// Builds data/sampling.json: real GPT-2 (small) next-token distributions for a prompt,
// following several independently sampled continuations. Used by the "dice" slide.
// Needs: npm i @huggingface/transformers  (run from a folder that has it installed)
// Usage: node build-sampling.mjs <out.json>
import { AutoTokenizer, AutoModelForCausalLM, Tensor } from '@huggingface/transformers';
import { writeFileSync } from 'node:fs';
const PROMPT = 'The best thing about AI is';
const RUNS = 5, STEPS = 9, TOPK_SHOW = 6, TEMP = 1.0, TOPK_SAMPLE = 40;
const tok = await AutoTokenizer.from_pretrained('Xenova/gpt2');
const model = await AutoModelForCausalLM.from_pretrained('Xenova/gpt2', { dtype: 'fp32' });
let seed = 20261003;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
async function dist(ids) {
  const input_ids = new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), [1, ids.length]);
  const attention_mask = new Tensor('int64', BigInt64Array.from(ids.map(() => 1n)), [1, ids.length]);
  const out = await model({ input_ids, attention_mask });
  const [, T, V] = out.logits.dims;
  const l = out.logits.data.subarray((T - 1) * V, T * V);
  let m = -Infinity; for (const x of l) if (x > m) m = x;
  const p = new Float64Array(V); let s = 0;
  for (let i = 0; i < V; i++) { p[i] = Math.exp((l[i] - m) / TEMP); s += p[i]; }
  for (let i = 0; i < V; i++) p[i] /= s;
  return p;
}
const promptIds = Array.from(tok.encode(PROMPT));
const runs = [];
for (let r = 0; r < RUNS; r++) {
  const ids = [...promptIds]; const steps = [];
  for (let s = 0; s < STEPS; s++) {
    const p = await dist(ids);
    const order = Array.from(p.keys()).sort((a, b) => p[b] - p[a]).slice(0, TOPK_SAMPLE);
    const mass = order.reduce((a, i) => a + p[i], 0);
    let u = rnd() * mass, pick = order[0];
    for (const i of order) { u -= p[i]; if (u <= 0) { pick = i; break; } }
    const top = order.slice(0, TOPK_SHOW).map((i) => ({ id: i, t: tok.decode([i]), p: +p[i].toFixed(4) }));
    steps.push({ top, pick: { id: pick, t: tok.decode([pick]), p: +p[pick].toFixed(4), rank: order.indexOf(pick) } });
    ids.push(pick);
  }
  runs.push({ text: tok.decode(ids.slice(promptIds.length)), steps });
  console.log(r, JSON.stringify(PROMPT + runs[r].text));
}
writeFileSync(process.argv[2], JSON.stringify({ model: 'GPT-2 small (124M)', prompt: PROMPT, promptTokens: promptIds.map((i) => ({ id: i, t: tok.decode([i]) })), temperature: TEMP, topK: TOPK_SAMPLE, runs }));
