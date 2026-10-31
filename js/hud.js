// Evangelion-style HUD over the stage: corner brackets, a part label and a live
// "time elapsed" counter. Purely decorative; it never blocks clicks.
import { gsap, h } from './lib.js';

// one label per part
const PART_EN = ['PROLOGUE', 'PART 01 · ANALYSIS', 'PART 02 · OPERATION', 'PART 03 · WARNING', 'EPILOGUE'];

export function createHud(stage) {
  const hud = h('div', { id: 'hud' }, stage);
  ['tl', 'tr', 'bl', 'br'].forEach((c) => h('i', { class: `hud-corner ${c}` }, hud));
  const box = h('div', { class: 'hud-tr' }, hud);
  const time = h('div', { class: 'hud-time', html: '<span>TIME ELAPSED</span><b>000.000</b><em>sec</em>' }, box);
  const en = h('div', { class: 'hud-en' }, box);
  const tnum = time.querySelector('b');
  const t0 = performance.now();
  gsap.ticker.add(() => { tnum.textContent = ((performance.now() - t0) / 1000).toFixed(3).padStart(7, '0'); });
  let lastPart = null;
  return {
    update(slide) {
      const part = slide.part || 0;
      if (part === lastPart) return;
      lastPart = part;
      en.textContent = PART_EN[part] || '';
      gsap.fromTo(box, { opacity: 0.2 }, { opacity: 1, duration: 0.18, repeat: 4, yoyo: true, ease: 'steps(1)' });
    },
  };
}
