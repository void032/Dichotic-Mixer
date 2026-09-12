export interface AudioClip {
  id: string;
  name: string;
  size: number;
  duration: number;
  sampleRate: number;
  channels: number;
  data: Float32Array; // Mono downmixed PCM samples
  peaks: number[]; // Normalized waveform peak amplitudes for rendering
}

export interface DichoticResult {
  targetSampleRate: number;
  duration: number;
  totalFrames: number;
  leftChannel: Float32Array;
  rightChannel: Float32Array;
  leftPeaks: number[];
  rightPeaks: number[];
  clipAOriginalDuration: number;
  clipBOriginalDuration: number;
  clipAName: string;
  clipBName: string;
  audioBuffer: AudioBuffer;
  wavBlob: Blob;
  wavUrl: string;
  wavSizeBytes: number;
}

export type PlaybackMode = 'stereo' | 'solo-left' | 'solo-right';

export type AttendedEar = 'left' | 'right';

export interface TestSession {
  id: string;
  timestamp: number;
  attendedEar: AttendedEar;
  targetClipName: string;
  userNotes: string;
}
