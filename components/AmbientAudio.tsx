import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

export default function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Create audio context for ambient sound
    // Note: We'll use the Web Audio API to generate ambient tones
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const createAmbientSound = () => {
      // Create oscillators for layered ambient sound
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.type = 'sine';
      oscillator1.frequency.setValueAtTime(110, audioContext.currentTime); // Low A
      oscillator2.type = 'sine';
      oscillator2.frequency.setValueAtTime(165, audioContext.currentTime); // E

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      if (!isMuted) {
        gainNode.gain.linearRampToValueAtTime(0.02, audioContext.currentTime + 2);
      }

      oscillator1.start();
      oscillator2.start();

      return { oscillator1, oscillator2, gainNode };
    };

    let currentSound: { oscillator1: OscillatorNode; oscillator2: OscillatorNode; gainNode: GainNode } | null = null;

    if (!isMuted) {
      currentSound = createAmbientSound();
    }

    return () => {
      if (currentSound) {
        currentSound.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 1);
        setTimeout(() => {
          currentSound?.oscillator1.stop();
          currentSound?.oscillator2.stop();
        }, 1000);
      }
    };
  }, [isMuted]);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <motion.button
      onClick={toggleMute}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="fixed bottom-6 right-6 z-50 group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="relative">
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
          animate={{
            scale: isHovered ? 1.2 : 1,
            opacity: isHovered ? 1 : 0.6,
          }}
          transition={{ duration: 0.3 }}
        />

        {/* Main button */}
        <div className="relative w-12 h-12 rounded-full bg-slate-900/80 backdrop-blur-md border border-cyan-400/40 flex items-center justify-center group-hover:border-cyan-400/80 transition-colors">
          <AnimatePresence mode="wait">
            {isMuted ? (
              <motion.div
                key="muted"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <VolumeX className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              </motion.div>
            ) : (
              <motion.div
                key="unmuted"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <Volume2 className="w-5 h-5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pulse animation when active */}
          {!isMuted && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-400/20"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-cyan-400/20"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeOut',
                  delay: 1,
                }}
              />
            </>
          )}
        </div>

        {/* Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap"
            >
              <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-400/40 rounded-lg px-3 py-1.5 text-xs text-cyan-300">
                {isMuted ? 'Enable Ambient Sound' : 'Disable Ambient Sound'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}
