// Scene "neuron": biological neuron ↔ artificial neuron → zoom out to brain mesh ↔ feed-forward
// network → universal approximation. States: 'single' (3 steps), 'network' (1), 'uat' (4).
import { gsap, s, svgRoot, rng, C, spline, lerp, clamp, sigmoid, fmt, mover, Loops } from '../lib.js';

// ---- geometry shared by the detailed drawings and the zoomed-out worlds ----
const CY = 690;
const BIO = { x: 400, y: CY, r: 62 };                 // detailed soma
const SUM = { x: 1420, y: CY, r: 62 };                // detailed Σ node
const NET = { xs: [1120, 1285, 1450, 1615, 1780], sizes: [4, 7, 7, 7, 3], dy: 72, r: 15 };
const S_AI = 340 / (NET.xs[1] - NET.xs[0]);           // zoom factor: detail ↔ network
const N0 = { x: NET.xs[1], y: CY };                   // the node our detailed neuron becomes
const IN_X = SUM.x - 340;
const IN_YS = [-1.5, -0.5, 0.5, 1.5].map((k) => CY + k * NET.dy * S_AI);
const WEIGHTS = [0.8, -0.5, 1.2, 0.3];
const ACT = { x: 1610, y: CY, size: 124 };
const OUT = { x: 1800, y: CY, r: 40 };
const MINI_R = 9, S_BIO = BIO.r / MINI_R;

