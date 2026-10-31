// Scene "title": an emergency-card backdrop for the title and the closing slide: hazard-stripe bands,
// a Japanese label and slowly counter-rotating MAGI-style rings (orange on the title, green at the close).
import { gsap, h, rng, mover, W, H } from '../lib.js';

export default function create(root) {
  const cv = h('canvas', { class: 'full', width: W, height: H }, root);
  const ctx = cv.getContext('2d');
  const rand = rng(3);
  const CX = W / 2, CY = 560;
  const rings = Array.from({ length: 13 }, (_, i) => ({
    r: 170 + i * 66, speed: (i % 2 ? -1 : 1) * (0.04 + 0.015 * i),
    dash: Array.from({ length: 6 }, () => 0.04 + rand() * 0.5), ticks: i === 2 || i === 6 || i === 10, a: 0.08 + rand() * 0.14,
  }));
  const bandTop = h('div', { class: 'eva-band', style: 'top:150px' }, root);
  const bandBot = h('div', { class: 'eva-band', style: 'top:900px' }, root);
  const jp = h('div', { class: 'eva-jp', text: '人工知能入門' }, root);
  let on = false, warm = 0;
  function tick() {
    if (!on) return;
    const now = performance.now() / 1000;
    const col = [Math.round(255 - warm * 194), Math.round(138 + warm * 117), Math.round(28 + warm * 134)];
    const rgba = (a) => `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = 'butt';
    for (const ring of rings) {
      const rot = now * ring.speed;
      ctx.strokeStyle = rgba(ring.a); ctx.lineWidth = ring.ticks ? 3 : 2;
      let ang = rot;
      ring.dash.forEach((d, i) => {
        const len = d * Math.PI;
        if (i % 2 === 0) { ctx.beginPath(); ctx.arc(CX, CY, ring.r, ang, ang + len); ctx.stroke(); }
        ang += len;
      });
      if (ring.ticks) {
        ctx.strokeStyle = rgba(ring.a * 1.6); ctx.lineWidth = 2;
        for (let k = 0; k < 72; k++) {
          const t = rot + (k / 72) * Math.PI * 2, l = k % 6 === 0 ? 16 : 7;
          ctx.beginPath(); ctx.moveTo(CX + Math.cos(t) * ring.r, CY + Math.sin(t) * ring.r); ctx.lineTo(CX + Math.cos(t) * (ring.r + l), CY + Math.sin(t) * (ring.r + l)); ctx.stroke();
        }
      }
    }
    // a slow sweep
    const sw = now * 0.35;
    ctx.strokeStyle = rgba(0.22); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(sw) * 1100, CY + Math.sin(sw) * 1100); ctx.stroke();
    // keep the middle readable
    const grad = ctx.createRadialGradient(CX, CY - 60, 120, CX, CY - 60, 820);
    grad.addColorStop(0, 'rgba(5,3,2,.94)'); grad.addColorStop(1, 'rgba(5,3,2,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }
  gsap.ticker.add(tick);
  // closing call to action: a link to the projects page
  const cta = h('a', {
    href: 'https://brenorb.com/projects/', target: '_blank', rel: 'noopener',
    style: 'position:absolute;left:50%;top:790px;transform:translateX(-50%);display:inline-flex;align-items:center;gap:16px;padding:20px 34px;border-radius:999px;border:2px solid var(--bio);background:rgba(255,138,28,.08);color:var(--ink);text-decoration:none;font:500 32px var(--sans);white-space:nowrap;visibility:hidden;opacity:0',
    html: 'See what I’m building <b style="color:var(--bio);font-weight:600">brenorb.com/projects</b> <span style="color:var(--bio)">→</span>',
  }, root);
  const tone = { v: 0 };
  return {
    update({ state, instant }) {
      on = true;
      const close = state === 'close';
      root.classList.toggle('eva-close', close);
      jp.textContent = close ? '作戦終了' : '人工知能入門';
      gsap.to(tone, { v: state === 'close' ? 1 : 0, duration: instant ? 0 : 1.2, onUpdate: () => { warm = tone.v; } });
      mover(instant)(cta, { autoAlpha: state === 'close' ? 1 : 0, y: state === 'close' ? 0 : 16, duration: 0.7, delay: state === 'close' && !instant ? 0.9 : 0 });
    },
    exit() { on = false; },
  };
}
