import React, { useState, useRef, createRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import axios from 'axios';
import { DataCore } from './components/DataCore';
import { DataStream } from './components/DataStream';

const CELL_COLORS = ["#00ffff", "#ff00ff", "#ffff00", "#00ff00", "#ff0088", "#7000ff", "#0088ff", "#ff8800"];

function App() {
  const [blocks, setBlocks] = useState([
    { id: 1, code: "def producer_module():\n    shared_data = 500\n    consumer_module(shared_data)", color: CELL_COLORS[0] }
  ]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());
  const nodeRefs = useRef({});

  const addBlock = () => {
    const nextId = blocks.length > 0 ? Math.max(...blocks.map(b => b.id)) + 1 : 1;
    const color = CELL_COLORS[(nextId - 1) % CELL_COLORS.length];
    setBlocks([...blocks, { id: nextId, code: "", color }]);
  };

  const removeBlock = (id) => {
    if (blocks.length === 1) return;
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const updateCode = (id, newCode) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, code: newCode } : b));
  };

  const handleAnalyze = async () => {
    try {
      const response = await axios.post('http://127.0.0.1:8000/analyze', { 
        blocks: blocks.map(b => ({ id: b.id, code: b.code })) 
      });
      
      const enrichedNodes = response.data.nodes.map(node => ({
        ...node,
        color: blocks.find(b => b.id === node.cell_id)?.color || "#ffffff"
      }));

      const newRefs = {};
      enrichedNodes.forEach(n => { newRefs[n.id] = createRef(); });
      nodeRefs.current = newRefs;
      setGraphData({ nodes: enrichedNodes, links: response.data.links });
      setHighlightedNodes(new Set()); setHighlightedLinks(new Set()); setSelectedNode(null);
    } catch (e) { alert("분석 중 오류 발생"); }
  };

  const handleSelectNode = (node) => {
    if (!node) { setHighlightedNodes(new Set()); setHighlightedLinks(new Set()); setSelectedNode(null); return; }
    setSelectedNode(node);
    const nodes = new Set([node.id]);
    const links = new Set();
    graphData.links.forEach((link, idx) => {
      if (link.source === node.id || link.target === node.id) {
        links.add(idx); nodes.add(link.source); nodes.add(link.target);
      }
    });
    setHighlightedNodes(nodes); setHighlightedLinks(links);
  };

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#020205", position: "relative", overflow: "hidden", display: "flex" }}>
      {/* 셀 리스트 사이드바 */}
      <div style={{ 
        width: "420px", height: "100%", zIndex: 100, background: "rgba(0,5,15,0.8)", 
        padding: "20px", overflowY: "auto", borderRight: "1px solid rgba(0,255,255,0.2)",
        backdropFilter: "blur(10px)"
      }}>
        <h2 style={{ color: "#00ffff", textShadow: "0 0 10px #00ffff", fontSize: "1.2rem", marginBottom: "20px" }}>NEURAL CODE CELLS</h2>
        
        {blocks.map((block) => (
          <div key={block.id} style={{ marginBottom: "20px", borderLeft: `4px solid ${block.color}`, paddingLeft: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ color: block.color, fontWeight: "bold", fontSize: "0.8rem" }}>CELL #{block.id}</span>
              <button onClick={() => removeBlock(block.id)} style={{ background: "none", border: "none", color: "#ff4444", cursor: "pointer", fontSize: "0.7rem" }}>REMOVE</button>
            </div>
            <textarea 
              value={block.code} onChange={(e) => updateCode(block.id, e.target.value)}
              placeholder="코드를 입력하세요..."
              style={{ 
                width: "100%", height: "100px", background: "rgba(0,0,0,0.5)", color: "#fff", 
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "4px", padding: "10px", outline: "none", fontSize: "0.8rem" 
              }}
            />
          </div>
        ))}

        <button onClick={addBlock} style={{ width: "100%", padding: "10px", background: "none", border: "1px dashed #00ffff", color: "#00ffff", cursor: "pointer", marginBottom: "10px" }}>+ ADD NEW CELL</button>
        <button onClick={handleAnalyze} style={{ width: "100%", padding: "12px", background: "#00ffff", border: "none", fontWeight: "bold", cursor: "pointer", color: "#000" }}>ANALYZE ALL CELLS</button>
      </div>

      {/* 우측 하단 상세창 */}
      {selectedNode && (
        <div style={{
          position: "absolute", bottom: "40px", right: "40px", zIndex: 100, width: "320px", padding: "20px", 
          background: "rgba(0, 15, 30, 0.9)", border: `2px solid ${selectedNode.color}`, borderRadius: "12px", color: "white"
        }}>
          <h3 style={{ color: selectedNode.color, margin: "0 0 10px 0" }}>{selectedNode.name}</h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.8, background: "rgba(255,255,255,0.05)", padding: "10px", borderRadius: "6px" }}>{selectedNode.description}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "15px" }}>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>LOC</span>
              <div style={{ color: "#00ffff", fontWeight: "bold" }}>{selectedNode.lines}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
              <span style={{ fontSize: "0.6rem", opacity: 0.5 }}>CONN</span>
              <div style={{ color: "#ff00ff", fontWeight: "bold" }}>{selectedNode.connections}</div>
            </div>
          </div>
        </div>
      )}

      <Canvas camera={{ position: [0, 0, 35] }} onPointerMissed={() => handleSelectNode(null)}>
        <Stars radius={150} count={5000} />
        <ambientLight intensity={0.5} />
        {graphData.nodes.map(node => (
          <DataCore 
            key={node.id} nodeRef={nodeRefs.current[node.id]} position={node.pos} name={node.name} 
            color={node.color} isFunction={node.type === 'Function'} onSelect={() => handleSelectNode(node)}
            isHighlighted={highlightedNodes.size === 0 || highlightedNodes.has(node.id)}
            dimmed={highlightedNodes.size > 0 && !highlightedNodes.has(node.id)} lines={node.lines}
          />
        ))}
        {graphData.links.map((link, idx) => (
          <DataStream 
            key={idx} startRef={nodeRefs.current[link.source]} endRef={nodeRefs.current[link.target]} 
            color={graphData.nodes.find(n => n.id === link.source)?.color || "#fff"}
            isHighlighted={highlightedLinks.size === 0 || highlightedLinks.has(idx)}
            dimmed={highlightedLinks.size > 0 && !highlightedLinks.has(idx)}
          />
        ))}
        <OrbitControls makeDefault />
      </Canvas>
    </div>
  );
}

export default App;
