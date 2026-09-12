import { useEffect, useRef, useState, useCallback } from 'react';
import { getAudioContext } from '../utils/audioUtils';
import { PlaybackMode } from '../types';

interface UseAudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  duration: number;
}

export function useAudioPlayer({ audioBuffer, duration }: UseAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('stereo');

  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startAudioTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Routing nodes
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const leftGainRef = useRef<GainNode | null>(null);
  const rightGainRef = useRef<GainNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  // Stop playback cleanly
  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.onended = null;
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // already stopped
      }
      sourceNodeRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  // Update gains according to playback mode and volume
  const updateGains = useCallback(() => {
    if (!leftGainRef.current || !rightGainRef.current || !masterGainRef.current) return;
    masterGainRef.current.gain.value = volume;

    if (playbackMode === 'stereo') {
      leftGainRef.current.gain.value = 1;
      rightGainRef.current.gain.value = 1;
    } else if (playbackMode === 'solo-left') {
      leftGainRef.current.gain.value = 1;
      rightGainRef.current.gain.value = 0;
    } else if (playbackMode === 'solo-right') {
      leftGainRef.current.gain.value = 0;
      rightGainRef.current.gain.value = 1;
    }
  }, [playbackMode, volume]);

  useEffect(() => {
    updateGains();
  }, [updateGains]);

  // Start playback from given offset
  const playFrom = useCallback(
    (offsetSec: number) => {
      if (!audioBuffer) return;
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      stopPlayback();

      // Clamp offset
      const safeOffset = Math.max(0, Math.min(offsetSec, duration));
      if (safeOffset >= duration) {
        setCurrentTime(0);
        return;
      }

      // Build chain if not exists
      if (!masterGainRef.current) {
        masterGainRef.current = ctx.createGain();
        masterGainRef.current.connect(ctx.destination);
      }

      splitterRef.current = ctx.createChannelSplitter(2);
      leftGainRef.current = ctx.createGain();
      rightGainRef.current = ctx.createGain();
      mergerRef.current = ctx.createChannelMerger(2);

      // Connect L/R splits to independent gains
      splitterRef.current.connect(leftGainRef.current, 0);
      splitterRef.current.connect(rightGainRef.current, 1);

      // Connect L/R gains to stereo merger inputs
      leftGainRef.current.connect(mergerRef.current, 0, 0);
      rightGainRef.current.connect(mergerRef.current, 0, 1);

      // Merger to master volume
      mergerRef.current.connect(masterGainRef.current);

      updateGains();

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(splitterRef.current);

      startAudioTimeRef.current = ctx.currentTime;
      startOffsetRef.current = safeOffset;
      setCurrentTime(safeOffset);

      source.onended = () => {
        setIsPlaying(false);
        if (animFrameRef.current !== null) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        // If reached end, wrap to 0
        setCurrentTime((prev) => (prev >= duration - 0.1 ? 0 : prev));
      };

      source.start(0, safeOffset);
      sourceNodeRef.current = source;
      setIsPlaying(true);

      const trackProgress = () => {
        if (!sourceNodeRef.current) return;
        const elapsed = ctx.currentTime - startAudioTimeRef.current;
        const pos = Math.min(duration, startOffsetRef.current + elapsed);
        setCurrentTime(pos);
        if (pos < duration) {
          animFrameRef.current = requestAnimationFrame(trackProgress);
        }
      };

      animFrameRef.current = requestAnimationFrame(trackProgress);
    },
    [audioBuffer, duration, stopPlayback, updateGains]
  );

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      // Pause
      stopPlayback();
    } else {
      // Play
      playFrom(currentTime >= duration - 0.05 ? 0 : currentTime);
    }
  }, [isPlaying, stopPlayback, playFrom, currentTime, duration]);

  const seek = useCallback(
    (timeSec: number) => {
      const clamped = Math.max(0, Math.min(timeSec, duration));
      setCurrentTime(clamped);
      if (isPlaying) {
        playFrom(clamped);
      }
    },
    [duration, isPlaying, playFrom]
  );

  const restart = useCallback(() => {
    seek(0);
    playFrom(0);
  }, [seek, playFrom]);

  // Clean up on unmount or audioBuffer change
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [audioBuffer, stopPlayback]);

  return {
    isPlaying,
    currentTime,
    volume,
    setVolume,
    playbackMode,
    setPlaybackMode,
    togglePlayPause,
    seek,
    restart,
    playFrom,
    stopPlayback,
  };
}
