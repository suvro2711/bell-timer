import { useEffect, useRef } from "react";
// We use a simpler audio approach if use-sound has issues in some envs, 
// but here we'll use standard HTML5 Audio for maximum compatibility without extra deps if possible,
// or wrap it cleanly.

// Reliable clear bell sound
const BELL_URL = "https://cdn.freesound.org/previews/339/339810_5121236-lq.mp3"; 

interface SoundPlayerProps {
  playTrigger: number; // Increment this to play
}

export function SoundPlayer({ playTrigger }: SoundPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload
    audioRef.current = new Audio(BELL_URL);
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    if (playTrigger > 0 && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.error("Audio play failed:", err));
    }
  }, [playTrigger]);

  return null;
}
