# Goal: build the "Use AI better" talk as a morphing HTML deck

## What you're building

A self-contained HTML presentation for a **20–30 minute talk** (the rest of the session is open conversation). The audience is smart people from other domains who have just met AI and are frustrated that it "doesn't work the way they think it should." Explain real concepts with real terms (softmax, embeddings, perplexity), each with a one-line plain meaning. Don't dumb it down. Keep every slide light: this is a conversation starter, not a lecture.

**The one goal of the talk:** people leave using AI better. They understand the machine just enough that its weird behavior stops being surprising, and they know the moving parts (context, files, skills, tools, loops, verification) that fix it.

Language: **English**.

## Source material (read first)

- `../agentic-engineering-talk.md`: previous talk outline (thesis, mechanisms M1–M7, rules, closing lines).
- `../agentic-engineering-problems.md`: failure-mode catalog with citations. Use it as the factual backbone for the "why did it do that?" section.

(These may be moved into this folder. Look here if they aren't in the parent.)

## The feel: one stage that morphs

- **Not slide-to-slide cuts.** One persistent stage where elements animate into their next state, like a good scrollytelling website. The artificial neuron shrinks into one node of a network. The network's output becomes probability bars. The token chips from the tokenizer slide come back later in the strawberry beat. The attention pie comes back in the context-window and "it forgot" beats.
- As visual as possible: motion carries the explanation, and text is minimal (a headline plus a few words). Generated animation (SVG / Canvas / WebGL) over video files. Use real footage only where it clearly adds something.
- Navigation: **arrow keys / space / presenter clicker (PageUp/PageDown)**. Scroll is optional and secondary. Support step-builds inside a slide (several clicks per slide).
- 16:9 stage that scales to any screen. Visible on a projector: high contrast and large type.
- **Fully offline.** All libraries (e.g. GSAP and its plugins), fonts, models and the Transformer Explainer copy are vendored locally. Nothing loads from the network at talk time.
- Speaker notes per slide (a hidden panel or a separate presenter view toggled with a key).
- Small, readable structure: one entry `index.html`, plus one module per slide/scene, so slides can be reordered or cut easily. The presenter will skip or remove slides (e.g. the tools/MCP slide) depending on time.

## Storyline

### Part 1: What's inside the machine (~8 min)

1. **Where it came from (1943).** Split screen. Left: a drawn biological neuron, with the electrical signal traveling from the dendrites through the soma down the axon to the synapse. Right: the artificial neuron drawn in the same style, with numbers flowing in, multiplied by weights, summed, passed through an activation function, and sent on to the next neuron. Point: the artificial neuron is a mathematical replica of the real one. (McCulloch & Pitts 1943. Rosenblatt's perceptron 1958 is optional.)
2. **Zoom out.** Both sides zoom out. Left: a dense mesh of neurons firing, with information moving from one side to the other. Right: a classic feed-forward network (input → hidden → output nodes) with activations flowing through it.
3. **Universal approximation (Cybenko 1989 / Hornik 1991).** A target curve, and as neurons are added, their bumps sum up until they fit it. "Enough neurons can approximate almost any function, including *what text comes next*."
4. **The training pipeline.** An animated pipeline:
   - **Pretraining**: predict the next token over a huge slice of the internet, minimizing **perplexity** (how surprised the model is by the real next token). Make the consequence visible: lowering perplexity pulls output toward the most probable text, a regression to the mean. That's why answers drift toward the average take and why models all write in that same recognizable style.
   - **Instruction tuning**: from a text completer to an assistant.
   - **RLHF**: humans rate answers, and a reward model learns the ratings. Show the rewarded phrases literally: *"You're absolutely right!"*, *"You're right to push back."* Point: it optimizes a proxy for approval.
   - **RL on checkable tasks** (code, math): why agents got good at code.
   - The weights are frozen at a **knowledge cutoff**.
5. **Classifier vs generator.** Classical AI: one input → one label with a confidence bar. Generative AI: a probability distribution over the next token, and a random number generator (dice) picks one, token after token. The same prompt can give different answers.
6. **Tokens (live widget, whole slide).** The model doesn't see words or letters. It sees tokens: an index into a table of vectors. Build a widget: type anything → colored token chips → each token's ID → its embedding vector rendered as a strip of colored cells. Use the **GPT-2 tokenizer** via transformers.js (local files), so it matches the Transformer Explainer model. For the vectors, precompute a compact version of GPT-2's token-embedding table (e.g. the first N of 768 dims, quantized) with a script, and label it honestly ("first N of 768 dimensions"). Preset buttons: `strawberry`, ` Strawberry`, `strawberries`, a number like `1234567`, a SimplicityHL snippet.
7. **Attention.** Pick one token. Its query is compared with every other token, softmax turns the scores into weights, and attention is a **fixed 100% pie** split across everything in the window. Show the lines/weights to other tokens and how this makes it "pay attention" to one thing over another.
8. **The context window (its own slide).** The window is a fixed-size buffer. As the conversation grows, every earlier token's slice of the pie thins, the middle gets the least attention, and past the edge things are gone, not just faded. The model has no memory between calls: the window *is* its memory.
9. **Transformer Explainer (whole slide, self-hosted).** Embed a local, self-hosted build of https://poloclub.github.io/transformer-explainer/ (repo: `poloclub/transformer-explainer`). Check its license and keep attribution. Build it with the right base path, and make sure the GPT-2 model files it fetches are served locally too. Provide a fallback screenshot if it fails to load.

### Part 2: From model to agent: the moving parts (~10 min)

(Final name to be decided, maybe "From model to agent" or "The parts you control." This section still explains moving parts; it isn't the advice list yet.)

10. **Chat vs agent.** claude.ai / ChatGPT: you talk to the model, and the chat history is its whole memory. Claude Code / Codex: a **harness** wraps the model with tools, a loop and files. Diagram: model ↔ harness ↔ tools, cycling.
11. **Tools & MCP** (skippable). The model can only emit text. The harness turns some of that text into actions: read files, run code, search, reach GitHub/Drive via MCP connectors.
12. **Context engineering.** The window is the only thing it knows, so what goes into it is the job. Start fresh chats. Keep what matters in files, not chat history. Summarize and restart. (Reuse the context-window visual.)
13. **AGENTS.md / CLAUDE.md and skills.** AGENTS.md / CLAUDE.md is context that is always loaded. Skills are context loaded on demand when relevant. This is how you beat the training prior with your own conventions.
14. **Goals and closing the loop.** Give it a clear goal *and a way to check its work* (compiler, tests, running it, a screenshot). The agent loops (act → check → fix) until the check passes. "Nothing it *says* becomes fact until something *happens*."
15. **A workflow.** Plan → do → verify → review, animated as a loop that tightens.

### Part 3: "Why did it do that?" (~6 min)

Everyday complaints traced back to the part that causes them, each pointing at a fix from Part 2. Morph the earlier visuals back in rather than drawing new ones.

16. *"We were talking, then it forgot everything and got dumb."* → context window (slide 8) → context engineering, fresh sessions, files (12).
17. *"I was writing Simplicity and it changed my code to Rust."* → training prior vs. weak context: Rust is everywhere in training data, while SimplicityHL looks like Rust and is rare (4, 6) → AGENTS.md, skills, docs and examples in context, plus a compiler in the loop (13, 14).
18. *"It said it tested it."* / *"You're absolutely right!"* → RLHF proxy (4) → evidence gates, closing the loop (14).
19. *"It can't count the R's in strawberry / does math wrong."* → tokens: the strawberry chips come back, letters hidden inside opaque tokens (6) → it writes code and code does the counting: `"strawberry".count("r")` → `3`.
20. *"It followed instructions hidden in a web page."* → no types. Analogy: for SQL injection you escape strings or use parameterized queries because code and data are different types. An LLM has one stream of tokens, so your instructions and a web page's text flow into the same pipe in the same color, and there is nothing to sanitize against. → least privilege, human approval for irreversible actions (11).
21. *"Every answer sounds the same / bland."* → perplexity, regression to the mean (4) → give it specifics, examples and a voice in context.

### Close (~1 min)

22. A plausibility engine with a buffer for memory. You don't need magic prompts: you control the context, the tools, and the loop that checks its work.

## Accuracy

Verify every date, name and number against a primary or reputable source before putting it on a slide (1943, 1958, 1989/1991, 2017 "Attention Is All You Need", GPT-2 dims/vocab). Where a visual simplifies, keep it truthful (e.g. label truncated vectors). No invented quotes or statistics.

## How to work

1. **Milestone 1, check in with me before continuing:** stage engine (morph transitions, step builds, keyboard/clicker nav, scaling, speaker notes) + slides 1–3 (neuron → zoom out → universal approximation). This validates the feel.
2. Milestone 2: the rest of Part 1, including the tokenizer widget and the self-hosted Transformer Explainer.
3. Milestone 3: Parts 2 and 3 and the close, with callbacks morphing earlier visuals back in.
4. Polish pass: timing, readability from the back of a room, and cut anything that doesn't earn its place.

## Done means

- `index.html` opens and runs the whole talk **with the network disabled**.
- Every slide and every step build has been viewed in a browser and screenshotted. No console errors, no overlapping or clipped text, and readable at projector resolution (1920×1080 and 1280×720).
- Transitions morph between slides (shared elements animate instead of cutting).
- The tokenizer widget accepts any text and shows tokens, IDs and vectors. Transformer Explainer runs locally inside its slide.
- Speaker notes exist for every slide, with the timing budget per part adding up to ~25 minutes.
- A short `README.md` explains how to run it, how to navigate, how to reorder or skip slides, and how the vendored assets were built.
