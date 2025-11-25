import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';

interface HolographicCardProps {
  children: ReactNode;
  onClick?: () => void;
  glowColor?: string;
  delay?: number;
}

export default function HolographicCard({
  children,
  onClick,
  glowColor = 'cyan',
  delay = 0,
}: HolographicCardProps) {
  const glowColors = {
    cyan: 'hover:shadow-[0_0_50px_rgba(34,211,238,0.3)]',
    blue: 'hover:shadow-[0_0_50px_rgba(59,130,246,0.3)]',
    purple: 'hover:shadow-[0_0_50px_rgba(168,85,247,0.3)]',
    pink: 'hover:shadow-[0_0_50px_rgba(236,72,153,0.3)]',
    rose: 'hover:shadow-[0_0_50px_rgba(244,63,94,0.3)]',
    amber: 'hover:shadow-[0_0_50px_rgba(251,191,36,0.3)]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -10 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        scale: 1.02,
        y: -8,
        transition: { duration: 0.3 },
      }}
      className="perspective-1000"
    >
      <Tilt
        tiltMaxAngleX={8}
        tiltMaxAngleY={8}
        scale={1.03}
        transitionSpeed={2000}
        glareEnable={true}
        glareMaxOpacity={0.3}
        glareColor="rgba(255, 255, 255, 0.5)"
        glarePosition="all"
        glareBorderRadius="1rem"
      >
        <button
          onClick={onClick}
          className={`relative w-full h-full rounded-2xl overflow-hidden transition-all duration-500 border border-white/10 glass-card group ${glowColors[glowColor as keyof typeof glowColors]}`}
        >
          {/* Holographic scan line */}
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
            initial={false}
            animate={{
              backgroundPosition: ['0% 0%', '0% 100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
              backgroundSize: '100% 200%',
            }}
          />

          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cyan-400/40 group-hover:border-cyan-400/80 transition-colors" />
          <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-cyan-400/40 group-hover:border-cyan-400/80 transition-colors" />
          <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-cyan-400/40 group-hover:border-cyan-400/80 transition-colors" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cyan-400/40 group-hover:border-cyan-400/80 transition-colors" />

          {/* Content */}
          {children}
        </button>
      </Tilt>
    </motion.div>
  );
}
