import { AudioClip, DichoticResult } from '../types';

let sharedAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedAudioCtx = new AudioCtxClass();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Downmix any AudioBuffer into a single mono Float32Array
 */
export function downmixToMono(buffer: AudioBuffer): Float32Array {
  const numChannels = buffer.numberOfChannels;
  const length = buffer.length;
  const mono = new Float32Array(length);

  if (numChannels === 1) {
    mono.set(buffer.getChannelData(0));
    return mono;
  }

  // Average all channels
  for (let c = 0; c < numChannels; c++) {
    const chanData = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      mono[i] += chanData[i] / numChannels;
    }
  }
  return mono;
}

/**
 * Resample a mono Float32Array to targetSampleRate using OfflineAudioContext
 */
export async function resampleMono(
  monoData: Float32Array,
  fromRate: number,
  toRate: number
): Promise<Float32Array> {
  if (fromRate === toRate) {
    return monoData;
  }

  const duration = monoData.length / fromRate;
  const targetLength = Math.max(1, Math.round(duration * toRate));

  // OfflineAudioContext handles native resampling
  const offlineCtx = new OfflineAudioContext(1, targetLength, toRate);
  const sourceBuffer = offlineCtx.createBuffer(1, monoData.length, fromRate);
  sourceBuffer.copyToChannel(monoData, 0);

  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = sourceBuffer;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer.getChannelData(0);
}

/**
 * Extract normalized waveform peaks (e.g. 300-600 points) for rendering
 */
export function extractPeaks(data: Float32Array, numPeaks = 400): number[] {
  const peaks: number[] = new Array(numPeaks).fill(0);
  if (data.length === 0) return peaks;

  const step = data.length / numPeaks;
  for (let i = 0; i < numPeaks; i++) {
    const start = Math.floor(i * step);
    const end = Math.floor((i + 1) * step);
    let max = 0;
    for (let j = start; j < end && j < data.length; j++) {
      const val = Math.abs(data[j]);
      if (val > max) max = val;
    }
    peaks[i] = Math.min(1, max);
  }
  return peaks;
}

/**
 * Decode an uploaded file (MP3 or WAV) into AudioClip
 */
export async function decodeAudioFile(file: File): Promise<AudioClip> {
  const ctx = getAudioContext();
  const arrayBuffer = await file.arrayBuffer();
  // decodeAudioData detaches the arrayBuffer, so we pass a slice or original
  const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  const monoData = downmixToMono(decodedBuffer);
  const peaks = extractPeaks(monoData, 500);

  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    size: file.size,
    duration: decodedBuffer.duration,
    sampleRate: decodedBuffer.sampleRate,
    channels: decodedBuffer.numberOfChannels,
    data: monoData,
    peaks,
  };
}

/**
 * Combine two clips into a true dichotic stereo track:
 * - Left channel: Clip A only (padded with silence if shorter)
 * - Right channel: Clip B only (padded with silence if shorter)
 * - Resampled to a common sample rate
 */
export async function combineDichoticClips(
  clipA: AudioClip,
  clipB: AudioClip
): Promise<DichoticResult> {
  const ctx = getAudioContext();
  // Target sample rate: choose max or common standard
  const targetSampleRate = Math.max(clipA.sampleRate, clipB.sampleRate);

  // Resample both clips if their sample rates differ from target
  const [dataA, dataB] = await Promise.all([
    resampleMono(clipA.data, clipA.sampleRate, targetSampleRate),
    resampleMono(clipB.data, clipB.sampleRate, targetSampleRate),
  ]);

  const maxDuration = Math.max(clipA.duration, clipB.duration);
  const totalFrames = Math.max(1, Math.round(maxDuration * targetSampleRate));

  // Allocate Left & Right channel Float32Arrays with silence (zeros)
  const leftChannel = new Float32Array(totalFrames);
  const rightChannel = new Float32Array(totalFrames);

  // Copy clip A into Left channel
  leftChannel.set(dataA.subarray(0, Math.min(dataA.length, totalFrames)));

  // Copy clip B into Right channel
  rightChannel.set(dataB.subarray(0, Math.min(dataB.length, totalFrames)));

  // Build true stereo AudioBuffer for in-browser playback
  const audioBuffer = ctx.createBuffer(2, totalFrames, targetSampleRate);
  audioBuffer.copyToChannel(leftChannel, 0);
  audioBuffer.copyToChannel(rightChannel, 1);

  // Extract waveforms for preview
  const leftPeaks = extractPeaks(leftChannel, 500);
  const rightPeaks = extractPeaks(rightChannel, 500);

  // Encode true stereo WAV file (interleaved L, R, L, R)
  const wavBlob = encodeStereoWav(leftChannel, rightChannel, targetSampleRate);
  const wavUrl = URL.createObjectURL(wavBlob);

  return {
    targetSampleRate,
    duration: maxDuration,
    totalFrames,
    leftChannel,
    rightChannel,
    leftPeaks,
    rightPeaks,
    clipAOriginalDuration: clipA.duration,
    clipBOriginalDuration: clipB.duration,
    clipAName: clipA.name,
    clipBName: clipB.name,
    audioBuffer,
    wavBlob,
    wavUrl,
    wavSizeBytes: wavBlob.size,
  };
}

/**
 * Encode two Float32Array channels into 16-bit PCM stereo WAV Blob
 * Channel 0 (Left) and Channel 1 (Right) are strictly interleaved.
 */
