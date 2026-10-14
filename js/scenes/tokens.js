// Scene "tokens": live tokenizer widget. Type anything → token chips → IDs → embedding vectors.
// Steps: 0 chips only · 1 IDs and vectors
import { gsap, h, mover } from '../lib.js';
import { loadTokenizer } from '../tokenizer.js';

export const CHIP_COLORS = ['#7fd8ea', '#ffc27a', '#c9a6ff', '#8fe3a6', '#ff9d8a', '#ffe08a'];
export const showTok = (t) => t.replace(/ /g, '·').replace(/\n/g, '↵');
const PRESETS = ['strawberry', ' Strawberry', 'strawberries', '1234567', 'Blockstream', 'jet::bip_0340_verify(pk, sig)'];
const MAX_ROWS = 7;

export default function create(root) {
  const w = h('div', { class: 'tokw' }, root);
  const input = h('input', { type: 'text', value: 'strawberry', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Text to tokenize' }, w);
  const pr = h('div', { class: 'presets' }, w);
  PRESETS.forEach((p) => h('button', { text: showTok(p) }, pr).addEventListener('click', () => { input.value = p; render(); }));
  const stats = h('span', { class: 'tokstats' }, pr);
  const line = h('div', { class: 'tokline' }, w);
  const table = h('div', {}, w);
  const head = h('div', { class: 'tokhead', html: '<span>token</span><span>index</span><span class="vh"></span>' }, table);
  const rows = h('div', { class: 'tokrows' }, table);
  const more = h('div', { class: 'note', style: 'margin-top:10px' }, table);
  let tk = null;

  function render() {
    if (!tk) { stats.textContent = 'loading tokenizer…'; return; }
    const text = input.value;
    const toks = tk.tokens(text);
    stats.textContent = `${[...text].length} characters → ${toks.length} token${toks.length === 1 ? '' : 's'}`;
    line.innerHTML = '';
    toks.slice(0, 40).forEach((t, i) => h('span', { class: 'tokchip', style: `background:${CHIP_COLORS[i % CHIP_COLORS.length]}`, text: showTok(t.text) }, line));
    rows.innerHTML = '';
    head.querySelector('.vh').textContent = tk.emb ? `vector: first ${tk.emb.meta.dims} of ${tk.emb.meta.fullDims} dimensions (GPT-2)` : 'vector';
    toks.slice(0, MAX_ROWS).forEach((t, i) => {
      const r = h('div', { class: 'tokrow' }, rows);
      h('span', { class: 'tokchip', style: `background:${CHIP_COLORS[i % CHIP_COLORS.length]}`, text: showTok(t.text) }, r);
      h('span', { class: 'tokid', html: `<small>#</small>${t.id}` }, r);
      const v = h('span', { class: 'tokvec' }, r);
      if (tk.emb) {
        let html = '';
        for (const q of tk.emb.vector(t.id)) { const a = Math.min(1, Math.abs(q) / 70); html += `<i style="background:rgba(${q >= 0 ? '95,212,232' : '255,150,90'},${(0.08 + a * 0.92).toFixed(2)})"></i>`; }
        v.innerHTML = html;
      }
    });
    more.textContent = toks.length > MAX_ROWS ? `+ ${toks.length - MAX_ROWS} more tokens` : '';
  }
  input.addEventListener('input', render);
  loadTokenizer().then((t) => { tk = t; render(); }).catch((e) => { stats.textContent = 'tokenizer failed to load: ' + e.message; });
  render();

  return {
    update({ step, instant }) {
      const to = mover(instant);
      to(table, { autoAlpha: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : 30, duration: 0.6 });
      if (step >= 1 && !instant && rows.children.length) gsap.fromTo(rows.children, { autoAlpha: 0, x: -20 }, { autoAlpha: 1, x: 0, duration: 0.4, stagger: 0.06 });
    },
    exit() { input.blur(); },
  };
}
