# Making AI work for you — the deck

A 20–30 minute talk as one morphing HTML stage: what's inside the machine, the parts you control, and why it does *that*. Everything runs from this folder; nothing is loaded from the network.

## Run it

```bash
python3 serve.py
```

Then open <http://localhost:4173/ai-talk/> (plain `http://localhost:4173/` redirects there). (A local server is needed because browsers won't load modules, the tokenizer or the model from `file://`.)

**Before the talk:** open the deck once and visit the *Transformer Explainer* slide so its model (197 MB, local copy) is read into the browser cache; after that it starts in a second. Press `F` for fullscreen.

## Online (GitHub Pages)

The repo publishes as-is from `main` at `https://brenorb.github.io/ai-talk/` (about 7 MB; no model weights in git). The local server uses the same `/ai-talk/` path so the two behave identically.

**The Transformer Explainer slide has two sources:**
- **Online** it embeds the original at <https://poloclub.github.io/transformer-explainer/>, which downloads its own GPT-2 from there.
- **Locally** (`localhost`) it uses the offline copy in `explainer/` if that folder exists, so the talk works without wifi. `explainer/` is in `.gitignore`; it is built on your machine (see *Rebuilding the Explainer copy* below). Without it, the local deck falls back to the online original.
- Force either with `?explainer=local` or `?explainer=remote`.

## Keys

