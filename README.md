# Video Asset Maker

A browser-based toolkit for making YouTube video assets: thumbnails, channel art, animated overlays, title cards and end screens. Everything renders on a `<canvas>` in the browser. Nothing is uploaded.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## What's inside

Every generator exports at **1080p, 2K or 4K**. Formats are 16:9, 9:16 (Shorts), 1:1 and 4:5, depending on the asset.

| Generator | Category | Formats · output |
| --- | --- | --- |
| YouTube Thumbnail | Thumbnails | 16:9 · PNG or JPG |
| VS Comparison (diagonal / straight / lightning split) | Thumbnails | 16:9 · PNG or JPG |
| Channel Banner (with safe-area guides) | Channel | 16:9 · PNG or JPG. Defaults to 2K, which is YouTube's 2560×1440 |
| Channel Avatar (also works as a watermark) | Channel | 1:1 · PNG or JPG |
| Webcam Frame (glowing facecam border + name tag) | Channel | 16:9, 1:1, 9:16 · transparent video or PNG |
| Intro Title Card (rise / typewriter / punch / split / glitch) | Titles | 16:9, 9:16, 1:1 · video |
| Kinetic Text (slam / slide / stack / flip, `*highlight*` words) | Titles | 9:16, 16:9, 1:1 · video |
| Audiogram (reacts to your uploaded audio) | Titles | 1:1, 9:16, 16:9 · video **with sound** |
| Top-N Ranking (full card or corner badge) | Titles | video |
| Poll Results (racing percentage bars) | Titles | video |
| Chapter Title (full screen or band over footage) | Titles | video |
| Countdown Timer (ring / digits / clock + bar) | Titles | video |
| Stream Screen (starting soon / BRB, seamless loop) | Titles | 16:9 · video |
| Quote Card | Titles | 16:9, 9:16, 1:1, 4:5 · PNG or JPG |
| Quiz / Trivia (four answers, countdown ring, correct-answer reveal) | Titles | 9:16, 16:9, 1:1 · video |
| Chat Story (text-message bubbles with typing indicator) | Titles | 9:16, 1:1, 16:9 · video, full screen or floating card |
| Before / After (animated slider divider over two images) | Titles | 16:9, 9:16, 1:1 · video |
| Animated Bar Chart (`Label: value` data, count-up, spotlight bar) | Titles | video |
| Stat Reveal (big count-up number with trend chip) | Titles | video |
| Code Window (editor or terminal typing highlighted code) | Titles | video |
| Review Score (score ring, category bars, verdict) | Titles | video |
| Animated Captions (pop / karaoke / boxed word) | Overlays | transparent video · Shorts first |
| Comment Highlight (“Replying to …” card) | Overlays | transparent video · Shorts first |
| Lower Third (4 styles) | Overlays | transparent video |
| Subscribe Button (click + bell animation) | Overlays | transparent video |
| Sponsor Callout (brand, offer, promo code, link + “link below” arrow) | Overlays | transparent video |
| Social Handles | Overlays | transparent video |
| Camcorder REC Overlay (timecode, battery, letterbox, VHS) | Overlays | transparent video |
| News Ticker (“Breaking news” band + crawl) | Overlays | transparent video |
| Subscriber Goal (count-up bar or ring) | Overlays | transparent video |
| Emoji Reactions (rising stream or repeating bursts) | Overlays | transparent video |
| Travel Route (draggable start/end, plane/car/train) | Overlays | transparent video |
| Comic Text Pop (burst / speech / thought) | Overlays | transparent video |
| Transition Wipe (panels / stripes / circle / shutter + logo sting) | Overlays | transparent video |
| Checklist (checkboxes or numbered steps) | Overlays | transparent video |
| Info Tag (location, price, date, time… with icons) | Overlays | transparent video |
| Callout Annotation | Overlays | transparent video |
| Chapter Progress Bar | Overlays | transparent video |
| End Screen (matches YouTube element layout) | End Screens | 16:9 · video |
| Credits Roll (headings, role — name pairs, closing line) | End Screens | video |

**Home page:** search across names, descriptions, tags, sizes and capabilities (try "animated", "transparent", "shorts", "audio"). Press `/` to focus search. You can also filter by category, or star a generator to add it to **Favourites**. Animated cards play when you hover them.

**Editor:**
- Live preview with a timeline. Press `Space` to play or pause.
- **Output:** pick the format and the resolution: 1080p, 2K (×4/3) or 4K (×2). For still images, choose PNG or JPG too. The preview always renders at 1080p so it plays smoothly; exports render at full size. Thumbnails, channel art and avatars warn you if the file goes over YouTube's upload limit.
- **Styles:** one-click looks, each previewed with your own text and images. Presets change colours, fonts and patterns and leave your text alone.
- **Undo and redo:** the toolbar buttons, or `Ctrl+Z` and `Ctrl+Shift+Z` / `Ctrl+Y`. A slider drag or canvas drag counts as one step, and so does Reset.
- **Drag to position:** on generators with a handle (callout target, comic pop, caption height), drag on the preview.
- **Preview backdrops:** transparent assets can be previewed on a checkerboard, a dark or light background, a sample scene, or your own screenshot. The backdrop is never exported.
- **Everything is remembered:** settings are saved per generator in `localStorage`, and uploaded images and audio are saved in IndexedDB so they survive a reload.
- **Share link:** the link button copies a URL that stores the design's settings (images and audio stay on your machine). Opening it loads that design.
- **Copy image:** the copy button puts the current frame on the clipboard as a PNG.
- **Audio:** the Audiogram decodes and analyses your file in the browser. A 48-band spectrum is precomputed, so export stays frame-accurate. You can pick the start point and clip length. The preview plays the sound in sync (use the speaker button to mute), and exports include it.
- Guides and placeholders only appear in the preview and are never exported.

