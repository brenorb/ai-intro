// Scene "attention": one token looks at the others; softmax turns scores into a fixed 100% split.
// Steps: 0 tokens are vectors · 1 scores against every earlier token · 2 softmax → 100% pie · 3 another token, another split
// Weights are illustrative (a real model has many layers and heads, each with its own pattern).
import { gsap, s, svgRoot, C, mover, rng, lerp } from '../lib.js';
import { CHIP_COLORS, showTok } from './tokens.js';

const TOKS = ['The', ' animal', ' didn', "'t", ' cross', ' the', ' street', ' because', ' it', ' was', ' too', ' tired'];
const W_IT = [0.03, 0.52, 0.03, 0.02, 0.06, 0.02, 0.17, 0.08, 0.07, 0, 0, 0];
const W_TIRED = [0.01, 0.34, 0.02, 0.03, 0.05, 0.01, 0.08, 0.06, 0.22, 0.05, 0.09, 0.04];
const FS = 32, CW = FS * 0.6, PAD = 13, GAP = 10, ROW_Y = 610, CH = 62;

export default function create(root) {
  const svg = svgRoot(root);
  const widths = TOKS.map((t) => t.length * CW + PAD * 2);
  const total = widths.reduce((a, b) => a + b, 0) + GAP * (TOKS.length - 1);
  let x = (1920 - total) / 2;
  const arcsG = s('g', { fill: 'none', 'stroke-linecap': 'round' }, svg);
  const rand = rng(4);
  const toks = TOKS.map((t, i) => {
    const w = widths[i], cx = x + w / 2; const g = s('g', {}, svg);
    const rect = s('rect', { x, y: ROW_Y - CH / 2, width: w, height: CH, rx: 12, fill: CHIP_COLORS[i % CHIP_COLORS.length] }, g);
    s('text', { x: cx, y: ROW_Y + 11, 'text-anchor': 'middle', style: `font: 600 ${FS}px var(--mono); fill: #0a0c12; white-space: pre`, text: showTok(t) }, g);
    const ring = s('rect', { x: x - 5, y: ROW_Y - CH / 2 - 5, width: w + 10, height: CH + 10, rx: 16, fill: 'none', stroke: C.attn, 'stroke-width': 5, opacity: 0 }, g);
    // mini vector
    const vec = s('g', {}, svg);
    const n = Math.max(3, Math.floor((w - 8) / 15));
    for (let k = 0; k < n; k++) s('rect', { x: x + (w - n * 15) / 2 + k * 15, y: ROW_Y + CH / 2 + 12, width: 12, height: 22, rx: 3, fill: rand() < 0.5 ? C.ai : C.bio2, opacity: 0.2 + rand() * 0.8 }, vec);
    const bar = s('rect', { x: cx - 16, y: ROW_Y + CH / 2 + 14, width: 32, height: 0, rx: 6, fill: CHIP_COLORS[i % CHIP_COLORS.length] }, svg);
    const val = s('text', { x: cx, y: ROW_Y + CH / 2 + 48, 'text-anchor': 'middle', class: 't-num', text: '' }, svg);
    const arc = s('path', { stroke: C.attn, 'stroke-width': 0, opacity: 0.85 }, arcsG);
    const o = { g, rect, ring, vec, bar, val, arc, cx, w };
    x += w + GAP;
    return o;
  });
  const rowLabel = s('text', { x: toks[0].cx - toks[0].w / 2, y: ROW_Y + CH / 2 + 130, class: 't-small', text: '' }, svg);
  // donut
  const D = { cx: 1560, cy: 880, r: 120, r2: 66 };
  const donut = s('g', {}, svg);
  const slices = TOKS.map((_, i) => s('path', { fill: CHIP_COLORS[i % CHIP_COLORS.length], stroke: C.bg, 'stroke-width': 3 }, donut));
  s('text', { x: D.cx, y: D.cy + 14, 'text-anchor': 'middle', style: `font: 600 40px var(--mono); fill: ${C.ink}`, text: '100%' }, donut);
  const dLabel = s('text', { x: D.cx - D.r - 30, y: D.cy - 20, 'text-anchor': 'end', class: 't-label', text: '' }, donut);
  const dLabel2 = s('text', { x: D.cx - D.r - 30, y: D.cy + 20, 'text-anchor': 'end', class: 't-label', text: 'always adds up to 100%' }, donut);
  dLabel.style.fill = C.ink;
  const note = s('text', { x: 110, y: 1004, class: 't-small', text: 'ILLUSTRATIVE WEIGHTS · A REAL MODEL HAS MANY LAYERS AND HEADS, EACH WITH ITS OWN PATTERN' }, svg);
  const formula = s('text', { x: 110, y: 900, class: 't-label', text: '' }, svg);

  const st = { w: new Array(TOKS.length).fill(0), focus: 8, mode: 0, from: null, to: null, t: 1 };
  function draw() {
    const f = toks[st.focus];
    let a0 = -Math.PI / 2;
    st.w.forEach((w, i) => {
      const t = toks[i];
      // arc from focus to token i
      if (i === st.focus) {
        t.arc.setAttribute('d', `M${f.cx - 14},${ROW_Y - CH / 2 - 6} c-30,-70 58,-70 28,0`);
      } else {
        const mid = (f.cx + t.cx) / 2, hgt = Math.min(210, 50 + Math.abs(f.cx - t.cx) * 0.24);
        t.arc.setAttribute('d', `M${f.cx},${ROW_Y - CH / 2 - 8} Q${mid},${ROW_Y - CH / 2 - 8 - hgt * 1.9} ${t.cx},${ROW_Y - CH / 2 - 8}`);
      }
      t.arc.setAttribute('stroke-width', st.mode >= 1 ? Math.max(w > 0 ? 1.5 : 0, w * 38) : 0);
      t.arc.setAttribute('opacity', 0.35 + Math.min(0.6, w * 1.6));
      t.bar.setAttribute('height', st.mode >= 2 ? w * 190 : 0);
      t.val.setAttribute('y', st.mode >= 2 ? ROW_Y + CH / 2 + 48 + w * 190 : ROW_Y + CH / 2 + 48);
      t.val.textContent = w <= 0.0005 || st.mode < 1 ? '' : st.mode === 1 ? (Math.log(w) + 4.2).toFixed(1) : `${Math.round(w * 100)}%`;
      // donut slice
      const a1 = a0 + w * Math.PI * 2;
      if (w > 0.0005) {
        const big = a1 - a0 > Math.PI ? 1 : 0;
        const p = (r, a) => `${D.cx + Math.cos(a) * r},${D.cy + Math.sin(a) * r}`;
        slices[i].setAttribute('d', `M${p(D.r, a0)} A${D.r},${D.r} 0 ${big} 1 ${p(D.r, a1)} L${p(D.r2, a1)} A${D.r2},${D.r2} 0 ${big} 0 ${p(D.r2, a0)}Z`);
      } else slices[i].setAttribute('d', '');
      a0 = a1;
    });
  }
  function setWeights(target, focus, mode, instant) {
    st.focus = focus; st.mode = mode;
    st.from = [...st.w]; st.to = target; st.t = 0;
    gsap.killTweensOf(st);
    gsap.to(st, { t: 1, duration: instant ? 0 : 1.0, ease: 'power2.inOut', onUpdate: () => { st.w = st.from.map((a, i) => lerp(a, st.to[i], st.t)); draw(); }, onComplete: () => { st.w = [...st.to]; draw(); } });
    if (instant) { st.w = [...target]; draw(); }
  }

  function update({ step, instant }) {
    const to = mover(instant);
    const focus = step >= 3 ? 11 : 8;
    const weights = step === 0 ? new Array(TOKS.length).fill(0) : step >= 3 ? W_TIRED : W_IT;
    toks.forEach((t, i) => {
      to(t.ring, { opacity: step >= 1 && i === focus ? 1 : 0, duration: 0.4 });
      to(t.g, { opacity: step >= 1 && i > focus ? 0.28 : 1, duration: 0.5 });
      to(t.vec, { autoAlpha: step === 0 ? 1 : 0, duration: 0.4 });
    });
    to(donut, { autoAlpha: step >= 2 ? 1 : 0, scale: step >= 2 ? 1 : 0.7, transformOrigin: `${D.cx}px ${D.cy}px`, duration: 0.7 });
    to(note, { autoAlpha: step >= 1 ? 1 : 0 });
    rowLabel.textContent = step === 1 ? 'SCORE: HOW RELEVANT IS EACH EARLIER TOKEN TO THIS ONE?' : '';
    formula.textContent = step === 0 ? '' : step === 1 ? `“${TOKS[focus].trim()}” compares itself with every token before it.` : 'softmax turns the scores into shares.';
    dLabel.textContent = `attention of “${TOKS[focus].trim()}”`;
    setWeights(weights, focus, Math.min(step, 2), instant);
  }
  return { update, exit() {} };
}
