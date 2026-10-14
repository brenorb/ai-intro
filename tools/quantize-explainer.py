"""Shrink the Transformer Explainer's GPT-2 export and re-split it into 10 MB chunks.
Usage (from the repo root):
  uv run --python 3.12 --with onnxruntime --with onnx --with numpy --with tokenizers \
      python tools/quantize-explainer.py <merged gpt2.onnx> <outdir> [variant]
variant: int8 (upstream's quantize_dynamic, all MatMuls) | int8pc (per-channel, output layer kept fp32) | int8pc-all (per-channel, everything)
         | int8pc-fp16head (int8pc, output-layer weights stored as fp16 and cast back to fp32 on load)  <- used
Prints how far the variant's outputs move from the original on real prompts."""
import sys, os, numpy as np, onnx, onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
from tokenizers import Tokenizer

src, outdir = sys.argv[1], sys.argv[2]
variant = sys.argv[3] if len(sys.argv) > 3 else 'int8pc-fp16head'
os.makedirs(outdir, exist_ok=True)
q = os.path.join(outdir, f'gpt2-{variant}.onnx')
def fp16_head(path_in, path_out):
    from onnx import numpy_helper, helper, TensorProto
    m = onnx.load(path_in)
    node = next(n for n in m.graph.node if n.name == '/model/lm_head/MatMul')
    w_name = next(i for i in node.input if any(t.name == i for t in m.graph.initializer))
    init = next(t for t in m.graph.initializer if t.name == w_name)
    w16 = numpy_helper.from_array(numpy_helper.to_array(init).astype(np.float16), w_name + '_fp16')
    m.graph.initializer.remove(init); m.graph.initializer.append(w16)
    cast = helper.make_node('Cast', [w_name + '_fp16'], [w_name], to=TensorProto.FLOAT, name='lm_head_weight_cast')
    idx = list(m.graph.node).index(node); m.graph.node.insert(idx, cast)
    onnx.save(m, path_out)

if variant == 'int8pc-fp16head' and not os.path.exists(q):
    base = os.path.join(outdir, 'gpt2-int8pc.onnx')
    if not os.path.exists(base):
        quantize_dynamic(src, base, weight_type=QuantType.QInt8, per_channel=True, nodes_to_exclude=['/model/lm_head/MatMul'])
    fp16_head(base, q)
if not os.path.exists(q):
    m = onnx.load(src, load_external_data=False)
    out_name = 'linear_output'
    last = [n.name for n in m.graph.node if out_name in n.output or (n.op_type in ('MatMul', 'Gemm') and any('lm_head' in i or 'linear' in i for i in n.output))]
    excl = last if variant == 'int8pc' else []
    print('excluded from quantization:', excl)
    quantize_dynamic(src, q, weight_type=QuantType.QInt8, per_channel=variant.startswith('int8pc'), nodes_to_exclude=excl)
print('sizes MB: original %.0f -> %s %.0f' % (os.path.getsize(src) / 2**20, variant, os.path.getsize(q) / 2**20))

tok = Tokenizer.from_file(os.path.join(os.path.dirname(__file__), '..', 'models', 'gpt2', 'tokenizer.json'))
a, b = ort.InferenceSession(src), ort.InferenceSession(q)
names = [o.name for o in a.get_outputs()]
li = names.index('linear_output')
def probs(sess, ids):
    r = sess.run(None, {'input': np.array([ids], dtype=np.int64)})
    z = np.asarray(r[li], np.float64).reshape(-1); p = np.exp(z - z.max()); return p / p.sum(), r
for prompt in ['Data visualization empowers users to', 'The capital of France is', 'The best thing about AI is']:
    ids = tok.encode(prompt).ids
    pa, ra = probs(a, ids); pb, rb = probs(b, ids)
    top = np.argsort(-pa)[:5]
    tv = 0.5 * np.abs(pa - pb).sum()
    attn = [float(np.abs(np.asarray(x) - np.asarray(y)).max()) for n, x, y in zip(names, ra, rb) if n.endswith('_softmax')]
    print(f'\n{prompt!r}  total-variation distance={tv:.3f}  max attention-weight change={max(attn):.3f}')
    for t in top: print(f'   {tok.decode([int(t)])!r:14s} original {pa[t]:.3f}   {variant} {pb[t]:.3f}')
