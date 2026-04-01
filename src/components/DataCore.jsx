import React, { useState, useMemo } from 'react';
import { Float, MeshWobbleMaterial, Billboard, Text, Points, PointMaterial } from '@react-three/drei';

export function DataCore({ position, color, isFunction, name, nodeRef, onSelect, isHighlighted, dimmed, lines }) {
  const [hovered, setHover] = useState(false);
  const opacity = dimmed ? 0.1 : 1.0;
  const emissiveInt = isHighlighted ? (hovered ? 12 : 4) : 0.3;

  const nodeScale = useMemo(() => {
    const base = isFunction ? 1.2 : 0.7; 
    return base + Math.min((lines || 0) * 0.15, 2.0);
  }, [lines, isFunction]);

  const particleCount = 40;
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, []);

  return (
    <Float speed={dimmed ? 0 : 2} rotationIntensity={1} floatIntensity={1}>
      <group 
        position={position} ref={nodeRef} scale={nodeScale} 
        onPointerDown={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={() => setHover(true)} onPointerOut={() => setHover(false)}
      >
        <mesh>
          {isFunction ? <icosahedronGeometry args={[0.5, 1]} /> : <boxGeometry args={[0.45, 0.45, 0.45]} />}
          <MeshWobbleMaterial color={color} speed={2} factor={hovered ? 1 : 0.5} 
                              emissive={color} emissiveIntensity={emissiveInt} transparent opacity={opacity} />
        </mesh>
        <mesh>
          {isFunction ? <icosahedronGeometry args={[0.55, 1]} /> : <boxGeometry args={[0.6, 0.6, 0.6]} />}
          <meshBasicMaterial color={color} wireframe transparent opacity={opacity * 0.2} />
        </mesh>
        <Points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
          </bufferGeometry>
          <PointMaterial transparent color={color} size={0.06} sizeAttenuation={true} depthWrite={false} opacity={opacity * 0.6} />
        </Points>
        <Billboard position={[0, 2.0, 0]}>
          <Text fontSize={0.35} color="#ffffff" fillOpacity={opacity} outlineWidth={0.04} outlineColor="#000000">
            {name}
          </Text>
        </Billboard>
      </group>
    </Float>
  );
}