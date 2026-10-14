// Scene "loop": goals, verification and workflow.
// States: 'close'    (0 open loop: a claim · 1 closed loop: goal + check · 2 ways to close the loop)
//         'workflow' (0 plan → do → verify → review · 1 small steps, checked often)
import { gsap, h, s, svgRoot, C, mover, Loops } from '../lib.js';

export default function create(root) {
  const svg = svgRoot(root);
  const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
  const div = (html, style, parent = root) => h('div', { html, style: 'position:absolute;' + css(style) }, parent);

  // ---------- open loop ----------
  const open = div('', { left: '110px', top: '400px', width: '1700px', height: '600px' });
  div('“Add the signature check.”', { left: '0', top: '60px', font: '400 32px var(--sans)', padding: '16px 22px', 'border-radius': '20px', background: '#2b2118', border: '1px solid #5a4024', color: '#ffe6c7' }, open);
  div('→', { left: '470px', top: '56px', font: '400 54px var(--sans)', color: 'var(--faint)' }, open);
  div('model', { left: '560px', top: '20px', width: '170px', height: '170px', 'border-radius': '50%', border: '3px solid var(--ai)', background: '#10222b', display: 'grid', 'place-content': 'center', font: '500 34px var(--serif)' }, open);
  div('→', { left: '760px', top: '56px', font: '400 54px var(--sans)', color: 'var(--faint)' }, open);
  const claim = div('“Done! I added the check, ran the tests and everything passes. ✅”', { left: '860px', top: '36px', width: '700px', font: '400 34px/1.3 var(--sans)', padding: '20px 26px', 'border-radius': '22px', background: '#12222b', border: '2px solid #235060', color: '#dff7fd' }, open);
  const audit = div('<div style="font:600 20px var(--mono);letter-spacing:.12em;color:var(--faint);margin-bottom:10px">WHAT ACTUALLY HAPPENED</div><div class="codecard" style="font-size:26px;border-color:var(--bad)">files edited:   1\ntests run:      <span class="bad">0</span>\ncommands run:   <span class="bad">0</span></div>', { left: '860px', top: '250px', width: '520px' }, open);
  const stamp = div('a claim, not a result', { left: '1410px', top: '300px', 'white-space': 'nowrap', font: '600 30px var(--serif)', color: 'var(--bad)', transform: 'rotate(-6deg)', border: '3px solid var(--bad)', padding: '8px 18px', 'border-radius': '12px' }, open);
  div('Sounding finished and being finished are generated the same way: as text.', { left: '0', top: '470px', width: '1700px', font: '400 30px var(--sans)', color: 'var(--dim)' }, open);

  // ---------- closed loop ----------
  const closed = s('g', {}, svg);
  const R = { cx: 560, cy: 700, r: 230 };
  const ring = s('circle', { cx: R.cx, cy: R.cy, r: R.r, fill: 'none', stroke: C.line, 'stroke-width': 6 }, closed);
  const ringOn = s('circle', { cx: R.cx, cy: R.cy, r: R.r, fill: 'none', stroke: C.ok, 'stroke-width': 6, 'stroke-dasharray': `${2 * Math.PI * R.r}`, 'stroke-dashoffset': `${2 * Math.PI * R.r}`, transform: `rotate(-90 ${R.cx} ${R.cy})`, 'stroke-linecap': 'round' }, closed);
  const stops = [['Act', 'write the code', -90], ['Check', 'run it for real', 30], ['Read', 'the real output', 150]].map(([t, d, deg]) => {
    const a = (deg * Math.PI) / 180, x = R.cx + Math.cos(a) * R.r, y = R.cy + Math.sin(a) * R.r;
    const g = s('g', { transform: `translate(${x},${y})` }, closed);
    const c = s('circle', { r: 64, fill: C.panel, stroke: C.ai, 'stroke-width': 3 }, g);
    s('text', { 'text-anchor': 'middle', y: -2, style: `font: 600 28px var(--sans); fill: ${C.ink}`, text: t }, g);
    s('text', { 'text-anchor': 'middle', y: 24, style: `font: 400 15px var(--sans); fill: ${C.dim}`, text: d }, g);
    return { c, a };
  });
  s('text', { x: R.cx, y: R.cy - 12, 'text-anchor': 'middle', class: 't-small', text: 'GOAL' }, closed).style.fill = C.gold;
  s('text', { x: R.cx, y: R.cy + 26, 'text-anchor': 'middle', style: `font: 500 30px var(--serif); fill: ${C.ink}`, text: 'all tests pass' }, closed);
  const runner = s('circle', { r: 13, fill: '#fff', class: 'glow-ai', opacity: 0 }, closed);
  const logBox = div('', { left: '960px', top: '430px', width: '850px' });
  div('WHAT ACTUALLY HAPPENED', { left: '0', top: '0', font: '600 20px var(--mono)', 'letter-spacing': '.12em', color: 'var(--faint)' }, logBox);
  const logCard = h('div', { class: 'codecard', style: 'position:absolute;left:0;top:36px;width:850px;height:250px;font-size:27px;border-color:var(--ok)' }, logBox);
  const finalMsg = div('“Done. 3 runs; the last one passes. Output attached.”', { left: '0', top: '320px', width: '850px', font: '400 32px/1.3 var(--sans)', padding: '18px 24px', 'border-radius': '22px', background: '#10201a', border: '2px solid #2d5a45', color: '#e4f7ea' }, logBox);
  const RUNS = ['run 1   <span class="bad">✗ 3 failing</span>', 'run 2   <span class="bad">✗ 1 failing</span>', 'run 3   <span class="ok">✓ 12 passed</span>'];

  // ---------- ways to close the loop ----------
  const ways = div('', { left: '110px', top: '400px', width: '1700px' });
  const wayGrid = h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:22px' }, ways);
  const wayEls = [['⚙️', 'A compiler or type checker'], ['🧪', 'Tests it can run'], ['▶️', 'Run it and look at the output'], ['📸', 'A screenshot of the result'], ['🕵️', 'A second agent as reviewer'], ['👀', 'You, reading the diff']].map(([ic, t]) => h('div', { class: 'fix', style: 'font-size:34px;padding:34px 28px', html: `<span style="font-size:46px">${ic}</span>${t}` }, wayGrid));

  // ---------- workflow ----------
  const wf = div('', { left: '110px', top: '400px', width: '1700px', height: '600px' });
  const WF = [['Plan', 'Agree on the goal and on what “done” means, before anything is built.', C.attn], ['Do', 'One small step at a time.', C.ai], ['Verify', 'A real check, run by the agent.', C.ok], ['Review', 'You read what changed. Then the next step.', C.bio]];
  const wfCards = WF.map(([t, d, col], i) => div(`<div style="font:600 20px var(--mono);letter-spacing:.14em;color:${col}">${i + 1}</div><div style="font:500 50px var(--serif);margin:6px 0 10px">${t}</div><div style="font:400 25px/1.35 var(--sans);color:var(--dim)">${d}</div>`, { left: `${i * 432}px`, top: '20px', width: '396px', height: '270px', 'border-radius': '22px', border: `2px solid ${col}`, background: 'var(--panel)', padding: '22px 26px' }, wf));
  const wfArrows = [0, 1, 2].map((i) => div('→', { left: `${396 + i * 432}px`, top: '110px', width: '36px', 'text-align': 'center', font: '400 34px var(--sans)', color: 'var(--faint)' }, wf));
  const back = s('path', { d: 'M1670,700 C1670,800 1500,800 960,800 C420,800 250,800 250,700', fill: 'none', stroke: C.faint, 'stroke-width': 3, 'stroke-dasharray': '6 10' }, svg);
  const backLbl = s('text', { x: 960, y: 838, 'text-anchor': 'middle', class: 't-small', text: 'REPEAT, IN SMALL STEPS' }, svg);
  // big leap vs small steps
  const steps = s('g', {}, svg);
  s('text', { x: 110, y: 470, class: 't-label', text: 'One big leap, checked at the end' }, steps);
  s('path', { d: 'M130,640 C500,430 1300,430 1700,640', fill: 'none', stroke: C.bad, 'stroke-width': 6, 'stroke-linecap': 'round' }, steps);
  s('text', { x: 1730, y: 652, style: `font: 600 44px var(--sans); fill: ${C.bad}`, text: '?' }, steps);
  s('text', { x: 110, y: 790, class: 't-label', text: 'Small steps, each one checked' }, steps);
  const hops = [];
  for (let i = 0; i < 8; i++) { const x0 = 130 + i * 196, x1 = x0 + 196; hops.push(s('path', { d: `M${x0},920 Q${(x0 + x1) / 2},830 ${x1},920`, fill: 'none', stroke: C.ok, 'stroke-width': 6, 'stroke-linecap': 'round' }, steps)); hops.push(s('text', { x: x1 - 12, y: 962, style: `font: 600 30px var(--sans); fill: ${C.ok}`, text: '✓' }, steps)); }

  const loops = new Loops();
  loops.add('closed', () => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 2.4 });
    const circ = 2 * Math.PI * R.r, ang = { a: -90 };
    const place = () => { const a = (ang.a * Math.PI) / 180; runner.setAttribute('cx', R.cx + Math.cos(a) * R.r); runner.setAttribute('cy', R.cy + Math.sin(a) * R.r); };
    tl.call(() => { logCard.innerHTML = ''; gsap.set(finalMsg, { autoAlpha: 0 }); gsap.set(ringOn, { attr: { 'stroke-dashoffset': circ } }); ang.a = -90; place(); gsap.set(runner, { opacity: 1 }); });
    RUNS.forEach((line, i) => {
      tl.to(ang, { a: -90 + 360 * (i + 1) - 240, duration: 0.55, ease: 'power1.inOut', onUpdate: place });
      tl.to(stops[1].c, { attr: { r: 72 }, duration: 0.12, yoyo: true, repeat: 1 });
      tl.call(() => { logCard.innerHTML += (i ? '\n' : '') + line; });
      tl.to(ang, { a: -90 + 360 * (i + 1) - 120, duration: 0.55, ease: 'power1.inOut', onUpdate: place });
      tl.to(ang, { a: -90 + 360 * (i + 1), duration: 0.55, ease: 'power1.inOut', onUpdate: place });
    });
    tl.to(ringOn, { attr: { 'stroke-dashoffset': 0 }, duration: 0.6 });
    tl.to(finalMsg, { autoAlpha: 1, duration: 0.5 }, '<');
    return tl;
  });
  loops.add('wf', () => {
    const tl = gsap.timeline({ repeat: -1 });
    wfCards.forEach((c) => { tl.to(c, { y: -12, boxShadow: '0 18px 50px rgba(0,0,0,.5)', duration: 0.3 }); tl.to(c, { y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)', duration: 0.3 }, '+=0.55'); });
    return tl;
  });

  function update({ state, step, instant }) {
    const to = mover(instant);
    const close = state === 'close', work = state === 'workflow';
    to(open, { autoAlpha: close && step === 0 ? 1 : 0 });
    if (close && step === 0 && !instant) { gsap.fromTo([audit, stamp], { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.5, delay: 1.2 }); }
    to(closed, { autoAlpha: close && step === 1 ? 1 : 0 });
    to(logBox, { autoAlpha: close && step === 1 ? 1 : 0 });
    to(ways, { autoAlpha: close && step === 2 ? 1 : 0 });
    if (close && step === 2 && !instant) gsap.fromTo(wayEls, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.09, delay: 0.5 });
    to(wf, { autoAlpha: work && step === 0 ? 1 : 0 });
    to([back, backLbl], { autoAlpha: work && step === 0 ? 1 : 0 });
    to(steps, { autoAlpha: work && step === 1 ? 1 : 0 });
    if (work && step === 1 && !instant) gsap.fromTo(hops, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, stagger: 0.11, delay: 0.9 });
    loops.only(...(close && step === 1 ? ['closed'] : work && step === 0 ? ['wf'] : []));
  }
  return { update, exit() { loops.stop(); } };
}
