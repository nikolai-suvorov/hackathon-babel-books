'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

interface PageFlipAnimationProps {
  children: ReactNode;
  currentPage: number;
  direction: 'forward' | 'backward';
}

const pageVariants = {
  enter: (direction: 'forward' | 'backward') => ({
    rotateY: direction === 'forward' ? -180 : 180,
    opacity: 0,
    scale: 0.8,
  }),
  center: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: 'forward' | 'backward') => ({
    rotateY: direction === 'forward' ? 180 : -180,
    opacity: 0,
    scale: 0.8,
  }),
};

const pageTransition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  duration: 0.6,
};

export default function PageFlipAnimation({
  children,
  currentPage,
  direction,
}: PageFlipAnimationProps) {
  // Play page turn sound
  const playPageTurnSound = () => {
    const audio = new Audio('/sounds/page-turn.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Silent fail if audio can't play
    });
  };

  return (
    <div className="relative w-full h-full perspective-1000">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentPage}
          custom={direction}
          variants={pageVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={pageTransition}
          onAnimationStart={() => playPageTurnSound()}
          className="w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
          }}
        >
          {/* Page shadow effect */}
          <motion.div
            className="absolute inset-0 bg-black rounded-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            style={{
              transform: 'translateZ(-10px)',
              filter: 'blur(20px)',
            }}
          />
          
          {/* Page content */}
          <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-xl">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}