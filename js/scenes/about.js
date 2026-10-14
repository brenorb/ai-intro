// Scene "about": who is talking. A timeline that lights up node by node, like the neuron's signal.
// Set `photo` on the slide in js/slides.js (e.g. 'assets/me.jpg') to replace the monogram.
import { gsap, h, s, svgRoot, C } from '../lib.js';

const Y = 640, X0 = 430, DX = 220;
const STEPS = [
  ['2010', 'First neural network: telling musical instruments apart'],
  ['2013', 'Engineering thesis: a reinforcement-learning trading bot'],
  ['2017', 'Into Bitcoin: Portuguese BIP39 wordlist, translating O Padrão Bitcoin'],
  ['LLMs', 'Satoshi 7B, the first open-source Bitcoin language model'],
  ['Hackathons', 'Prizes with LLM code assistants for Bitcoin smart contracts'],
  ['Now', 'Agent skills for Bitcoin and Nostr; talks on agentic engineering'],
];

export default function create(root) {
  const svg = svgRoot(root);
  const line = s('line', { x1: X0, y1: Y, x2: X0 + DX * (STEPS.length - 1), y2: Y, stroke: C.line, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const lit = s('line', { x1: X0, y1: Y, x2: X0, y2: Y, stroke: C.ai, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const pulse = s('circle', { cx: X0, cy: Y, r: 11, fill: '#eafcff', class: 'glow-ai', opacity: 0 }, svg);
  const nodes = STEPS.map((_, i) => s('circle', { cx: X0 + DX * i, cy: Y, r: 13, fill: C.bg, stroke: C.faint, 'stroke-width': 3 }, svg));
  const labels = STEPS.map(([tag, text], i) => {
    const up = i % 2 === 0;
    return h('div', {
      style: `position:absolute;left:${X0 + DX * i - 14}px;${up ? `bottom:${1080 - Y + 34}px` : `top:${Y + 34}px`};width:${DX * 1.5}px`,
      html: `<div style="font:600 24px var(--mono);color:${i === STEPS.length - 1 ? C.gold : C.ai};letter-spacing:.06em">${tag}</div><div style="font:400 25px/1.3 var(--sans);color:var(--ink);margin-top:6px;max-width:${DX * 1.4}px">${text}</div>`,
    }, root);
  });

  const photo = h('div', { style: 'position:absolute;left:110px;top:510px;width:250px;height:250px;border-radius:50%;padding:5px;background:conic-gradient(from 200deg,#5fd4e8,#7c9cff,#ffb057,#5fd4e8)' }, root);
  const inner = h('div', { style: 'width:100%;height:100%;border-radius:50%;background:#10141d;display:grid;place-items:center;overflow:hidden;font:500 92px var(--serif);color:var(--ink)', text: 'BB' }, photo);
  const img = new Image();
  img.onload = () => { inner.textContent = ''; Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' }); inner.appendChild(img); };

  const chips = h('div', { style: 'position:absolute;left:110px;top:900px;display:flex;gap:16px' }, root);
  const chipEls = ['📖 Author of <i>101 Perguntas sobre Bitcoin</i>', '🏛️ Host of BitDevs Brasília', '🌐 brenorb.com'].map((t) => h('div', { class: 'chip', html: t }, chips));

  let tl = null;
  function play(instant) {
    tl && tl.kill();
    const end = (i) => X0 + DX * i;
    if (instant) {
      lit.setAttribute('x2', end(STEPS.length - 1));
      nodes.forEach((n, i) => gsap.set(n, { attr: { fill: i === STEPS.length - 1 ? C.gold : C.ai, stroke: i === STEPS.length - 1 ? C.gold : C.ai } }));
      gsap.set([...labels, ...chipEls, photo], { autoAlpha: 1, y: 0 }); gsap.set(pulse, { opacity: 0 });
      return;
    }
    gsap.set(labels, { autoAlpha: 0, y: 14 }); gsap.set(chipEls, { autoAlpha: 0, y: 14 }); gsap.set(photo, { autoAlpha: 0, scale: 0.9 });
    nodes.forEach((n) => gsap.set(n, { attr: { fill: C.bg, stroke: C.faint } }));
    lit.setAttribute('x2', X0);
    tl = gsap.timeline();
    tl.to(photo, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
    tl.set(pulse, { opacity: 1, attr: { cx: X0 } });
    STEPS.forEach((_, i) => {
      if (i > 0) tl.to([pulse, lit], { attr: { cx: end(i), x2: end(i) }, duration: 0.42, ease: 'power1.inOut' });
      const last = i === STEPS.length - 1;
      tl.to(nodes[i], { attr: { fill: last ? C.gold : C.ai, stroke: last ? C.gold : C.ai, r: 17 }, duration: 0.15 });
      tl.to(nodes[i], { attr: { r: 13 }, duration: 0.25 });
      tl.to(labels[i], { autoAlpha: 1, y: 0, duration: 0.4 }, '<-0.2');
    });
    tl.to(pulse, { opacity: 0, duration: 0.3 });
    tl.to(chipEls, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.12 }, '-=0.1');
  }
  return { update({ instant, slide }) { if (slide.photo && !img.src) img.src = slide.photo; play(instant); }, exit() { tl && tl.kill(); } };
}