export function encodeStereoWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 2;
  const numFrames = Math.min(left.length, right.length);
  const bytesPerSample = 2; // 16-bit PCM
  const blockAlign = numChannels * bytesPerSample; // 4
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const bufferLength = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF identifier 'RIFF'
  writeString(view, 0, 'RIFF');
  // RIFF chunk length = file size - 8
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type 'WAVE'
  writeString(view, 8, 'WAVE');

  // Format chunk identifier 'fmt '
  writeString(view, 12, 'fmt ');
  // Format chunk length = 16
  view.setUint32(16, 16, true);
  // Audio format 1 = PCM
  view.setUint16(20, 1, true);
  // Channel count: 2 (Stereo)
  view.setUint16(22, numChannels, true);
  // Sample rate
  view.setUint32(24, sampleRate, true);
  // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  view.setUint32(28, byteRate, true);
  // Block align (NumChannels * BitsPerSample/8)
  view.setUint16(32, blockAlign, true);
  // Bits per sample: 16
  view.setUint16(34, 16, true);

  // Data chunk identifier 'data'
  writeString(view, 36, 'data');
  // Data chunk length
  view.setUint32(40, dataSize, true);

  // Write interleaved 16-bit PCM samples [L0, R0, L1, R1, ...]
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    // Left channel
    let sampleL = left[i];
    sampleL = Math.max(-1, Math.min(1, sampleL));
    const int16L = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff;
    view.setInt16(offset, int16L, true);
    offset += 2;

    // Right channel
    let sampleR = right[i];
    sampleR = Math.max(-1, Math.min(1, sampleR));
    const int16R = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff;
    view.setInt16(offset, int16R, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Generates two high quality synthetic demo clips (WAV) with distinct acoustic content
 * Clip A: Speech-cadence tonal pulses (vowel formants + numbers rhythm)
 * Clip B: Harmonic marimba / chime melody (arpeggio sequence)
 * This allows instant 1-click testing even without uploading personal files.
 */
export async function createDemoClips(): Promise<{ clipA: AudioClip; clipB: AudioClip }> {
  const sampleRate = 44100;
  
  // Clip A: 5.5 seconds of rhythmic voice-like formant bursts (A ear)
  const durationA = 5.5;
  const framesA = Math.round(durationA * sampleRate);
  const dataA = new Float32Array(framesA);

  // Generate 5 distinct spoken-rhythm pulses with formant overtones (simulating numbers: "one, two, three, four, five")
  const words = [
    { start: 0.3, dur: 0.6, pitch: 160 },
    { start: 1.3, dur: 0.65, pitch: 175 },
    { start: 2.3, dur: 0.7, pitch: 150 },
    { start: 3.4, dur: 0.6, pitch: 190 },
    { start: 4.3, dur: 0.75, pitch: 140 },
  ];

  for (const word of words) {
    const startIdx = Math.floor(word.start * sampleRate);
    const endIdx = Math.min(framesA, Math.floor((word.start + word.dur) * sampleRate));
    for (let i = startIdx; i < endIdx; i++) {
      const t = (i - startIdx) / sampleRate;
      const progress = t / word.dur;
      // Envelope
      const env = Math.sin(progress * Math.PI) * Math.min(1, (1 - progress) * 2);
      // Fundamental + formants (200Hz, 700Hz, 1200Hz, 2400Hz)
      const f0 = word.pitch;
      const s = 
        Math.sin(2 * Math.PI * f0 * t) * 0.4 +
        Math.sin(2 * Math.PI * (f0 * 3) * t) * 0.25 +
        Math.sin(2 * Math.PI * (f0 * 5) * t) * 0.15 +
        Math.sin(2 * Math.PI * 1200 * t) * 0.1;
      dataA[i] = s * env * 0.7;
    }
  }

  // Clip B: 7.2 seconds of clear harmonic marimba / bell arpeggio notes (B ear)
  // Intentionally different duration (7.2s vs 5.5s) to demonstrate padding!
  const durationB = 7.2;
  const framesB = Math.round(durationB * sampleRate);
  const dataB = new Float32Array(framesB);

  const notes = [
    { start: 0.4, pitch: 440 }, // A4
    { start: 1.0, pitch: 554.37 }, // C#5
    { start: 1.6, pitch: 659.25 }, // E5
    { start: 2.2, pitch: 880 }, // A5
    { start: 2.8, pitch: 659.25 },
    { start: 3.4, pitch: 554.37 },
    { start: 4.0, pitch: 493.88 }, // B4
    { start: 4.8, pitch: 587.33 }, // D5
    { start: 5.6, pitch: 739.99 }, // F#5
    { start: 6.2, pitch: 880 }, // A5
  ];

  for (const note of notes) {
    const startIdx = Math.floor(note.start * sampleRate);
    const endIdx = Math.min(framesB, Math.floor((note.start + 0.9) * sampleRate));
    for (let i = startIdx; i < endIdx; i++) {
      const t = (i - startIdx) / sampleRate;
      // Exponential decay
      const env = Math.exp(-t * 4.5);
      // Bell harmonics
      const s = 
        Math.sin(2 * Math.PI * note.pitch * t) * 0.5 +
        Math.sin(2 * Math.PI * (note.pitch * 2.76) * t) * 0.25 +
        Math.sin(2 * Math.PI * (note.pitch * 5.4) * t) * 0.1;
      dataB[i] += s * env * 0.6;
    }
  }

  const clipA: AudioClip = {
    id: `sample-a-${Date.now()}`,
    name: 'Sample_A_SpeechCadence_Numbers.wav',
    size: framesA * 2,
    duration: durationA,
    sampleRate,
    channels: 1,
    data: dataA,
    peaks: extractPeaks(dataA, 500),
  };

  const clipB: AudioClip = {
    id: `sample-b-${Date.now()}`,
    name: 'Sample_B_HarmonicChimes_Melody.wav',
    size: framesB * 2,
    duration: durationB,
    sampleRate,
    channels: 1,
    data: dataB,
    peaks: extractPeaks(dataB, 500),
  };

  return { clipA, clipB };
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 10);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
