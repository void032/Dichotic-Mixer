import React, { useRef, useEffect, useState, useCallback } from 'react';
import { formatTime } from '../utils/audioUtils';

interface WaveformDisplayProps {
  channelName: string;
  earLabel: string;
  theme: 'left' | 'right';
  peaks: number[];
  clipOriginalDuration: number;
  totalDuration: number;
  currentTime: number;
  isPlaying: boolean;
  onSeek: (time: number) => void;
  fileName: string;
  isSoloed?: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  channelName,
  earLabel,
  theme,
  peaks,
  clipOriginalDuration,
  totalDuration,
  currentTime,
  onSeek,
  fileName,
  isSoloed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const isDraggingRef = useRef(false);

  const isPadded = clipOriginalDuration < totalDuration - 0.05;
  const paddingStartTime = clipOriginalDuration;

  // Render waveform on canvas matching technical aesthetic
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerY = height / 2;
    const numBars = peaks.length;
    if (numBars === 0) return;

    const barWidth = Math.max(1.5, width / numBars);
    const gap = 1;
    const effBarWidth = Math.max(1, barWidth - gap);

    // Compute padding boundary in canvas pixels
    const padRatio = Math.min(1, clipOriginalDuration / (totalDuration || 1));
    const padBoundaryX = padRatio * width;

    // Background for padded silence zone
    if (isPadded && padBoundaryX < width) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(padBoundaryX, 0, width - padBoundaryX, height);

      // Dashed boundary line
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(padBoundaryX, 0);
      ctx.lineTo(padBoundaryX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Playback progress ratio
    const progressRatio = Math.min(1, Math.max(0, currentTime / (totalDuration || 1)));
    const progressX = progressRatio * width;

    // Technical grid/center baseline
    ctx.strokeStyle = '#222226';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Color definitions
    // Theme Left: Gold/Amber accent (#FFD700)
    // Theme Right: Bright White/Ice (#F8F7F4)
    const activeColor = theme === 'left' ? '#FFD700' : '#F8F7F4';
    const inactiveColor = theme === 'left' ? 'rgba(255, 215, 0, 0.35)' : 'rgba(248, 247, 244, 0.35)';
    const silenceColor = '#2a2a2e';

    // Draw bars
    for (let i = 0; i < numBars; i++) {
      const x = i * barWidth;
      const peak = peaks[i];
      const barHeight = Math.max(1.5, peak * (height * 0.42));

      const isPlayed = x <= progressX;
      const isPastOriginalAudio = x > padBoundaryX;

      if (isPastOriginalAudio) {
        ctx.fillStyle = silenceColor;
      } else if (isPlayed) {
        ctx.fillStyle = activeColor;
      } else {
        ctx.fillStyle = inactiveColor;
      }

      const topY = centerY - barHeight;
      const fullHeight = barHeight * 2;

      ctx.fillRect(x, topY, effBarWidth, fullHeight);
    }

    // Draw Playhead cursor
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(progressX, 0);
    ctx.lineTo(progressX, height);
    ctx.stroke();

    // Small square head cap on cursor
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(progressX - 3, 2, 6, 6);
  }, [peaks, theme, clipOriginalDuration, totalDuration, currentTime, isPadded]);

  // Handle ResizeObserver for canvas resolution
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = 96 * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      drawWaveform();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => ro.disconnect();
  }, [drawWaveform]);

  useEffect(() => {
    drawWaveform();
  }, [currentTime, peaks, drawWaveform]);

  // Seek handler from client coordinates
  const handleSeekFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetTime = ratio * totalDuration;
    onSeek(targetTime);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    handleSeekFromEvent(e);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (isDraggingRef.current) {
        handleSeekFromEvent(moveEvent);
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setHoverX(x);
    setHoverTime((x / rect.width) * totalDuration);
  };

  return (
    <div
      id={`waveform-card-${theme}`}
      className="border border-[#27272a] bg-[#141417] p-4 flex flex-col gap-2"
    >
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[10px] tracking-wider px-2 py-0.5 border ${
              theme === 'left'
                ? 'border-[#FFD700] text-[#FFD700] bg-[#FFD700]/10'
                : 'border-[#888] text-[#F8F7F4] bg-[#222]'
            }`}
          >
            {earLabel}
          </span>
          <span className="font-mono text-xs text-[#F8F7F4] truncate max-w-xs md:max-w-md" title={fileName}>
            {channelName}: <span className="text-[#888]">{fileName}</span>
          </span>
          {isSoloed && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 border border-[#FFD700] bg-[#FFD700] text-[#111113] font-bold">
              SOLO ACTIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-[#777]">
          <span>SRC: {formatTime(clipOriginalDuration)}</span>
          {isPadded && (
            <span
              className="text-[#FFD700] border border-[#333] px-1.5 py-0.2 bg-[#1b1b1e]"
              title={`Padded with ${(totalDuration - clipOriginalDuration).toFixed(2)}s silence`}
            >
              +{(totalDuration - clipOriginalDuration).toFixed(1)}s ZERO_PAD
            </span>
          )}
        </div>
      </div>

      {/* Interactive Waveform Canvas Container */}
      <div
        ref={containerRef}
        id={`waveform-canvas-container-${theme}`}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsHovering(false);
          setHoverTime(null);
        }}
        onMouseMove={handleMouseMove}
        className="relative w-full h-24 bg-[#0c0c0e] border border-[#222226] overflow-hidden cursor-crosshair select-none"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Hover marker & tooltip */}
        {isHovering && hoverTime !== null && (
          <>
            <div
              className="absolute top-0 bottom-0 w-px bg-[#FFD700] pointer-events-none"
              style={{ left: `${hoverX}px` }}
            />
            <div
              className="absolute top-1 transform -translate-x-1/2 pointer-events-none bg-[#FFD700] text-[#111113] font-mono text-[9px] px-1.5 py-0.5 font-bold z-10"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          </>
        )}

        {/* Padded Silence Tag */}
        {isPadded && (
          <div className="absolute right-2 bottom-1.5 font-mono text-[9px] tracking-wider text-[#666] bg-[#111113]/90 px-1.5 py-0.5 border border-[#27272a] pointer-events-none">
            PAD SILENCE @ {formatTime(paddingStartTime)}
          </div>
        )}
      </div>

      {/* Time ticks indicator bar */}
      <div className="flex justify-between items-center font-mono text-[10px] text-[#555]">
        <span>00:00.0</span>
        <span>MID: {formatTime(totalDuration / 2)}</span>
        <span>END: {formatTime(totalDuration)}</span>
      </div>
    </div>
  );
};
