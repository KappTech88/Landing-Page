import React from 'react';
import { motion } from 'framer-motion';

export default function FloatingElements() {
  const elements = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 50,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {elements.map((el) => (
        <motion.div
          key={el.id}
          className="absolute rounded-full"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            width: el.size,
            height: el.size,
            background: `radial-gradient(circle,
              ${
                el.id % 3 === 0
                  ? 'rgba(34, 211, 238, 0.15)'
                  : el.id % 3 === 1
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(236, 72, 153, 0.15)'
              } 0%,
              transparent 70%)`,
            filter: 'blur(40px)',
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(el.id) * 20, 0],
            scale: [1, 1.2, 1],
            opacity: [el.opacity, el.opacity * 1.5, el.opacity],
          }}
          transition={{
            duration: el.duration,
            delay: el.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
