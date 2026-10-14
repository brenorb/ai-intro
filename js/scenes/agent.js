// Scene "agent": from a chat to an agent.
// States: 'chat'  (0 chat: you ↔ model · 1 a harness wraps the model with tools · 2 the loop)
//         'tools' (0 a tool call is just text the harness executes · 1 MCP connectors)
import { gsap, h, s, svgRoot, C, mover, Loops } from '../lib.js';

const TOOLS = [['🔎', 'Search', 'look things up'], ['📁', 'Files', 'read and edit'], ['⌨️', 'Terminal', 'run commands'], ['🧪', 'Tests', 'check the work']];
const LOG = [
  [1, 'read contract.simf'], [0, 'search the docs: “bip_0340_verify”'], [1, 'edit contract.simf'], [2, 'run the compiler → 1 error'],
  [1, 'fix line 2'], [2, 'run the compiler → ok'], [3, 'run tests → all pass'],
];

export default function create(root) {
  const svg = svgRoot(root);
  const css = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(';');
  const node = (html, style) => h('div', { html, style: 'position:absolute;' + css(style) }, root);

  const person = node('<div style="font-size:74px;line-height:1">🧑‍💻</div><div style="font:600 24px var(--sans);margin-top:8px;color:var(--bio)">you</div>', { left: '0', top: '0', width: '170px', height: '170px', 'border-radius': '50%', border: '3px solid var(--bio)', background: '#2b2118', display: 'grid', 'place-content': 'center', 'text-align': 'center' });
  const model = node('<div style="font:500 44px var(--serif)">model</div><div style="font:500 16px var(--mono);color:var(--ai);margin-top:6px;letter-spacing:.06em">TEXT IN → TEXT OUT</div>', { left: '0', top: '0', width: '250px', height: '250px', 'border-radius': '50%', border: '3px solid var(--ai)', background: 'radial-gradient(circle at 40% 35%, #1d4654, #10222b)', display: 'grid', 'place-content': 'center', 'text-align': 'center', 'box-shadow': '0 0 60px rgba(95,212,232,.25)' });
  const harness = node('<div style="position:absolute;left:26px;top:-17px;background:var(--bg);padding:2px 14px;font:600 20px var(--mono);letter-spacing:.12em;color:var(--gold)">HARNESS</div><div style="position:absolute;left:0;right:0;bottom:16px;text-align:center;font:500 20px var(--mono);color:var(--faint)">Claude Code · Codex · Cursor</div>', { left: '640px', top: '470px', width: '460px', height: '440px', 'border-radius': '40px', border: '3px dashed var(--gold)' });
  const tools = TOOLS.map(([ic, n, d], i) => node(`<span style="font-size:42px">${ic}</span><span><b style="display:block;font:600 28px var(--sans)">${n}</b><span style="font:400 21px var(--sans);color:var(--dim)">${d}</span></span>`, { left: '1420px', top: `${420 + i * 132}px`, width: '390px', height: '108px', 'border-radius': '20px', border: '2px solid var(--line)', background: 'var(--panel)', display: 'flex', 'align-items': 'center', gap: '20px', padding: '0 24px' }));
  const chatTag = node('claude.ai · ChatGPT in a browser tab', { left: '110px', top: '960px', width: '1700px', 'text-align': 'center', font: '500 22px var(--mono)', color: 'var(--faint)', 'letter-spacing': '.06em' });
  const youMsg = node('', { left: '0', top: '0', 'max-width': '560px', font: '400 28px/1.3 var(--sans)', padding: '14px 20px', 'border-radius': '18px', background: '#2b2118', border: '1px solid #5a4024', color: '#ffe6c7' });
  const aiMsg = node('', { left: '0', top: '0', 'max-width': '560px', font: '400 28px/1.3 var(--sans)', padding: '14px 20px', 'border-radius': '18px', background: '#12222b', border: '1px solid #235060', color: '#dff7fd' });
  const logEl = node('', { left: '640px', top: '930px', width: '460px', 'text-align': 'center', font: '500 24px var(--mono)', color: 'var(--gold)', 'white-space': 'nowrap' });
  const stepEl = node('', { left: '110px', top: '420px', font: '600 22px var(--mono)', color: 'var(--faint)', 'letter-spacing': '.1em' });

  // connectors
  const mc = { x: 870, y: 690 };
  const lines = TOOLS.map((_, i) => s('path', { d: `M${mc.x + 130},${mc.y} C${1250},${mc.y} ${1260},${474 + i * 132} 1420,${474 + i * 132}`, fill: 'none', stroke: C.line, 'stroke-width': 3 }, svg));
  const userLine = s('path', { d: `M320,690 H${mc.x - 130}`, fill: 'none', stroke: C.line, 'stroke-width': 3 }, svg);
  const dot = s('circle', { r: 11, fill: '#fff', class: 'glow-ai', opacity: 0 }, svg);

  // ---------- tools state ----------
  const tw = h('div', { style: 'position:absolute;left:110px;top:330px;width:1700px;height:680px' }, root);
  const card = (title, col, body, left, w) => h('div', { style: `position:absolute;left:${left}px;top:0;width:${w}px`, html: `<div style="font:600 20px var(--mono);letter-spacing:.12em;color:${col};margin-bottom:12px">${title}</div><div class="codecard" style="font-size:22px;height:262px;padding:18px 22px;border-color:${col}">${body}</div>` }, tw);
  const c1 = card('1 · THE MODEL WRITES TEXT', C.ai, '{\n  <span class="f">"tool"</span>: <span class="s">"read_file"</span>,\n  <span class="f">"path"</span>: <span class="s">"contract.simf"</span>\n}', 0, 500);
  const c2 = card('2 · THE HARNESS RUNS IT', C.gold, '<span class="c"># an ordinary program runs</span>\n$ cat contract.simf', 600, 500);
  const c3 = card('3 · THE RESULT IS PASTED BACK', C.ok, '<span class="k">fn</span> <span class="f">main</span>() {\n  jet::bip_0340_verify(\n    (param::PUBLIC_KEY,\n     jet::sig_all_hash()),\n    witness::SIGNATURE)\n}', 1200, 500);
  const arrows = [h('div', { style: 'position:absolute;left:520px;top:140px;font-size:54px;color:var(--faint)', text: '→' }, tw), h('div', { style: 'position:absolute;left:1120px;top:140px;font-size:54px;color:var(--faint)', text: '→' }, tw)];
  const toolLine = h('div', { class: 'lbl', style: 'position:absolute;left:0;top:350px;width:1700px;font-size:32px;line-height:1.35', html: 'The model can only ever write text. The <b style="color:var(--gold)">harness</b> turns some of that text into actions, and the results come back as more tokens in the window.' }, tw);
  const mcp = h('div', { style: 'position:absolute;left:0;top:336px;width:1700px' }, tw);
  h('div', { style: 'font:600 22px var(--mono);letter-spacing:.12em;color:var(--attn);margin-bottom:16px', text: 'MCP · A STANDARD PLUG FOR ADDING TOOLS' }, mcp);
  const plugs = h('div', { style: 'display:grid;grid-template-columns:repeat(6,1fr);gap:16px' }, mcp);
  const plugEls = [['🐙', 'GitHub'], ['📄', 'Google Drive'], ['💬', 'Slack'], ['🗄️', 'Databases'], ['🌐', 'A browser'], ['🔧', 'Your own API']].map(([ic, n]) => h('div', { style: 'border:2px solid var(--attn);border-radius:18px;background:#1b1626;padding:20px 10px;text-align:center', html: `<div style="font-size:46px">${ic}</div><div style="font:600 25px var(--sans);margin-top:8px">${n}</div>` }, plugs));
  h('div', { class: 'lbl', style: 'margin-top:26px;font-size:30px', html: 'Each connector gives the model new things it can <i>do</i>. More reach means more to supervise.' }, mcp);

  const loops = new Loops();
  loops.add('chat', () => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6 });
    const pairs = [['Why is my contract failing?', 'It is probably the signature check…'], ['No, I already fixed that.', 'You’re right! Then try…']];
    pairs.forEach(([q, a]) => {
      tl.call(() => { youMsg.textContent = q; aiMsg.textContent = a; });
      tl.fromTo(youMsg, { x: 520, y: 560, autoAlpha: 0 }, { x: 620, autoAlpha: 1, duration: 0.5, ease: 'power2.out' });
      tl.to(youMsg, { autoAlpha: 0.35, duration: 0.3 }, '+=1.1');
      tl.fromTo(aiMsg, { x: 900, y: 730, autoAlpha: 0 }, { x: 800, autoAlpha: 1, duration: 0.5, ease: 'power2.out' }, '<');
      tl.to([youMsg, aiMsg], { autoAlpha: 0, duration: 0.3 }, '+=1.6');
    });
    return tl;
  });
  loops.add('loop', () => {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
    tl.call(() => { logEl.textContent = ''; stepEl.textContent = ''; tools.forEach((t) => gsap.set(t, { borderColor: '#2a3347' })); });
    tl.set(dot, { opacity: 1, attr: { fill: '#ffe6c7' } });
    tl.fromTo(dot, { motionPath: { path: userLine, start: 0, end: 0 } }, { motionPath: { path: userLine, start: 0, end: 1 }, duration: 0.6, ease: 'power1.inOut', immediateRender: false });
    LOG.forEach(([ti, text], i) => {
      tl.call(() => { logEl.textContent = text; stepEl.textContent = `LOOP ${i + 1} · THINK → ACT → OBSERVE`; gsap.to(tools, { borderColor: '#2a3347', duration: 0.2 }); gsap.to(tools[ti], { borderColor: C.ai, duration: 0.2 }); });
      tl.set(dot, { attr: { fill: '#fff' } });
      tl.fromTo(dot, { motionPath: { path: lines[ti], start: 0, end: 0 } }, { motionPath: { path: lines[ti], start: 0, end: 1 }, duration: 0.45, ease: 'power1.inOut', immediateRender: false });
      tl.to(tools[ti], { scale: 1.05, duration: 0.12, yoyo: true, repeat: 1 });
      tl.to(dot, { motionPath: { path: lines[ti], start: 1, end: 0 }, duration: 0.45, ease: 'power1.inOut' });
      tl.fromTo(model, { scale: 1 }, { scale: 1.04, duration: 0.12, yoyo: true, repeat: 1 });
    });
    tl.call(() => { logEl.textContent = '“Done. Here is the diff and the test output.”'; stepEl.textContent = '7 LOOPS, NO HUMAN IN BETWEEN'; gsap.to(tools, { borderColor: '#2a3347', duration: 0.2 }); });
    tl.to(dot, { motionPath: { path: userLine, start: 1, end: 0 }, duration: 0.6, ease: 'power1.inOut' });
    tl.set(dot, { opacity: 0 });
    return tl;
  });

  function update({ state, step, instant }) {
    const to = mover(instant);
    const chat = state === 'chat', agent = chat && step >= 1, toolsSt = state === 'tools';
    // actors
    to(person, { x: agent ? 150 : 300, y: 605, autoAlpha: chat ? 1 : 0, duration: 1.0 });
    to(model, { x: agent ? mc.x - 125 : 1370, y: 565, autoAlpha: chat ? 1 : 0, scale: 1, duration: 1.0 });
    to(harness, { autoAlpha: agent ? 1 : 0, scale: agent ? 1 : 0.8, duration: 0.8, delay: agent && !instant ? 0.5 : 0 });
    tools.forEach((t, i) => to(t, { autoAlpha: agent ? 1 : 0, x: agent ? 0 : 80, duration: 0.6, delay: agent && !instant ? 0.7 + i * 0.1 : 0 }));
    to([...lines, userLine], { autoAlpha: agent ? 1 : 0, duration: 0.6, delay: agent && !instant ? 1.0 : 0 });
    to(chatTag, { autoAlpha: chat && step === 0 ? 1 : 0 });
    to([logEl, stepEl], { autoAlpha: chat && step === 2 ? 1 : 0 });
    if (!(chat && step === 0)) gsap.set([youMsg, aiMsg], { autoAlpha: 0 });
    if (!(chat && step === 2)) gsap.set(dot, { opacity: 0 });
    loops.only(...(chat && step === 0 ? ['chat'] : chat && step === 2 ? ['loop'] : []));
    // tools
    to(tw, { autoAlpha: toolsSt ? 1 : 0, duration: 0.6 });
    if (toolsSt) {
      [c1, arrows[0], c2, arrows[1], c3].forEach((e, i) => gsap.fromTo(e, { autoAlpha: instant || step > 0 ? 1 : 0, y: instant || step > 0 ? 0 : 30 }, { autoAlpha: 1, y: 0, duration: instant ? 0 : 0.5, delay: instant || step > 0 ? 0 : 0.3 + i * 0.3 }));
      to(toolLine, { autoAlpha: step === 0 ? 1 : 0 });
      to(mcp, { autoAlpha: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 30 });
      if (step >= 1 && !instant) gsap.fromTo(plugEls, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, delay: 0.2 });
    }
  }
  return { update, exit() { loops.stop(); } };
}
