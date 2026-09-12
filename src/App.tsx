import { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  CheckCircle2,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { AudioClip, DichoticResult } from './types';
import { combineDichoticClips, createDemoClips } from './utils/audioUtils';
import { AudioUploader } from './components/AudioUploader';
import { WaveformDisplay } from './components/WaveformDisplay';
import { PlayerControls } from './components/PlayerControls';
import { AttentionTest } from './components/AttentionTest';
import { useAudioPlayer } from './hooks/useAudioPlayer';

export default function App() {
  const [clipA, setClipA] = useState<AudioClip | null>(null);
  const [clipB, setClipB] = useState<AudioClip | null>(null);
  const [dichoticResult, setDichoticResult] = useState<DichoticResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom audio player hook
  const {
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
  } = useAudioPlayer({
    audioBuffer: dichoticResult?.audioBuffer ?? null,
    duration: dichoticResult?.duration ?? 0,
  });

  // Recombine whenever clipA or clipB changes
  useEffect(() => {
    let isCancelled = false;

    async function processDichotic() {
      if (!clipA || !clipB) {
        setDichoticResult(null);
        return;
      }

      setIsProcessing(true);
      setErrorMsg(null);
      try {
        const result = await combineDichoticClips(clipA, clipB);
        if (!isCancelled) {
          setDichoticResult(result);
        }
      } catch (err: unknown) {
        console.error('Error combining dichotic clips:', err);
        if (!isCancelled) {
          setErrorMsg('AUDIO_PROCESSING_ERROR: Failed to resample and interleave streams. Verify file format compatibility.');
        }
      } finally {
        if (!isCancelled) {
          setIsProcessing(false);
        }
      }
    }

    processDichotic();

    return () => {
      isCancelled = true;
    };
  }, [clipA, clipB]);

  // Swap Clip A & Clip B
  const handleSwapClips = useCallback(() => {
    setClipA(clipB);
    setClipB(clipA);
  }, [clipA, clipB]);

  // Load sample test pair
  const handleLoadDemo = useCallback(async () => {
    setIsLoadingDemo(true);
    try {
      const demo = await createDemoClips();
      setClipA(demo.clipA);
      setClipB(demo.clipB);
    } catch (err) {
      console.error('Failed to create demo clips:', err);
    } finally {
      setIsLoadingDemo(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#111113] text-[#F8F7F4] flex flex-col font-sans">
      {/* Header with technical border and typography */}
      <header className="border-b-2 border-[#222] bg-[#111113]">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-2xl font-bold tracking-tight text-[#F8F7F4]">
                DICHOTIC MIXER
              </h1>
              <span className="font-mono text-[10px] text-[#111113] bg-[#FFD700] px-2 py-0.5 font-bold uppercase tracking-wider">
                INTERLEAVE DSP v1.0
              </span>
            </div>
            <p className="font-mono text-xs text-[#888] mt-1">
              TRUE STEREO SEPARATION &bull; ZERO BLEED PER-CHANNEL INTERLEAVING
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={isLoadingDemo}
              className="font-mono text-xs text-[#111113] bg-[#FFD700] hover:bg-white transition-colors px-4 py-2 font-bold disabled:opacity-50 cursor-pointer"
            >
              {isLoadingDemo ? 'SYNTHESIZING...' : 'LOAD TEST SIGNALS'}
            </button>
            <div className="font-mono text-[10px] text-[#666] border border-[#333] px-2.5 py-1.5 hidden sm:block">
              CH: 2 &bull; 16-BIT PCM
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-[1200px] mx-auto px-6 py-8 w-full flex-1 space-y-8">
        {/* Step 1: Input Audio Slots */}
        <section id="step-upload">
          <AudioUploader
            clipA={clipA}
            clipB={clipB}
            onClipAChange={setClipA}
            onClipBChange={setClipB}
            onSwapClips={handleSwapClips}
            onLoadDemoClips={handleLoadDemo}
            isLoadingDemo={isLoadingDemo}
          />
        </section>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="border border-[#FFD700] bg-[#1a1a14] p-6 flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#FFD700] animate-spin" />
            <div className="font-mono text-xs text-[#FFD700]">
              [PROCESSING AUDIO ENGINE]: Resampling to common rate &bull; Zero-padding silence &bull; Interleaving discrete channels...
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMsg && (
          <div className="border border-[#ff4444] bg-[#221111] p-4 font-mono text-xs text-[#ff6666]">
            {errorMsg}
          </div>
        )}

        {/* Combined Results & Waveforms */}
        {dichoticResult && !isProcessing && (
          <div className="space-y-8">
            {/* Waveforms Section */}
            <section id="step-waveforms" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222] pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm uppercase tracking-wider text-[#FFD700] font-bold">
                    [CHANNEL WAVEFORM MONITOR]
                  </span>
                  <span className="font-mono text-xs text-[#666]">
                    // {dichoticResult.targetSampleRate.toLocaleString()} HZ STEREO
                  </span>
                </div>

                <div className="font-mono text-[11px] flex items-center gap-4 text-[#888]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#FFD700] inline-block" /> CH 0: LEFT EAR
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#F8F7F4] inline-block" /> CH 1: RIGHT EAR
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Left Channel Waveform */}
                <WaveformDisplay
                  channelName="CHANNEL 0 (LEFT EAR)"
                  earLabel="CH 0: LEFT"
                  theme="left"
                  peaks={dichoticResult.leftPeaks}
                  clipOriginalDuration={dichoticResult.clipAOriginalDuration}
                  totalDuration={dichoticResult.duration}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onSeek={seek}
                  fileName={dichoticResult.clipAName}
                  isSoloed={playbackMode === 'solo-left'}
                />

                {/* Right Channel Waveform */}
                <WaveformDisplay
                  channelName="CHANNEL 1 (RIGHT EAR)"
                  earLabel="CH 1: RIGHT"
                  theme="right"
                  peaks={dichoticResult.rightPeaks}
                  clipOriginalDuration={dichoticResult.clipBOriginalDuration}
                  totalDuration={dichoticResult.duration}
                  currentTime={currentTime}
                  isPlaying={isPlaying}
                  onSeek={seek}
                  fileName={dichoticResult.clipBName}
                  isSoloed={playbackMode === 'solo-right'}
                />
              </div>
            </section>

            {/* Playback & Export */}
            <section id="step-playback">
              <PlayerControls
                result={dichoticResult}
                isPlaying={isPlaying}
                currentTime={currentTime}
                volume={volume}
                playbackMode={playbackMode}
                onTogglePlayPause={togglePlayPause}
                onRestart={restart}
                onSeek={seek}
                onVolumeChange={setVolume}
                onPlaybackModeChange={setPlaybackMode}
              />
            </section>

            {/* Attention Self-Test Module */}
            <section id="step-attention-test">
              <AttentionTest
                result={dichoticResult}
                playbackMode={playbackMode}
                onSetPlaybackMode={setPlaybackMode}
                onPlay={() => playFrom(currentTime)}
              />
            </section>

            {/* Technical Specifications Grid */}
            <section className="border border-[#222] bg-[#0c0c0e] p-5 space-y-3">
              <div className="flex items-center gap-2 font-mono text-xs text-[#888]">
                <Terminal className="w-4 h-4 text-[#FFD700]" />
                <span className="text-[#FFD700] font-bold">// DSP PIPELINE SPECIFICATIONS</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs pt-1">
                <div className="border border-[#222] p-3 bg-[#111113]">
                  <div className="text-[10px] text-[#666]">COMMON SAMPLE RATE</div>
                  <div className="text-[#FFD700] font-bold mt-1">{dichoticResult.targetSampleRate} Hz</div>
                  <div className="text-[10px] text-[#555] mt-0.5">Sinc polyphase resampled</div>
                </div>

                <div className="border border-[#222] p-3 bg-[#111113]">
                  <div className="text-[10px] text-[#666]">TOTAL DURATION &amp; FRAMES</div>
                  <div className="text-[#FFD700] font-bold mt-1">
                    {dichoticResult.duration.toFixed(2)}s [{dichoticResult.totalFrames.toLocaleString()}]
                  </div>
                  <div className="text-[10px] text-[#555] mt-0.5">Padded to longer input</div>
                </div>

                <div className="border border-[#222] p-3 bg-[#111113]">
                  <div className="text-[10px] text-[#666]">CHANNEL ISOLATION</div>
                  <div className="text-[#FFD700] font-bold mt-1">TRUE DISCRETE 2-CH</div>
                  <div className="text-[10px] text-[#555] mt-0.5">0.0% crosstalk interleave</div>
                </div>

                <div className="border border-[#222] p-3 bg-[#111113]">
                  <div className="text-[10px] text-[#666]">TARGET EXPORT CODEC</div>
                  <div className="text-[#FFD700] font-bold mt-1">16-BIT LPCM WAV</div>
                  <div className="text-[10px] text-[#555] mt-0.5">RIFF header encoded</div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Empty State when no clips uploaded */}
        {!dichoticResult && !isProcessing && (
          <div className="border border-dashed border-[#333] bg-[#0c0c0e] p-12 text-center space-y-4">
            <div className="w-12 h-12 mx-auto border border-[#444] bg-[#141417] flex items-center justify-center text-[#FFD700]">
              <Sliders className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-mono text-sm font-bold text-[#F8F7F4]">
                AWAITING DUAL AUDIO INPUTS
              </h3>
              <p className="font-mono text-xs text-[#777] leading-relaxed">
                Upload both <span className="text-[#FFD700]">Clip A [Left]</span> and{' '}
                <span className="text-[#F8F7F4]">Clip B [Right]</span>, or load the built-in signal pair to synthesize the stereo dichotic track.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="font-mono text-xs text-[#111113] bg-[#FFD700] hover:bg-white transition-colors px-4 py-2 font-bold cursor-pointer"
              >
                LOAD TEST SIGNALS
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-6 font-mono text-[10px] text-[#555] pt-4 border-t border-[#1a1a1e]">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" /> WEB AUDIO API DECODING
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" /> AUTOMATIC RESAMPLING
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" /> ZERO-PAD SILENCE MATCH
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD700]" /> 16-BIT STEREO WAV EXPORT
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222] py-6 text-center font-mono text-xs text-[#666]">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>DICHOTIC MIXER // TECHNICAL INTERFACE</span>
          <span className="text-[#888]">
            RECOMMENDED: HEADPHONES FOR BINAURAL ISOLATION
          </span>
        </div>
      </footer>
    </div>
  );
}
