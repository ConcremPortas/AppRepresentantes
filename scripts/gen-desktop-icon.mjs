// Gera o ícone-fonte (1024×1024) do app desktop: fundo verde institucional +
// isotipo branco centralizado. A partir dele, `npx tauri icon` gera todos os
// formatos (ico/icns/png) em src-tauri/icons/.
//
// Rodar:  node scripts/gen-desktop-icon.mjs
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = 1024;

const canvas = createCanvas(S, S);
const ctx = canvas.getContext('2d');

// Fundo: gradiente verde institucional
const g = ctx.createLinearGradient(0, 0, S, S);
g.addColorStop(0, '#164a2a');
g.addColorStop(0.55, '#0d3018');
g.addColorStop(1, '#06170d');
ctx.fillStyle = g;
ctx.fillRect(0, 0, S, S);

// Brilho radial sutil
const glow = ctx.createRadialGradient(S / 2, S * 0.4, 0, S / 2, S * 0.4, S * 0.6);
glow.addColorStop(0, 'rgba(46,175,105,0.25)');
glow.addColorStop(1, 'rgba(46,175,105,0)');
ctx.fillStyle = glow;
ctx.fillRect(0, 0, S, S);

// Isotipo branco centralizado (~54% do quadro)
const logo = await loadImage(readFileSync(join(ROOT, 'public/logos/Isotipo-Branco.png')));
const ls = Math.round(S * 0.54);
ctx.drawImage(logo, (S - ls) / 2, (S - ls) / 2, ls, ls);

mkdirSync(join(ROOT, 'src-tauri'), { recursive: true });
const out = join(ROOT, 'src-tauri/icon-source.png');
writeFileSync(out, canvas.toBuffer('image/png'));
console.log('Ícone-fonte gerado:', out, `(${S}x${S})`);
