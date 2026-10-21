// Scene "verify": is your work AI-verifiable? A top-down flowchart (decisions as diamonds, steps as
// boxes, outcomes as pills, right-angle connectors) that builds one branch per step.
// Steps: 0 the question · 1 yes: verifiable, let it run · 2 maybe: build a judge, test it · 3 no: you're the judge
import { gsap, h, s, svgRoot, C, mover } from '../lib.js';

// shapes: [kind, cx, cy, w, h, html, colour]
const NODES = {
  q: ['diamond', 960, 345, 620, 200, 'Can AI or a test tell<br>if the result is good?', C.ink],
  judge: ['box', 960, 540, 380, 70, 'Build an AI judge', C.ai],
  q2: ['diamond', 960, 740, 640, 230, 'Build an eval to test<br>your judge. Is it<br>good enough?', C.ink],
  ver: ['box', 330, 740, 400, 90, 'You have verifiable work', C.ok],
  verEnd: ['pill', 330, 935, 470, 116, 'Let it run: close the loop, delegate, get out of the way', C.ok],
  me: ['box', 1590, 740, 400, 90, 'You’re the judge', C.gold],
  meEnd: ['pill', 1590, 935, 520, 116, 'AI as a helper: one or two tasks at a time, protect your focus', C.gold],
};
// connectors as right-angle polylines; label position
const EDGES = {
  yes: [[[650, 345], [330, 345], [330, 695]], 'Yes', 490, 329],
  maybe: [[[960, 445], [960, 505]], 'Maybe', 1030, 485],
  no: [[[1270, 345], [1590, 345], [1590, 695]], 'No', 1430, 329],
  judgeQ2: [[[960, 575], [960, 625]]],
  q2Yes: [[[640, 740], [530, 740]], 'Yes', 585, 724],
  q2No: [[[1280, 740], [1390, 740]], 'No', 1335, 724],
  verEnd: [[[330, 785], [330, 877]]],
  meEnd: [[[1590, 785], [1590, 877]]],
};
const STEP = [
  { nodes: ['q'], edges: [] },
  { nodes: ['ver', 'verEnd'], edges: ['yes', 'verEnd'] },
  { nodes: ['judge', 'q2'], edges: ['maybe', 'judgeQ2', 'q2Yes'] },
  { nodes: ['me', 'meEnd'], edges: ['no', 'meEnd', 'q2No'] },
];
const RUN = [[], ['yes', 'verEnd'], ['maybe', 'judgeQ2', 'q2Yes'], ['no', 'meEnd']];

