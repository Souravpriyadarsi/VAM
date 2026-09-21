import { backgroundControls, drawBackground, drawCover, ease, fitText, font, FONT_OPTIONS, progress, rgba, roundRectPath } from '../lib/draw';
import { LANDSCAPE } from '../lib/sizes';
import type { Generator, Params } from './types';
import { stylePresets } from './types';

interface Slot {
  kind: 'video' | 'subscribe';
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

/** Element positions in 1920×1080 space, sized to match YouTube's end-screen element proportions. */
function slots(p: Params): Slot[] {
  const layout = p.layout as string;
  const l1 = p.label1 as string;
  const l2 = p.label2 as string;
  if (layout === 'one') {
    return [
      { kind: 'video', x: 150, y: 330, w: 960, h: 540, label: l1 },
      { kind: 'subscribe', x: 1330, y: 440, w: 320, h: 320, label: p.subscribeLabel as string },
    ];
  }
  if (layout === 'three') {
    return [
      { kind: 'video', x: 110, y: 330, w: 540, h: 304, label: l1 },
      { kind: 'video', x: 690, y: 330, w: 540, h: 304, label: l2 },
      { kind: 'video', x: 1270, y: 330, w: 540, h: 304, label: p.label3 as string },
      { kind: 'subscribe', x: 855, y: 730, w: 210, h: 210, label: p.subscribeLabel as string },
    ];
  }
  return [
    { kind: 'video', x: 130, y: 320, w: 780, h: 439, label: l1 },
    { kind: 'video', x: 1010, y: 320, w: 780, h: 439, label: l2 },
    { kind: 'subscribe', x: 865, y: 800, w: 190, h: 190, label: p.subscribeLabel as string },
  ];
}

export const endScreen: Generator = {
  id: 'end-screen',
  name: 'End Screen',
  description: 'Animated end-screen background with frames that line up with YouTube’s video, playlist and subscribe elements.',
  category: 'End Screens',
  tags: ['end screen', 'outro', 'end card', 'watch next', 'subscribe', 'animated'],
  sizes: [LANDSCAPE],
  animation: { duration: (p) => p.duration as number, posterTime: 1.5 },
  controls: [
    { type: 'select', key: 'layout', label: 'Layout', group: 'Layout', default: 'two', options: [
      { value: 'two', label: '2 videos + subscribe' },
      { value: 'one', label: '1 video + subscribe' },
      { value: 'three', label: '3 videos + subscribe' },
    ] },
    { type: 'text', key: 'heading', label: 'Heading', group: 'Text', default: 'THANKS FOR WATCHING!' },
    { type: 'text', key: 'label1', label: 'Video 1 label', group: 'Text', default: 'WATCH NEXT' },
    { type: 'text', key: 'label2', label: 'Video 2 label', group: 'Text', default: 'MOST POPULAR', showIf: (p) => p.layout !== 'one' },
    { type: 'text', key: 'label3', label: 'Video 3 label', group: 'Text', default: 'PLAYLIST', showIf: (p) => p.layout === 'three' },
    { type: 'text', key: 'subscribeLabel', label: 'Subscribe label', group: 'Text', default: 'SUBSCRIBE' },
    { type: 'image', key: 'avatar', label: 'Channel avatar', group: 'Text', default: null, hint: 'YouTube draws your avatar there too — this is just for the preview' },
    { type: 'select', key: 'font', label: 'Heading font', group: 'Text', default: 'Bebas Neue', options: FONT_OPTIONS },
    { type: 'color', key: 'textColor', label: 'Text colour', group: 'Text', default: '#ffffff' },
    { type: 'color', key: 'accent', label: 'Accent colour', group: 'Frames', default: '#ff3d57' },
    { type: 'select', key: 'frameStyle', label: 'Frame style', group: 'Frames', default: 'glow', options: [
      { value: 'glow', label: 'Glow' },
      { value: 'solid', label: 'Solid border' },
      { value: 'none', label: 'None' },
    ] },
    { type: 'toggle', key: 'guides', label: 'Show element guides', group: 'Frames', default: true, hint: 'Preview only — never exported' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Timing', default: 12, min: 5, max: 20, step: 1, unit: 's', hint: 'YouTube allows 5–20 s' },
    ...backgroundControls({ type: 'gradient', c1: '#141e30', c2: '#243b55', angle: 135, pattern: 'rays' }),
  ],
  presets: stylePresets(
    { font: 'Bebas Neue', textColor: '#ffffff', accent: '#ff3d57', frameStyle: 'glow', bgType: 'gradient', bgColor1: '#141e30', bgColor2: '#243b55', bgPattern: 'rays', bgVignette: true, bgDarken: 25 },
    {
      Night: {},
      'Red hype': { accent: '#ffe500', bgColor1: '#ff3d57', bgColor2: '#3a0ca3' },
      Clean: { font: 'Montserrat', textColor: '#0f172a', accent: '#2563eb', frameStyle: 'solid', bgType: 'solid', bgColor1: '#f8fafc', bgPattern: 'none', bgVignette: false, bgDarken: 0 },
      Neon: { accent: '#00f5d4', bgType: 'radial', bgColor1: '#1a0033', bgColor2: '#05000a', bgPattern: 'grid' },
    },
  ),

  render(ctx, p, t, { width: w, height: h, preview }) {
    drawBackground(ctx, p, w, h, t);
    const k = w / 1920;
    const accent = p.accent as string;
    const color = p.textColor as string;

    const headK = ease.outQuint(progress(t, 0.1, 0.8));
    const { size } = fitText(ctx, p.heading as string, p.font as string, 900, 1500 * k, 150 * k, 130 * k, 1, false);
    ctx.save();
    ctx.globalAlpha = headK;
    ctx.font = font(p.font as string, size, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 20 * k;
    ctx.fillText(p.heading as string, w / 2, 160 * k - (1 - headK) * 40 * k);
    ctx.restore();

    slots(p).forEach((s, i) => {
      const x = s.x * k;
      const y = s.y * k;
      const sw = s.w * k;
      const sh = s.h * k;
      const a = ease.outBack(progress(t, 0.3 + i * 0.15, 0.6));
      ctx.save();
      ctx.translate(x + sw / 2, y + sh / 2);
      ctx.scale(a, a);
      ctx.translate(-sw / 2, -sh / 2);

      const isVideo = s.kind === 'video';
      const pathFor = (inset: number) => {
        if (isVideo) roundRectPath(ctx, -inset, -inset, sw + inset * 2, sh + inset * 2, 14 * k + inset);
        else {
          ctx.beginPath();
          ctx.arc(sw / 2, sh / 2, sw / 2 + inset, 0, Math.PI * 2);
        }
      };

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      pathFor(0);
      ctx.fill();
      if (!isVideo && p.avatar instanceof HTMLImageElement) {
        ctx.save();
        pathFor(0);
        ctx.clip();
        drawCover(ctx, p.avatar, 0, 0, sw, sh);
        ctx.restore();
      }

      const style = p.frameStyle as string;
      if (style !== 'none') {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + i);
        ctx.lineWidth = 6 * k;
        ctx.strokeStyle = accent;
        if (style === 'glow') {
          ctx.shadowColor = accent;
          ctx.shadowBlur = (20 + pulse * 25) * k;
        }
        pathFor(10 * k);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = color;
      ctx.font = font('Inter', 30 * k, 800);
      ctx.textAlign = isVideo ? 'left' : 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.letterSpacing = `${4 * k}px`;
      if (isVideo) ctx.fillText(s.label, 0, -30 * k);
      else ctx.fillText(s.label, sw / 2, sh + 62 * k);
      ctx.letterSpacing = '0px';

      if (preview && p.guides) {
        ctx.setLineDash([12 * k, 10 * k]);
        ctx.lineWidth = 2 * k;
        ctx.strokeStyle = rgba('#ffffff', 0.6);
        pathFor(-8 * k);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = rgba('#ffffff', 0.6);
        ctx.font = font('Inter', (isVideo ? 24 : 18) * k, 600);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isVideo ? 'YouTube places a video here' : 'Subscribe', sw / 2, sh / 2);
      }
      ctx.restore();
    });
  },
};
