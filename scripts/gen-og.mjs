// ─────────────────────────────────────────────────────────────────────────────
// Gera a imagem Open Graph (1200×630) do Concrem Connect, no estilo da tela de
// login: fundo verde escuro, gradiente + brilho radial, partículas discretas,
// linhas geométricas sutis, isotipo no "chip de vidro" e os textos da marca.
//
// Rodar:  node scripts/gen-og.mjs   (ou: npm run og)
// Saída:  public/og-concrem-connect.png
// ─────────────────────────────────────────────────────────────────────────────
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = 1200, H = 630;
const CX = W / 2;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

function roundRect(x, y, w, h, r) {
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

// ── Fundo: gradiente verde escuro ──
const base = ctx.createLinearGradient(0, 0, W, H);
base.addColorStop(0, '#06110A');
base.addColorStop(0.5, '#0a1e12');
base.addColorStop(1, '#04120a');
ctx.fillStyle = base;
ctx.fillRect(0, 0, W, H);

// ── Brilho radial superior (verde Concrem) ──
const glow = ctx.createRadialGradient(CX, H * 0.30, 0, CX, H * 0.30, W * 0.58);
glow.addColorStop(0, 'rgba(46,175,105,0.30)');
glow.addColorStop(0.45, 'rgba(46,175,105,0.09)');
glow.addColorStop(1, 'rgba(46,175,105,0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, W, H);

// ── Brilho secundário inferior direito ──
const glow2 = ctx.createRadialGradient(W * 0.86, H * 0.92, 0, W * 0.86, H * 0.92, W * 0.42);
glow2.addColorStop(0, 'rgba(20,120,70,0.14)');
glow2.addColorStop(1, 'rgba(20,120,70,0)');
ctx.fillStyle = glow2;
ctx.fillRect(0, 0, W, H);

// ── Linhas geométricas sutis (inspiração folha) ──
ctx.save();
ctx.strokeStyle = 'rgba(120,220,160,0.055)';
ctx.lineWidth = 1.5;
for (let i = 0; i < 6; i++) {
  const y = H * 0.12 + i * H * 0.15;
  ctx.beginPath();
  ctx.moveTo(-60, y);
  ctx.quadraticCurveTo(CX, y - 90, W + 60, y + 50);
  ctx.stroke();
}
ctx.restore();

// ── Partículas discretas (posições fixas para saída estável) ──
const PARTS = [
  [120, 90, 2.2, 0.18], [300, 160, 1.4, 0.12], [520, 70, 1.8, 0.15], [700, 130, 1.2, 0.10],
  [880, 80, 2.4, 0.16], [1040, 170, 1.6, 0.12], [1130, 300, 1.3, 0.10], [90, 320, 1.8, 0.14],
  [200, 480, 2.0, 0.13], [420, 540, 1.4, 0.10], [640, 500, 1.7, 0.12], [860, 560, 1.5, 0.11],
  [1000, 470, 2.2, 0.15], [1150, 540, 1.3, 0.09], [60, 200, 1.5, 0.11], [1170, 120, 1.6, 0.12],
  [360, 300, 1.2, 0.08], [980, 340, 1.4, 0.10], [520, 420, 1.1, 0.08], [760, 360, 1.3, 0.09],
];
for (const [x, y, r, a] of PARTS) {
  ctx.globalAlpha = a;
  ctx.fillStyle = '#9ef5c0';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
ctx.globalAlpha = 1;

// ── Chip de vidro + isotipo ──
const CHIP = 150;
const chipX = CX - CHIP / 2;
const chipY = 132;

// brilho atrás do chip
const chipGlow = ctx.createRadialGradient(CX, chipY + CHIP / 2, 0, CX, chipY + CHIP / 2, CHIP);
chipGlow.addColorStop(0, 'rgba(46,175,105,0.35)');
chipGlow.addColorStop(1, 'rgba(46,175,105,0)');
ctx.fillStyle = chipGlow;
ctx.fillRect(chipX - CHIP, chipY - CHIP, CHIP * 3, CHIP * 3);

roundRect(chipX, chipY, CHIP, CHIP, 40);
ctx.fillStyle = 'rgba(255,255,255,0.06)';
ctx.fill();
ctx.strokeStyle = 'rgba(255,255,255,0.16)';
ctx.lineWidth = 1.5;
ctx.stroke();

const logo = await loadImage(readFileSync(join(ROOT, 'public/logos/Isotipo-Branco.png')));
const LS = 84;
ctx.drawImage(logo, CX - LS / 2, chipY + (CHIP - LS) / 2, LS, LS);

// ── Textos ──
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// PORTAL DO REPRESENTANTE (com tracking manual)
ctx.fillStyle = 'rgba(110,231,168,0.80)';
ctx.font = '600 24px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
drawTracked('PORTAL DO REPRESENTANTE', CX, chipY + CHIP + 56, 8);

// Concrem Connect
ctx.fillStyle = '#ffffff';
ctx.font = '700 82px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
ctx.fillText('Concrem Connect', CX, chipY + CHIP + 128);

// Subtítulo
ctx.fillStyle = 'rgba(255,255,255,0.58)';
ctx.font = '400 32px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
ctx.fillText('Acesse sua conta para continuar.', CX, chipY + CHIP + 188);

function drawTracked(text, cx, y, spacing) {
  const widths = [...text].map(ch => ctx.measureText(ch).width + spacing);
  const total = widths.reduce((s, w) => s + w, 0) - spacing;
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => { ctx.fillText(ch, x, y); x += widths[i]; });
  ctx.textAlign = prevAlign;
}

const out = join(ROOT, 'public/og-concrem-connect.png');
writeFileSync(out, canvas.toBuffer('image/png'));
console.log('OG gerado:', out, `(${(readFileSync(out).length / 1024).toFixed(0)} KB, ${W}x${H})`);
