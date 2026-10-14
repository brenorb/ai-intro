// Small helpers shared by all scenes.
export const gsap = window.gsap;
gsap.registerPlugin(window.MotionPathPlugin, window.Flip, window.CustomEase);

export const W = 1920, H = 1080;
const SVGNS = 'http://www.w3.org/2000/svg';

export const C = {
  ink: '#f3f1ea', dim: '#a3aabb', faint: '#626c82', line: '#2a3347', panel: '#151a26', panel2: '#1c2333',
  bio: '#ffb057', bio2: '#ff7a59', ai: '#5fd4e8', ai2: '#7c9cff', attn: '#c59bff', ok: '#6fdc8c', bad: '#ff6b6b', gold: '#ffd166', bg: '#0a0c12',
};

/** Create an SVG element: s('circle', {cx: 1}, parent) */
export function s(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) {
    if (k === 'text') e.textContent = attrs[k];
    else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}

/** Create an HTML element: h('div', {class: 'x', html: '...'}, parent) */
export function h(tag, attrs = {}, parent) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'html') e.innerHTML = attrs[k];
    else if (k === 'text') e.textContent = attrs[k];
    else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(e.style, attrs[k]);
    else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  }
  if (parent) parent.appendChild(e);
  return e;
}

export function svgRoot(parent, cls = 'full') {
  return s('svg', { class: cls, viewBox: `0 0 ${W} ${H}`, width: W, height: H }, parent);
}

/** Deterministic random numbers so the deck looks the same every run. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const sigmoid = (x) => 1 / (1 + Math.exp(-x));
export const fmt = (x, d = 2) => (x >= 0 ? '' : '−') + Math.abs(x).toFixed(d);

/** to(): gsap.to that becomes gsap.set when `instant` is true. */
export function mover(instant) {
  return (target, vars) => {
    if (instant) { const { duration, delay, ease, stagger, ...rest } = vars; gsap.killTweensOf(target); return gsap.set(target, rest); }
    return gsap.to(target, { duration: 0.8, ease: 'power3.inOut', overwrite: true, ...vars });
  };
}

/** show/hide by autoAlpha with a list of [element, visibleBoolean] */
export function vis(to, pairs, extra = {}) {
  for (const [el, on] of pairs) to(el, { autoAlpha: on ? 1 : 0, ...extra });
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
export function spline(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/** A group of looping timelines that a scene can start/stop as a unit. */
export class Loops {
  constructor() { this.items = new Map(); }
  add(name, make) { this.items.set(name, { make, tl: null }); return this; }
  only(...names) {
    for (const [n, it] of this.items) {
      if (names.includes(n)) { if (!it.tl) it.tl = it.make(); else it.tl.play(); }
      else if (it.tl) { it.tl.kill(); it.tl = null; }
    }
  }
  stop() { this.only(); }
}
