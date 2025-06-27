'use client';

import { useEffect, useRef, useState } from 'react';

interface BackgroundMusicProps {
  tone: 'playful' | 'magical' | 'scary' | 'wholesome' | 'adventurous';
  enabled: boolean;
  volume?: number;
}

const toneToMusic: Record<string, string> = {
  playful: '/music/bouncy-xylophone.mp3',
  magical: '/music/twinkly-chimes.mp3',
  scary: '/music/soft-whooshes.mp3',
  wholesome: '/music/soft-piano.mp3',
  adventurous: '/music/rhythmic-drums.mp3',
};

export default function BackgroundMusic({ 
  tone, 
  enabled, 
  volume = 0.3 
}: BackgroundMusicProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;
    const musicUrl = toneToMusic[tone] || toneToMusic.wholesome;

    if (enabled) {
      // Crossfade to new track if changing
      if (audio.src !== musicUrl) {
        const fadeOut = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume -= 0.05;
          } else {
            clearInterval(fadeOut);
            audio.pause();
            audio.src = musicUrl;
            audio.volume = 0;
            
            audio.play().then(() => {
              setIsPlaying(true);
              // Fade in
              const fadeIn = setInterval(() => {
                if (audio.volume < volume) {
                  audio.volume = Math.min(audio.volume + 0.05, volume);
                } else {
                  clearInterval(fadeIn);
                }
              }, 50);
            }).catch(() => {
              setIsPlaying(false);
            });
          }
        }, 50);
      } else if (!isPlaying) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    } else {
      // Fade out and pause
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.05) {
          audio.volume -= 0.05;
        } else {
          clearInterval(fadeOut);
          audio.pause();
          setIsPlaying(false);
        }
      }, 50);
    }

    return () => {
      // Cleanup on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [tone, enabled, volume]);

  return null; // This is a controller component with no UI
}