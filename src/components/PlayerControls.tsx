import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Download,
  Headphones,
} from 'lucide-react';
import { DichoticResult, PlaybackMode } from '../types';
import { formatBytes, formatTime } from '../utils/audioUtils';

interface PlayerControlsProps {
  result: DichoticResult;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  playbackMode: PlaybackMode;
  onTogglePlayPause: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onPlaybackModeChange: (mode: PlaybackMode) => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  result,
  isPlaying,
  currentTime,
  volume,
  playbackMode,
  onTogglePlayPause,
  onRestart,
  onSeek,
  onVolumeChange,
  onPlaybackModeChange,
}) => {
  const downloadFileName = `dichotic_${result.clipAName.replace(/\.[^/.]+$/, '')}_L_${result.clipBName.replace(/\.[^/.]+$/, '')}_R.wav`;

  return (
    <div
      id="player-controls-panel"
      className="border border-[#333] bg-[#141417] p-5 space-y-4"
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: '#FFD700',
      }}
    >
      {/* Headphone Advisory Header */}
      <div className="flex items-center justify-between border-b border-[#222] pb-3 text-xs">
        <div className="flex items-center gap-2 text-[#FFD700] font-mono text-[11px] tracking-wider">
          <Headphones className="w-4 h-4 shrink-0" />
          <span>REQUIREMENT: STEREO HEADPHONES DISCRETE MONITORING</span>
        </div>
        <div className="font-mono text-[10px] text-[#777]">
          [CH 0 &rarr; L_EAR] &bull; [CH 1 &rarr; R_EAR]
        </div>
      </div>

      {/* Main Playback Bar */}
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          id="play-pause-btn"
          type="button"
          onClick={onTogglePlayPause}
          className="border border-[#FFD700] bg-[#FFD700] text-[#111113] hover:bg-white hover:text-[#111113] transition-colors px-4 py-2 font-mono text-xs font-bold tracking-wider flex items-center gap-2 cursor-pointer shadow-xs"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>PLAY_STREAM</span>
            </>
          )}
        </button>

        {/* Restart Button */}
        <button
          id="restart-playback-btn"
          type="button"
          onClick={onRestart}
          className="border border-[#444] bg-[#111113] hover:border-[#FFD700] hover:text-[#FFD700] text-[#F8F7F4] px-3 py-2 font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          title="Restart stream from 00:00"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>

        {/* Time Progress Bar */}
        <div className="flex-1 flex items-center gap-3">
          <span className="font-mono text-xs text-[#FFD700] w-14 text-right">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={result.duration}
            step="0.01"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-[#26262b] appearance-none cursor-pointer accent-[#FFD700]"
          />
          <span className="font-mono text-xs text-[#666] w-14">
            {formatTime(result.duration)}
          </span>
        </div>

        {/* Volume Control */}
        <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#27272a]">
          <button
            type="button"
            onClick={() => onVolumeChange(volume > 0 ? 0 : 1)}
            className="text-[#888] hover:text-[#FFD700] transition-colors cursor-pointer"
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-16 h-1.5 bg-[#26262b] appearance-none cursor-pointer accent-[#FFD700]"
          />
        </div>
      </div>

      {/* Audition Mode Tabs & Download Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#222]">
        {/* Audition Channel Selectors */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[#777] mr-1">
            MONITOR:
          </span>
          <button
            type="button"
            onClick={() => onPlaybackModeChange('stereo')}
            className={`font-mono text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
              playbackMode === 'stereo'
                ? 'border-[#FFD700] bg-[#FFD700] text-[#111113] font-bold'
                : 'border-[#333] bg-[#111113] text-[#888] hover:border-[#555] hover:text-[#F8F7F4]'
            }`}
          >
            [STEREO INTERLEAVE]
          </button>
          <button
            type="button"
            onClick={() => onPlaybackModeChange('solo-left')}
            className={`font-mono text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
              playbackMode === 'solo-left'
                ? 'border-[#FFD700] bg-[#FFD700] text-[#111113] font-bold'
                : 'border-[#333] bg-[#111113] text-[#888] hover:border-[#555] hover:text-[#F8F7F4]'
            }`}
          >
            [SOLO LEFT / A]
          </button>
          <button
            type="button"
            onClick={() => onPlaybackModeChange('solo-right')}
            className={`font-mono text-xs px-2.5 py-1 border transition-colors cursor-pointer ${
              playbackMode === 'solo-right'
                ? 'border-[#FFD700] bg-[#FFD700] text-[#111113] font-bold'
                : 'border-[#333] bg-[#111113] text-[#888] hover:border-[#555] hover:text-[#F8F7F4]'
            }`}
          >
            [SOLO RIGHT / B]
          </button>
        </div>

        {/* Download WAV File */}
        <a
          id="download-wav-btn"
          href={result.wavUrl}
          download={downloadFileName}
          className="font-mono text-xs text-[#111113] bg-[#FFD700] hover:bg-white transition-colors px-3.5 py-1.5 font-bold flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT STEREO .WAV</span>
          <span className="text-[#333] font-normal text-[10px]">
            [{formatBytes(result.wavSizeBytes)}]
          </span>
        </a>
      </div>
    </div>
  );
};
