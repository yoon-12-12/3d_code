import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

export function DataStream({ startRef, endRef, color, isHighlighted, dimmed }) {
  const lineRef = useRef();

  useFrame((state, delta) => {
    if (startRef?.current && endRef?.current && lineRef.current && !dimmed) {
      const startPos = new THREE.Vector3();
      const endPos = new THREE.Vector3();
      startRef.current.getWorldPosition(startPos);
      endRef.current.getWorldPosition(endPos);
      lineRef.current.geometry.setPositions([startPos.x, startPos.y, startPos.z, endPos.x, endPos.y, endPos.z]);
      lineRef.current.computeLineDistances();
      lineRef.current.material.dashOffset -= delta * (isHighlighted ? 2.5 : 1.2);
    }
  });

  return (
    <Line 
      ref={lineRef} points={[[0,0,0],[0,0,0]]} color={color} 
      lineWidth={isHighlighted ? 3.5 : 0.8} dashed transparent opacity={dimmed ? 0.05 : 0.5} 
    />
  );
}