| Key | Does |
|---|---|
| `→` `Space` `PageDown` `Enter` | next step / next slide (a presenter clicker sends PageDown/PageUp) |
| `←` `PageUp` `Backspace` | back |
| `N` | speaker notes drawer (with timer and what's next) |
| `P` | presenter window: notes, clock, next slide; stays in sync with the main window, and its keys drive the deck |
| `O` | overview: click any slide to jump; shows the time budget per part |
| `F` | fullscreen |
| `Home` / `End` | first / last slide |
| scroll / trackpad | also moves one step (off on the interactive slides) |
| `?` | key help |

On the two interactive slides (tokenizer, Transformer Explainer) the keyboard belongs to the widget. Use `PageDown`/`PageUp` (the clicker) or the round arrows at the bottom right to move on. `Esc` leaves the text box.

The URL always holds the current position (`#attention.2`), so a reload comes back to the same step.

## The talk (≈24 min)

| Part | Slides | Time |
|---|---|---|
| Title + who's talking | | 1.2 |
| **1 · What's inside the machine** | neuron (1943) → zoom out → universal approximation → classifier vs generator → training pipeline → tokens (live) → attention → context window → Transformer Explainer (live) | ≈ 9 |
| **2 · From model to agent** | chat vs agent → tools & MCP → AGENTS.md → skills → context engineering → closing the loop | ≈ 8 |
| **3 · "Why did it do that?"** | six complaints, each traced to its cause and its fix | ≈ 5.5 |
| Close | | 0.6 |

Press `O` in the deck for the live numbers. Every slide has speaker notes (`N`).

**Your photo:** set `photo: 'assets/me.jpg'` on the `about` slide in `js/slides.js` and put the image there; otherwise it shows a monogram.

## Reorder, skip or cut slides

All slide order, text and notes live in [`js/slides.js`](js/slides.js). Each entry is one slide:

```js
{ id: 'tools', scene: 'agent', state: 'tools', steps: 2, part: 2, title: '…', time: 1.0, captions: [...], notes: `…` }
```

- **Skip for one run:** add `?skip=tools,explainer` to the URL (comma-separated slide ids).
- **Skip permanently:** add `skip: true` to the entry, or delete it.
- **Reorder:** move the entry. Every scene can enter any of its states directly, so any order works. Slides that share a `scene` morph into each other when adjacent; otherwise they cross-fade.
- **Change text:** edit `captions` (`kicker`, `h`, `sub`; one object per step, later steps inherit) and `notes`.
- **Rename Part 2:** edit `PARTS` at the top of the same file.

## How it's built

```
index.html            entry
css/deck.css          stage, captions, chrome, notes, presenter window
css/scenes.css        scene-specific styles
js/engine.js          navigation, steps, scaling, captions, notes, overview, presenter sync
js/slides.js          THE DECK: order, captions, notes
js/lib.js             small helpers (svg/html builders, seeded random, loops)
js/winbar.js          the context-window bar (reused by several slides)
js/tokenizer.js       GPT-2 tokenizer (byte-level BPE from tokenizer.json) + embedding lookup
js/scenes/*.js        one module per scene (a scene serves one or more slides)
data/                 real GPT-2 sampling data + compact embedding table
models/gpt2/          GPT-2 tokenizer files
explainer/            offline Transformer Explainer build with an int8 GPT-2 (local only, not in git)
vendor/               GSAP, fonts
tools/                builders and the verification script (not needed to present)
```

A **scene** is a persistent layer (`create(root) → { update({state, step, instant}), exit() }`). A **slide** is a state of a scene. Moving between slides of the same scene animates the same elements into their next state (the artificial neuron shrinks into one node of the network; the context window fills, overflows, gets annotated). The stage is 1920×1080 and scales to any window.

What is real and what is illustrative is labelled on the slides: the tokenizer, token ids, embedding vectors and the next-token probabilities are real GPT-2; the attention weights, the training-progress bars and the thumbs-up counts are illustrative.

## Vendored assets and how they were made

| Asset | Source | How |
|---|---|---|
| `vendor/gsap/*` | GSAP 3.15 (free licence) | copied from the `gsap` npm package (`dist/`) |
| `vendor/fonts/*` | Inter, JetBrains Mono, Fraunces (SIL OFL) | copied from `@fontsource-variable/*` |
| `models/gpt2/*` | `Xenova/gpt2` on Hugging Face | `tokenizer.json`, `tokenizer_config.json`, `config.json` |
| `data/gpt2-emb-64.bin` | `openai-community/gpt2` `wte.weight` | `node tools/build-embeddings.mjs`: first 64 of 768 dims, int8 |
| `data/sampling.json` | GPT-2 small run locally | `tools/build-sampling.mjs` (needs `@huggingface/transformers` in Node): real next-token distributions for 5 sampled continuations |
| `explainer/` (local only) | [poloclub/transformer-explainer](https://github.com/poloclub/transformer-explainer) (MIT), commit in `tools/explainer-upstream-commit.txt` | see below |
| `assets/explainer-fallback.jpg` | screenshot of the local Explainer | shown under the live demo until it loads |

**Rebuilding the Explainer copy:** clone the repo at that commit, apply `tools/explainer-offline.patch` (local ONNX runtime, local tokenizer, local KaTeX CSS, no Google Fonts, no YouTube embed, configurable base path, Vite bumped to match its Svelte plugin, model read from `model-int8/` in 20 chunks). Shrink the model: join `static/model-v2/gpt2.onnx.part0`…`part62` into one file, run `uv run --python 3.12 --with onnxruntime --with onnx --with numpy --with tokenizers python tools/quantize-explainer.py <joined.onnx> <outdir>` (per-channel int8 weights, output layer in fp16: 626 → 197 MB, top predictions within a couple of points of the original; the script prints the comparison), split the result into 10 MB pieces named `gpt2.onnx.part0`…`part19` in `static/model-int8/` and delete `static/model-v2/`. Then copy `onnxruntime-web`'s `ort-wasm-simd-threaded*` files to `static/ort/`, KaTeX's `katex.min.css` + `fonts/` to `static/katex/`, the three `Xenova/gpt2` tokenizer files to `static/models/Xenova/gpt2/`, then `npm install --legacy-peer-deps` and `BASE_PATH=/ai-talk/explainer NODE_ENV=production npm run build` and copy `build/` here as `explainer/`.

## Check it

```bash
cd tools && npm install && cd ..
node tools/verify.mjs shots 1920 1080 walk          # DECK_URL=https://brenorb.github.io/ai-talk/ to check the live site
```

With the server running, this drives headless Chrome through the whole deck with real key presses, **blocks every non-local network request**, screenshots every step into `shots/`, and prints a report (console errors, failed or blocked requests, navigation mismatches). `jump` instead of `walk` is faster (instant jumps, no transitions). `uv run --with pillow python tools/sheets.py shots` builds contact sheets (the last run's sheets and report are in `shots/`).

`node tools/check-explainer.mjs` separately confirms that the local Explainer copy loads its model and generates a token with the network blocked.
