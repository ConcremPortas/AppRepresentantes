// ─────────────────────────────────────────────────────────────────────────────
// Gera a versão OTIMIZADA da wallpaper de login a partir de
// public/logos/Wallpaper-Concrem-Op4v2.png (2276x1280, ~4.7MB PNG) →
// public/login-bg.jpg (1920w, JPEG) — leve o suficiente para a tela de login.
//
// Rodar:  node scripts/gen-login-bg.mjs   (ou: npm run login:bg)
// ─────────────────────────────────────────────────────────────────────────────
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = await loadImage(readFileSync(join(ROOT, 'public/logos/Wallpaper-Concrem-Op4v2.png')));

const W = 1680;
const H = Math.round(src.height * (W / src.width));
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';
ctx.drawImage(src, 0, 0, W, H);

const jpeg = await canvas.encode('jpeg', 68);
const out = join(ROOT, 'public/login-bg.jpg');
writeFileSync(out, jpeg);
console.log('login-bg.jpg gerado:', `${W}x${H}`, `${Math.round(jpeg.length / 1024)} KB`);
