import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface StarTrailsProps {
  count?: number;
}

function StarTrails({ count = 1000 }: StarTrailsProps) {
  const linesRef = useRef<THREE.LineSegments>(null);

  // Generate star trail positions
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 6); // 2 points per line
    const colors = new Float32Array(count * 6);

    for (let i = 0; i < count; i++) {
      const i6 = i * 6;

      // Start position
      const x = (Math.random() - 0.5) * 100;
      const y = (Math.random() - 0.5) * 100;
      const z = -Math.random() * 200 - 10;

      positions[i6] = x;
      positions[i6 + 1] = y;
      positions[i6 + 2] = z;

      // End position (trail behind)
      positions[i6 + 3] = x;
      positions[i6 + 4] = y;
      positions[i6 + 5] = z - 1; // Small trail initially

      // Assign colors matching star colors
      const colorType = Math.random();
      let r, g, b;

      if (colorType < 0.5) {
        r = 1.0; g = 1.0; b = 1.0;
      } else if (colorType < 0.7) {
        r = 0.5; g = 0.7; b = 1.0;
      } else if (colorType < 0.85) {
        r = 1.0; g = 0.95; b = 0.6;
      } else {
        r = 1.0; g = 0.6; b = 0.4;
      }

      // Head of trail (bright)
      colors[i6] = r;
      colors[i6 + 1] = g;
      colors[i6 + 2] = b;

      // Tail of trail (dim)
      colors[i6 + 3] = r * 0.2;
      colors[i6 + 4] = g * 0.2;
      colors[i6 + 5] = b * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return { geometry, colors: colors };
  }, [count]);

  // Animate trails
  useFrame(() => {
    if (linesRef.current) {
      const positions = linesRef.current.geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < count; i++) {
        const i6 = i * 6;

        // Move trail forward
        positions[i6 + 2] += 0.15;
        positions[i6 + 5] += 0.15;

        const z = positions[i6 + 2];

        // Create motion blur effect - trail gets longer as star approaches
        if (z > -20) {
          const blurLength = ((z + 20) / 30) * 5; // Trail length increases
          positions[i6 + 5] = positions[i6 + 2] - blurLength;
        } else {
          positions[i6 + 5] = positions[i6 + 2] - 1;
        }

        // Reset if passed camera
        if (positions[i6 + 2] > 10) {
          const x = (Math.random() - 0.5) * 100;
          const y = (Math.random() - 0.5) * 100;
          const z = -210;

          positions[i6] = x;
          positions[i6 + 1] = y;
          positions[i6 + 2] = z;
          positions[i6 + 3] = x;
          positions[i6 + 4] = y;
          positions[i6 + 5] = z - 1;
        }
      }

      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <lineSegments ref={linesRef} geometry={particles.geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

export default StarTrails;
