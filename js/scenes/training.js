// Scene "training": the pipeline that produces the weights.
// Steps: 0 pretraining · 1 instruction tuning · 2 RLHF · 3 RL on checkable tasks · 4 frozen at a cutoff
import { gsap, h, s, C, mover, Loops } from '../lib.js';

const STAGES = [
  ['Pretraining', 'predict the next token'],
  ['Instruction tuning', 'act like an assistant'],
  ['Human feedback (RLHF)', 'people rate the answers'],
  ['RL on checkable tasks', 'code, math: a program grades'],
];
const EXAMPLES = [
  ['The capital of France is', ' Paris', [' Paris', ' a', ' located']],
  ['Once upon a', ' time', [' time', ' day', ' hill']],
  ['To be, or not to', ' be', [' be', ' the', ' go']],
  ['E = mc', '²', ['²', '.', ' is']],
  ['Thank you very', ' much', [' much', ' kindly', ' well']],
];

export default function create(root) {
  const pipe = h('div', { class: 'pipe' }, root);
  const stageEls = STAGES.map(([b, sp], i) => h('div', { class: 'stage', html: `<i>${i + 1}</i><b>${b}</b><span>${sp}</span>` }, pipe));
  const panels = Array.from({ length: 5 }, () => h('div', { class: 'panel tr' }, root));
  const loops = new Loops();

  // ---------- P0: pretraining ----------
  const p0 = panels[0];
  const sent = h('div', { class: 'tr-sentence' }, p0);
  const bars = h('div', { class: 'tr-bars' }, p0);
  const rows = [0, 1, 2].map((i) => {
    const r = h('div', { class: 'bar-row' + (i === 0 ? ' right' : ''), html: '<span class="tok"></span><span class="track"><span class="fill" style="display:block"></span></span><span class="pct"></span>' }, bars);
    return { r, tok: r.querySelector('.tok'), fill: r.querySelector('.fill'), pct: r.querySelector('.pct') };
  });
  h('div', { class: 'note tr-foot', text: 'Probabilities are illustrative. The loop is real: guess, compare with the true next token, nudge the weights, repeat for trillions of tokens.' }, p0);
  const graph = h('div', { class: 'tr-graph' }, p0);
  const gsvg = s('svg', { viewBox: '0 0 760 380', width: 760, height: 380 }, graph);
  s('rect', { x: 1, y: 1, width: 758, height: 378, rx: 18, fill: C.panel, stroke: C.line, 'stroke-width': 2 }, gsvg);
  s('text', { x: 30, y: 46, class: 't-label', text: 'perplexity' }, gsvg).style.fill = C.gold;
  s('text', { x: 30, y: 76, class: 't-small', text: 'how surprised the model is by the real next token' }, gsvg);
  s('text', { x: 730, y: 350, class: 't-small', 'text-anchor': 'end', text: 'training →' }, gsvg);
  const curvePts = []; for (let i = 0; i <= 60; i++) { const t = i / 60; curvePts.push([50 + t * 660, 130 + 190 * (1 - Math.exp(-4.2 * t)) + Math.sin(i * 1.7) * 3 * (1 - t)]); }
  const lossD = curvePts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const loss = s('path', { d: lossD, fill: 'none', stroke: C.gold, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, gsvg);
  const lossLen = loss.getTotalLength ? 900 : 900;
  loss.setAttribute('stroke-dasharray', lossLen); loss.setAttribute('stroke-dashoffset', lossLen);
  const lossDot = s('circle', { r: 9, fill: '#fff', class: 'glow-bio', cx: curvePts[0][0], cy: curvePts[0][1] }, gsvg);
  loops.add('pretrain', () => {
    const tl = gsap.timeline({ repeat: -1 });
    const prog = { v: 0 };
    const setProg = (v) => {
      prog.v = v; const L = loss.getTotalLength(); loss.setAttribute('stroke-dasharray', L); loss.setAttribute('stroke-dashoffset', L * (1 - v));
      const p = loss.getPointAtLength(L * v); lossDot.setAttribute('cx', p.x); lossDot.setAttribute('cy', p.y);
    };
    setProg(0);
    EXAMPLES.forEach(([text, ans, cands], i) => {
      const right = [0.06, 0.22, 0.48, 0.74, 0.91][i];
      const others = [(1 - right) * 0.42, (1 - right) * 0.2];
      tl.call(() => {
        sent.innerHTML = `${text}<span class="blank">&nbsp;</span>`;
        rows.forEach((r, k) => { r.tok.textContent = '“' + cands[k] + '”'; gsap.set(r.fill, { width: 0 }); r.pct.textContent = ''; });
      });
      tl.to({}, { duration: 0.35 });
      rows.forEach((r, k) => {
        const v = k === 0 ? right : others[k - 1];
        tl.to(r.fill, { width: `${v * 100}%`, duration: 0.55, ease: 'power2.out' }, '<');
        tl.call(() => { r.pct.textContent = `${Math.round(v * 100)}%`; }, null, '>-0.1');
      });
      tl.call(() => { sent.querySelector('.blank').textContent = ans; });
      tl.to(prog, { v: (i + 1) / EXAMPLES.length, duration: 0.7, ease: 'power1.inOut', onUpdate: () => setProg(prog.v) });
      tl.to({}, { duration: 0.75 });
    });
    tl.to({}, { duration: 1.2 });
    return tl;
  });

  // ---------- P2: instruction tuning ----------
  const p2 = panels[1];
  const two = h('div', { class: 'two' }, p2);
  h('div', { class: 'chatcard', html: `<h4>Before: a text completer</h4><div class="bubble you">How do I boil an egg?</div><div class="bubble raw">…is what I typed into the search bar at 2 a.m., because my roommate had no idea either. So we called his mother, who</div>` }, two);
  h('div', { class: 'chatcard good', html: `<h4>After: an assistant</h4><div class="bubble you">How do I boil an egg?</div><div class="bubble ai">Put the egg in boiling water for 7 to 9 minutes, then cool it in cold water before peeling.</div>` }, two);

  // ---------- P3: RLHF ----------
  const p3 = panels[2];
  const flow = h('div', { class: 'flowcol' }, p3);
  h('div', { class: 'flowbox', html: 'Two answers to the same prompt' }, flow);
  h('div', { class: 'flowbox', html: 'A person picks the one they prefer<small>thousands of people, millions of times</small>' }, flow);
  h('div', { class: 'flowbox', html: 'A reward model learns to predict the pick' }, flow);
  h('div', { class: 'flowbox hl', html: 'The model is trained to score high<small>a proxy for approval, not for truth</small>' }, flow);
  const phr = h('div', { class: 'phrases' }, p3);
  const PH = [['“You’re absolutely right!”', 97, 0], ['“Great question!”', 91, 0], ['“You’re right to push back.”', 88, 0], ['“I’ve tested it and it works.”', 84, 0], ['“I’m not sure.”', 22, 1], ['“Which one did you mean?”', 17, 1]];
  const phEls = PH.map(([t, n, low]) => { const e = h('div', { class: 'phrase' + (low ? ' low' : ''), html: `<span>${t}</span><span class="cnt">👍 0</span>` }, phr); return { e, n, cnt: e.querySelector('.cnt') }; });
  h('div', { class: 'note', style: 'position:absolute;left:0;bottom:0;width:640px;line-height:1.5', text: 'Counts are illustrative. The effect is real: agreeable, confident, diligent-sounding answers tend to be rated higher.' }, p3);
  function playPhrases(instant) {
    phEls.forEach((p, i) => {
      const o = { v: 0 };
      gsap.killTweensOf(o);
      gsap.fromTo(p.e, { x: 60, autoAlpha: 0 }, { x: 0, autoAlpha: p.e.classList.contains('low') ? 0.55 : 1, duration: instant ? 0 : 0.5, delay: instant ? 0 : 0.2 + i * 0.13 });
      gsap.to(o, { v: p.n, duration: instant ? 0 : 1.4, delay: instant ? 0 : 0.4 + i * 0.13, ease: 'power2.out', onUpdate: () => { p.cnt.textContent = `👍 ${Math.round(o.v)}`; } });
    });
  }

  // ---------- P4: RL on checkable tasks ----------
  const p4 = panels[3];
  const code = h('div', { class: 'codecard', style: 'position:absolute;left:0;top:0;width:800px;height:300px' }, p4);
  const tests = h('div', { class: 'tests', style: 'position:absolute;left:880px;top:0;width:520px' }, p4);
  const reward = h('div', { style: 'position:absolute;left:1460px;top:30px;width:240px;text-align:center;font:600 30px var(--mono)' }, p4);
  h('div', { class: 'lbl', style: 'position:absolute;left:0;top:340px;width:1700px', html: 'Here the grader is a <b style="color:var(--ink)">program</b>, not a person: the tests pass or they don’t. This is a big part of why models became good at code and math.' }, p4);
  const ATT = [
    ['<span class="k">def</span> <span class="f">median</span>(xs):\n    <span class="k">return</span> xs[<span class="f">len</span>(xs) // 2]', [0, 0, 0]],
    ['<span class="k">def</span> <span class="f">median</span>(xs):\n    xs = <span class="f">sorted</span>(xs)\n    <span class="k">return</span> xs[<span class="f">len</span>(xs) // 2]', [1, 0, 1]],
    ['<span class="k">def</span> <span class="f">median</span>(xs):\n    xs = <span class="f">sorted</span>(xs)\n    m = <span class="f">len</span>(xs) // 2\n    <span class="k">if</span> <span class="f">len</span>(xs) % 2: <span class="k">return</span> xs[m]\n    <span class="k">return</span> (xs[m - 1] + xs[m]) / 2', [1, 1, 1]],
  ];
  const TN = ['test_unsorted', 'test_even_length', 'test_single'];
  loops.add('rl', () => {
    const tl = gsap.timeline({ repeat: -1 });
    ATT.forEach(([src, res], a) => {
      tl.call(() => {
        code.innerHTML = `<span class="c"># attempt ${a + 1}</span>\n${src}`;
        tests.innerHTML = TN.map((n) => `<div style="opacity:.35">· ${n}</div>`).join('');
        reward.innerHTML = '';
      });
      tl.fromTo(code, { autoAlpha: 0.2 }, { autoAlpha: 1, duration: 0.4 });
      res.forEach((ok, i) => tl.call(() => { const d = tests.children[i]; d.style.opacity = 1; d.innerHTML = `<span class="${ok ? 'ok' : 'bad'}">${ok ? '✓' : '✗'}</span> ${TN[i]}`; }, null, `+=${0.35}`));
      const all = res.every(Boolean);
      tl.call(() => { reward.innerHTML = all ? '<div class="ok" style="font-size:80px">+1</div><div class="ok">reward</div>' : '<div class="bad" style="font-size:80px">0</div><div class="bad">no reward</div>'; }, null, '+=0.35');
      tl.fromTo(reward, { scale: 0.6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'back.out(2)' });
      tl.to({}, { duration: all ? 2.2 : 1.1 });
    });
    return tl;
  });

  // ---------- P5: frozen ----------
  const p5 = panels[4];
  h('div', { class: 'lbl', style: 'position:absolute;left:0;top:30px', html: 'After training the weights are <b style="color:#9fd8ff">frozen</b>.' }, p5);
  const tline = h('div', { class: 'timeline' }, p5);
  const known = h('div', { class: 'known' }, tline);
  const gapEl = h('div', { class: 'gap' }, tline);
  h('div', { style: 'position:absolute;left:30px;top:135px;font:600 28px var(--sans);color:#dff7fd', text: 'everything it read' }, p5);
  const mCut = h('div', { class: 'tl-mark', style: 'left:68%;color:#9fd8ff;top:54px', text: 'knowledge cutoff' }, p5);
  const mNow = h('div', { class: 'tl-mark', style: 'left:97%;color:var(--gold);top:54px', text: 'today' }, p5);
  const gapTxt = h('div', { style: 'position:absolute;left:70%;width:26%;top:135px;text-align:center;font:500 26px var(--sans);color:var(--dim)', text: 'never seen' }, p5);
  h('div', { class: 'lbl', style: 'position:absolute;left:0;top:300px;width:1700px', html: 'It does not learn from your conversations. Anything newer, private or specific to you has to arrive through the <b style="color:var(--ink)">context window</b>.' }, p5);

  let shown = -1;
  function update({ step, instant }) {
    const to = mover(instant);
    const stageOf = Math.min(step, 3);
    stageEls.forEach((e, i) => { e.classList.toggle('on', i === stageOf && step < 4); e.classList.toggle('done', i < stageOf); });
    pipe.classList.toggle('frozen', step === 4);
    panels.forEach((p, i) => to(p, { autoAlpha: i === step ? 1 : 0, y: i === step ? 0 : i < step ? -24 : 24, duration: 0.6 }));
    loops.only(...(step === 0 ? ['pretrain'] : step === 3 ? ['rl'] : []));
    if (step === 2 && shown !== 2) playPhrases(instant);
    if (step === 4) {
      gsap.fromTo(known, { width: '0%' }, { width: '68%', duration: instant ? 0 : 1.4, ease: 'power2.inOut' });
      gsap.fromTo([mCut, gapEl, gapTxt, mNow], { autoAlpha: 0 }, { autoAlpha: 1, duration: instant ? 0 : 0.5, stagger: 0.25, delay: instant ? 0 : 1.2 });
    }
    shown = step;
  }
  return { update, exit() { loops.stop(); shown = -1; } };
}
