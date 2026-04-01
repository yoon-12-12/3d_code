from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ast
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeBlock(BaseModel):
    id: int
    code: str

class MultiCodeRequest(BaseModel):
    blocks: list[CodeBlock]

@app.post("/analyze")
async def analyze_code(request: MultiCodeRequest):
    try:
        nodes = []
        links = []
        interactions = []
        
        # 1. 개별 블록 분석 (노드 소속 태깅)
        for block in request.blocks:
            tree = ast.parse(block.code)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # 함수 노드
                    nodes.append({
                        "id": node.name, "type": "Function", "name": node.name,
                        "cell_id": block.id, "lines": node.end_lineno - node.lineno + 1,
                        "vars": [t.id for sub in node.body if isinstance(sub, ast.Assign) for t in sub.targets if hasattr(t, 'id')]
                    })
                    # 내부 변수 노드
                    for sub in node.body:
                        if isinstance(sub, ast.Assign):
                            try: val_repr = ast.unparse(sub.value)
                            except: val_repr = "unknown"
                            for target in sub.targets:
                                if hasattr(target, 'id'):
                                    var_id = f"{node.name}_{target.id}"
                                    nodes.append({
                                        "id": var_id, "type": "Variable", "name": target.id, 
                                        "cell_id": block.id, "value": val_repr, "parent": node.name, "lines": 1
                                    })
                                    links.append({"source": node.name, "target": var_id})

        # 2. 통합 상호작용 분석 (전체 코드를 합쳐서 호출 관계 파악)
        full_source = "\n\n".join([b.code for b in request.blocks])
        full_tree = ast.parse(full_source)
        for node in ast.walk(full_tree):
            if isinstance(node, ast.FunctionDef):
                for sub in node.body:
                    for call in ast.walk(sub):
                        if isinstance(call, ast.Call) and isinstance(call.func, ast.Name):
                            target_f = call.func.id
                            for arg in call.args:
                                if isinstance(arg, ast.Name):
                                    source_var = f"{node.name}_{arg.id}"
                                    # 셀 경계를 넘는 링크 생성
                                    links.append({"source": source_var, "target": target_f})
                                    interactions.append({"from": node.name, "to": target_f, "var": arg.id})

        # 3. 데이터 보정 및 좌표 부여
        final_nodes = []
        for n in nodes:
            # 설명문 조립 (어느 셀 출신인지 명시)
            origin = f"[Cell #{n['cell_id']} 소속]"
            if n["type"] == "Function":
                n["description"] = f"{origin} '{n['name']}' 함수. 내부 속성: {n['vars']}."
                rel = [i for i in interactions if i['to'] == n['name']]
                if rel: n["description"] += f" (수신처: {', '.join(list(set([i['from'] for i in rel])))})"
            else:
                n["description"] = f"{origin} '{n['name']}' 변수. 값: '{n['value']}'."
                pas = [i for i in interactions if i['from'] == n['parent'] and i['var'] == n['name']]
                if pas: n["description"] += f" (전달처: {', '.join(list(set([i['to'] for i in pas])))})"
            
            n["connections"] = sum(1 for l in links if l["source"] == n["id"] or l["target"] == n["id"])
            n["pos"] = [random.uniform(-18, 18), random.uniform(-18, 18), random.uniform(-18, 18)]
            final_nodes.append(n)
            
        return {"nodes": final_nodes, "links": links}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)