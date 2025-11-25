import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
}

function ParticleSystem({ count = 5000 }: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);

  // Generate random particle positions in 3D space
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Position particles in a sphere around the camera
      const i3 = i * 3;
      const radius = Math.random() * 25 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Color gradient from cyan to purple to pink
      const colorChoice = Math.random();
      if (colorChoice < 0.33) {
        colors[i3] = 0.4 + Math.random() * 0.6;     // Cyan-ish
        colors[i3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i3 + 2] = 1;
      } else if (colorChoice < 0.66) {
        colors[i3] = 0.6 + Math.random() * 0.4;     // Purple-ish
        colors[i3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i3 + 2] = 1;
      } else {
        colors[i3] = 1;                              // Pink-ish
        colors[i3 + 1] = 0.4 + Math.random() * 0.3;
        colors[i3 + 2] = 0.8 + Math.random() * 0.2;
      }
    }

    return { positions, colors };
  }, [count]);

  // Animate particles with gentle rotation and floating
  useFrame((state) => {
    if (ref.current) {
      const time = state.clock.getElapsedTime();

      // Slow rotation
      ref.current.rotation.y = time * 0.05;
      ref.current.rotation.x = Math.sin(time * 0.1) * 0.1;

      // Gentle pulsing
      const scale = 1 + Math.sin(time * 0.3) * 0.05;
      ref.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <Points ref={ref} positions={particles.positions} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function ParticleField({ count = 5000 }: ParticleFieldProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 75 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <ParticleSystem count={count} />
      </Canvas>
    </div>
  );
}
