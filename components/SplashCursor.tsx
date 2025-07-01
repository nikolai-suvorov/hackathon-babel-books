'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Splash {
  id: number;
  x: number;
  y: number;
  color: string;
}

const colors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FECA57', // Yellow
  '#FF6B9D', // Pink
  '#A8E6CF', // Light Green
  '#C7CEEA', // Lavender
  '#FFD93D', // Gold
];

export default function SplashCursor() {
  const [splashes, setSplashes] = useState<Splash[]>([]);
  const [isClient, setIsClient] = useState(false);
  const splashIdRef = useRef(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Create splash on mouse move with some throttling
      if (Math.random() > 0.9) {
        const newSplash: Splash = {
          id: splashIdRef.current++,
          x: e.clientX,
          y: e.clientY,
          color: colors[Math.floor(Math.random() * colors.length)],
        };

        setSplashes((prev) => [...prev, newSplash]);

        // Remove splash after animation
        setTimeout(() => {
          setSplashes((prev) => prev.filter((s) => s.id !== newSplash.id));
        }, 1000);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Create multiple splashes on click
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          const angle = (i / 8) * Math.PI * 2;
          const distance = 30 + Math.random() * 20;
          const newSplash: Splash = {
            id: splashIdRef.current++,
            x: e.clientX + Math.cos(angle) * distance,
            y: e.clientY + Math.sin(angle) * distance,
            color: colors[Math.floor(Math.random() * colors.length)],
          };

          setSplashes((prev) => [...prev, newSplash]);

          setTimeout(() => {
            setSplashes((prev) => prev.filter((s) => s.id !== newSplash.id));
          }, 1500);
        }, i * 50);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, [isClient]);

  if (!isClient) return null;

  return (
    <div className="splash-cursor-container">
      <AnimatePresence>
        {splashes.map((splash) => (
          <motion.div
            key={splash.id}
            className="splash"
            initial={{
              x: splash.x - 15,
              y: splash.y - 15,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [1, 0.8, 0],
            }}
            exit={{
              scale: 0,
              opacity: 0,
            }}
            transition={{
              duration: 1,
              ease: 'easeOut',
            }}
            style={{
              position: 'fixed',
              width: 30,
              height: 30,
              borderRadius: '50%',
              backgroundColor: splash.color,
              pointerEvents: 'none',
              zIndex: 9999,
              filter: 'blur(2px)',
              mixBlendMode: 'screen',
            }}
          />
        ))}
      </AnimatePresence>

      <style jsx global>{`
        .splash-cursor-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
        }

        /* Add a custom cursor for extra fun */
        body {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%23FF6B6B" opacity="0.8"/><circle cx="10" cy="10" r="3" fill="%23FFFFFF"/></svg>') 10 10, auto;
        }

        /* Sparkle animation for splashes */
        @keyframes sparkle {
          0% {
            transform: scale(0) rotate(0deg);
          }
          50% {
            transform: scale(1) rotate(180deg);
          }
          100% {
            transform: scale(0) rotate(360deg);
          }
        }

        .splash::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          animation: sparkle 1s ease-out;
        }
      `}</style>
    </div>
  );
}