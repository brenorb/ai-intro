// Deck engine: one persistent stage, scenes as persistent layers, slides as states of scenes.
// A slide = { id, scene, state, steps, part, title, time, caption | captions[], layout, notes }.
// A scene module exports create(root, api) -> { update(ctx), exit() }.
import { gsap, h } from './lib.js';
import { SLIDES as ALL_SLIDES, SCENES, PARTS } from './slides.js';

const params = new URLSearchParams(location.search);
const skipIds = new Set((params.get('skip') || '').split(',').filter(Boolean));
const SLIDES = ALL_SLIDES.filter((sl) => !sl.skip && !skipIds.has(sl.id));
const isPresenter = params.has('presenter');
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('ai-talk-deck') : null;

const $ = (q) => document.querySelector(q);
const stage = $('#stage'), scenesEl = $('#scenes'), captionEl = $('#caption');
const kickerEl = captionEl.querySelector('.kicker'), headEl = captionEl.querySelector('.headline'), subEl = captionEl.querySelector('.sub');

const live = {};          // scene name -> { layer, api }
let cur = null;           // { idx, step }
let scale = 1;
const startedAt = Date.now();

// ---------- scaling ----------
function fit() {
  scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${scale}) translate(-50%, -50%)`;
}
addEventListener('resize', fit);
fit();

// ---------- captions ----------
function captionFor(slide, step) {
  if (slide.captions) {
    let c = null;
    for (let i = 0; i <= step && i < slide.captions.length; i++) if (slide.captions[i]) c = { ...(c || {}), ...slide.captions[i] };
    return c || {};
  }
  return slide.caption || {};
}
let capKey = '';
function setCaption(slide, step, instant) {
  const c = captionFor(slide, step);
  const layout = c.layout || slide.layout || '';
  const key = JSON.stringify([c.kicker, c.h, c.sub, layout]);
  if (key === capKey) return;
  const apply = () => {
    captionEl.className = layout;
    kickerEl.innerHTML = c.kicker || '';
    headEl.innerHTML = c.h || '';
    subEl.innerHTML = c.sub || '';
    kickerEl.style.display = c.kicker ? '' : 'none';
    subEl.style.display = c.sub ? '' : 'none';
  };
  const prev = capKey ? JSON.parse(capKey) : [];
  capKey = key;
  // stop whatever caption animation is running and drop its leftovers (an interrupted Flip
  // morph would otherwise leave the headline squeezed by a half-finished scale)
  const lines = [kickerEl, headEl, subEl];
  gsap.killTweensOf(lines);
  gsap.set(lines, { clearProps: 'transform,width,height' });
  if (instant) { apply(); gsap.set(lines, { autoAlpha: 1, y: 0 }); return; }
  // same headline, different layout (e.g. big quote → quote with explanation): move it instead of swapping it
  if (prev[1] === c.h && prev[0] === c.kicker && prev[3] !== layout) {
    gsap.set([kickerEl, headEl], { autoAlpha: 1, y: 0 });
    const st = window.Flip.getState([kickerEl, headEl]);
    apply();
    window.Flip.from(st, { duration: 0.9, ease: 'power3.inOut', scale: true, onComplete: () => gsap.set([kickerEl, headEl], { clearProps: 'transform,width,height' }) });
    gsap.fromTo(subEl, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.55 });
    return;
  }
  // only animate the lines that changed
  const changed = [];
  if (prev[0] !== c.kicker || prev[3] !== layout) changed.push(kickerEl);
  if (prev[1] !== c.h || prev[3] !== layout) changed.push(headEl);
  if (prev[2] !== c.sub || prev[3] !== layout) changed.push(subEl);
  gsap.to(changed, {
    autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in', overwrite: true,
    onComplete: () => {
      apply();
      gsap.set([kickerEl, headEl, subEl].filter((e) => !changed.includes(e)), { autoAlpha: 1, y: 0 });
      gsap.fromTo(changed, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.07 });
    },
  });
}

// ---------- scenes ----------
function getScene(name) {
  if (!live[name]) {
    const layer = h('div', { class: 'scene', 'data-scene': name }, scenesEl);
    const api = SCENES[name](layer, { next, prev, stage, getScale: () => scale });
    live[name] = { layer, api };
  }
  return live[name];
}

/** FLIP shared elements between two scene layers: [data-morph="key"] present in both. */
function morphShared(oldLayer, newLayer) {
  const olds = new Map([...oldLayer.querySelectorAll('[data-morph]')].map((e) => [e.dataset.morph, e]));
  newLayer.querySelectorAll('[data-morph]').forEach((ne) => {
    const oe = olds.get(ne.dataset.morph);
    if (!oe) return;
    const a = oe.getBoundingClientRect(), b = ne.getBoundingClientRect();
    if (!a.width || !b.width) return;
    gsap.set(oe, { autoAlpha: 0 });
    gsap.from(ne, {
      x: (a.left - b.left) / scale, y: (a.top - b.top) / scale, scaleX: a.width / b.width, scaleY: a.height / b.height,
      transformOrigin: '0 0', duration: 0.9, ease: 'power3.inOut', clearProps: 'transform',
    });
  });
}

function show(idx, step, { dir = 1, instant = false } = {}) {
  idx = Math.max(0, Math.min(SLIDES.length - 1, idx));
  const slide = SLIDES[idx];
  step = Math.max(0, Math.min((slide.steps || 1) - 1, step));
  const prev = cur && { ...cur, slide: SLIDES[cur.idx] };
  if (prev && prev.idx === idx && prev.step === step) return;
  const sameScene = !!prev && prev.slide.scene === slide.scene;
  const sc = getScene(slide.scene);

  if (!sameScene) {
    if (prev) {
      const old = live[prev.slide.scene];
      gsap.killTweensOf(old.layer);
      gsap.to(old.layer, { autoAlpha: 0, duration: instant ? 0 : 0.5, ease: 'power2.inOut', onComplete: () => old.api.exit && old.api.exit() });
    }
    gsap.killTweensOf(sc.layer);
    gsap.to(sc.layer, { autoAlpha: 1, duration: instant ? 0 : 0.7, ease: 'power2.inOut', delay: instant ? 0 : 0.15 });
  }
  sc.api.update({
    state: slide.state, step, dir, instant: instant || false, entering: !sameScene,
    prevState: sameScene ? prev.slide.state : null, prevStep: sameScene && prev.idx === idx ? prev.step : null, slide,
  });
  if (!sameScene && prev && !instant) morphShared(live[prev.slide.scene].layer, sc.layer);

  setCaption(slide, step, instant || !prev);
  cur = { idx, step };
  document.body.classList.toggle('interactive', !!slide.interactive);

  // chrome
  $('#part-label').textContent = PARTS[slide.part] || '';
  $('#counter').textContent = `${idx + 1} / ${SLIDES.length}`;
  const total = SLIDES.reduce((a, sl) => a + (sl.steps || 1), 0);
  const done = SLIDES.slice(0, idx).reduce((a, sl) => a + (sl.steps || 1), 0) + step + 1;
  $('#progress i').style.width = `${(done / total) * 100}%`;
  history.replaceState(null, '', `#${slide.id}${step ? '.' + step : ''}`);
  renderNotes();
  channel && channel.postMessage({ type: 'state', idx, step });
  // build the next scene ahead of time so the transition into it is smooth
  const nx = SLIDES[idx + 1];
  if (nx) setTimeout(() => { const n = getScene(nx.scene); n.api.preload && n.api.preload(); }, 900);
}

