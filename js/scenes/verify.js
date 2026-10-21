// Scene "verify": is your work AI-verifiable? A decision flowchart that builds one branch per step.
// Steps: 0 the question · 1 yes: verifiable, let it run · 2 maybe: build a judge, test it · 3 no: you're the judge
import { gsap, h, s, svgRoot, C, mover } from '../lib.js';

// node boxes in stage coordinates: [x, y, w, h] with (x, y) the centre
const N = {
  q: [960, 340, 860, 150],
  yes: [330, 640, 440, 110], yesOut: [330, 860, 470, 150],
  judge: [960, 570, 420, 90], eval: [960, 775, 660, 160],
  no: [1590, 640, 440, 110], noOut: [1590, 860, 520, 150],
};
const top = (k) => [N[k][0], N[k][1] - N[k][3] / 2], bottom = (k) => [N[k][0], N[k][1] + N[k][3] / 2];
const left = (k) => [N[k][0] - N[k][2] / 2, N[k][1]], right = (k) => [N[k][0] + N[k][2] / 2, N[k][1]];

export default function create(root) {
  const svg = svgRoot(root);
  s('defs', {}, svg).innerHTML = `<marker id="vArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.dim}"/></marker>`;
  const edge = (from, to, label, lx, ly) => {
    const p = s('path', { d: `M${from[0]},${from[1]} L${to[0]},${to[1]}`, fill: 'none', stroke: C.dim, 'stroke-width': 3 }, svg);
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    p.setAttribute('stroke-dasharray', len); p.setAttribute('stroke-dashoffset', len);
    const t = label ? s('text', { x: lx, y: ly, 'text-anchor': 'middle', style: `font: 600 26px var(--mono); fill: ${C.ink}; paint-order: stroke; stroke: ${C.bg}; stroke-width: 10px`, text: label, opacity: 0 }, svg) : null;
    return { p, t, len };
  };
  const qBottom = bottom('q');
  const E = {
    yes: edge([qBottom[0] - 230, qBottom[1] - 18], top('yes'), 'Yes', 560, 500),
    maybe: edge(qBottom, top('judge'), 'Maybe', 1040, 465),
    no: edge([qBottom[0] + 230, qBottom[1] - 18], top('no'), 'No', 1360, 500),
    judgeEval: edge(bottom('judge'), top('eval')),
    evalYes: edge(left('eval'), right('yes'), 'Yes', 610, 680),
    evalNo: edge(right('eval'), left('no'), 'No', 1310, 680),
    yesOut: edge(bottom('yes'), top('yesOut')),
    noOut: edge(bottom('no'), top('noOut')),
  };

  const box = (k, html, style) => {
    const [x, y, w, hh] = N[k];
    return h('div', { html, style: `position:absolute;left:${x - w / 2}px;top:${y - hh / 2}px;width:${w}px;height:${hh}px;display:grid;place-items:center;text-align:center;padding:0 26px;box-sizing:border-box;visibility:hidden;opacity:0;${style}` }, root);
  };
  const B = {
    q: box('q', 'Can AI, or a test, tell if<br>the finished work is good?', 'border-radius:50%;border:3px solid var(--ink);background:var(--panel);font:500 34px/1.25 var(--sans);padding:0 90px'),
    yes: box('yes', 'You have verifiable work', `border-radius:18px;border:3px solid ${C.ok};background:#10201a;font:600 32px var(--sans)`),
    yesOut: box('yesOut', 'Let it run. Close the loop, delegate as much as you can, get out of the way.', 'border-radius:18px;border:2px solid var(--line);background:var(--panel);font:400 27px/1.3 var(--sans);color:var(--dim)'),
    judge: box('judge', 'Build an AI judge', `border-radius:18px;border:3px solid ${C.ai};background:#12222b;font:600 30px var(--sans)`),
    eval: box('eval', 'Test the judge on work<br>you already graded.<br>Is it good enough?', 'border-radius:50%;border:3px solid var(--ink);background:var(--panel);font:500 27px/1.3 var(--sans);padding:0 90px'),
    no: box('no', 'You’re the judge', `border-radius:18px;border:3px solid ${C.gold};background:#231d10;font:600 32px var(--sans)`),
    noOut: box('noOut', 'AI as a helper. One or two tasks at a time, remove bottlenecks, protect your focus.', 'border-radius:18px;border:2px solid var(--line);background:var(--panel);font:400 27px/1.3 var(--sans);color:var(--dim)'),
  };
  const pulse = s('circle', { r: 11, fill: '#eafcff', class: 'glow-ai', opacity: 0 }, svg);

  // what each step adds: boxes, then edges
  const STEP = [
    { boxes: ['q'], edges: [] },
    { boxes: ['yes', 'yesOut'], edges: ['yes', 'yesOut'] },
    { boxes: ['judge', 'eval'], edges: ['maybe', 'judgeEval', 'evalYes'] },
    { boxes: ['no', 'noOut'], edges: ['no', 'noOut', 'evalNo'] },
  ];
  // the path the pulse runs on each step
  const RUN = [[], ['yes', 'yesOut'], ['maybe', 'judgeEval', 'evalYes'], ['no', 'noOut']];
  let tl = null;

  function update({ step, instant }) {
    const to = mover(instant);
    tl && tl.kill(); tl = null; gsap.set(pulse, { opacity: 0 });
    const shown = new Set(STEP.slice(0, step + 1).flatMap((x) => x.boxes));
    const drawn = new Set(STEP.slice(0, step + 1).flatMap((x) => x.edges));
    const fresh = new Set(STEP[step].edges);
    for (const k in B) to(B[k], { autoAlpha: shown.has(k) ? 1 : 0, scale: shown.has(k) ? 1 : 0.92, duration: 0.5, delay: shown.has(k) && STEP[step].boxes.includes(k) && !instant ? 0.35 + STEP[step].boxes.indexOf(k) * 0.35 : 0 });
    let d = 0;
    for (const k in E) {
      const e = E[k], on = drawn.has(k);
      const delay = on && fresh.has(k) && !instant ? (d++) * 0.35 : 0;
      // the arrowhead appears only once its line is fully drawn
      if (!on || !instant) e.p.removeAttribute('marker-end');
      to(e.p, { attr: { 'stroke-dashoffset': on ? 0 : e.len }, duration: 0.5, delay, ease: 'power2.inOut', onComplete: on ? () => e.p.setAttribute('marker-end', 'url(#vArrow)') : undefined });
      if (on && instant) e.p.setAttribute('marker-end', 'url(#vArrow)');
      if (e.t) to(e.t, { opacity: on ? 1 : 0, duration: 0.3, delay: delay + 0.2 });
    }
    if (!instant && RUN[step].length) {
      tl = gsap.timeline({ delay: 1.6, repeat: -1, repeatDelay: 1.2 });
      tl.set(pulse, { opacity: 1 });
      RUN[step].forEach((k) => tl.fromTo(pulse, { motionPath: { path: E[k].p, start: 0, end: 0 } }, { motionPath: { path: E[k].p, start: 0, end: 1 }, duration: 0.7, ease: 'power1.inOut', immediateRender: false }));
      tl.to(pulse, { opacity: 0, duration: 0.25 });
    }
  }
  return { update, exit() { tl && tl.kill(); tl = null; } };
}
