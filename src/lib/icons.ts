import { opts } from '../generators/types';
import { circle, setStyle } from './draw';

/** Simple glyphs drawn with canvas paths, centred on (cx, cy) inside a box of `s` pixels. */

export const ICON_OPTIONS = opts({
  pin: 'Location pin', price: 'Price tag', calendar: 'Calendar', clock: 'Clock', star: 'Star',
  heart: 'Heart', music: 'Music note', link: 'Link', user: 'Person', camera: 'Camera',
});

export function drawIcon(ctx: CanvasRenderingContext2D, name: string, cx: number, cy: number, s: number, color: string, hole: string) {
  const r = s / 2;
  ctx.save();
  ctx.translate(cx, cy);
  setStyle(ctx, { fillStyle: color, strokeStyle: color, lineWidth: s * 0.11, lineCap: 'round', lineJoin: 'round' });
  const dot = (x: number, y: number, rr: number, fill = hole) => {
    ctx.fillStyle = fill;
    circle(ctx, x, y, rr);
    ctx.fillStyle = color;
  };

  switch (name) {
    case 'pin':
      ctx.beginPath();
      ctx.arc(0, -r * 0.22, r * 0.62, Math.PI * 0.82, Math.PI * 0.18);
      ctx.lineTo(0, r * 0.95);
      ctx.closePath();
      ctx.fill();
      dot(0, -r * 0.22, r * 0.24);
      break;
    case 'price':
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, -r * 0.1);
      ctx.lineTo(-r * 0.1, -r * 0.9);
      ctx.lineTo(r * 0.85, -r * 0.85);
      ctx.lineTo(r * 0.9, r * 0.1);
      ctx.lineTo(r * 0.1, r * 0.9);
      ctx.closePath();
      ctx.fill();
      dot(r * 0.45, -r * 0.45, r * 0.16);
      break;
    case 'calendar':
      ctx.beginPath();
      ctx.roundRect(-r * 0.8, -r * 0.62, r * 1.6, r * 1.5, r * 0.18);
      ctx.fill();
      ctx.fillStyle = hole;
      ctx.fillRect(-r * 0.62, -r * 0.2, r * 1.24, r * 0.92);
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) ctx.fillRect(-r * 0.5 + i * r * 0.38, -r * 0.08 + j * r * 0.38, r * 0.24, r * 0.24);
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, -r * 0.9);
      ctx.lineTo(-r * 0.4, -r * 0.5);
      ctx.moveTo(r * 0.4, -r * 0.9);
      ctx.lineTo(r * 0.4, -r * 0.5);
      ctx.stroke();
      break;
    case 'clock':
      circle(ctx, 0, 0, r * 0.85);
      ctx.strokeStyle = hole;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.5);
      ctx.lineTo(0, 0);
      ctx.lineTo(r * 0.35, r * 0.2);
      ctx.stroke();
      break;
    case 'star':
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.42 : r * 0.95;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr + r * 0.05);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 'heart':
      ctx.beginPath();
      ctx.moveTo(0, r * 0.85);
      ctx.bezierCurveTo(-r * 1.1, r * 0.1, -r * 0.8, -r * 0.95, 0, -r * 0.4);
      ctx.bezierCurveTo(r * 0.8, -r * 0.95, r * 1.1, r * 0.1, 0, r * 0.85);
      ctx.fill();
      break;
    case 'music':
      ctx.beginPath();
      ctx.ellipse(-r * 0.35, r * 0.55, r * 0.3, r * 0.24, -0.4, 0, Math.PI * 2);
      ctx.ellipse(r * 0.55, r * 0.35, r * 0.3, r * 0.24, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = s * 0.09;
      ctx.beginPath();
      ctx.moveTo(-r * 0.08, r * 0.52);
      ctx.lineTo(-r * 0.08, -r * 0.75);
      ctx.lineTo(r * 0.82, -r * 0.95);
      ctx.lineTo(r * 0.82, r * 0.32);
      ctx.stroke();
      break;
    case 'link':
      ctx.lineWidth = s * 0.13;
      ctx.rotate(-Math.PI / 4);
      ctx.beginPath();
      ctx.roundRect(-r * 0.95, -r * 0.3, r * 1.05, r * 0.6, r * 0.3);
      ctx.roundRect(-r * 0.1, -r * 0.3, r * 1.05, r * 0.6, r * 0.3);
      ctx.stroke();
      break;
    case 'user':
      circle(ctx, 0, -r * 0.35, r * 0.38);
      ctx.beginPath();
      ctx.ellipse(0, r * 0.75, r * 0.75, r * 0.55, 0, Math.PI, 0);
      ctx.fill();
      break;
    case 'camera':
      ctx.beginPath();
      ctx.roundRect(-r * 0.9, -r * 0.45, r * 1.8, r * 1.25, r * 0.2);
      ctx.fill();
      ctx.fillRect(-r * 0.35, -r * 0.7, r * 0.7, r * 0.3);
      dot(0, r * 0.15, r * 0.36);
      dot(0, r * 0.15, r * 0.2, color);
      break;
  }
  ctx.restore();
}