function next() { if (!cur) return; const sl = SLIDES[cur.idx]; if (cur.step < (sl.steps || 1) - 1) show(cur.idx, cur.step + 1, { dir: 1 }); else if (cur.idx < SLIDES.length - 1) show(cur.idx + 1, 0, { dir: 1 }); }
function prev() { if (!cur) return; if (cur.step > 0) show(cur.idx, cur.step - 1, { dir: -1 }); else if (cur.idx > 0) show(cur.idx - 1, (SLIDES[cur.idx - 1].steps || 1) - 1, { dir: -1, instant: false }); }
function jump(idx, step = 0) { show(idx, step, { instant: true }); }

// ---------- notes / overview / help ----------
const notesEl = $('#notes'), overviewEl = $('#overview'), helpEl = $('#help');
const clock = () => { const s = Math.floor((Date.now() - startedAt) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const notesHtml = (sl) => (sl.notes || '').trim().split(/\n\s*\n/).map((p) => `<p>${p.trim()}</p>`).join('');
function renderNotes() {
  if (notesEl.hidden || !cur) return;
  const sl = SLIDES[cur.idx], nx = SLIDES[cur.idx + 1];
  notesEl.innerHTML = `<div class="meta"><span>${cur.idx + 1}. ${sl.title}</span><span>step ${cur.step + 1}/${sl.steps || 1}</span><span>~${sl.time || 1} min</span><span>${clock()}</span></div>${notesHtml(sl)}<div class="next">Next: ${nx ? nx.title : '— end —'}</div>`;
}
function renderOverview() {
  let html = `<h2>Slides</h2><div class="hint">click to jump · Esc to close · total ≈ ${SLIDES.reduce((a, s) => a + (s.time || 0), 0).toFixed(1)} min</div>`;
  let part = -1;
  SLIDES.forEach((sl, i) => {
    if (sl.part !== part) { if (part !== -1) html += '</ol>'; part = sl.part; const t = SLIDES.filter((x) => x.part === part).reduce((a, x) => a + (x.time || 0), 0); html += `<h3>${PARTS[part] || 'Intro'} · ~${t.toFixed(1)} min</h3><ol>`; }
    html += `<li data-i="${i}" class="${cur && cur.idx === i ? 'cur' : ''}"><span class="n">${i + 1}</span><span>${sl.title}</span><span class="t">${sl.steps || 1} step${(sl.steps || 1) > 1 ? 's' : ''}</span></li>`;
  });
  overviewEl.innerHTML = html + '</ol>';
  overviewEl.querySelectorAll('li').forEach((li) => li.addEventListener('click', () => { overviewEl.hidden = true; jump(+li.dataset.i); }));
}
helpEl.innerHTML = `<div><kbd>→</kbd><kbd>Space</kbd><kbd>PgDn</kbd> next</div><div><kbd>←</kbd><kbd>PgUp</kbd> back</div><div><kbd>N</kbd> speaker notes</div><div><kbd>P</kbd> presenter window</div><div><kbd>O</kbd> overview / jump</div><div><kbd>F</kbd> fullscreen</div><div><kbd>Home</kbd><kbd>End</kbd> first / last</div><div><kbd>?</kbd> this help</div>`;

// ---------- input ----------
function onKey(e) {
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  const k = e.key;
  if (typing) {
    if (k === 'PageDown') { e.preventDefault(); t.blur(); next(); } else if (k === 'PageUp') { e.preventDefault(); t.blur(); prev(); } else if (k === 'Escape') t.blur();
    return;
  }
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (!overviewEl.hidden && k !== 'Escape' && k.toLowerCase() !== 'o') return;
  if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter' || k === 'ArrowDown') { e.preventDefault(); next(); }
  else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace' || k === 'ArrowUp') { e.preventDefault(); prev(); }
  else if (k === 'Home') jump(0);
  else if (k === 'End') jump(SLIDES.length - 1);
  else if (k.toLowerCase() === 'n') { notesEl.hidden = !notesEl.hidden; renderNotes(); }
  else if (k.toLowerCase() === 'o') { overviewEl.hidden = !overviewEl.hidden; if (!overviewEl.hidden) renderOverview(); }
  else if (k === 'Escape') { overviewEl.hidden = true; helpEl.hidden = true; }
  else if (k.toLowerCase() === 'f') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
  else if (k.toLowerCase() === 'p') window.open(location.pathname + '?presenter', 'ai-talk-presenter', 'width=900,height=700');
  else if (k === '?') helpEl.hidden = !helpEl.hidden;
}

// ---------- presenter window ----------
function bootPresenter() {
  document.body.classList.add('presenter');
  const root = h('div', { id: 'presenter' }, document.body);
  let st = { idx: 0, step: 0 };
  const render = () => {
    const sl = SLIDES[st.idx], nx = SLIDES[st.idx + 1];
    root.innerHTML = `<div class="top"><span>${st.idx + 1} / ${SLIDES.length}</span><span>${PARTS[sl.part] || ''}</span><span>~${sl.time || 1} min</span><span class="clock">${clock()}</span></div>
      <h1>${sl.title}</h1><div class="step">step ${st.step + 1} of ${sl.steps || 1}</div><div class="notes">${notesHtml(sl)}</div>
      <div class="next">Next: <b>${nx ? nx.title : '— end —'}</b></div>
      <div class="btns"><button data-c="prev">‹ Back</button><button data-c="next">Next ›</button></div>`;
    root.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => channel.postMessage({ type: 'cmd', cmd: b.dataset.c })));
  };
  channel.onmessage = (e) => { if (e.data.type === 'state') { st = e.data; render(); } };
  channel.postMessage({ type: 'hello' });
  addEventListener('keydown', (e) => {
    if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); channel.postMessage({ type: 'cmd', cmd: 'next' }); }
    if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); channel.postMessage({ type: 'cmd', cmd: 'prev' }); }
  });
  setInterval(() => { const c = root.querySelector('.clock'); if (c) c.textContent = clock(); }, 1000);
  render();
}

