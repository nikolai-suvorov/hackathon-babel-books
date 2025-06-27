'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveZone {
  id: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  type: 'sound' | 'animation' | 'visual' | 'reaction';
  action: string;
  label: string;
}

interface StoryPageProps {
  pageNumber: number;
  text: string;
  imageUrl?: string;
  imagePrompt: string;
  audioUrl?: string;
  audioDuration?: number;
  interactiveZones?: InteractiveZone[];
  onPageComplete?: () => void;
  autoPlay?: boolean;
  narrationLanguage?: string;
  textLanguage?: string;
}

export default function InteractiveStoryPage({
  pageNumber,
  text,
  imageUrl,
  imagePrompt,
  audioUrl,
  audioDuration,
  interactiveZones = [],
  onPageComplete,
  autoPlay = false,
  narrationLanguage,
  textLanguage,
}: StoryPageProps) {
  const [showInteractions, setShowInteractions] = useState(false);
  const [activatedZones, setActivatedZones] = useState<Set<string>>(new Set());
  const [isNarrating, setIsNarrating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  // Load and play narration
  useEffect(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
      } else {
        audioRef.current.src = audioUrl;
      }
      
      audioRef.current.onended = () => {
        setIsNarrating(false);
        setIsPlaying(false);
        if (onPageComplete) {
          onPageComplete();
        }
      };
      
      if (autoPlay) {
        audioRef.current.play()
          .then(() => {
            setIsNarrating(true);
            setIsPlaying(true);
          })
          .catch((err) => {
            console.log('Auto-play failed:', err);
          });
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl, autoPlay, onPageComplete]);

  // Show interactive zones after narration starts
  useEffect(() => {
    if (isNarrating) {
      const timer = setTimeout(() => {
        setShowInteractions(true);
      }, 2000); // Show after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [isNarrating]);

  const handleZoneClick = (zone: InteractiveZone) => {
    if (activatedZones.has(zone.id)) return;

    setActivatedZones(new Set(Array.from(activatedZones).concat(zone.id)));

    // Play zone-specific sound effect
    const audio = new Audio(`/sounds/${zone.type}-${zone.id}.mp3`);
    audio.play().catch(() => {
      // Fallback to visual feedback only
      console.log('Audio playback failed, showing visual feedback only');
    });

    // Reset after animation
    setTimeout(() => {
      setActivatedZones(prev => {
        const newSet = new Set(prev);
        newSet.delete(zone.id);
        return newSet;
      });
    }, 1000);
  };

  const playNarration = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsNarrating(false);
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setIsNarrating(true);
          })
          .catch((err) => {
            console.log('Play failed:', err);
          });
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Story Image */}
      <div 
        ref={imageRef}
        className="relative w-full h-full overflow-hidden rounded-3xl"
      >
        {imageUrl ? (
          <img 
            src={imageUrl}
            alt={imagePrompt}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-sunshine-yellow to-coral-pink flex items-center justify-center">
            <div className="text-center text-white">
              <p className="text-6xl mb-4">🖼️</p>
              <p className="text-lg font-medium px-4">{imagePrompt}</p>
            </div>
          </div>
        )}

        {/* Interactive Zones */}
        <AnimatePresence>
          {showInteractions && interactiveZones.map((zone) => (
            <motion.button
              key={zone.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: activatedZones.has(zone.id) ? 1.2 : 1,
              }}
              exit={{ opacity: 0 }}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                activatedZones.has(zone.id) ? '' : 'hover:scale-110'
              } transition-all duration-200`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
              onClick={() => handleZoneClick(zone)}
              aria-label={zone.label}
            >
              {/* Pulse effect for unactivated zones */}
              {!activatedZones.has(zone.id) && (
                <motion.div
                  className="absolute inset-0 bg-white bg-opacity-30 rounded-full"
                  animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.3, 0.1, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
              
              {/* Sparkle burst for activated zones */}
              {activatedZones.has(zone.id) && (
                <motion.div
                  className="absolute inset-0"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 2, 0] }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-4xl">✨</span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Text Content */}
      <motion.div 
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <p className={`text-xl leading-relaxed text-gray-800 font-body ${
          isNarrating ? 'animate-pulse' : ''
        }`}>
          {text}
        </p>

        {/* Language indicators */}
        {textLanguage !== narrationLanguage && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
            <span>📖 Text: {textLanguage}</span>
            <span>•</span>
            <span>🔊 Narration: {narrationLanguage}</span>
          </div>
        )}
      </motion.div>

      {/* Audio Controls */}
      {audioUrl && (
        <motion.div 
          className="mt-6 bg-gray-50 rounded-xl p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={playNarration}
              className="bg-dream-blue text-white p-3 rounded-full hover:bg-opacity-90 transition-all transform hover:scale-105"
              aria-label={isPlaying ? "Pause narration" : "Play narration"}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">
                {isPlaying ? 'Playing narration...' : 'Listen to the story'}
              </p>
              {audioDuration && (
                <p className="text-xs text-gray-500">Duration: {audioDuration}s</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}