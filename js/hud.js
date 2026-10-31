// Evangelion-style HUD over the stage: corner brackets and a live "time elapsed" counter that
// flickers when a new part starts (the part name itself is in the footer). Purely decorative.
import { gsap, h } from './lib.js';

export function createHud(stage) {
  const hud = h('div', { id: 'hud' }, stage);
  ['tl', 'tr', 'bl', 'br'].forEach((c) => h('i', { class: `hud-corner ${c}` }, hud));
  const box = h('div', { class: 'hud-tr' }, hud);
  const time = h('div', { class: 'hud-time', html: '<span>TIME ELAPSED</span><b>000.000</b><em>sec</em>' }, box);
  const tnum = time.querySelector('b');
  const t0 = performance.now();
  gsap.ticker.add(() => { tnum.textContent = ((performance.now() - t0) / 1000).toFixed(3).padStart(7, '0'); });
  let lastPart = null;
  return {
    update(slide) {
      const part = slide.part || 0;
      if (part === lastPart) return;
      lastPart = part;
      gsap.fromTo(box, { opacity: 0.2 }, { opacity: 1, duration: 0.18, repeat: 4, yoyo: true, ease: 'steps(1)' });
    },
  };
}
