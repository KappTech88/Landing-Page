import React, { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface EnhancedNavProps {
  onLogoClick: () => void;
  onBackClick?: () => void;
  showBack?: boolean;
  rightContent?: React.ReactNode;
}

export default function EnhancedNav({ onLogoClick, onBackClick, showBack = false, rightContent }: EnhancedNavProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const backgroundColor = useTransform(
    scrollY,
    [0, 100],
    ['rgba(2, 6, 23, 0.5)', 'rgba(2, 6, 23, 0.9)']
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      style={{ backgroundColor }}
      className="sticky top-0 z-50 w-full backdrop-blur-md border-b border-white/10 transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo with enhanced animation */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogoClick}
          className="flex items-center cursor-pointer select-none group"
        >
          <div className="relative">
            <motion.div
              className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/50 group-hover:shadow-cyan-500/80 transition-shadow"
              animate={{
                boxShadow: isScrolled
                  ? '0 10px 25px -5px rgba(6, 182, 212, 0.5)'
                  : '0 4px 15px -3px rgba(6, 182, 212, 0.5)',
              }}
            >
              <span className="text-white font-bold text-lg">ER</span>
            </motion.div>
            {/* Orbital ring */}
            <motion.div
              className="absolute inset-0 rounded-full border border-cyan-400/30"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </motion.div>

        {/* Back button or right content */}
        {showBack && onBackClick ? (
          <motion.button
            onClick={onBackClick}
            whileHover={{ scale: 1.05, x: -3 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center px-4 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm text-slate-300 group"
          >
            <motion.div
              animate={{ x: [0, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:text-cyan-400 transition-colors" />
            </motion.div>
            <span className="group-hover:text-white transition-colors">Back</span>
          </motion.button>
        ) : (
          <div className="flex items-center gap-3">
            {rightContent}
          </div>
        )}
      </div>

      {/* Animated underline */}
      <motion.div
        className="h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent"
        animate={{
          opacity: isScrolled ? 0.5 : 0.2,
        }}
      />
    </motion.nav>
  );
}
