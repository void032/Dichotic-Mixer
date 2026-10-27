# Dichotic Mixer

Dichotic Mixer is a browser-based audio tool for creating a true stereo dichotic listening track from two separate audio clips. It keeps each input isolated to its own ear channel, displays the waveform for each side, and lets you preview or export the final stereo WAV.

This project is designed for headphone-based listening tests, attention checks, and controlled left/right audio comparisons.

## Features

- Upload two separate audio files
- Combine them into a true stereo track with:
  - Channel 0 = left ear input
  - Channel 1 = right ear input
- Automatically resample inputs to a common sample rate
- Match clip duration by padding the shorter channel with silence
- Display per-channel waveform previews
- Play in stereo, left-only, or right-only modes
- Export the final mixed result as a 16-bit PCM WAV
- Includes a built-in test signal generator for instant demo playback
- Includes an attention/self-test workflow for listening validation

## Why this exists

Dichotic listening is commonly used in experimental and educational contexts where listeners are asked to attend to one ear while the other carries a different signal. This app makes that workflow quick and repeatable in the browser without needing external audio tooling.

## How it works

1. Load or upload two audio clips.
2. The app decodes them with the Web Audio API.
3. Each clip is downmixed to mono and resampled to a shared sample rate.
4. The final stereo file is created by placing Clip A on the left channel and Clip B on the right channel.
5. You can preview the result, switch playback modes, and export the generated stereo WAV.

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```bash
npm install
```

### Run locally

```bash
npm run dev
```

The app runs on port 3000 by default.

### Production build

```bash
npm run build
```

### Type checking

```bash
npm run lint
```

## Project structure

```text
.
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── src/
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   ├── components/
│   ├── hooks/
│   └── utils/
└── metadata.json
```

## Tech stack

- React
- TypeScript
- Vite
- Web Audio API
- Tailwind CSS

## Notes

- Best results are achieved with headphones.
- This tool is intended for controlled listening and audio experimentation.
- The final export is a stereo WAV in standard 16-bit PCM format.

## License

This project does not currently include a license file. If you plan to distribute or publish it, consider adding an open-source license such as MIT.
