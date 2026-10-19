// Scene "context": the context window as a fixed buffer.
// States: 'window'   (0 what it is · 1 it fills, your share thins · 2 overflow: gone · 3 re-read every time)
//         'engineer' (0 everything you could give it · 1 dump it all in · 2 curate)  — its own layout, not the strip
//         'agents'   (0 the file · 1 loaded at the start of every session)
//         'skills'   (0 only descriptions sit in the window · 1 the matching skill loads)
import { gsap, h, s, C, mover, rng } from '../lib.js';
import { createWinBar } from '../winbar.js';

const SYS = { key: 'sys', kind: 'sys', size: 4, label: 'System', pinned: true };
const INST = { key: 'inst', kind: 'inst', size: 6, label: 'Your rules' };
function convo(n, seed = 2) {
  const r = rng(seed); const out = [];
  for (let i = 0; i < n; i++) out.push({ key: 'c' + i, kind: i % 2 ? 'ai' : 'you', size: i % 2 ? 4 + Math.round(r() * 6) : 2 + Math.round(r() * 2) });
  return out;
}
const TURNS = convo(40);
const upto = (limit, base) => { const out = [...base]; let t = base.reduce((a, x) => a + x.size, 0); for (const c of TURNS) { if (t + c.size > limit) break; out.push(c); t += c.size; } return out; };

