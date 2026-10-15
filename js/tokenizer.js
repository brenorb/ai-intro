// GPT-2 tokenizer + token-embedding lookup, all from local files.
// A small byte-level BPE that reads Hugging Face's tokenizer.json for GPT-2 (vocabulary, merges and
// special tokens) and applies the same algorithm, so it gives the same tokens as the reference tokenizer.
let ready = null;

export async function loadBpe() {
  const tj = await (await fetch(new URL('../models/gpt2/tokenizer.json', import.meta.url))).json();
  const vocab = tj.model.vocab, merges = tj.model.merges;
  const rank = new Map(merges.map((m, i) => [Array.isArray(m) ? m.join(' ') : m, i]));
  const inv = []; for (const k in vocab) inv[vocab[k]] = k;
  // special tokens (for GPT-2: <|endoftext|>) are matched whole before BPE, never split
  const special = new Map((tj.added_tokens || []).map((t) => [t.content, t.id]));
  const specialRe = special.size ? new RegExp(`(${[...special.keys()].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`) : null;
  // GPT-2's byte <-> printable unicode mapping
  const bs = []; for (let b = 33; b <= 126; b++) bs.push(b); for (let b = 161; b <= 172; b++) bs.push(b); for (let b = 174; b <= 255; b++) bs.push(b);
  const b2u = {}; let n = 0;
  for (let b = 0; b < 256; b++) b2u[b] = String.fromCharCode(bs.includes(b) ? b : 256 + n++);
  const u2b = Object.fromEntries(Object.entries(b2u).map(([b, u]) => [u, +b]));
  const pat = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;
  const enc = new TextEncoder(), dec = new TextDecoder();
  const bpe = (word) => {
    let parts = [...word];
    while (parts.length > 1) {
      let best = -1, br = Infinity;
      for (let i = 0; i < parts.length - 1; i++) { const r = rank.get(parts[i] + ' ' + parts[i + 1]); if (r !== undefined && r < br) { br = r; best = i; } }
      if (best < 0) break;
      const a = parts[best], b = parts[best + 1], out = [];
      for (let i = 0; i < parts.length; i++) { if (i < parts.length - 1 && parts[i] === a && parts[i + 1] === b) { out.push(a + b); i++; } else out.push(parts[i]); }
      parts = out;
    }
    return parts;
  };
  const encodePlain = (text) => (text.match(pat) || []).flatMap((w) => bpe([...enc.encode(w)].map((b) => b2u[b]).join('')).map((p) => vocab[p]));
  return {
    encode: (text) => (specialRe ? text.split(specialRe) : [text]).flatMap((piece, i) => (i % 2 ? [special.get(piece)] : encodePlain(piece))),
    decode: (id) => dec.decode(Uint8Array.from([...(inv[id] || '')].map((c) => u2b[c]))),
  };
}

async function loadEmb() {
  const [meta, buf] = await Promise.all([
    fetch(new URL('../data/gpt2-emb-64.json', import.meta.url)).then((r) => r.json()),
    fetch(new URL('../data/gpt2-emb-64.bin', import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  const table = new Int8Array(buf);
  return { meta, vector: (id) => table.subarray(id * meta.dims, (id + 1) * meta.dims) };
}

export function loadTokenizer() {
  if (!ready) ready = (async () => {
    const tk = await loadBpe();
    const emb = await loadEmb().catch(() => null);
    return { ...tk, emb, tokens: (text) => tk.encode(text).map((id) => ({ id, text: tk.decode(id) })) };
  })();
  return ready;
}