export default function create(root) {
  const svg = svgRoot(root);
  s('defs', {}, svg).innerHTML = `<marker id="vArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.dim}"/></marker>`;
  const edgesG = s('g', {}, svg), nodesG = s('g', {}, svg);

  const E = {};
  for (const k in EDGES) {
    const [pts, label, lx, ly] = EDGES[k];
    const p = s('path', { d: pts.map((q, i) => `${i ? 'L' : 'M'}${q[0]},${q[1]}`).join(''), fill: 'none', stroke: C.dim, 'stroke-width': 3, 'stroke-linejoin': 'round' }, edgesG);
    let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    p.setAttribute('stroke-dasharray', len); p.setAttribute('stroke-dashoffset', len);
    const t = label ? s('text', { x: lx, y: ly, 'text-anchor': 'middle', style: `font: 600 25px var(--mono); fill: ${C.ink}; paint-order: stroke; stroke: ${C.bg}; stroke-width: 10px`, text: label, opacity: 0 }, edgesG) : null;
    E[k] = { p, t, len };
  }

  const NN = {};
  for (const k in NODES) {
    const [kind, cx, cy, w, hh, html, col] = NODES[k];
    const g = s('g', { opacity: 0 }, nodesG);
    const fill = col === C.ok ? '#10201a' : col === C.gold ? '#231d10' : col === C.ai ? '#12222b' : C.panel;
    if (kind === 'diamond') s('polygon', { points: `${cx},${cy - hh / 2} ${cx + w / 2},${cy} ${cx},${cy + hh / 2} ${cx - w / 2},${cy}`, fill, stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
    else s('rect', { x: cx - w / 2, y: cy - hh / 2, width: w, height: hh, rx: kind === 'pill' ? hh / 2 : 12, fill, stroke: col, 'stroke-width': 3 }, g);
    const textW = kind === 'diamond' ? w * 0.62 : w - 60;
    const size = kind === 'pill' && hh > 100 ? 25 : kind === 'diamond' ? 27 : 28;
    const weight = kind === 'box' && col !== C.ai ? 600 : 500;
    const lbl = h('div', {
      html,
      style: `position:absolute;left:${cx - textW / 2}px;top:${cy - hh / 2}px;width:${textW}px;height:${hh}px;display:grid;place-items:center;text-align:center;visibility:hidden;opacity:0;font:${weight} ${size}px/1.25 var(--sans);color:var(--ink)`,
    }, root);
    NN[k] = { g, lbl };
  }
  const pulse = s('circle', { r: 11, fill: '#eafcff', class: 'glow-ai', opacity: 0 }, svg);
  let tl = null;

  function update({ step, instant }) {
    const to = mover(instant);
    tl && tl.kill(); tl = null; gsap.set(pulse, { opacity: 0 });
    const shown = new Set(STEP.slice(0, step + 1).flatMap((x) => x.nodes));
    const drawn = new Set(STEP.slice(0, step + 1).flatMap((x) => x.edges));
    const freshNodes = STEP[step].nodes, freshEdges = STEP[step].edges;
    // new pieces appear in the order the eye follows them: edge, node, edge, node…
    let order = [];
    if (step === 0) order = [['n', 'q']];
    else {
      RUN[step].forEach((e, i) => { order.push(['e', e]); if (freshNodes[i]) order.push(['n', freshNodes[i]]); });
      freshNodes.slice(RUN[step].length).forEach((n) => order.push(['n', n]));
      freshEdges.filter((e) => !RUN[step].includes(e)).forEach((e) => order.push(['e', e]));
    }
    const delayOf = (type, k) => { const i = order.findIndex(([t, x]) => t === type && x === k); return i < 0 || instant ? 0 : 0.25 + i * 0.3; };
    for (const k in NN) {
      const on = shown.has(k), d = on && freshNodes.includes(k) ? delayOf('n', k) : 0;
      to(NN[k].g, { opacity: on ? 1 : 0, duration: 0.4, delay: d });
      to(NN[k].lbl, { autoAlpha: on ? 1 : 0, duration: 0.4, delay: d });
    }
    for (const k in E) {
      const e = E[k], on = drawn.has(k), d = on && freshEdges.includes(k) ? delayOf('e', k) : 0;
      // the arrowhead appears only once its line is fully drawn
      if (!on || !instant) e.p.removeAttribute('marker-end');
      to(e.p, { attr: { 'stroke-dashoffset': on ? 0 : e.len }, duration: 0.45, delay: d, ease: 'power2.inOut', onComplete: on ? () => e.p.setAttribute('marker-end', 'url(#vArrow)') : undefined });
      if (on && instant) e.p.setAttribute('marker-end', 'url(#vArrow)');
      if (e.t) to(e.t, { opacity: on ? 1 : 0, duration: 0.3, delay: d + 0.15 });
    }
    if (!instant && RUN[step].length) {
      tl = gsap.timeline({ delay: 0.6 + order.length * 0.3, repeat: -1, repeatDelay: 1.2 });
      tl.set(pulse, { opacity: 1 });
      RUN[step].forEach((k) => tl.fromTo(pulse, { motionPath: { path: E[k].p, start: 0, end: 0 } }, { motionPath: { path: E[k].p, start: 0, end: 1 }, duration: 0.25 + E[k].len / 900, ease: 'none', immediateRender: false }));
      tl.to(pulse, { opacity: 0, duration: 0.25 });
    }
  }
  return { update, exit() { tl && tl.kill(); tl = null; } };
}
