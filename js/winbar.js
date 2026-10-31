// The context-window bar: a fixed-capacity frame holding coloured segments (tokens by source).
// Reused by the context slides and by the "why did it do that?" callbacks.
import { gsap, h, C } from './lib.js';

export const KIND = {
  sys: { color: '#a46bff', group: 'System prompt' },
  inst: { color: '#ffbf1a', group: 'Your instructions' },
  you: { color: '#ff8a1c', group: 'You' },
  ai: { color: '#3dffa2', group: 'Model' },
  tool: { color: '#a6ff3a', group: 'Tool results' },
  file: { color: '#2ee6d6', group: 'Files' },
  agents: { color: '#ffd23f', group: 'AGENTS.md' },
  skill: { color: '#ff5a36', group: 'Skills' },
  summary: { color: '#fff0dc', group: 'Summary' },
  web: { color: '#ff2a1f', group: 'Web page' },
};

export function createWinBar(parent, { left = 110, top = 560, width = 1700, height = 150, label = 'Context window', cap = 'fixed size' } = {}) {
  const wrap = h('div', { style: 'position:absolute;inset:0' }, parent);
  const frame = h('div', { class: 'winframe', 'data-label': label, 'data-cap': cap, style: { left: left + 'px', top: top + 'px', width: width + 'px', height: height + 'px' } }, wrap);
  const legend = h('div', { style: `position:absolute;left:${left}px;top:${top + height + 22}px;display:flex;gap:26px;flex-wrap:wrap;width:${width}px;font:500 22px var(--sans);color:var(--dim)` }, wrap);
  const inner = { x: left + 6, w: width - 12, y: top + 6, h: height - 12 };
  const segs = new Map();
  let current = [];

  function set(list, { instant = false, stagger = 0, fall = true } = {}) {
    const total = list.reduce((a, sg) => a + sg.size, 0);
    const scale = inner.w / 100;
    let x = inner.x;
    const keys = new Set(list.map((sg) => sg.key));
    // removed segments: fall off (oldest) or fade
    for (const [key, el] of segs) {
      if (keys.has(key)) continue;
      segs.delete(key);
      gsap.killTweensOf(el);
      if (instant) el.remove();
      else gsap.to(el, fall ? { y: 260 + Math.random() * 80, rotation: (Math.random() - 0.5) * 50, autoAlpha: 0, duration: 1.1, ease: 'power2.in', onComplete: () => el.remove() } : { autoAlpha: 0, duration: 0.4, onComplete: () => el.remove() });
    }
    let newIdx = 0;
    list.forEach((sg) => {
      const k = KIND[sg.kind] || {};
      const w = Math.max(2, sg.size * scale - 4);
      let el = segs.get(sg.key);
      const fresh = !el;
      if (fresh) {
        el = h('div', { class: 'seg', style: { left: x + 'px', width: w + 'px', top: inner.y + 'px', height: inner.h + 'px', background: sg.color || k.color } }, wrap);
        h('span', {}, el);
        segs.set(sg.key, el);
      }
      const lab = el.querySelector('span');
      const text = sg.label || '';
      lab.textContent = text;
      lab.style.display = text.length * 12.5 + 16 < w ? '' : 'none';
      gsap.killTweensOf(el);
      if (instant) gsap.set(el, { left: x, width: w, autoAlpha: 1, y: 0, rotation: 0, scaleY: 1, background: sg.color || k.color });
      else if (fresh) gsap.fromTo(el, { autoAlpha: 0, y: -70 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: stagger * newIdx++ });
      else gsap.to(el, { left: x, width: w, autoAlpha: 1, y: 0, duration: 0.8, ease: 'power3.inOut', background: sg.color || k.color });
      x += sg.size * scale;
    });
    // legend
    const groups = [...new Map(list.map((sg) => [sg.group || (KIND[sg.kind] || {}).group, sg.color || (KIND[sg.kind] || {}).color])).entries()].filter(([g]) => g);
    legend.innerHTML = groups.map(([g, c]) => `<span style="display:inline-flex;align-items:center;gap:10px"><i style="width:20px;height:20px;border-radius:5px;background:${c};display:inline-block"></i>${g}</span>`).join('');
    current = list;
    return total;
  }
  /** Drop whole oldest unpinned segments until the list fits in 100. */
  function fit(list) {
    const out = [...list];
    let total = out.reduce((a, sg) => a + sg.size, 0);
    while (total > 100) { const i = out.findIndex((sg) => !sg.pinned); if (i < 0) break; total -= out[i].size; out.splice(i, 1); }
    return out;
  }
  const rectOf = (key) => { const el = segs.get(key); return el ? { left: parseFloat(el.style.left), width: parseFloat(el.style.width) } : null; };
  return { wrap, frame, legend, inner, set, fit, rectOf, get current() { return current; }, color: C };
}
