import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

export default function FloatingElements() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reduce elements on mobile for better performance (15 -> 5)
  const elementCount = isMobile ? 5 : 15;

  const elements = useMemo(() =>
    Array.from({ length: elementCount }, (_, i) => ({
      id: i,
      size: isMobile ? Math.random() * 60 + 40 : Math.random() * 100 + 50, // Smaller on mobile
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: isMobile ? Math.random() * 30 + 20 : Math.random() * 20 + 10, // Slower on mobile
      delay: Math.random() * 5,
      opacity: Math.random() * 0.2 + 0.05, // Lower opacity for subtlety
    })), [elementCount, isMobile]);

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
            filter: isMobile ? 'blur(30px)' : 'blur(40px)', // Less blur on mobile
          }}
          animate={isMobile ? {
            // Simpler animation on mobile - just opacity pulse
            opacity: [el.opacity, el.opacity * 1.3, el.opacity],
          } : {
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