**Export:**
- **PNG / JPG** is the current frame at the chosen resolution. JPG is roughly 10× smaller, which helps with YouTube's 2 MB thumbnail limit at 2K and 4K.
- **WebM** is VP9. When the asset has a transparent background, the WebM keeps a real alpha channel.
- **MP4** is H.264 with no transparency. Overlays can switch to a green or blue screen background for keying.
- **Sound:** generators with a soundtrack export it as Opus in WebM and as AAC in MP4, at 48 kHz stereo.

Video is rendered frame by frame and encoded with WebCodecs (via [mediabunny](https://mediabunny.dev)). It never drops frames, runs faster than real time and keeps working in a background tab. The encoder only loads when you open the export dialog. It needs a browser with WebCodecs: current Chrome, Edge, Firefox or Safari.

## Project layout

```
src/
  generators/        one module per generator, grouped by category
    thumbnails/  channel/  titles/  overlays/  endScreens/
    types.ts         Generator / Control / Params contracts, plus opts(), onlyIf(), stylePresets()
    index.ts         the registry: add new generators here
  lib/
    draw.ts          canvas helpers: easing, setStyle, shapes, text fitting, backgrounds, patterns
    overlay.ts       shared "transparent / green screen" background control
    export.ts        PNG + video export (renderFrame is the single render path)
    fonts.ts         preloads web fonts so canvas text renders correctly
    storage.ts       per-generator settings persistence (params in localStorage)
    imageStore.ts    uploaded images in IndexedDB
    history.ts       undo/redo with gesture merging
    audio.ts         audio decoding, FFT spectrum analysis, preview playback, export segments
    icons.ts         canvas-drawn glyphs (pin, price, calendar…)
    thumb.ts         downscaled previews for home cards and style presets
    sizes.ts         formats (16:9, 9:16, 1:1, 4:5) and resolution tiers (1080p / 2K / 4K)
    useStoredState.ts   useState that persists to localStorage / sessionStorage
  components/        controls panel and fields, style presets, card previews, export dialog, icons
  pages/
    Home.tsx         search, category chips, favourites
    editor/          GeneratorPage plus its toolbar, stage, timeline and hooks
  styles/            base, home, editor, panel and dialog stylesheets
```

## Adding a generator

A generator is a plain object. The UI, preview, timeline, persistence and export all come from this definition:

```ts
// src/generators/titles/myCard.ts
import type { Generator } from '../types';
import { backgroundControls, drawBackground, font, setStyle } from '../../lib/draw';
import { LANDSCAPE, VERTICAL } from '../../lib/sizes';

export const myCard: Generator = {
  id: 'my-card',                      // URL: #/g/my-card
  name: 'My Card',
  description: 'Shown on the home card and at the top of the settings panel.',
  category: 'Titles',
  tags: ['keywords', 'for', 'search'],
  sizes: [LANDSCAPE, VERTICAL],       // from lib/sizes — defined at 1080p, exported up to 4K
  animation: { duration: 4 },         // omit for a still image
  controls: [
    { type: 'text', key: 'title', label: 'Title', group: 'Text', default: 'Hello' },
    ...backgroundControls({ c1: '#111', c2: '#333' }),
  ],
  render(ctx, p, t, { width, height, preview }) {
    drawBackground(ctx, p, width, height, t);
    // setStyle assigns several drawing-state properties at once; globalAlpha fades in over the first second.
    setStyle(ctx, { font: font('Anton', 120), fillStyle: '#fff', globalAlpha: Math.min(1, t) });
    ctx.fillText(p.title as string, 100, height / 2);
  },
};
```

Then add it to `GENERATORS` in `src/generators/index.ts`.

Optional extras:
- Select options can be written as `options: opts({ value: 'Label', ... })`, and `onlyIf(controls, (p) => …)` shows a set of controls conditionally.
- `presets: stylePresets(base, { Name: overrides, ... })` adds one-click looks. Each preset is `base` plus its overrides, so switching presets never leaves part of the previous look behind.
- `handles: [{ x: 'posX', y: 'posY' }]` makes number controls holding percentages (0–100) draggable on the preview.
- `cardCrop: [x, y, w, h]` zooms the home-page card into part of the frame, for small overlays.
- `transparent: true` (or a function of the params) marks the asset as exportable with alpha.
- `defaultResolution: '2k'` picks the starting tier. `uploadLimit: { bytes, note }` warns when an export is too large for the platform.
- `{ type: 'audio' }` controls plus `soundtrack: (p) => ({ clip, offset })` give a generator sound. The preview plays it and exports include it. Use `sampleSpectrum(clip, t)` from `lib/audio.ts` to drive visuals.

Rules for `render`:
- It must be a pure function of `(params, t, size)`, because export seeks to arbitrary times. For randomness, use `seeded()`, not `Math.random()`.
- Lay things out relative to `width` and `height`. A unit like `u = Math.min(w, h) / 1080` works well, so every format and resolution tier looks the same. Scale shadow blurs and offsets by it too, because canvas transforms don't scale them.
- Only draw guides or placeholders when `preview` is true.
- For looping assets, make every motion periodic over the duration (see `titles/stream.ts`).