export default function create(root) {
  const bar = createWinBar(root, { cap: 'fixed size · a sketch, not to scale' });
  const wrap = bar.wrap;

  // ---- 'window' extras ----
  const share = h('div', { style: 'position:absolute;left:110px;top:400px;font:500 30px var(--sans);color:var(--dim)' }, root);
  const usvg = s('svg', { viewBox: '0 0 1700 130', width: 1700, height: 130, style: 'position:absolute;left:110px;top:376px;overflow:visible' }, root);
  const uPath = s('path', { d: 'M10,30 C160,34 300,110 850,112 C1400,110 1540,34 1690,22', fill: 'none', stroke: C.attn, 'stroke-width': 5, 'stroke-linecap': 'round' }, usvg);
  s('text', { x: 850, y: 92, 'text-anchor': 'middle', class: 't-label', text: 'weakest in the middle' }, usvg).style.fill = C.attn;
  s('text', { x: 14, y: 8, class: 't-small', text: 'HOW MUCH ATTENTION EACH POSITION GETS' }, usvg).style.fill = C.attn;
  const gone = h('div', { style: 'position:absolute;left:110px;top:800px;font:500 38px var(--serif);color:var(--bad)', html: 'Past the edge it isn’t blurry. It’s <i>gone</i>.' }, root);
  const scanClip = h('div', { style: 'position:absolute;left:116px;top:566px;width:1688px;height:138px;border-radius:14px;overflow:hidden;pointer-events:none;z-index:3' }, wrap);
  const scan = h('div', { style: 'position:absolute;left:0;top:0;width:180px;height:138px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent)' }, scanClip);
  const reread = h('div', { style: 'position:absolute;left:110px;top:800px;width:1700px;font:500 34px/1.35 var(--sans);color:var(--dim)', html: 'The model has <b style="color:var(--ink)">no memory between messages</b>. For every single token it writes, it reads the whole window again from the top. What is in the window <i>is</i> its memory.' }, root);
  let scanTl = null;

  // ---- 'engineer': pick what goes in (cards move between a pool and the window) ----
  const eng = h('div', { style: 'position:absolute;inset:0' }, root);
  h('div', { class: 'note', style: 'position:absolute;left:110px;top:282px;font-size:20px;letter-spacing:.12em;color:var(--dim)', text: 'EVERYTHING YOU COULD GIVE IT' }, eng);
  const engWinLbl = h('div', { class: 'note', style: 'position:absolute;left:1130px;top:282px;font-size:20px;letter-spacing:.12em;color:var(--ink)', text: 'THE CONTEXT WINDOW · ALL IT WILL KNOW' }, eng);
  const pool = h('div', { style: 'position:absolute;left:110px;top:322px;width:960px;display:grid;grid-template-columns:1fr 1fr;gap:14px' }, eng);
  const efr = h('div', { style: 'position:absolute;left:1130px;top:322px;width:680px;height:580px;border:3px solid var(--ink);border-radius:22px;transition:border-color .5s' }, eng);
  const ewin = h('div', { style: 'position:absolute;left:1146px;top:338px;width:648px;display:flex;flex-direction:column;gap:8px' }, eng);
  const empty = h('div', { style: 'position:absolute;left:1130px;top:560px;width:680px;text-align:center;font:500 30px var(--sans);color:var(--faint)', text: 'Empty. You decide what goes in.' }, eng);
  const engNote = h('div', { style: 'position:absolute;left:1130px;top:920px;width:680px;font:500 26px/1.3 var(--sans);color:var(--dim)' }, eng);
  const engFixes = h('div', { style: 'position:absolute;left:110px;top:720px;width:960px;display:grid;grid-template-columns:1fr 1fr;gap:14px' }, eng);
  ['New task, new chat', 'Keep what matters in files', 'Summarize, then restart', 'Load only what is relevant'].forEach((t) => h('div', { class: 'fix', style: 'font-size:27px;padding:14px 18px', text: t }, engFixes));
  const CARDS = [
    ['goal', 'Your goal + what “done” means', 1, 1], ['agents', 'AGENTS.md: the house rules', 1, 1], ['files', 'The 2 files that matter', 2, 1], ['sum', 'Short summary of progress', 1, 1],
    ['repo', 'The whole repository', 4, 0], ['chat', '3 weeks of chat history', 4, 0], ['logs', '2,000 lines of pasted logs', 3, 0], ['dead', 'Old attempts and dead ends', 2, 0],
  ].map(([key, text, size, good]) => ({ key, size, good, el: h('div', { style: 'height:76px;border-radius:16px;border:2px solid var(--line);background:var(--panel);display:flex;align-items:center;padding:0 22px;font:500 27px var(--sans);color:var(--ink);overflow:hidden;white-space:nowrap', text }) }));
  const byKey = Object.fromEntries(CARDS.map((c) => [c.key, c]));
  const DUMP = ['agents', 'goal', 'repo', 'chat', 'files', 'logs', 'dead', 'sum'], CURATED = ['agents', 'goal', 'files', 'sum'];
  CARDS.forEach((c) => pool.appendChild(c.el));
  function placeCards(step, instant) {
    const inWin = step === 0 ? [] : step === 1 ? DUMP : CURATED;
    const st = instant ? null : window.Flip.getState(CARDS.map((c) => c.el));
    CARDS.forEach((c) => { if (!inWin.includes(c.key)) pool.appendChild(c.el); });
    inWin.forEach((k) => ewin.appendChild(byKey[k].el));
    CARDS.forEach((c) => {
      const inside = inWin.includes(c.key);
      Object.assign(c.el.style, {
        height: (inside ? 28 + c.size * 22 : 76) + 'px',
        borderColor: step === 2 ? (c.good ? '#2d8a5c' : '#2a3347') : inside && step === 1 && !c.good ? '#6a3a3a' : '#2a3347',
        background: step === 2 && c.good ? '#10201a' : 'var(--panel)',
        opacity: step === 2 && !c.good ? '0.35' : '1',
        textDecoration: step === 2 && !c.good ? 'line-through' : 'none',
      });
    });
    if (st) window.Flip.from(st, { duration: 0.9, ease: 'power3.inOut', stagger: 0.04, absolute: true });
  }

  // ---- 'files' extras ----
  const agentsCard = h('div', { class: 'codecard', style: 'position:absolute;left:110px;top:350px;width:640px;height:330px;font-size:23px;border-color:#ffe08a' }, root);
  agentsCard.innerHTML = `<span class="s"># AGENTS.md</span>\n<span class="c">Read at the start of every session.</span>\n\n- This repo is <span class="f">SimplicityHL</span>, not Rust.\n- Check the compiler output before\n  saying something works.\n- Ask before deleting files.\n- Style: small functions, no macros.`;
  const shelf = h('div', { style: 'position:absolute;left:820px;top:350px;width:990px' }, root);
  h('div', { class: 'note', style: 'color:#ff9d8a;margin-bottom:14px;font-size:20px;letter-spacing:.12em', text: 'SKILLS: INSTRUCTIONS THAT LOAD ONLY WHEN NEEDED' }, shelf);
  const shelfGrid = h('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:14px' }, shelf);
  const SK = [['simplicity-contracts', 'Write and compile SimplicityHL'], ['pdf-reports', 'Build PDF reports'], ['code-review', 'Our review checklist'], ['brand-voice', 'How we write'], ['deploy', 'Release steps'], ['data-queries', 'Warehouse tables']];
  const skEls = SK.map(([n, d]) => h('div', { style: 'border:2px solid var(--line);border-radius:14px;background:var(--panel);padding:14px 18px', html: `<div style="font:600 23px var(--mono);color:#ff9d8a">${n}</div><div style="font:400 20px var(--sans);color:var(--dim);margin-top:4px">${d}</div>` }, shelfGrid));
  const task = h('div', { class: 'bubble you', style: 'position:absolute;left:820px;top:610px;font-size:28px;margin:0', text: '“Write a contract that checks one signature.”' }, root);
  const aka = h('div', { style: 'position:absolute;left:820px;top:350px;width:990px;font:400 30px/1.4 var(--sans);color:var(--dim)', html: 'Same idea, different names: <b style="color:var(--ink)">CLAUDE.md</b> in Claude Code, <b style="color:var(--ink)">AGENTS.md</b> in Codex and others, <b style="color:var(--ink)">project instructions</b> on claude.ai and ChatGPT.' }, root);
  const session = h('div', { style: 'position:absolute;left:820px;top:530px;font:600 34px var(--mono);color:#ffe08a' }, root);
  const sessionNote = h('div', { style: 'position:absolute;left:820px;top:600px;width:990px;font:400 28px/1.4 var(--sans);color:var(--dim)', html: 'Every new session starts with it. The rule no longer lives in message 1 of an old chat.' }, root);
  const skillCard = h('div', { class: 'codecard', style: 'position:absolute;left:110px;top:350px;width:640px;height:330px;font-size:23px;border-color:#ff9d8a' }, root);
  skillCard.innerHTML = `<span class="s">simplicity-contracts/</span>\n├── <span class="f">SKILL.md</span>   <span class="c">name + one line</span>\n│              <span class="c">+ full instructions</span>\n├── examples/  <span class="c">working contracts</span>\n├── docs/      <span class="c">language reference</span>\n└── scripts/   <span class="c">compile + test</span>`;
  let sessionTl = null;

  const hideAll = (to) => { [share, usvg, gone, reread, agentsCard, shelf, task, verdict, eng, engFixes, aka, session, sessionNote, skillCard].forEach((e) => to(e, { autoAlpha: 0, duration: 0.4 })); };
  const verdict = h('div', { style: 'position:absolute;left:110px;top:800px;width:1700px;font:500 34px/1.35 var(--sans);color:var(--dim)' }, root);

  function update({ state, step, instant, prevState }) {
    const to = mover(instant);
    const opts = { instant, stagger: 0.035 };
    scanTl && scanTl.kill(); scanTl = null; gsap.set(scan, { autoAlpha: 0 });
    sessionTl && sessionTl.kill(); sessionTl = null;
    hideAll(to);
    to(wrap, { y: state === 'agents' || state === 'skills' ? 190 : 0, autoAlpha: state === 'engineer' ? 0 : 1, duration: 0.9 });
    bar.frame.dataset.label = 'Context window';

    if (state === 'window') {
      if (step === 0) {
        const first = [SYS, INST, TURNS[0]];
        bar.set(first, opts);
        // example numbers: ~3,500-token system prompt + 500 tokens of your rules + a 100-token question
        share.innerHTML = `Example: your rules are 500 tokens. In a fresh chat that is <b style="color:var(--gold);font-size:44px">${((500 / 4100) * 100).toFixed(0)}%</b> of everything it reads.`;
        to(share, { autoAlpha: 1 });
      } else if (step === 1) {
        const long = upto(96, [SYS, INST]);
        bar.set(long, opts);
        to(usvg, { autoAlpha: 1, delay: instant ? 0 : 1.2 });
        share.innerHTML = '';
        verdict.innerHTML = `80,000 tokens of chat later, the same 500 tokens are <b style="color:var(--gold)">${((500 / 80000) * 100).toFixed(1)}%</b> of what it reads, sitting where attention is weakest. Nothing is forgotten yet. They are <b style="color:var(--ink)">out-massed</b>.`;
        to(verdict, { autoAlpha: 1, delay: instant ? 0 : 1.0 });
      } else if (step === 2) {
        const all = [SYS, INST, ...TURNS];
        if (!instant && prevState === 'window') { bar.set(upto(96, [SYS, INST]), { instant: true }); gsap.delayedCall(0.05, () => bar.set(bar.fit(upto(140, [SYS, INST])), opts)); }
        else bar.set(bar.fit(all.slice(0, 26)), opts);
        to(gone, { autoAlpha: 1, delay: instant ? 0 : 0.9 });
      } else {
        bar.set(bar.fit(upto(140, [SYS, INST])), opts);
        to(reread, { autoAlpha: 1 });
        scanTl = gsap.timeline({ repeat: -1 });
        scanTl.fromTo(scan, { x: -180, autoAlpha: 1 }, { x: 1690, duration: 1.5, ease: 'none' }).to({}, { duration: 0.25 });
      }
    }

    if (state === 'engineer') {
      to(eng, { autoAlpha: 1, duration: 0.6 });
      placeCards(step, instant);
      to(empty, { autoAlpha: step === 0 ? 1 : 0, duration: 0.4 });
      efr.style.borderColor = step === 1 ? C.bad : step === 2 ? C.ok : C.ink;
      engWinLbl.style.color = step === 1 ? C.bad : step === 2 ? C.ok : C.ink;
      engNote.innerHTML = step === 1 ? 'It doesn’t fit. The four cards that matter are now a small part of the window, lost among logs, history and dead ends.' : step === 2 ? 'Less than half full, and all of it relevant. The rest is room for the work.' : '';
      Object.assign(engNote.style, step === 1 ? { left: '110px', top: '360px', width: '900px', fontSize: '40px', color: 'var(--bad)' } : { left: '1130px', top: '920px', width: '680px', fontSize: '26px', color: 'var(--dim)' });
      to(engFixes, { autoAlpha: step === 2 ? 1 : 0, delay: instant ? 0 : 0.6 });
    }

    if (state === 'agents' || state === 'skills') {
      const sys = { key: 'sys', kind: 'sys', size: 5, label: 'System' };
      const ag = { key: 'agents', kind: 'agents', size: 9, label: 'AGENTS.md' };
      const slivers = SK.map((sk, i) => ({ key: 'sk' + i, kind: 'skill', size: 1.4 }));
      bar.frame.dataset.label = 'Context window · a brand-new session';
      if (state === 'agents') {
        to(agentsCard, { autoAlpha: 1 });
        to(aka, { autoAlpha: step === 0 ? 1 : 0 });
        if (step === 0) bar.set([], opts);
        else {
          to(session, { autoAlpha: 1 }); to(sessionNote, { autoAlpha: 1 });
          const days = ['Monday', 'Wednesday', 'Friday'];
          if (instant) { session.textContent = 'Every session'; bar.set([sys, ag], opts); }
          else {
            sessionTl = gsap.timeline({ repeat: -1 });
            days.forEach((d) => {
              sessionTl.call(() => { session.textContent = `${d}: new session`; bar.set([], { stagger: 0 }); });
              sessionTl.to({}, { duration: 0.5 });
              sessionTl.call(() => bar.set([sys, ag], opts));
              sessionTl.to({}, { duration: 1.9 });
            });
          }
        }
      } else {
        to(skillCard, { autoAlpha: 1 });
        to(shelf, { autoAlpha: 1 });
        to(task, { autoAlpha: step >= 1 ? 1 : 0 });
        if (step === 0) bar.set([sys, ag, ...slivers], opts);
        else bar.set([sys, ag, ...slivers, { key: 'task', kind: 'you', size: 5, label: 'Task' }, { key: 'skfull', kind: 'skill', size: 17, label: 'simplicity-contracts (full)' }], opts);
        skEls.forEach((e, i) => gsap.to(e, { borderColor: step >= 1 && i === 0 ? '#ff9d8a' : '#2a3347', opacity: step >= 1 && i !== 0 ? 0.4 : 1, scale: step >= 1 && i === 0 ? 1.04 : 1, duration: instant ? 0 : 0.5 }));
      }
    }
  }
  return { update, exit() { scanTl && scanTl.kill(); scanTl = null; sessionTl && sessionTl.kill(); sessionTl = null; } };
}