export default function create(root) {
  const svg = svgRoot(root);
  const defs = s('defs', {}, svg);
  defs.innerHTML = `
    <radialGradient id="somaGrad" cx="42%" cy="38%" r="70%"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".55" stop-color="${C.bio}"/><stop offset="1" stop-color="${C.bio2}"/></radialGradient>
    <radialGradient id="nodeGrad" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#bff3ff"/><stop offset="1" stop-color="${C.ai}"/></radialGradient>
    <clipPath id="clipL"><rect x="0" y="340" width="952" height="700"/></clipPath>
    <clipPath id="clipR"><rect x="968" y="340" width="952" height="700"/></clipPath>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`;

  const rand = rng(7);

  // =====================================================================
  // LEFT WORLD: mesh of mini neurons (zoomed-out brain)
  // =====================================================================
  const leftClip = s('g', { 'clip-path': 'url(#clipL)' }, svg);
  const bioWorld = s('g', {}, leftClip);
  const meshEdgesG = s('g', { fill: 'none', stroke: C.bio, 'stroke-opacity': 0.28, 'stroke-width': 1.6, 'stroke-linecap': 'round' }, bioWorld);
  const meshNodesG = s('g', {}, bioWorld);
  const meshPulseG = s('g', {}, bioWorld);
  const COLS = 9, ROWS = 6;
  const mesh = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const x = 120 + c * 95 + (rand() - 0.5) * 50, y = 430 + r * 100 + (c % 2 ? 46 : 0) + (rand() - 0.5) * 44;
    mesh.push({ c, r, x, y, out: [], glow: null });
  }
  // the neuron we were looking at: snap one mid-left node to an exact spot
  const b0 = mesh.find((m) => m.c === 3 && m.r === 2); b0.x = 420; b0.y = CY;
  const meshEdges = [];
  for (const a of mesh) {
    const cands = mesh.filter((b) => b.c > a.c && b.c <= a.c + 2).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y));
    const k = 2 + (rand() < 0.45 ? 1 : 0);
    for (const b of cands.slice(0, k)) {
      const mx = (a.x + b.x) / 2 + (rand() - 0.5) * 40, my = (a.y + b.y) / 2 + (rand() - 0.5) * 60;
      const e = { a, b, c: [mx, my] };
      s('path', { d: `M${a.x},${a.y} Q${mx},${my} ${b.x},${b.y}` }, meshEdgesG);
      a.out.push(e); meshEdges.push(e);
    }
  }
  for (const m of mesh) {
    const g = s('g', { transform: `translate(${m.x},${m.y})` }, meshNodesG);
    // dendrite stubs
    for (let i = 0; i < 4; i++) {
      const ang = Math.PI * (0.62 + 0.76 * (i / 3)) + (rand() - 0.5) * 0.3, L = 16 + rand() * 12;
      s('line', { x1: Math.cos(ang) * MINI_R * 0.8, y1: Math.sin(ang) * MINI_R * 0.8, x2: Math.cos(ang) * L, y2: Math.sin(ang) * L, stroke: C.bio, 'stroke-opacity': 0.45, 'stroke-width': 1.5, 'stroke-linecap': 'round' }, g);
    }
    m.glow = s('circle', { r: MINI_R * 2.6, fill: C.bio, opacity: 0, filter: 'url(#soft)' }, g);
    s('circle', { r: MINI_R, fill: 'url(#somaGrad)' }, g);
  }
  const meshPulses = Array.from({ length: 70 }, () => ({ el: s('circle', { r: 3.4, fill: '#fff3df', opacity: 0 }, meshPulseG), e: null, t: 0, dur: 1 }));

  // =====================================================================
  // LEFT DETAIL: one biological neuron
  // =====================================================================
  const bioDetail = s('g', {}, svg);
  const bioInner = s('g', {}, bioDetail);
  const dendG = s('g', { fill: 'none', stroke: C.bio, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, bioInner);
  const trunks = [];
  const rd = rng(21);
  [128, 152, 178, 204, 232].forEach((deg, ti) => {
    const a0 = (deg * Math.PI) / 180;
    const L = 250 + rd() * 60;
    const pts = [];
    let a = a0;
    for (let i = 0; i <= 5; i++) {
      const d = BIO.r * 0.9 + (L * i) / 5;
      a += (rd() - 0.5) * 0.16;
      pts.push([BIO.x + Math.cos(a) * d, BIO.y - Math.sin(a) * d]);
    }
    s('path', { d: spline(pts), 'stroke-width': 7, 'stroke-opacity': 0.9 }, dendG);
    // branches
    [2, 3, 4].forEach((bi) => {
      if (rd() < 0.2) return;
      const [bx, by] = pts[bi];
      const ba = a0 + (rd() < 0.5 ? 1 : -1) * (0.45 + rd() * 0.35), bl = 70 + rd() * 70;
      const bp = [[bx, by], [bx + Math.cos(ba) * bl * 0.5, by - Math.sin(ba) * bl * 0.5 + (rd() - 0.5) * 14], [bx + Math.cos(ba) * bl, by - Math.sin(ba) * bl]];
      s('path', { d: spline(bp), 'stroke-width': 3.6, 'stroke-opacity': 0.7 }, dendG);
      s('circle', { cx: bp[2][0], cy: bp[2][1], r: 4, fill: C.bio, stroke: 'none', opacity: 0.8 }, dendG);
    });
    s('circle', { cx: pts[5][0], cy: pts[5][1], r: 5.5, fill: C.bio, stroke: 'none' }, dendG);
    // signal travels tip -> soma
    const inward = s('path', { d: spline([...pts].reverse()), stroke: 'none' }, dendG);
    trunks.push({ path: inward, tip: pts[5] });
  });
  const axonPts = [[BIO.x + BIO.r - 4, BIO.y], [540, 700], [640, 682], [740, 696], [836, 690]];
  const axon = s('path', { d: spline(axonPts), fill: 'none', stroke: C.bio, 'stroke-width': 7, 'stroke-linecap': 'round' }, bioInner);
  s('path', { d: spline(axonPts), fill: 'none', stroke: '#ffd49a', 'stroke-opacity': 0.42, 'stroke-width': 26, 'stroke-linecap': 'round', 'stroke-dasharray': '50 34', 'stroke-dashoffset': -44 }, bioInner);
  const bulbs = [];
  [[916, 610], [934, 664], [934, 716], [914, 770]].forEach(([tx, ty]) => {
    s('path', { d: spline([[836, 690], [(836 + tx) / 2 + 6, (690 + ty) / 2 + (ty < 690 ? 8 : -8)], [tx, ty]]), fill: 'none', stroke: C.bio, 'stroke-width': 4, 'stroke-linecap': 'round' }, bioInner);
    bulbs.push(s('circle', { cx: tx, cy: ty, r: 9, fill: C.bio }, bioInner));
  });
  const somaGlow = s('circle', { cx: BIO.x, cy: BIO.y, r: BIO.r * 1.5, fill: C.bio2, opacity: 0, filter: 'url(#soft)' }, bioInner);
  // hillock + soma
  s('path', { d: `M${BIO.x + 30},${BIO.y - 44} Q${BIO.x + 78},${BIO.y - 10} ${BIO.x + 96},${BIO.y} Q${BIO.x + 78},${BIO.y + 10} ${BIO.x + 30},${BIO.y + 44}Z`, fill: C.bio }, bioInner);
  const soma = s('circle', { cx: BIO.x, cy: BIO.y, r: BIO.r, fill: 'url(#somaGrad)' }, bioInner);
  s('circle', { cx: BIO.x - 8, cy: BIO.y - 4, r: 22, fill: '#b5532f', opacity: 0.55 }, bioInner);
  const dendPulses = trunks.map(() => s('circle', { r: 9, fill: '#fff6e6', class: 'glow-bio', opacity: 0 }, bioInner));
  const spike = s('circle', { r: 12, fill: '#fff6e6', class: 'glow-bio', opacity: 0 }, bioInner);

  // =====================================================================
  // RIGHT WORLD: feed-forward network
  // =====================================================================
  const rightClip = s('g', { 'clip-path': 'url(#clipR)' }, svg);
  const aiWorld = s('g', {}, rightClip);
  const netEdgesG = s('g', { stroke: C.ai, 'stroke-width': 1.3 }, aiWorld);
  const netNodesG = s('g', {}, aiWorld);
  const netPulseG = s('g', {}, aiWorld);
  const layers = NET.sizes.map((n, li) => Array.from({ length: n }, (_, i) => ({ x: NET.xs[li], y: CY + (i - (n - 1) / 2) * NET.dy, li, i, fill: null, act: 0 })));
  const netEdges = [];
  for (let li = 0; li < layers.length - 1; li++) for (const a of layers[li]) for (const b of layers[li + 1]) {
    const w = rand() * 2 - 1;
    const el = s('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'stroke-opacity': 0.1 + Math.abs(w) * 0.16 }, netEdgesG);
    netEdges.push({ a, b, w, el, li });
  }
  for (const L of layers) for (const n of L) {
    s('circle', { cx: n.x, cy: n.y, r: NET.r, fill: C.bg, stroke: C.ai, 'stroke-width': 2 }, netNodesG);
    n.fill = s('circle', { cx: n.x, cy: n.y, r: NET.r - 1, fill: 'url(#nodeGrad)', opacity: 0.15 }, netNodesG);
  }
  const netPulses = Array.from({ length: 90 }, () => ({ el: s('circle', { r: 3, fill: '#e8fbff', opacity: 0 }, netPulseG), e: null, t0: 0 }));

  // =====================================================================
  // RIGHT DETAIL: one artificial neuron
  // =====================================================================
  const aiDetailWrap = s('g', {}, svg);
  const aiDetail = s('g', {}, aiDetailWrap);
  const aiInner = s('g', {}, aiDetail);
  const ins = IN_YS.map((y, i) => {
    const ang = Math.atan2(SUM.y - y, SUM.x - IN_X);
    const x1 = IN_X + Math.cos(ang) * 36, y1 = y + Math.sin(ang) * 36, x2 = SUM.x - Math.cos(ang) * (SUM.r + 2), y2 = SUM.y - Math.sin(ang) * (SUM.r + 2);
    s('line', { x1, y1, x2, y2, stroke: C.ai, 'stroke-width': 2 + Math.abs(WEIGHTS[i]) * 3, 'stroke-opacity': 0.55 }, aiInner);
    const px = lerp(x1, x2, 0.45), py = lerp(y1, y2, 0.45);
    const pill = s('g', { transform: `translate(${px},${py})` }, aiInner);
    const pillBg = s('rect', { x: -52, y: -22, width: 104, height: 44, rx: 22, fill: C.panel2, stroke: C.ai, 'stroke-width': 1.5 }, pill);
    s('text', { class: 't-num', 'text-anchor': 'middle', y: 8, fill: C.ai, text: `× ${fmt(WEIGHTS[i], 1)}` }, pill).style.fill = C.ai;
    s('circle', { cx: IN_X, cy: y, r: 34, fill: C.panel, stroke: C.ai, 'stroke-width': 2.5 }, aiInner);
    const val = s('text', { class: 't-num', x: IN_X, y: y + 8, 'text-anchor': 'middle', text: '0.0' }, aiInner);
    return { y, x1, y1, x2, y2, px, py, pillBg, val };
  });
  s('line', { x1: SUM.x + SUM.r, y1: CY, x2: ACT.x - ACT.size / 2, y2: CY, stroke: C.ai, 'stroke-width': 4, 'stroke-opacity': 0.7 }, aiInner);
  s('line', { x1: ACT.x + ACT.size / 2, y1: CY, x2: OUT.x - OUT.r, y2: CY, stroke: C.ai, 'stroke-width': 4, 'stroke-opacity': 0.7 }, aiInner);
  s('path', { d: `M${OUT.x + OUT.r},${CY} H${OUT.x + OUT.r + 46} m-14,-11 l14,11 l-14,11`, fill: 'none', stroke: C.ai, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-opacity': 0.7 }, aiInner);
  const sumGlow = s('circle', { cx: SUM.x, cy: SUM.y, r: SUM.r * 1.5, fill: C.ai, opacity: 0, filter: 'url(#soft)' }, aiInner);
  // the Σ node lives outside the fading detail group: on zoom-out it shrinks into its node in the network
  const sumMorph = s('g', {}, aiDetailWrap);
  const sumCircle = s('circle', { cx: 0, cy: 0, r: SUM.r, fill: C.panel, stroke: C.ai, 'stroke-width': 3 }, sumMorph);
  const sumLabel = s('g', {}, sumMorph);
  s('text', { x: 0, y: 6, 'text-anchor': 'middle', style: `font: 500 54px var(--serif); fill: ${C.ai}`, text: 'Σ' }, sumLabel);
  const sumVal = s('text', { class: 't-num', x: 0, y: 44, 'text-anchor': 'middle', text: '' }, sumLabel);
  sumVal.style.fontSize = '20px';
  // activation box with a sigmoid curve
  const hs = ACT.size / 2;
  s('rect', { x: ACT.x - hs, y: ACT.y - hs, width: ACT.size, height: ACT.size, rx: 22, fill: C.panel, stroke: C.ai, 'stroke-width': 3 }, aiInner);
  const sigPts = []; for (let i = 0; i <= 40; i++) { const z = -5 + (10 * i) / 40; sigPts.push([ACT.x - 42 + (84 * i) / 40, ACT.y + 36 - 72 * sigmoid(z)]); }
  s('line', { x1: ACT.x - 46, y1: ACT.y + 36, x2: ACT.x + 46, y2: ACT.y + 36, stroke: C.line, 'stroke-width': 2 }, aiInner);
  s('path', { d: spline(sigPts), fill: 'none', stroke: C.ai, 'stroke-width': 4, 'stroke-linecap': 'round' }, aiInner);
  const actDot = s('circle', { r: 8, fill: '#fff', class: 'glow-ai', cx: ACT.x, cy: ACT.y, opacity: 0 }, aiInner);
  const outFill = s('circle', { cx: OUT.x, cy: OUT.y, r: OUT.r, fill: 'url(#nodeGrad)', opacity: 0.2 }, aiInner);
  s('circle', { cx: OUT.x, cy: OUT.y, r: OUT.r, fill: 'none', stroke: C.ai, 'stroke-width': 3 }, aiInner);
  const outVal = s('text', { class: 't-num', x: OUT.x, y: OUT.y + 8, 'text-anchor': 'middle', text: '' }, aiInner);
  outVal.style.fill = '#06222a';
  const chips = ins.map(() => {
    const g = s('g', { opacity: 0 }, aiInner);
    s('circle', { r: 9, fill: '#eafcff', class: 'glow-ai' }, g);
    const t = s('text', { class: 't-num', y: -18, 'text-anchor': 'middle', text: '' }, g);
    t.style.fontSize = '21px';
    return { g, t };
  });
  const flowDot = s('circle', { r: 10, fill: '#eafcff', class: 'glow-ai', opacity: 0 }, aiInner);

  // =====================================================================
  // LABELS (step 2 of 'single')
  // =====================================================================
  const labels = s('g', {}, svg);
  const badge = (x, y, n, text, col, anchor = 'start') => {
    const g = s('g', { transform: `translate(${x},${y})` }, labels);
    const tx = s('text', { class: 't-label', x: anchor === 'start' ? 44 : -44, y: 8, 'text-anchor': anchor, text }, g);
    tx.style.fill = C.ink;
    s('circle', { r: 17, fill: col }, g);
    s('text', { 'text-anchor': 'middle', y: 7, style: 'font: 700 20px var(--mono); fill: #0a0c12', text: n }, g);
    return g;
  };
  badge(90, 392, '1', 'dendrites: signals come in', C.bio);
  badge(90, 990, '2', 'synapse strength', C.bio);
  badge(300, 540, '3', 'cell body adds them up', C.bio);
  badge(470, 772, '4', 'fires past a threshold', C.bio);
  badge(560, 606, '5', 'axon: signal goes out', C.bio);
  badge(IN_X - 30, 392, '1', 'inputs', C.ai);
  badge(ins[3].px - 30, ins[3].py + 62, '2', 'weights', C.ai);
  badge(SUM.x - 30, 590, '3', 'sum', C.ai);
  badge(ACT.x - 20, 790, '4', 'activation', C.ai);
  badge(OUT.x - 50, 612, '5', 'output', C.ai);

  // divider between the two halves
  const divider = s('line', { x1: 960, y1: 420, x2: 960, y2: 980, stroke: C.line, 'stroke-width': 2, 'stroke-dasharray': '4 10' }, svg);
  const sideL = s('text', { class: 't-small', x: 920, y: 1006, 'text-anchor': 'end', text: 'BIOLOGICAL NEURON' }, svg);
  const sideR = s('text', { class: 't-small', x: 1810, y: 1006, 'text-anchor': 'end', text: 'ARTIFICIAL NEURON' }, svg);
  sideL.style.fill = C.bio; sideR.style.fill = C.ai;

  // =====================================================================
  // UAT: one hidden layer fits a curve
  // =====================================================================
  const uat = s('g', {}, svg);
  const U = { inX: 190, hidX: 420, outX: 650, cy: 700, top: 420, bot: 980, px: 830, py: 410, pw: 980, ph: 540 };
  const NS = [1, 3, 8, 40];
  const MAXN = 40;
  const uEdges = s('g', { stroke: C.ai, 'stroke-width': 1.2 }, uat);
  const uNodes = s('g', {}, uat);
  s('circle', { cx: U.inX, cy: U.cy, r: 24, fill: C.panel, stroke: C.ai, 'stroke-width': 2.5 }, uat);
  s('text', { class: 't-num', x: U.inX, y: U.cy + 8, 'text-anchor': 'middle', text: 'x' }, uat);
  s('circle', { cx: U.outX, cy: U.cy, r: 24, fill: C.panel, stroke: C.ai, 'stroke-width': 2.5 }, uat);
  s('text', { class: 't-num', x: U.outX, y: U.cy + 8, 'text-anchor': 'middle', text: 'y' }, uat);
  const hid = Array.from({ length: MAXN }, () => ({
    e1: s('line', { x1: U.inX + 24, y1: U.cy, 'stroke-opacity': 0.5 }, uEdges), e2: s('line', { x2: U.outX - 24, y2: U.cy, 'stroke-opacity': 0.5 }, uEdges),
    c: s('circle', { cx: U.hidX, r: 10, fill: 'url(#nodeGrad)' }, uNodes), y: U.cy, o: 0,
  }));
  const uCount = s('text', { x: U.hidX, y: 400, 'text-anchor': 'middle', style: `font: 600 30px var(--mono); fill: ${C.ai}`, text: '' }, uat);
  
  // plot
  s('rect', { x: U.px, y: U.py, width: U.pw, height: U.ph, rx: 18, fill: C.panel, stroke: C.line, 'stroke-width': 1.5 }, uat);
  for (let i = 1; i < 4; i++) s('line', { x1: U.px, x2: U.px + U.pw, y1: U.py + (U.ph * i) / 4, y2: U.py + (U.ph * i) / 4, stroke: C.line, 'stroke-opacity': 0.5 }, uat);
  const f = (x) => 0.5 + 0.27 * Math.sin(2 * Math.PI * 1.1 * x + 0.4) + 0.13 * Math.sin(2 * Math.PI * 2.7 * x + 1.3) + 0.06 * Math.sin(2 * Math.PI * 5 * x);
  const SAMPLES = 240;
  const X = (x) => U.px + 40 + x * (U.pw - 80), Y = (v) => U.py + U.ph - 50 - v * (U.ph - 100);
  // N soft steps = best piecewise-constant fit with N+1 levels (each hidden neuron contributes one step)
  const segMean = (a, b) => { let t = 0; for (let i = 0; i <= 20; i++) t += f(a + ((b - a) * i) / 20); return t / 21; };
  const approx = (N) => {
    const lv = Array.from({ length: N + 1 }, (_, j) => segMean(j / (N + 1), (j + 1) / (N + 1)));
    const out = new Float64Array(SAMPLES + 1);
    for (let j = 0; j <= SAMPLES; j++) {
      const x = j / SAMPLES; let v = lv[0];
      for (let i = 0; i < N; i++) v += (lv[i + 1] - lv[i]) * sigmoid(4.5 * (N + 1) * (x - (i + 1) / (N + 1)));
      out[j] = v;
    }
    return out;
  };
  const curves = NS.map(approx);
  const toD = (arr) => { let d = ''; for (let j = 0; j <= SAMPLES; j++) d += `${j ? 'L' : 'M'}${X(j / SAMPLES).toFixed(1)},${Y(arr[j]).toFixed(1)}`; return d; };
  const target = new Float64Array(SAMPLES + 1).map((_, j) => f(j / SAMPLES));
  s('path', { d: toD(target), fill: 'none', stroke: C.ink, 'stroke-width': 3, 'stroke-dasharray': '3 11', 'stroke-linecap': 'round', opacity: 0.85 }, uat);
  const fitGlow = s('path', { fill: 'none', stroke: C.ai, 'stroke-width': 14, opacity: 0.18, 'stroke-linejoin': 'round' }, uat);
  const fitPath = s('path', { fill: 'none', stroke: C.ai, 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, uat);
  const lg = s('g', { transform: `translate(${U.px + 36},${U.py + 44})` }, uat);
  s('line', { x1: 0, x2: 54, y1: 0, y2: 0, stroke: C.ink, 'stroke-width': 3, 'stroke-dasharray': '3 11', 'stroke-linecap': 'round' }, lg);
  s('text', { class: 't-label', x: 70, y: 8, text: 'the function we want' }, lg);
  s('line', { x1: 340, x2: 394, y1: 0, y2: 0, stroke: C.ai, 'stroke-width': 5, 'stroke-linecap': 'round' }, lg);
  s('text', { class: 't-label', x: 410, y: 8, text: 'what the network computes' }, lg);
  s('text', { class: 't-small', x: U.px + U.pw - 36, y: U.py + U.ph - 30, 'text-anchor': 'end', text: 'y = Σ wᵢ · σ(aᵢ·x + bᵢ)' }, uat).style.fontSize = '24px';
  const fit = { cur: Float64Array.from(curves[0]), from: null, to: null, t: 0 };
  const drawFit = () => { const d = toD(fit.cur); fitPath.setAttribute('d', d); fitGlow.setAttribute('d', d); };
  drawFit();
  let uatN = -1;
  function setUat(N, instant) {
    if (N === uatN && !instant) return; uatN = N;
    const n = NS[N], spacing = Math.min(84, (U.bot - U.top - 40) / Math.max(1, n - 1)), r = clamp(spacing * 0.36, 4.5, 20);
    hid.forEach((hnode, i) => {
      const on = i < n, y = on ? U.cy + 10 + (i - (n - 1) / 2) * spacing : U.cy + 10;
      const st = { y: hnode.y, o: hnode.o, r: +hnode.c.getAttribute('r') };
      gsap.killTweensOf(hnode);
      const apply = () => {
        hnode.c.setAttribute('cy', hnode.y); hnode.c.setAttribute('opacity', hnode.o);
        hnode.e1.setAttribute('x2', U.hidX - hnode.rr); hnode.e1.setAttribute('y2', hnode.y); hnode.e2.setAttribute('x1', U.hidX + hnode.rr); hnode.e2.setAttribute('y1', hnode.y);
        hnode.e1.setAttribute('opacity', hnode.o); hnode.e2.setAttribute('opacity', hnode.o); hnode.c.setAttribute('r', hnode.rr);
      };
      hnode.rr = st.r;
      gsap.to(hnode, { y, o: on ? 1 : 0, rr: r, duration: instant ? 0 : 0.9, delay: instant || !on ? 0 : Math.min(i * 0.015, 0.4), ease: 'power3.inOut', onUpdate: apply, onComplete: apply });
    });
    uCount.textContent = n === 1 ? '1 neuron' : `${n} neurons`;
    fit.from = Float64Array.from(fit.cur); fit.to = curves[N]; fit.t = 0;
    gsap.killTweensOf(fit);
    gsap.to(fit, { t: 1, duration: instant ? 0 : 1.2, ease: 'power2.inOut', onUpdate: () => { for (let j = 0; j <= SAMPLES; j++) fit.cur[j] = lerp(fit.from[j], fit.to[j], fit.t); drawFit(); } });
    if (instant) { fit.cur.set(curves[N]); drawFit(); }
  }

  // =====================================================================
  // ZOOM: glue detail drawings to their node in the zoomed-out world
  // =====================================================================
  const zoom = { k: 0 };
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  function applyZoom() {
    const k = zoom.k;
    // right
    const sa = Math.pow(S_AI, 1 - k), ax = lerp(SUM.x, N0.x, k), ay = lerp(SUM.y, N0.y, k);
    aiWorld.setAttribute('transform', `translate(${ax - sa * N0.x},${ay - sa * N0.y}) scale(${sa})`);
    const da = sa / S_AI;
    aiDetail.setAttribute('transform', `translate(${ax - da * SUM.x},${ay - da * SUM.y}) scale(${da})`);
    aiDetail.setAttribute('opacity', 1 - sm(k * 1.5));
    const e = sm(k), rs = SUM.r * (1 - e) + NET.r * sa * e;
    sumMorph.setAttribute('transform', `translate(${ax},${ay}) scale(${rs / SUM.r})`);
    sumLabel.setAttribute('opacity', 1 - sm(k * 1.6));
    sumCircle.setAttribute('opacity', 1 - sm((k - 0.85) * 7));
    aiWorld.setAttribute('opacity', sm((k - 0.05) * 1.6));
    // left
    const sb = Math.pow(S_BIO, 1 - k), bx = lerp(BIO.x, b0.x, k), by = lerp(BIO.y, b0.y, k);
    bioWorld.setAttribute('transform', `translate(${bx - sb * b0.x},${by - sb * b0.y}) scale(${sb})`);
    const db = sb / S_BIO;
    bioInner.setAttribute('transform', `translate(${bx - db * BIO.x},${by - db * BIO.y}) scale(${db})`);
    bioInner.setAttribute('opacity', 1 - sm(k * 1.35));
    bioWorld.setAttribute('opacity', sm((k - 0.1) * 1.5));
  }
  applyZoom();

  // =====================================================================
  // LOOPS
  // =====================================================================
  const loops = new Loops();
  const vr = rng(99);
  loops.add('single', () => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7 });
    let xs = [0, 0, 0, 0], z = 0, y = 0;
    tl.call(() => {
      xs = xs.map(() => Math.round(vr() * 10) / 10);
      z = xs.reduce((a, x, i) => a + x * WEIGHTS[i], 0); y = sigmoid(z);
      ins.forEach((inp, i) => { inp.val.textContent = xs[i].toFixed(1); });
      sumVal.textContent = ''; outVal.textContent = '';
      gsap.set(outFill, { opacity: 0.2 }); gsap.set(actDot, { opacity: 0 });
    }, null, 0);
    // biological: pulses run down the dendrites
    trunks.forEach((t, i) => {
      tl.fromTo(dendPulses[i], { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0.25 + i * 0.07);
      tl.fromTo(dendPulses[i], { motionPath: { path: t.path, start: 0, end: 0 } }, { motionPath: { path: t.path, start: 0, end: 0.97 }, duration: 1.0, ease: 'power1.in', immediateRender: false }, 0.25 + i * 0.07);
      tl.to(dendPulses[i], { opacity: 0, duration: 0.12 }, 1.2 + i * 0.07);
    });
    // artificial: numbers run down the wires, get multiplied on the way
    ins.forEach((inp, i) => {
      const ch = chips[i], st = { p: 0 };
      tl.set(ch.g, { opacity: 1 }, 0.3 + i * 0.07);
      tl.fromTo(st, { p: 0 }, {
        p: 1, duration: 1.05, ease: 'power1.inOut', immediateRender: false,
        onUpdate: () => {
          ch.g.setAttribute('transform', `translate(${lerp(inp.x1, inp.x2, st.p)},${lerp(inp.y1, inp.y2, st.p)})`);
          ch.t.textContent = st.p < 0.45 ? xs[i].toFixed(1) : fmt(xs[i] * WEIGHTS[i]);
          inp.pillBg.setAttribute('fill', Math.abs(st.p - 0.45) < 0.08 ? C.ai : C.panel2);
          inp.pillBg.setAttribute('fill-opacity', Math.abs(st.p - 0.45) < 0.08 ? 0.35 : 1);
        },
      }, 0.3 + i * 0.07);
      tl.set(ch.g, { opacity: 0 }, 1.38 + i * 0.07);
    });
    // integrate
    tl.call(() => { sumVal.textContent = fmt(z); }, null, 1.6);
    tl.fromTo([somaGlow, sumGlow], { opacity: 0 }, { opacity: 0.75, duration: 0.18, yoyo: true, repeat: 1 }, 1.58);
    tl.fromTo(soma, { scale: 1 }, { scale: 1.07, transformOrigin: '50% 50%', duration: 0.18, yoyo: true, repeat: 1 }, 1.58);
    // fire
    tl.fromTo(spike, { opacity: 0 }, { opacity: 1, duration: 0.1 }, 1.9);
    tl.fromTo(spike, { motionPath: { path: axon, start: 0, end: 0 } }, { motionPath: { path: axon, start: 0, end: 1 }, duration: 0.85, ease: 'power1.inOut', immediateRender: false }, 1.9);
    tl.to(spike, { opacity: 0, duration: 0.1 }, 2.72);
    tl.fromTo(bulbs, { scale: 1 }, { scale: 1.7, transformOrigin: '50% 50%', duration: 0.2, yoyo: true, repeat: 1, stagger: 0.03 }, 2.72);
    tl.fromTo(bulbs, { fill: C.bio }, { fill: '#fff6e6', duration: 0.2, yoyo: true, repeat: 1, stagger: 0.03 }, 2.72);
    tl.fromTo(flowDot, { attr: { cx: SUM.x + SUM.r, cy: CY }, opacity: 1 }, { attr: { cx: ACT.x - hs }, duration: 0.3, ease: 'none', immediateRender: false }, 1.9);
    tl.set(flowDot, { opacity: 0 }, 2.2);
    tl.call(() => { gsap.set(actDot, { opacity: 1, attr: { cx: ACT.x - 42 + 84 * clamp((z + 5) / 10, 0, 1), cy: ACT.y + 36 - 72 * y } }); }, null, 2.2);
    tl.fromTo(flowDot, { attr: { cx: ACT.x + hs }, opacity: 1 }, { attr: { cx: OUT.x - OUT.r }, duration: 0.3, ease: 'none', immediateRender: false }, 2.42);
    tl.set(flowDot, { opacity: 0 }, 2.72);
    tl.call(() => { outVal.textContent = y.toFixed(2); gsap.to(outFill, { opacity: 0.25 + 0.75 * y, duration: 0.25 }); }, null, 2.72);
    tl.to({}, { duration: 0.8 }, 2.9);
    return tl;
  });

  // mesh + network pulses, driven by one ticker
  let worldOn = false, last = 0, fireClock = 0, waveClock = 0;
  const spawnMesh = (e) => { const p = meshPulses.find((q) => !q.e); if (!p) return; p.e = e; p.t = 0; p.dur = 0.55 + Math.hypot(e.b.x - e.a.x, e.b.y - e.a.y) / 260; };
  const flash = (m) => gsap.fromTo(m.glow, { opacity: 0.85 }, { opacity: 0, duration: 0.6, overwrite: true });
  function wave() {
    // a forward pass: activations ripple layer by layer
    let acts = layers[0].map(() => vr());
    layers.forEach((L, li) => {
      if (li > 0) acts = L.map((n) => sigmoid(netEdges.filter((e) => e.b === n).reduce((a, e) => a + e.w * e.a.act, 0) * 2.2));
      L.forEach((n, i) => { n.act = acts[i]; gsap.to(n.fill, { opacity: 0.12 + 0.88 * acts[i], duration: 0.3, delay: li * 0.42, overwrite: true }); });
    });
    const now = performance.now() / 1000;
    for (const e of netEdges) {
      const strength = Math.abs(e.w) * e.a.act;
      if (strength < 0.33) continue;
      const p = netPulses.find((q) => !q.e); if (!p) break;
      p.e = e; p.t0 = now + e.li * 0.42 + 0.06;
    }
  }
  function tick() {
    if (!worldOn) return;
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    fireClock -= dt;
    if (fireClock <= 0) { fireClock = 0.16 + vr() * 0.2; const src = mesh.filter((m) => m.c <= 1); const m = src[Math.floor(vr() * src.length)]; flash(m); m.out.forEach(spawnMesh); }
    for (const p of meshPulses) {
      if (!p.e) continue;
      p.t += dt / p.dur;
      if (p.t >= 1) { const b = p.e.b; p.e = null; p.el.setAttribute('opacity', 0); flash(b); b.out.forEach((e) => vr() < 0.6 && spawnMesh(e)); continue; }
      const { a, b, c } = p.e, t = p.t, u = 1 - t;
      p.el.setAttribute('cx', u * u * a.x + 2 * u * t * c[0] + t * t * b.x); p.el.setAttribute('cy', u * u * a.y + 2 * u * t * c[1] + t * t * b.y); p.el.setAttribute('opacity', 0.95);
    }
    waveClock -= dt; if (waveClock <= 0) { waveClock = 2.5; wave(); }
    for (const p of netPulses) {
      if (!p.e) continue;
      const t = (now - p.t0) / 0.4;
      if (t < 0) continue;
      if (t >= 1) { p.e = null; p.el.setAttribute('opacity', 0); continue; }
      p.el.setAttribute('cx', lerp(p.e.a.x, p.e.b.x, t)); p.el.setAttribute('cy', lerp(p.e.a.y, p.e.b.y, t)); p.el.setAttribute('opacity', 0.9);
    }
  }
  gsap.ticker.add(tick);
  function setWorld(on) {
    if (on === worldOn) return; worldOn = on; last = performance.now() / 1000; fireClock = 0; waveClock = 0.6;
    if (!on) { meshPulses.forEach((p) => { p.e = null; p.el.setAttribute('opacity', 0); }); netPulses.forEach((p) => { p.e = null; p.el.setAttribute('opacity', 0); }); }
  }

  // =====================================================================
  // STATE MACHINE
  // =====================================================================
  function update({ state, step, instant }) {
    const to = mover(instant);
    const single = state === 'single', network = state === 'network', isUat = state === 'uat';
    // zoom
    gsap.killTweensOf(zoom);
    if (instant) { zoom.k = single ? 0 : 1; applyZoom(); }
    else gsap.to(zoom, { k: single ? 0 : 1, duration: 2.0, ease: 'power2.inOut', onUpdate: applyZoom });
    // stays visible while zooming out: applyZoom fades the detail and shrinks Σ into its network node
    to(aiDetailWrap, { autoAlpha: (single && step >= 1) || network ? 1 : 0, duration: 0.9 });
    to(bioDetail, { autoAlpha: isUat ? 0 : 1 });
    to(labels, { autoAlpha: single && step >= 2 ? 1 : 0, duration: 0.6 });
    to(divider, { autoAlpha: isUat ? 0 : single && step < 1 ? 0 : 1 });
    to(sideL, { autoAlpha: isUat ? 0 : 1 }); to(sideR, { autoAlpha: isUat || (single && step < 1) ? 0 : 1 });
    sideL.textContent = single ? 'BIOLOGICAL NEURON' : 'A BRAIN: ~86 BILLION OF THEM';
    sideR.textContent = single ? 'ARTIFICIAL NEURON' : 'A NEURAL NETWORK';
    // uat: both halves leave, the simple network + plot arrive
    to(leftClip, { autoAlpha: isUat ? 0 : 1, x: isUat ? -200 : 0 });
    to(rightClip, { autoAlpha: isUat ? 0 : 1, x: isUat ? -700 : 0, duration: 1.0 });
    to(uat, { autoAlpha: isUat ? 1 : 0, x: isUat ? 0 : 240, duration: 1.0 });
    if (isUat) setUat(step, instant);
    loops.only(...(single ? ['single'] : []));
    setWorld(network || (single && false));
    if (network) setWorld(true);
  }

  return { update, exit() { loops.stop(); setWorld(false); } };
}
