// Scene "explainer": Transformer Explainer (Polo Club, Georgia Tech, MIT licence) in an iframe.
// Online it embeds the hosted original. Locally it uses the offline copy in explainer/ (not in git;
// see README) when present, so the talk works without wifi. ?explainer=local|remote forces either.
// A static screenshot stays underneath as a fallback until (and unless) the app loads.
import { gsap, h } from '../lib.js';

const REMOTE = 'https://poloclub.github.io/transformer-explainer/';

async function pickSource() {
  const forced = new URLSearchParams(location.search).get('explainer');
  if (forced === 'remote') return REMOTE;
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  if (forced !== 'local' && !local) return REMOTE;
  try { if ((await fetch('explainer/index.html', { method: 'HEAD' })).ok) return 'explainer/'; } catch (e) { /* no local copy */ }
  return REMOTE;
}

export default function create(root, api) {
  const box = h('div', { style: 'position:absolute;left:40px;top:150px;width:1840px;height:850px;border-radius:18px;overflow:hidden;border:2px solid var(--line);background:#fff' }, root);
  h('img', { src: 'assets/explainer-fallback.jpg', alt: 'Transformer Explainer (static screenshot)', style: 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top left' }, box);
  const status = h('div', { class: 'note', style: 'position:absolute;right:60px;top:112px;color:var(--faint)', text: '' }, root);
  const credit = h('div', { class: 'note', style: 'position:absolute;left:460px;width:1000px;text-align:center;top:1010px;font-size:15px', text: '' }, root);
  let frame = null;
  async function load() {
    if (frame) return;
    frame = true;
    const src = await pickSource();
    const isLocal = src !== REMOTE;
    credit.textContent = `Transformer Explainer · Polo Club, Georgia Tech · MIT licence · ${isLocal ? 'local int8 copy' : 'live from poloclub.github.io'}`;
    status.textContent = isLocal ? 'loading the model (local)…' : 'loading the live demo…';
    frame = h('iframe', { src, title: 'Transformer Explainer', style: 'position:absolute;inset:0;width:100%;height:100%;border:0;opacity:0;background:#fff' }, box);
    frame.addEventListener('load', () => {
      gsap.to(frame, { opacity: 1, duration: 0.6 }); status.textContent = '';
      // same-origin copy only: keep the presenter clicker working while the demo has focus
      if (isLocal) try { frame.contentWindow.addEventListener('keydown', (e) => { if (e.key === 'PageDown') { e.preventDefault(); api.next(); } if (e.key === 'PageUp') { e.preventDefault(); api.prev(); } }); } catch (e) { /* ignore */ }
    });
    setTimeout(() => { if (frame && +frame.style.opacity === 0) status.textContent = 'still loading… (screenshot shown meanwhile)'; }, 9000);
  }
  return { update() { load(); }, exit() {}, preload: load };
}
