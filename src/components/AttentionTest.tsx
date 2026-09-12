import React, { useState } from 'react';
import { Ear, Shuffle, RotateCcw, Volume2, CheckCircle, HelpCircle, History, Trash2 } from 'lucide-react';
import { AttendedEar, DichoticResult, PlaybackMode, TestSession } from '../types';

interface AttentionTestProps {
  result: DichoticResult | null;
  playbackMode: PlaybackMode;
  onSetPlaybackMode: (mode: PlaybackMode) => void;
  onPlay: () => void;
}

export const AttentionTest: React.FC<AttentionTestProps> = ({
  result,
  onSetPlaybackMode,
  onPlay,
}) => {
  const [attendedEar, setAttendedEar] = useState<AttendedEar>('left');
  const [userInput, setUserInput] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [testHistory, setTestHistory] = useState<TestSession[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const targetClipName = result
    ? attendedEar === 'left'
      ? result.clipAName
      : result.clipBName
    : attendedEar === 'left'
    ? 'Clip A'
    : 'Clip B';

  const randomizeTarget = () => {
    const randomChoice: AttendedEar = Math.random() > 0.5 ? 'right' : 'left';
    setAttendedEar(randomChoice);
  };

  const handleSaveTrial = () => {
    if (!userInput.trim()) return;
    const session: TestSession = {
      id: `trial-${Date.now()}`,
      timestamp: Date.now(),
      attendedEar,
      targetClipName,
      userNotes: userInput.trim(),
    };
    setTestHistory((prev) => [session, ...prev]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleClearCurrent = () => {
    setUserInput('');
  };

  const handleSoloTargetEar = () => {
    onSetPlaybackMode(attendedEar === 'left' ? 'solo-left' : 'solo-right');
    onPlay();
  };

  return (
    <div
      id="attention-self-test-card"
      className="border border-[#333] bg-[#141417] p-6 space-y-5"
    >
      {/* Header with technical classification */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm uppercase tracking-wider text-[#FFD700] font-bold">
              [EVALUATION MODULE]
            </span>
            <span className="text-sm font-semibold text-[#F8F7F4]">DICHOTIC ATTENTION SELF-TEST</span>
            <button
              type="button"
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-[#666] hover:text-[#FFD700] transition-colors ml-1 cursor-pointer"
              title="Toggle cognitive theory info"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="font-mono text-xs text-[#777] mt-1">
            Auditory selective attention paradigm: isolate target stream while suppressing contralateral signal.
          </p>
        </div>

        <button
          type="button"
          onClick={randomizeTarget}
          className="font-mono text-xs border border-[#444] hover:border-[#FFD700] hover:text-[#FFD700] text-[#F8F7F4] px-3 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer bg-[#111113]"
        >
          <Shuffle className="w-3.5 h-3.5 text-[#FFD700]" />
          RANDOMIZE EAR TARGET
        </button>
      </div>

      {showExplanation && (
        <div className="font-mono text-xs text-[#999] bg-[#0c0c0e] border border-[#27272a] p-3 space-y-1.5 leading-relaxed">
          <div className="text-[#FFD700] font-bold">// DICHOTIC ATTENTION PARADIGM</div>
          <p>
            Dichotic listening simultaneously routes disparate speech or audio signals into the left and right auditory pathways.
            The user attempts to mentally shadow or extract the target stream while suppressing the competing input.
          </p>
        </div>
      )}

      {/* Target Ear Selection Buttons */}
      <div className="space-y-2">
        <label className="font-mono text-xs uppercase tracking-wider text-[#aaa] block">
          TARGET EAR INSTRUCTION:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Left Ear Option */}
          <button
            type="button"
            id="attend-left-toggle-btn"
            onClick={() => setAttendedEar('left')}
            className={`border p-4 text-left transition-colors cursor-pointer flex items-center justify-between ${
              attendedEar === 'left'
                ? 'border-[#FFD700] bg-[#1a1a14]'
                : 'border-[#333] bg-[#111113] hover:border-[#555]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 border ${
                  attendedEar === 'left'
                    ? 'border-[#FFD700] bg-[#FFD700] text-[#111113]'
                    : 'border-[#444] bg-[#18181b] text-[#888]'
                }`}
              >
                <Ear className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`font-mono text-xs font-bold ${
                    attendedEar === 'left' ? 'text-[#FFD700]' : 'text-[#F8F7F4]'
                  }`}
                >
                  TARGET: LEFT EAR [CH 0]
                </div>
                <div className="font-mono text-[11px] text-[#777] truncate max-w-[200px]">
                  {result ? result.clipAName : 'Clip A'}
                </div>
              </div>
            </div>
            {attendedEar === 'left' && (
              <span className="font-mono text-[10px] tracking-wider text-[#FFD700] border border-[#FFD700] px-1.5 py-0.5">
                ACTIVE FOCUS
              </span>
            )}
          </button>

          {/* Right Ear Option */}
          <button
            type="button"
            id="attend-right-toggle-btn"
            onClick={() => setAttendedEar('right')}
            className={`border p-4 text-left transition-colors cursor-pointer flex items-center justify-between ${
              attendedEar === 'right'
                ? 'border-[#FFD700] bg-[#1a1a14]'
                : 'border-[#333] bg-[#111113] hover:border-[#555]'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 border ${
                  attendedEar === 'right'
                    ? 'border-[#FFD700] bg-[#FFD700] text-[#111113]'
                    : 'border-[#444] bg-[#18181b] text-[#888]'
                }`}
              >
                <Ear className="w-4 h-4" />
              </div>
              <div>
                <div
                  className={`font-mono text-xs font-bold ${
                    attendedEar === 'right' ? 'text-[#FFD700]' : 'text-[#F8F7F4]'
                  }`}
                >
                  TARGET: RIGHT EAR [CH 1]
                </div>
                <div className="font-mono text-[11px] text-[#777] truncate max-w-[200px]">
                  {result ? result.clipBName : 'Clip B'}
                </div>
              </div>
            </div>
            {attendedEar === 'right' && (
              <span className="font-mono text-[10px] tracking-wider text-[#FFD700] border border-[#FFD700] px-1.5 py-0.5">
                ACTIVE FOCUS
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Target Status Banner & Solo Auditor */}
      <div className="border border-[#2a2a2e] bg-[#0d0d0f] p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-xs text-[#bbb]">
          ATTENTION FOCUS:{' '}
          <span className="text-[#FFD700] font-bold">
            {attendedEar.toUpperCase()} EAR ({attendedEar === 'left' ? 'CLIP A' : 'CLIP B'})
          </span>
        </div>
        <button
          type="button"
          onClick={handleSoloTargetEar}
          className="font-mono text-xs text-[#FFD700] hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>[SOLO TARGET EAR TO VERIFY AUDITORY RECALL]</span>
        </button>
      </div>

      {/* Self-Test Response Box */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="user-understanding-input" className="font-mono text-xs uppercase tracking-wider text-[#aaa]">
            PERCEPTUAL LOG // USER RECALL TRANSCRIPTION:
          </label>
          <span className="font-mono text-[10px] text-[#666]">[NO AUTOMATED GRADING &bull; SELF-TEST ONLY]</span>
        </div>
        <textarea
          id="user-understanding-input"
          rows={3}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder={`Type whatever words, phrases, or frequency cues you discerned in your ${attendedEar.toUpperCase()} ear while resisting the opposite channel...`}
          className="w-full bg-[#0c0c0e] border border-[#333] focus:border-[#FFD700] text-[#F8F7F4] font-mono text-xs p-3 outline-none transition-colors placeholder:text-[#555] resize-y"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleClearCurrent}
          disabled={!userInput}
          className="font-mono text-xs text-[#777] hover:text-[#bbb] disabled:opacity-30 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" /> [CLEAR TEXT]
        </button>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="font-mono text-xs text-[#FFD700] flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> TRIAL_LOGGED
            </span>
          )}
          <button
            id="record-trial-btn"
            type="button"
            onClick={handleSaveTrial}
            disabled={!userInput.trim()}
            className="font-mono text-xs text-[#111113] bg-[#FFD700] hover:bg-white transition-colors px-4 py-2 font-bold disabled:opacity-30 cursor-pointer"
          >
            RECORD TRIAL ENTRY
          </button>
        </div>
      </div>

      {/* Trial Logs Table */}
      {testHistory.length > 0 && (
        <div className="pt-4 border-t border-[#27272a] space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase text-[#888] flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-[#FFD700]" />
              SESSION HISTORY LOG [{testHistory.length}]
            </span>
            <button
              type="button"
              onClick={() => setTestHistory([])}
              className="font-mono text-[10px] text-[#666] hover:text-[#ff5555] flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> [PURGE LOG]
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {testHistory.map((trial) => (
              <div
                key={trial.id}
                className="border border-[#27272a] bg-[#0c0c0e] p-3 font-mono text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[10px] text-[#666]">
                  <span className="text-[#FFD700] font-bold">
                    [ATTENDED: {trial.attendedEar.toUpperCase()} EAR // {trial.targetClipName}]
                  </span>
                  <span>{new Date(trial.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-[#ddd] whitespace-pre-wrap">{trial.userNotes}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
