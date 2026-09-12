import React, { useRef, useState } from 'react';
import { Upload, Music, ArrowLeftRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { AudioClip } from '../types';
import { decodeAudioFile, formatBytes, formatTime } from '../utils/audioUtils';

interface AudioUploaderProps {
  clipA: AudioClip | null;
  clipB: AudioClip | null;
  onClipAChange: (clip: AudioClip | null) => void;
  onClipBChange: (clip: AudioClip | null) => void;
  onSwapClips: () => void;
  onLoadDemoClips: () => Promise<void>;
  isLoadingDemo: boolean;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  clipA,
  clipB,
  onClipAChange,
  onClipBChange,
  onSwapClips,
}) => {
  const [isDecodingA, setIsDecodingA] = useState(false);
  const [isDecodingB, setIsDecodingB] = useState(false);
  const [errorA, setErrorA] = useState<string | null>(null);
  const [errorB, setErrorB] = useState<string | null>(null);

  const fileInputARef = useRef<HTMLInputElement | null>(null);
  const fileInputBRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (
    file: File,
    _isClipA: boolean,
    setLoading: (l: boolean) => void,
    setError: (err: string | null) => void,
    onSuccess: (clip: AudioClip) => void
  ) => {
    setError(null);
    setLoading(true);
    try {
      const clip = await decodeAudioFile(file);
      onSuccess(clip);
    } catch (err: unknown) {
      console.error(err);
      setError('DECODE_FAILED: Ensure file is valid audio (MP3 or WAV).');
    } finally {
      setLoading(false);
    }
  };

  const setupDropZone = (
    isClipA: boolean,
    setLoading: (l: boolean) => void,
    setError: (err: string | null) => void,
    onSuccess: (clip: AudioClip) => void
  ) => {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
          handleFileChange(file, isClipA, setLoading, setError, onSuccess);
        }
      },
    };
  };

  return (
    <div id="audio-uploader-section" className="space-y-3">
      {/* Subheader and Swap Utility */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-widest text-[#888] uppercase">[INPUT STREAMS]</span>
          <span className="font-mono text-[11px] text-[#555]">// DISCRETE AUDIO SOURCES</span>
        </div>

        {clipA && clipB && (
          <button
            id="swap-clips-button"
            type="button"
            onClick={onSwapClips}
            className="font-mono text-xs text-[#F8F7F4] border border-[#444] px-3 py-1 hover:border-[#FFD700] hover:text-[#FFD700] transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Swap Left [Clip A] and Right [Clip B]"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            SWAP CHANNELS [A ↔ B]
          </button>
        )}
      </div>

      {/* Grid of Two Upload Cards - matching technical interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Clip A / Left Channel Card */}
        <div
          id="left-card"
          {...setupDropZone(true, setIsDecodingA, setErrorA, onClipAChange)}
          className={`relative border p-6 flex flex-col gap-3 transition-colors ${
            clipA ? 'border-[#555] bg-[#141417]' : 'border-[#333] bg-[#111113]'
          }`}
          style={{
            borderLeftWidth: '4px',
            borderLeftColor: clipA ? '#FFD700' : '#555',
          }}
        >
          <input
            ref={fileInputARef}
            type="file"
            accept="audio/mp3,audio/wav,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileChange(file, true, setIsDecodingA, setErrorA, onClipAChange);
              }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#bbb]">
              LEFT CHANNEL [CLIP A]
            </span>
            {clipA && (
              <button
                type="button"
                onClick={() => fileInputARef.current?.click()}
                className="font-mono text-[10px] text-[#888] hover:text-[#FFD700] cursor-pointer"
              >
                [REPLACE]
              </button>
            )}
          </div>

          {isDecodingA ? (
            <div className="h-[150px] border border-[#222] bg-[#0c0c0e] flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-[#888]">&gt;_ DECODING_STREAM_A...</span>
            </div>
          ) : clipA ? (
            <div className="h-[150px] border border-[#26262a] bg-[#0c0c0e] p-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-[#333] bg-[#1a1a1e] text-[#FFD700]">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-[#F8F7F4] font-medium truncate" title={clipA.name}>
                    {clipA.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#777] mt-1 space-y-0.5">
                    <div>DURATION: {formatTime(clipA.duration)}</div>
                    <div>RATE: {clipA.sampleRate.toLocaleString()} Hz &bull; {clipA.channels === 1 ? '1-CH MONO' : `${clipA.channels}-CH STEREO`}</div>
                    <div>SIZE: {formatBytes(clipA.size)}</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#FFD700] shrink-0" />
              </div>

              <div className="font-mono text-[10px] text-[#555] border-t border-[#1f1f23] pt-2 flex justify-between">
                <span>ASSIGNED: CH 0 [LEFT EAR]</span>
                <span className="text-[#FFD700]">READY</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputARef.current?.click()}
              className="h-[150px] border border-[#222] hover:border-[#444] bg-[#0d0d0f] flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <Upload className="w-6 h-6 text-[#444] group-hover:text-[#FFD700] transition-colors mb-2" />
              <span className="font-mono text-xs text-[#888] group-hover:text-[#F8F7F4] transition-colors">
                DRAG AUDIO TO SLOT
              </span>
              <span className="font-mono text-[10px] text-[#444] mt-1">OR CLICK TO BROWSE (MP3 / WAV)</span>
            </div>
          )}

          {errorA && (
            <div className="font-mono text-xs text-[#ff5555] bg-[#221111] border border-[#441111] p-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorA}</span>
            </div>
          )}
        </div>

        {/* Clip B / Right Channel Card */}
        <div
          id="right-card"
          {...setupDropZone(false, setIsDecodingB, setErrorB, onClipBChange)}
          className={`relative border p-6 flex flex-col gap-3 transition-colors ${
            clipB ? 'border-[#555] bg-[#141417]' : 'border-[#333] bg-[#111113]'
          }`}
          style={{
            borderLeftWidth: '4px',
            borderLeftColor: clipB ? '#FFD700' : '#555',
          }}
        >
          <input
            ref={fileInputBRef}
            type="file"
            accept="audio/mp3,audio/wav,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileChange(file, false, setIsDecodingB, setErrorB, onClipBChange);
              }
            }}
          />

          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wider text-[#bbb]">
              RIGHT CHANNEL [CLIP B]
            </span>
            {clipB && (
              <button
                type="button"
                onClick={() => fileInputBRef.current?.click()}
                className="font-mono text-[10px] text-[#888] hover:text-[#FFD700] cursor-pointer"
              >
                [REPLACE]
              </button>
            )}
          </div>

          {isDecodingB ? (
            <div className="h-[150px] border border-[#222] bg-[#0c0c0e] flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs text-[#888]">&gt;_ DECODING_STREAM_B...</span>
            </div>
          ) : clipB ? (
            <div className="h-[150px] border border-[#26262a] bg-[#0c0c0e] p-4 flex flex-col justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 border border-[#333] bg-[#1a1a1e] text-[#FFD700]">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-[#F8F7F4] font-medium truncate" title={clipB.name}>
                    {clipB.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#777] mt-1 space-y-0.5">
                    <div>DURATION: {formatTime(clipB.duration)}</div>
                    <div>RATE: {clipB.sampleRate.toLocaleString()} Hz &bull; {clipB.channels === 1 ? '1-CH MONO' : `${clipB.channels}-CH STEREO`}</div>
                    <div>SIZE: {formatBytes(clipB.size)}</div>
                  </div>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#FFD700] shrink-0" />
              </div>

              <div className="font-mono text-[10px] text-[#555] border-t border-[#1f1f23] pt-2 flex justify-between">
                <span>ASSIGNED: CH 1 [RIGHT EAR]</span>
                <span className="text-[#FFD700]">READY</span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputBRef.current?.click()}
              className="h-[150px] border border-[#222] hover:border-[#444] bg-[#0d0d0f] flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <Upload className="w-6 h-6 text-[#444] group-hover:text-[#FFD700] transition-colors mb-2" />
              <span className="font-mono text-xs text-[#888] group-hover:text-[#F8F7F4] transition-colors">
                DRAG AUDIO TO SLOT
              </span>
              <span className="font-mono text-[10px] text-[#444] mt-1">OR CLICK TO BROWSE (MP3 / WAV)</span>
            </div>
          )}

          {errorB && (
            <div className="font-mono text-xs text-[#ff5555] bg-[#221111] border border-[#441111] p-2 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorB}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