// ---------- boot ----------
function boot() {
  if (isPresenter) return bootPresenter();
  fit();
  addEventListener('keydown', onKey);
  // scroll / trackpad: optional and secondary; ignored on interactive slides and while a widget has focus
  let wheelLock = 0;
  addEventListener('wheel', (e) => {
    if (!cur || SLIDES[cur.idx].interactive || !overviewEl.hidden || Math.abs(e.deltaY) < 30) return;
    const now = Date.now(); if (now < wheelLock) return; wheelLock = now + 900;
    (e.deltaY > 0 ? next : prev)();
  }, { passive: true });
  $('#nav-next').addEventListener('click', next);
  $('#nav-prev').addEventListener('click', prev);
  if (channel) channel.onmessage = (e) => {
    if (e.data.type === 'cmd') (e.data.cmd === 'next' ? next : prev)();
    if (e.data.type === 'hello' && cur) channel.postMessage({ type: 'state', ...cur });
  };
  const [id, st] = location.hash.slice(1).split('.');
  const i = SLIDES.findIndex((sl) => sl.id === id);
  show(i >= 0 ? i : 0, +st || 0, { instant: true });
  setInterval(() => !notesEl.hidden && renderNotes(), 1000);
  // ?auto=N presses “next” N times after loading (used by tools/shot.sh to capture animated transitions)
  const auto = +params.get('auto') || 0;
  for (let k = 0; k < auto; k++) setTimeout(next, 600 + k * 2600);
  window.deck = { next, prev, jump, show, SLIDES, get cur() { return cur; } };
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(boot);
