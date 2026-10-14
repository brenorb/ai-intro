// Scene "sampling": classical AI picks one label; generative AI outputs a distribution and rolls dice.
// Steps: 0 classifier · 1 a distribution over next tokens · 2 dice: sample, append, repeat · 3 same prompt, five runs
// The generator side uses real GPT-2 probabilities from data/sampling.json (see tools/build-sampling.mjs).
import { gsap, h, s, C, mover, rng } from '../lib.js';

export default function create(root) {
  // ---------- classifier ----------
  const clf = h('div', { class: 'clf' }, root);
  const cs = s('svg', { viewBox: '0 0 1700 560', width: 1700, height: 560, style: 'overflow:visible' }, clf);
  // a tiny pixel cat
  const CAT = ['..#......#..', '.###....###.', '.####..####.', '.##########.', '.##.####.##.', '.##########.', '.####..####.', '.###.##.###.', '..########..', '...######...'];
  const img = s('g', { transform: 'translate(40,60)' }, cs);
  s('rect', { x: -14, y: -14, width: 388, height: 328, rx: 18, fill: C.panel, stroke: C.line, 'stroke-width': 2 }, img);
  CAT.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && s('rect', { x: x * 30, y: y * 30, width: 28, height: 28, rx: 5, fill: (y === 4 && (x === 3 || x === 8)) ? C.bg : C.bio }, img)));
  s('text', { x: 180, y: 410, 'text-anchor': 'middle', class: 't-small', text: 'INPUT' }, cs);
  s('path', { d: 'M470,210 H590 m-16,-13 l16,13 l-16,13', fill: 'none', stroke: C.faint, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cs);
  s('rect', { x: 620, y: 120, width: 260, height: 180, rx: 22, fill: C.panel, stroke: C.ai, 'stroke-width': 3 }, cs);
  s('text', { x: 750, y: 204, 'text-anchor': 'middle', class: 't-big', text: 'classifier' }, cs);
  s('text', { x: 750, y: 244, 'text-anchor': 'middle', class: 't-small', text: 'CLASSICAL AI' }, cs);
  s('path', { d: 'M900,210 H1020 m-16,-13 l16,13 l-16,13', fill: 'none', stroke: C.faint, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cs);
  const clfBars = [['cat', 0.97], ['dog', 0.02], ['fox', 0.01]].map(([n, p], i) => {
    const y = 110 + i * 78;
    s('text', { x: 1060, y: y + 34, class: 't-big', text: n }, cs).style.fill = i ? C.dim : C.gold;
    s('rect', { x: 1170, y, width: 400, height: 48, rx: 10, fill: C.panel2 }, cs);
    const f = s('rect', { x: 1170, y, width: 0, height: 48, rx: 10, fill: i ? C.faint : C.gold }, cs);
    s('text', { x: 1590, y: y + 34, class: 't-num', text: `${Math.round(p * 100)}%` }, cs);
    return { f, p };
  });
  const clfNote = s('text', { x: 1060, y: 400, class: 't-label', text: 'One input → one answer, with a confidence.' }, cs);

  // ---------- generator ----------
  const gen = h('div', { class: 'gen' }, root);
  const promptEl = h('div', { class: 'prompt-line' }, gen);
  const barsEl = h('div', { style: 'position:absolute;left:0;top:140px;width:900px' }, gen);
  const rows = Array.from({ length: 7 }, () => {
    const r = h('div', { class: 'bar-row', html: '<span class="tok"></span><span class="track"><span class="fill" style="display:block"></span></span><span class="pct"></span>' }, barsEl);
    return { r, tok: r.querySelector('.tok'), fill: r.querySelector('.fill'), pct: r.querySelector('.pct') };
  });
  const dice = h('div', { class: 'dice', html: '<span>🎲</span><small>random draw</small>' }, gen);
  const diceNum = dice.querySelector('span');
  const runsEl = h('div', { class: 'runs', style: 'position:absolute;left:0;top:10px;width:1110px' }, gen);
  const src = h('div', { class: 'note', style: 'position:absolute;left:0;bottom:-14px', text: '' }, gen);
  const genTag = h('div', { class: 'note', style: 'position:absolute;left:0;top:-44px;color:var(--ai)', text: 'GENERATIVE AI' }, gen);

  let data = null, tl = null, wantStep = -1;
  fetch('data/sampling.json').then((r) => r.json()).then((d) => { data = d; src.textContent = `Real probabilities from ${d.model}: temperature ${d.temperature}, top-${d.topK} sampling, vocabulary of 50,257 tokens.`; if (wantStep >= 1) render(wantStep, true); });

  const show = (t) => t.replace(/\n/g, '↵');
  function drawDist(st, pick) {
    const maxP = st.top[0].p;
    const others = 1 - st.top.reduce((a, t) => a + t.p, 0);
    st.top.forEach((t, i) => {
      const r = rows[i];
      r.tok.textContent = '“' + show(t.t) + '”';
      r.pct.textContent = `${(t.p * 100).toFixed(1)}%`;
      gsap.to(r.fill, { width: `${(t.p / maxP) * 100}%`, duration: 0.35, overwrite: true });
      r.r.classList.toggle('pick', !!pick && pick.id === t.id);
    });
    const o = rows[6];
    const pickedOther = pick && !st.top.some((t) => t.id === pick.id);
    o.tok.textContent = pickedOther ? '“' + show(pick.t) + '”' : '…all others';
    o.pct.textContent = pickedOther ? `${(pick.p * 100).toFixed(1)}%` : `${(others * 100).toFixed(1)}%`;
    gsap.to(o.fill, { width: pickedOther ? `${(pick.p / maxP) * 100}%` : `${Math.min(100, (others / maxP) * 100)}%`, duration: 0.35, overwrite: true });
    o.r.classList.toggle('pick', !!pickedOther);
    o.r.style.opacity = pickedOther ? 1 : 0.5;
  }
  const setPrompt = (extra, fresh) => { promptEl.innerHTML = `<span class="p">${data.prompt}</span>${extra.map((t, i) => `<span class="${i === extra.length - 1 && fresh ? 'new' : ''}">${show(t)}</span>`).join('')}<span style="color:var(--gold)">▍</span>`; };

  function playRuns() {
    tl && tl.kill();
    tl = gsap.timeline({ repeat: -1 });
    const jr = rng(5);
    data.runs.forEach((run) => {
      const acc = [];
      tl.call(() => { acc.length = 0; setPrompt(acc); drawDist(run.steps[0]); diceNum.textContent = '🎲'; });
      tl.to({}, { duration: 0.8 });
      run.steps.forEach((st, i) => {
        tl.call(() => drawDist(st));
        // roll
        const roll = { n: 0 };
        tl.to(roll, { n: 1, duration: 0.45, ease: 'none', onUpdate: () => { diceNum.textContent = jr().toFixed(2); } });
        tl.fromTo(dice, { rotation: -8 }, { rotation: 0, duration: 0.45, ease: 'elastic.out(1.4,0.4)' }, '<');
        tl.call(() => { drawDist(st, st.pick); });
        tl.to({}, { duration: 0.5 });
        tl.call(() => { acc.push(st.pick.t); setPrompt(acc, true); });
        tl.to({}, { duration: 0.25 });
        if (i === run.steps.length - 1) tl.to({}, { duration: 1.6 });
      });
    });
  }

  function render(step, instant) {
    if (!data) return;
    tl && tl.kill(); tl = null;
    rows.forEach((r) => r.r.classList.remove('pick'));
    if (step === 1) { setPrompt([]); drawDist(data.runs[0].steps[0]); diceNum.textContent = '🎲'; }
    if (step === 2) playRuns();
    if (step === 3) {
      setPrompt([]);
      runsEl.innerHTML = data.runs.map((r) => `<div><span class="p">${data.prompt}</span><span class="c">${show(r.text)}</span>…</div>`).join('');
      gsap.fromTo(runsEl.children, { autoAlpha: 0, x: 40 }, { autoAlpha: 1, x: 0, duration: instant ? 0 : 0.5, stagger: instant ? 0 : 0.35 });
    }
  }

  function update({ step, instant }) {
    wantStep = step;
    const to = mover(instant);
    const big = step === 0;
    to(clf, { scale: big ? 1 : 0.33, x: big ? 0 : -10, y: big ? 0 : 60, autoAlpha: big ? 1 : 0.55, transformOrigin: '0 0', duration: 1.0 });
    to(clfNote, { autoAlpha: big ? 1 : 0 });
    clfBars.forEach((b, i) => gsap.to(b.f, { attr: { width: 400 * b.p }, duration: instant ? 0 : 0.9, delay: instant ? 0 : 0.5 + i * 0.1, overwrite: true }));
    to(gen, { autoAlpha: step >= 1 ? 1 : 0, x: step >= 1 ? 0 : 120, duration: 0.9 });
    to(barsEl, { autoAlpha: step === 1 || step === 2 ? 1 : 0 });
    to(dice, { autoAlpha: step === 2 ? 1 : 0, scale: step === 2 ? 1 : 0.6 });
    to(runsEl, { autoAlpha: step === 3 ? 1 : 0 });
    to(promptEl, { autoAlpha: step === 3 ? 0 : 1 });
    render(step, instant);
  }
  return { update, exit() { tl && tl.kill(); tl = null; } };
}
