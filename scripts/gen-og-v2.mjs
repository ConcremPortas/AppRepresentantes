// ─────────────────────────────────────────────────────────────────────────────
// Gera as imagens Open Graph v2 do Concrem Connect, otimizadas para MINIATURA
// (WhatsApp): logo grande, título grande, tudo centralizado, margens seguras,
// poucos elementos e alto contraste. Arte própria no estilo da tela de login —
// NÃO é screenshot.
//
// Rodar:  node scripts/gen-og-v2.mjs   (ou: npm run og:v2)
// Saídas:
//   public/og-concrem-connect-v2.png         1200×630  (principal, og:image)
//   public/og-concrem-connect-square-v2.png  1200×1200 (fallback quadrado)
// ─────────────────────────────────────────────────────────────────────────────
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const logo = await loadImage(readFileSync(join(ROOT, 'public/logos/Isotipo-Branco.png')));
const LOGO_AR = logo.width / logo.height; // 390/243 ≈ 1.60

const EYEBROW = 'PORTAL DO REPRESENTANTE';
const TITLE = 'Concrem Connect';
const SUBTITLE = 'Acompanhe orçamentos, pedidos, clientes e documentos.';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function drawTracked(ctx, text, cx, y, size, spacing, color) {
  ctx.font = `600 ${size}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  const widths = [...text].map(ch => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((s, w) => s + w, 0) - spacing;
  let x = cx - total / 2;
  [...text].forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i]; });
  ctx.textAlign = 'center';
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function render(W, H, S) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const CX = W / 2;

  // ── Fundo: gradiente verde escuro institucional ──
  const base = ctx.createLinearGradient(0, 0, W, H);
  base.addColorStop(0, '#06120B');
  base.addColorStop(0.5, '#0a2013');
  base.addColorStop(1, '#03100A');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // ── Brilho radial premium atrás do logo ──
  const gy = H * 0.40;
  const glow = ctx.createRadialGradient(CX, gy, 0, CX, gy, W * 0.55);
  glow.addColorStop(0, 'rgba(46,175,105,0.34)');
  glow.addColorStop(0.42, 'rgba(46,175,105,0.10)');
  glow.addColorStop(1, 'rgba(46,175,105,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ── Brilho secundário (canto inferior) ──
  const g2 = ctx.createRadialGradient(W * 0.85, H * 0.95, 0, W * 0.85, H * 0.95, W * 0.45);
  g2.addColorStop(0, 'rgba(18,120,68,0.16)');
  g2.addColorStop(1, 'rgba(18,120,68,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // ── Vinheta sutil nas bordas (foco no centro) ──
  const vig = ctx.createRadialGradient(CX, H / 2, H * 0.25, CX, H / 2, W * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  // ── Linhas geométricas sutis (inspiração folha) ──
  ctx.save();
  ctx.strokeStyle = 'rgba(120,220,160,0.05)';
  ctx.lineWidth = Math.max(1.5, W / 800);
  const N = 5;
  for (let i = 0; i < N; i++) {
    const y = H * 0.16 + i * (H * 0.68 / (N - 1));
    ctx.beginPath();
    ctx.moveTo(-60, y);
    ctx.quadraticCurveTo(CX, y - H * 0.14, W + 60, y + H * 0.08);
    ctx.stroke();
  }
  ctx.restore();

  // ── Partículas discretas (determinísticas, proporcionais) ──
  const PARTS = [
    [0.09, 0.14], [0.20, 0.30], [0.16, 0.72], [0.30, 0.85], [0.50, 0.90],
    [0.70, 0.84], [0.84, 0.72], [0.91, 0.30], [0.80, 0.16], [0.62, 0.12],
    [0.40, 0.10], [0.10, 0.50], [0.90, 0.52], [0.28, 0.60], [0.74, 0.60],
  ];
  for (const [fx, fy] of PARTS) {
    const r = (fx * 7 % 2 + 1.1) * (W / 1200);
    ctx.globalAlpha = 0.10 + (fy * 13 % 8) / 100;
    ctx.fillStyle = '#9ef5c0';
    ctx.beginPath();
    ctx.arc(fx * W, fy * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ── Layout central (medido antes p/ centralizar verticalmente) ──
  const maxTextW = W - S.safe * 2;
  ctx.font = `400 ${S.sub}px "Segoe UI", Arial, sans-serif`;
  const subLines = wrapLines(ctx, SUBTITLE, maxTextW);
  const subBlock = subLines.length * S.sub * 1.28;

  const total = S.chip + S.gap1 + S.eyebrow + S.gap2 + S.title + S.gap3 + subBlock;
  let y = (H - total) / 2;

  // ── Chip de vidro + brilho + isotipo ──
  const chipX = CX - S.chip / 2;
  const chipCY = y + S.chip / 2;
  const cg = ctx.createRadialGradient(CX, chipCY, 0, CX, chipCY, S.chip * 0.95);
  cg.addColorStop(0, 'rgba(46,175,105,0.40)');
  cg.addColorStop(1, 'rgba(46,175,105,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(chipX - S.chip, y - S.chip, S.chip * 3, S.chip * 3);

  roundRect(ctx, chipX, y, S.chip, S.chip, S.chip * 0.26);
  ctx.fillStyle = 'rgba(255,255,255,0.065)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1.5, W / 700);
  ctx.stroke();

  const logoH = S.logoH;
  const logoW = logoH * LOGO_AR;
  ctx.drawImage(logo, CX - logoW / 2, chipCY - logoH / 2, logoW, logoH);
  y += S.chip + S.gap1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // ── Eyebrow ──
  drawTracked(ctx, EYEBROW, CX, y + S.eyebrow, S.eyebrow, S.eyebrow * 0.34, 'rgba(110,231,168,0.85)');
  y += S.eyebrow + S.gap2;

  // ── Título ──
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${S.title}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText(TITLE, CX, y + S.title);
  y += S.title + S.gap3;

  // ── Subtítulo (uma ou duas linhas) ──
  ctx.fillStyle = 'rgba(255,255,255,0.66)';
  ctx.font = `400 ${S.sub}px "Segoe UI", Arial, sans-serif`;
  subLines.forEach((ln, i) => ctx.fillText(ln, CX, y + S.sub + i * S.sub * 1.28));

  return canvas;
}

const rect = render(1200, 630, {
  safe: 130, chip: 176, logoH: 106, eyebrow: 25, title: 90, sub: 31,
  gap1: 42, gap2: 16, gap3: 24,
});
const square = render(1200, 1200, {
  safe: 150, chip: 340, logoH: 202, eyebrow: 38, title: 116, sub: 44,
  gap1: 74, gap2: 26, gap3: 40,
});

for (const [name, cv] of [
  ['og-concrem-connect-v2.png', rect],
  ['og-concrem-connect-square-v2.png', square],
]) {
  const out = join(ROOT, 'public', name);
  writeFileSync(out, cv.toBuffer('image/png'));
  console.log('OG v2 gerado:', name, `(${(readFileSync(out).length / 1024).toFixed(0)} KB, ${cv.width}x${cv.height})`);
}
