// Builds data/gpt2-emb-64.bin: the first 64 of 768 dimensions of GPT-2's token-embedding
// table (wte), quantized to int8. Downloads only the wte tensor via an HTTP range request.
// Usage: node tools/build-embeddings.mjs
import { writeFileSync } from 'node:fs';
const URL_ = 'https://huggingface.co/openai-community/gpt2/resolve/main/model.safetensors';
const DIMS = 64;
const range = async (a, b) => new Uint8Array(await (await fetch(URL_, { headers: { Range: `bytes=${a}-${b}` } })).arrayBuffer());
const head = await range(0, 7);
const hlen = Number(new DataView(head.buffer).getBigUint64(0, true));
const meta = JSON.parse(new TextDecoder().decode(await range(8, 8 + hlen - 1)));
const key = Object.keys(meta).find((k) => k.endsWith('wte.weight'));
const { shape, dtype, data_offsets } = meta[key];
console.log(key, shape, dtype);
const [V, D] = shape;
const base = 8 + hlen;
const raw = await range(base + data_offsets[0], base + data_offsets[1] - 1);
const f = new Float32Array(raw.buffer, raw.byteOffset, V * D);
let maxAbs = 0;
for (let i = 0; i < V; i++) for (let d = 0; d < DIMS; d++) maxAbs = Math.max(maxAbs, Math.abs(f[i * D + d]));
// clip at the 99.9th percentile-ish scale so typical values use the int8 range
const SCALE = 0.5; // values beyond ±0.5 are clipped (wte std ≈ 0.14)
const out = new Int8Array(V * DIMS);
let clipped = 0;
for (let i = 0; i < V; i++) for (let d = 0; d < DIMS; d++) {
  let q = Math.round((f[i * D + d] / SCALE) * 127);
  if (q > 127 || q < -127) { clipped++; q = Math.max(-127, Math.min(127, q)); }
  out[i * DIMS + d] = q;
}
writeFileSync(new URL('../data/gpt2-emb-64.bin', import.meta.url), out);
writeFileSync(new URL('../data/gpt2-emb-64.json', import.meta.url), JSON.stringify({ model: 'openai-community/gpt2', tensor: key, vocab: V, fullDims: D, dims: DIMS, dtype: 'int8', scale: SCALE, note: 'value = int8 / 127 * scale' }));
console.log({ V, D, maxAbs, clipped, bytes: out.length });
