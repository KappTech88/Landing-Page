import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import StarTrails from './StarTrails';

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

  // Slow, meditative forward motion through space with motion blur
  useFrame(() => {
    if (ref.current) {
      const positions = ref.current.geometry.attributes.position.array as Float32Array;
      const colors = ref.current.geometry.attributes.color.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Move stars toward camera slowly (meditative speed)
        positions[i3 + 2] += 0.15;

        // Calculate distance-based motion blur
        const z = positions[i3 + 2];

        // As stars get closer (z increases), make them brighter and add blur effect
        if (z > -20) {
          // Stars close to camera - increase opacity
          const blurFactor = Math.min((z + 20) / 30, 1); // 0 to 1 as it approaches

          // Store original color
          const origR = particles.colors[i3];
          const origG = particles.colors[i3 + 1];
          const origB = particles.colors[i3 + 2];

          // Brighten as it approaches
          colors[i3] = origR * (1 + blurFactor * 0.3);
          colors[i3 + 1] = origG * (1 + blurFactor * 0.3);
          colors[i3 + 2] = origB * (1 + blurFactor * 0.3);
        }

        // Reset stars that pass the camera
        if (positions[i3 + 2] > 10) {
          positions[i3 + 2] = -210;
          positions[i3] = (Math.random() - 0.5) * 100;
          positions[i3 + 1] = (Math.random() - 0.5) * 100;

          // Reset color to original
          colors[i3] = particles.colors[i3];
          colors[i3 + 1] = particles.colors[i3 + 1];
          colors[i3 + 2] = particles.colors[i3 + 2];
        }
      }

      ref.current.geometry.attributes.position.needsUpdate = true;
      ref.current.geometry.attributes.color.needsUpdate = true;
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

        {/* Motion blur trails */}
        <StarTrails count={1000} />

        {/* Main stars */}
        <DeepSpaceStars count={count} />
      </Canvas>
    </div>
  );
}
