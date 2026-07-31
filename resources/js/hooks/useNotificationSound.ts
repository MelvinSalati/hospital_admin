// resources/js/hooks/useNotificationSound.ts

import { useEffect, useRef, useState } from 'react';

interface SoundOptions {
  volume?: number;
  loop?: boolean;
  playbackRate?: number;
}

export const useNotificationSound = (options: SoundOptions = {}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { volume = 0.5, loop = false, playbackRate = 1 } = options;

  // Load sound on mount
  useEffect(() => {
    // Use the sound file from your public folder
    const audio = new Audio('/notification.mp3');
    audio.volume = volume;
    audio.loop = loop;
    audio.playbackRate = playbackRate;

    // Event listeners
    const onCanPlay = () => {
      setIsLoaded(true);
      audioRef.current = audio;
      console.log('✅ Notification sound loaded successfully');
    };

    const onError = (error: any) => {
      console.warn('⚠️ Could not load notification sound:', error);
      // Try fallback - generate a beep using Web Audio API
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
        
        console.log('🔊 Using Web Audio fallback for notification sound');
      } catch (e) {
        console.warn('⚠️ Could not play fallback sound');
      }
    };

    audio.addEventListener('canplaythrough', onCanPlay);
    audio.addEventListener('error', onError);

    // Load the audio
    audio.load();

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('canplaythrough', onCanPlay);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
      setIsLoaded(false);
    };
  }, [volume, loop, playbackRate]);

  const play = () => {
    if (!audioRef.current) {
      console.warn('⚠️ Audio not loaded yet');
      return Promise.reject('Audio not loaded');
    }

    try {
      // Reset to beginning if already playing
      audioRef.current.currentTime = 0;
      
      return audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          audioRef.current?.addEventListener('ended', () => {
            setIsPlaying(false);
          }, { once: true });
        })
        .catch((error) => {
          console.warn('⚠️ Could not play notification sound:', error);
          setIsPlaying(false);
          throw error;
        });
    } catch (error) {
      console.warn('⚠️ Could not play notification sound:', error);
      setIsPlaying(false);
      throw error;
    }
  };

  const stop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const setVolume = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
    }
  };

  return { 
    play, 
    stop, 
    isPlaying, 
    isLoaded,
    setVolume 
  };
};