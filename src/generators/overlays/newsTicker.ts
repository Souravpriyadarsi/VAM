import { circle, clamp, contrastText, ease, fillRoundRect, fitText, font, FONT_OPTIONS, progress, setStyle } from '../../lib/draw';
import { drawOverlayBg, OVERLAY_SIZES, overlayBgControl, overlayIsTransparent } from '../../lib/overlay';
import type { Generator } from '../types';
import { stylePresets } from '../types';

const OUTRO = 0.5;

export const newsTicker: Generator = {
  id: 'news-ticker',
  name: 'News Ticker',
  description: '“Breaking news” lower banner with a headline and a scrolling ticker — for commentary, parody and recap videos.',
  category: 'Overlays',
  tags: ['news', 'breaking news', 'ticker', 'headline', 'lower third', 'crawl', 'parody', 'live', 'animated', 'transparent'],
  sizes: OVERLAY_SIZES,
  animation: { duration: (p) => p.duration as number, posterTime: 2 },
  transparent: overlayIsTransparent,
  controls: [
    { type: 'text', key: 'label', label: 'Label', group: 'Text', default: 'BREAKING NEWS' },
    { type: 'text', key: 'headline', label: 'Headline', group: 'Text', default: 'Local creator finally finishes editing video' },
    { type: 'text', key: 'ticker', label: 'Ticker', group: 'Text', multiline: true, default: 'Viewers demand part two\nThumbnail tested 47 times\nCoffee supplies running dangerously low\nSubscribe button reportedly “very clickable”', hint: 'One item per line' },
    { type: 'toggle', key: 'live', label: '“LIVE” badge', group: 'Text', default: true },
    { type: 'text', key: 'station', label: 'Station tag', group: 'Text', default: 'PKN', hint: 'Short text at the start of the ticker — leave empty to hide' },
    { type: 'color', key: 'accent', label: 'Accent', group: 'Style', default: '#dc2626' },
    { type: 'color', key: 'band', label: 'Headline band', group: 'Style', default: '#ffffff' },
    { type: 'color', key: 'tickerBg', label: 'Ticker background', group: 'Style', default: '#0f172a' },
    { type: 'select', key: 'font', label: 'Font', group: 'Style', default: 'Oswald', options: FONT_OPTIONS },
    { type: 'number', key: 'speed', label: 'Ticker speed', group: 'Timing', default: 160, min: 40, max: 400, step: 10, unit: ' px/s' },
    { type: 'number', key: 'duration', label: 'Duration', group: 'Timing', default: 10, min: 3, max: 60, step: 1, unit: 's' },
    overlayBgControl(),
  ],
  presets: stylePresets(
    { accent: '#dc2626', band: '#ffffff', tickerBg: '#0f172a', font: 'Oswald' },
    {
      Breaking: {},
      Sports: { accent: '#2563eb', band: '#f8fafc', tickerBg: '#0b1b3a', font: 'Bebas Neue' },
      Finance: { accent: '#16a34a', band: '#f0fdf4', tickerBg: '#052e16', font: 'Roboto Mono' },
      Tabloid: { accent: '#facc15', band: '#111111', tickerBg: '#dc2626', font: 'Anton' },
    },
  ),

  render(ctx, p, t, { width: w, height: h }) {
    drawOverlayBg(ctx, p, w, h);
    const D = p.duration as number;
    const u = Math.min(w, h) / 1080;
    const fam = p.font as string;
    const accent = p.accent as string;
    const band = p.band as string;
    const tickerBg = p.tickerBg as string;
    const out = ease.inCubic(progress(t, D - OUTRO, OUTRO));

    const tickerH = 64 * u;
    const bandH = 104 * u;
    const labelH = 58 * u;
    const margin = 60 * u;
    const bandW = w - margin * 2;
    const tickerY = h - margin - tickerH + out * (tickerH + margin);
    const bandY = tickerY - bandH;

    // Ticker bar with a scrolling crawl.
    const tickerIn = ease.outCubic(progress(t, 0.1, 0.5));
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin, tickerY, bandW * tickerIn, tickerH);
    ctx.clip();
    ctx.fillStyle = tickerBg;
    ctx.fillRect(margin, tickerY, bandW, tickerH);
    const station = (p.station as string).trim();
    let crawlX = margin;
    ctx.textBaseline = 'middle';
    if (station) {
      ctx.font = font(fam, 32 * u, 700);
      const sw = ctx.measureText(station).width + 40 * u;
      ctx.fillStyle = accent;
      ctx.fillRect(margin, tickerY, sw, tickerH);
      setStyle(ctx, { fillStyle: contrastText(accent), textAlign: 'center' });
      ctx.fillText(station, margin + sw / 2, tickerY + tickerH / 2 + 2 * u);
      crawlX += sw;
    }
    const items = (p.ticker as string).split('\n').map((l) => l.trim()).filter(Boolean);
    if (items.length) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(crawlX, tickerY, margin + bandW - crawlX, tickerH);
      ctx.clip();
      setStyle(ctx, { font: font(fam, 32 * u, 500), textAlign: 'left', fillStyle: contrastText(tickerBg) });
      const segment = items.map((it) => `${it.toUpperCase()}     ■     `).join('');
      const segW = ctx.measureText(segment).width;
      const offset = (t * (p.speed as number) * u) % segW;
      for (let x = crawlX + 20 * u - offset; x < margin + bandW; x += segW) ctx.fillText(segment, x, tickerY + tickerH / 2 + 2 * u);
      ctx.restore();
    }
    ctx.restore();

    // Headline band wipes in from the left.
    const bandIn = ease.outQuint(progress(t, 0.35, 0.6));
    if (bandIn > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(margin, bandY - labelH, bandW * bandIn, bandH + labelH);
      ctx.clip();
      ctx.fillStyle = band;
      ctx.fillRect(margin, bandY, bandW, bandH);
      const headlineIn = ease.outCubic(progress(t, 0.7, 0.5));
      const { size } = fitText(ctx, (p.headline as string).toUpperCase(), fam, 700, bandW - 60 * u, bandH * 0.75, 64 * u, 1, false);
      setStyle(ctx, { globalAlpha: headlineIn, fillStyle: contrastText(band), font: font(fam, size, 700), textAlign: 'left' });
      ctx.fillText((p.headline as string).toUpperCase(), margin + 30 * u, bandY + bandH / 2 + 3 * u + (1 - headlineIn) * 20 * u);
      ctx.restore();
    }

    // Label tab sitting on top of the band, with an optional pulsing LIVE badge.
    const labelIn = ease.outBack(progress(t, 0.2, 0.45));
    if (labelIn > 0) {
      ctx.save();
      ctx.font = font(fam, 36 * u, 700);
      const label = (p.label as string).toUpperCase();
      const lw = ctx.measureText(label).width + 44 * u;
      ctx.translate(margin, bandY);
      ctx.scale(1, clamp(labelIn, 0, 1.2));
      ctx.fillStyle = accent;
      ctx.fillRect(0, -labelH, lw, labelH);
      setStyle(ctx, { fillStyle: contrastText(accent), textAlign: 'left' });
      ctx.fillText(label, 22 * u, -labelH / 2 + 2 * u);
      if (p.live) {
        const lx = lw + 14 * u;
        ctx.font = font(fam, 28 * u, 700);
        const liveW = ctx.measureText('LIVE').width + 62 * u;
        ctx.fillStyle = '#111111';
        fillRoundRect(ctx, lx, -labelH + 8 * u, liveW, labelH - 16 * u, 6 * u);
        const pulse = 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI));
        ctx.fillStyle = `rgba(239,68,68,${pulse})`;
        circle(ctx, lx + 22 * u, -labelH / 2, 9 * u);
        ctx.fillStyle = '#ffffff';
        ctx.fillText('LIVE', lx + 40 * u, -labelH / 2 + 2 * u);
      }
      ctx.restore();
    }
  },
};
