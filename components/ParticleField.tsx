import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
}

function DeepSpaceStars({ count = 3000 }: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);

  // Generate star positions with depth variation
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Distribute stars in a large volume
      positions[i3] = (Math.random() - 0.5) * 100;     // X
      positions[i3 + 1] = (Math.random() - 0.5) * 100; // Y
      positions[i3 + 2] = -Math.random() * 200 - 10;   // Z (depth)

      // Assign random star colors
      const colorType = Math.random();
      if (colorType < 0.5) {
        // White stars (50%)
        colors[i3] = 1.0;
        colors[i3 + 1] = 1.0;
        colors[i3 + 2] = 1.0;
      } else if (colorType < 0.7) {
        // Blue stars (20%)
        colors[i3] = 0.5;
        colors[i3 + 1] = 0.7;
        colors[i3 + 2] = 1.0;
      } else if (colorType < 0.85) {
        // Yellow stars (15%)
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.95;
        colors[i3 + 2] = 0.6;
      } else {
        // Red/Orange stars (15%)
        colors[i3] = 1.0;
        colors[i3 + 1] = 0.6;
        colors[i3 + 2] = 0.4;
      }

      // Vary star sizes for depth perception
      sizes[i] = Math.random() * 2 + 0.5;
    }

    return { positions, colors, sizes };
  }, [count]);

  // Set up colors on the geometry
  React.useEffect(() => {
    if (ref.current) {
      ref.current.geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(particles.colors, 3)
      );
    }
  }, [particles.colors]);

  // Slow, meditative forward motion through space
  useFrame(() => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Move stars toward camera slowly (meditative speed)
        positions[i3 + 2] += 0.15;

        // Reset stars that pass the camera
        if (positions[i3 + 2] > 10) {
          positions[i3 + 2] = -210;
          positions[i3] = (Math.random() - 0.5) * 100;
          positions[i3 + 1] = (Math.random() - 0.5) * 100;
        }
      }

      ref.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <Points ref={ref} positions={particles.positions} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.35}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={1.0}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function ParticleField({ count = 3000 }: ParticleFieldProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 0], fov: 75, near: 0.1, far: 1000 }}
        dpr={[1, 2]}
        style={{ background: 'transparent', width: '100%', height: '100%' }}
      >
        {/* Nebula fog effect with deep purple and dark blue */}
        <fog attach="fog" args={['#110022', 10, 150]} />

        {/* Ambient nebula glow */}
        <ambientLight intensity={0.2} color="#220033" />

        <DeepSpaceStars count={count} />
      </Canvas>
    </div>
  );
}
