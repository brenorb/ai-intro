// Scene "title": a slow drifting field of connected nodes behind the title and the closing slide.
import { gsap, h, rng, W, H } from '../lib.js';

export default function create(root) {
  const cv = h('canvas', { class: 'full', width: W, height: H }, root);
  const ctx = cv.getContext('2d');
  const rand = rng(3);
  const pts = Array.from({ length: 110 }, () => ({ x: rand() * W, y: rand() * H, vx: (rand() - 0.5) * 12, vy: (rand() - 0.5) * 12, ph: rand() * 6.28 }));
  let on = false, last = 0, warm = 0;
  function tick() {
    if (!on) return;
    const now = performance.now() / 1000, dt = Math.min(0.05, now - last); last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of pts) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -40) p.x = W + 40; if (p.x > W + 40) p.x = -40; if (p.y < -40) p.y = H + 40; if (p.y > H + 40) p.y = -40; }
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 210) continue;
      const pulse = 0.5 + 0.5 * Math.sin(now * 1.4 + a.ph + b.ph);
      ctx.strokeStyle = `rgba(${Math.round(95 + warm * 160)},${Math.round(212 - warm * 36)},${Math.round(232 - warm * 145)},${(1 - d / 210) * (0.1 + 0.22 * pulse)})`;
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const p of pts) {
      const g = 0.45 + 0.4 * Math.sin(now * 1.1 + p.ph);
      ctx.fillStyle = `rgba(${Math.round(190 + warm * 65)},${Math.round(236 - warm * 30)},${Math.round(255 - warm * 120)},${g})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, 6.283); ctx.fill();
    }
    // keep the middle readable
    const grad = ctx.createRadialGradient(W / 2, H * 0.47, 120, W / 2, H * 0.47, 900);
    grad.addColorStop(0, 'rgba(10,12,18,.92)'); grad.addColorStop(1, 'rgba(10,12,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  }
  gsap.ticker.add(tick);
  const tone = { v: 0 };
  return {
    update({ state, instant }) {
      on = true; last = performance.now() / 1000;
      gsap.to(tone, { v: state === 'close' ? 1 : 0, duration: instant ? 0 : 1.2, onUpdate: () => { warm = tone.v; } });
    },
    exit() { on = false; },
  };
}
