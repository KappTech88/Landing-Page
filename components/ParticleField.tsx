import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
}

function GalaxyStars({ count = 5000 }: ParticleFieldProps) {
  const ref = useRef<THREE.Points>(null);

  // Generate star positions and properties
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Spread stars in a large cylinder (traveling forward through space)
      const radius = Math.random() * 40;
      const angle = Math.random() * Math.PI * 2;

      positions[i3] = Math.cos(angle) * radius; // X
      positions[i3 + 1] = (Math.random() - 0.5) * 40; // Y
      positions[i3 + 2] = (Math.random() - 0.5) * 100; // Z (depth)

      // Star colors - mostly white with hints of blue, yellow, and red
      const colorType = Math.random();
      if (colorType < 0.7) {
        // White stars (most common)
        const brightness = 0.8 + Math.random() * 0.2;
        colors[i3] = brightness;
        colors[i3 + 1] = brightness;
        colors[i3 + 2] = brightness;
      } else if (colorType < 0.85) {
        // Blue-white stars
        colors[i3] = 0.7 + Math.random() * 0.3;
        colors[i3 + 1] = 0.8 + Math.random() * 0.2;
        colors[i3 + 2] = 1;
      } else if (colorType < 0.95) {
        // Yellow-white stars
        colors[i3] = 1;
        colors[i3 + 1] = 0.9 + Math.random() * 0.1;
        colors[i3 + 2] = 0.7 + Math.random() * 0.2;
      } else {
        // Red-orange stars (rare)
        colors[i3] = 1;
        colors[i3 + 1] = 0.5 + Math.random() * 0.3;
        colors[i3 + 2] = 0.3 + Math.random() * 0.2;
      }

      // Vary star sizes for depth perception
      sizes[i] = Math.random() * 2 + 0.5;

      // Different velocities for parallax effect
      velocities[i] = Math.random() * 0.5 + 0.2;
    }

    return { positions, colors, sizes, velocities };
  }, [count]);

  // Animate stars moving toward camera (traveling through space)
  useFrame((state) => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Move stars toward camera (increasing Z)
        positions[i3 + 2] += particles.velocities[i];

        // Reset stars that pass the camera
        if (positions[i3 + 2] > 50) {
          positions[i3 + 2] = -50;

          // Randomize position when resetting
          const radius = Math.random() * 40;
          const angle = Math.random() * Math.PI * 2;
          positions[i3] = Math.cos(angle) * radius;
          positions[i3 + 1] = (Math.random() - 0.5) * 40;
        }
      }

      ref.current.geometry.attributes.position.needsUpdate = true;

      // Subtle rotation for dynamic feel
      ref.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 0.05) * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={particles.positions} stride={3}>
      <PointMaterial
        transparent
        vertexColors
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function ParticleField({ count = 5000 }: ParticleFieldProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 75 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <GalaxyStars count={count} />
      </Canvas>
    </div>
  );
}
