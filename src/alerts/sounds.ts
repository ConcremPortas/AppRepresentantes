// ─────────────────────────────────────────────────────────────────────────────
// 3 sons discretos gerados via Web Audio (sem assets): sucesso, atenção, erro.
// Estilo Apple/Slack: senoides suaves com envelope curto, todos < 500ms.
// ─────────────────────────────────────────────────────────────────────────────
import type { SomTipo } from './registry';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Toca uma nota senoidal suave com ataque/decay rápidos. */
function nota(ac: AudioContext, freq: number, inicio: number, duracao: number, volume = 0.12) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, inicio);
  gain.gain.linearRampToValueAtTime(volume, inicio + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
  osc.connect(gain).connect(ac.destination);
  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
}

export function playSom(tipo: SomTipo) {
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;

  switch (tipo) {
    case 'sucesso':
      // Duas notas ascendentes (dó→sol) — positivo, discreto (~320ms)
      nota(ac, 523.25, t, 0.16);
      nota(ac, 783.99, t + 0.13, 0.19);
      break;
    case 'atencao':
      // Nota dupla no mesmo tom — "toc-toc" gentil (~360ms)
      nota(ac, 587.33, t, 0.14, 0.1);
      nota(ac, 587.33, t + 0.2, 0.16, 0.1);
      break;
    case 'erro':
      // Duas notas descendentes (mi→dó) — sóbrio, sem agressividade (~340ms)
      nota(ac, 659.25, t, 0.15, 0.1);
      nota(ac, 523.25, t + 0.15, 0.19, 0.1);
      break;
  }
}
