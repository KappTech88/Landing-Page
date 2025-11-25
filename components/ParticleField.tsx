import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleFieldProps {
  count?: number;
}

function HyperSpaceStars({ count = 1000 }: ParticleFieldProps) {
  const linesRef = useRef<THREE.LineSegments>(null);

  // Generate star streak data
  const { geometry, colors } = useMemo(() => {
    const positions = new Float32Array(count * 6); // 2 points per line (start and end)
    const colors = new Float32Array(count * 6); // colors for both points

    for (let i = 0; i < count; i++) {
      const i6 = i * 6;

      // Random angle for radial distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 40 + 5; // Much wider spread

      // Start position (spread across screen)
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = -Math.random() * 100 - 10;

      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;

      // End position (creates the streak)
      positions[i6 + 3] = x * 1.1;
      positions[i6 + 4] = y * 1.1;
      positions[i6 + 5] = z - 2;

      // Vibrant color palette inspired by No Man's Sky
      const colorChoice = Math.random();
      let r, g, b;

      if (colorChoice < 0.25) {
        // Bright cyan
        r = 0.3; g = 0.9; b = 1;
      } else if (colorChoice < 0.5) {
        // Bright magenta/pink
        r = 1; g = 0.3; b = 0.9;
      } else if (colorChoice < 0.75) {
        // Bright white
        r = 1; g = 1; b = 1;
      } else {
        // Bright purple
        r = 0.7; g = 0.3; b = 1;
      }

      // Apply color to both points of the line
      colors[i6] = r;
      colors[i6 + 1] = g;
      colors[i6 + 2] = b;
      colors[i6 + 3] = r * 0.5; // Fade the tail
      colors[i6 + 4] = g * 0.5;
      colors[i6 + 5] = b * 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { geometry, colors: new Float32Array(colors) };
  }, [count]);

  // Animate the hyperspace warp effect
  useFrame(() => {
    if (linesRef.current) {
      const positions = linesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i6 = i * 6;

        // Get current position
        let x = positions[i6];
        let y = positions[i6 + 1];
        let z = positions[i6 + 2];

        // Move toward camera (increase z) and expand outward
        const speed = 0.3;
        const expandFactor = 1.005;

        z += speed;

        // Reset if past camera
        if (z > 10) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 40 + 5; // Match wider spread
          x = Math.cos(angle) * radius;
          y = Math.sin(angle) * radius;
          z = -100 - Math.random() * 50;
        } else {
          // Expand outward as approaching
          x *= expandFactor;
          y *= expandFactor;
        }

        // Update start point
        positions[i6] = x;
        positions[i6 + 1] = y;
        positions[i6 + 2] = z;

        // Update end point (creates streak)
        positions[i6 + 3] = x * 1.1;
        positions[i6 + 4] = y * 1.1;
        positions[i6 + 5] = z - 3;
      }

      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.9}
        blending={THREE.AdditiveBlending}
        linewidth={2}
      />
    </lineSegments>
  );
}

export default function ParticleField({ count = 1000 }: ParticleFieldProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Canvas
        camera={{ position: [0, 0, 0], fov: 90 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <HyperSpaceStars count={count} />
      </Canvas>
    </div>
  );
}
