// The deck: order, text and speaker notes. Reorder, cut or add `skip: true` freely —
// every scene can enter any of its states directly.
import title from './scenes/title.js';
import about from './scenes/about.js';
import neuron from './scenes/neuron.js';
import training from './scenes/training.js';
import sampling from './scenes/sampling.js';
import tokens from './scenes/tokens.js';
import attention from './scenes/attention.js';
import context from './scenes/context.js';
import explainer from './scenes/explainer.js';
import agent from './scenes/agent.js';
import loop from './scenes/loop.js';
import why from './scenes/why.js';

export const SCENES = { title, about, neuron, training, sampling, tokens, attention, context, explainer, agent, loop, why };

export const PARTS = ['', 'Part 1 · What’s inside the machine', 'Part 2 · From model to agent', 'Part 3 · “Why did it do that?”', ''];

export const SLIDES = [
  {
    id: 'title', scene: 'title', state: 'title', part: 0, title: 'Title', time: 0.5, layout: 'center',
    caption: { h: 'Making AI work for you', sub: 'What’s inside the machine, the parts you control, and why it does <em>that</em>.' },
    notes: `Promise of the talk: you'll leave understanding the machine just enough that its weird behaviour stops being surprising — and knowing which parts you can actually control.

Three parts: what's inside (8 min), the moving parts around the model (10 min), then we go back through the classic complaints and trace each to its cause (6 min). Then open conversation.`,
  },
  {
    id: 'about', scene: 'about', state: 'about', part: 0, title: 'Who’s talking', time: 0.7,
    photo: 'assets/me.jpg', // square works best; '' shows a BB monogram
    caption: { kicker: 'Who’s talking', h: 'Breno Brito', sub: 'Engineer working where AI meets Bitcoin. Building neural networks since 2010.' },
    notes: `Keep it to 40 seconds; the timeline lights up on its own.

Engineer by training. First neural network in 2010, in Matlab, telling musical instruments apart. 2013: graduated with a reinforcement-learning trading bot. Bitcoin since 2017: co-author of the Portuguese BIP39 wordlist, translated O Padrão Bitcoin and other books.

Then language models: in 2023, Satoshi 7B, the first open-source Bitcoin LLM; prizes in Bitcoin hackathons with LLM code assistants for smart contracts. Now: agent skills for Bitcoin and Nostr (Freedom Skills), and talks on going from vibe coding to agentic engineering.

Why it matters for today: I use these agents every day, and most of what I'll show comes from watching them fail.`,
  },
  {
    id: 'neuron', scene: 'neuron', state: 'single', steps: 3, part: 1, title: 'Where it came from: the neuron (1943)', time: 1.0,
    captions: [
      { kicker: 'Where it came from', h: 'It starts with a real neuron', sub: 'Signals arrive on the dendrites, add up in the cell body and, past a threshold, fire down the axon.' },
      { kicker: '1943 · McCulloch &amp; Pitts', h: 'The neuron, written as math', sub: 'Numbers come in, each is multiplied by a <b>weight</b>, they are summed, and an <b>activation function</b> decides how strongly to fire.' },
      { kicker: '1943 · McCulloch &amp; Pitts', h: 'Same parts, different material', sub: 'Learning means changing the weights. That is all “training” ever adjusts.' },
    ],
    notes: `Left: a biological neuron. Signals come in on the dendrites, the cell body integrates them, and if the total crosses a threshold the neuron fires a spike down the axon to the next neurons.

CLICK — 1943: Warren McCulloch (neurophysiologist) and Walter Pitts (logician) publish "A Logical Calculus of the Ideas Immanent in Nervous Activity": the neuron as a unit that sums inputs and fires past a threshold. In 1958 Rosenblatt's perceptron adds weights that can be learned from examples.

Watch the numbers: each input is multiplied by its weight, they're added, and the activation function squashes the sum into the output.

CLICK — the mapping, part by part. The one thing to remember: the weights are the knowledge. Training only ever changes weights.`,
  },
  {
    id: 'zoomout', scene: 'neuron', state: 'network', steps: 1, part: 1, title: 'Zoom out: brain ↔ neural network', time: 0.5,
    caption: { kicker: 'Zoom out', h: 'One is simple. Wire up many.', sub: 'Each unit only adds and fires. The behaviour lives in the connections: billions of weights.' },
    notes: `Zoom out on both sides. The neuron we were looking at is one dot among many.

Left: a brain, roughly 86 billion neurons passing signals along. Right: the classic feed-forward network — layers of those artificial neurons, every one connected to the next layer, information flowing left to right.

No single unit is smart. Whatever the network "knows" is stored in the strength of the connections. Today's large models have hundreds of billions of weights.`,
  },
  {
    id: 'uat', scene: 'neuron', state: 'uat', steps: 4, part: 1, title: 'Universal approximation (1989)', time: 0.9,
    captions: [
      { kicker: '1989 · Universal approximation theorem', h: 'Why would a pile of these work?', sub: 'One neuron gives you one soft step.' },
      { sub: 'Three neurons: three steps, added together.' },
      { sub: 'Each neuron you add lets the network bend a little closer to the target.' },
      { h: 'Enough neurons can fit almost any function', sub: 'Including the function <em>“given this text, what comes next?”</em> That is the one a language model learns.' },
    ],
    notes: `Why does stacking these simple units work at all? Cybenko (1989) and Hornik (1991) proved the universal approximation theorem: a network with a single hidden layer and enough neurons can approximate any continuous function as closely as you like.

Dashed line: the function we want. Blue: what the network computes. With one neuron you get one soft step. CLICK three. CLICK eight. CLICK forty — it hugs the curve.

The theorem says a good set of weights exists; it doesn't say how to find them. That's what training is for.

The punchline: "what text comes next" is also just a function — from the text so far to a probability for every possible next piece. A language model is a very large network fitted to that function.`,
  },
  {
    id: 'classgen', scene: 'sampling', state: 'sampling', steps: 4, part: 1, title: 'Classifier vs generator: the dice', time: 1.0,
    captions: [
      { kicker: 'Two kinds of AI', h: 'Classical AI picks one answer', sub: 'Is this a cat? Yes, 97% sure. Same picture, same answer, every time.' },
      { kicker: 'Two kinds of AI', h: 'Generative AI outputs a distribution', sub: 'For the next token it gives a probability to <em>every</em> token in its vocabulary.' },
      { h: 'Then it rolls dice', sub: 'One token is drawn at random, weighted by probability. It is appended, and the whole thing runs again.' },
      { h: 'Same prompt, different answers', sub: 'Every token is a draw, and each draw changes everything after it.' },
    ],
    notes: `Classical machine learning: classification. One input, one label, a confidence. Deterministic.

CLICK — a language model doesn't output an answer. It outputs a probability for every one of its ~50,000 tokens. These bars are real GPT-2 numbers for "The best thing about AI is", computed ahead of time (the model itself isn't running here).

CLICK — then a random number generator picks one, weighted by probability. Usually a likely one, sometimes not. The pick is appended to the text and the model runs again on the longer text. One token at a time; it can't go back.

CLICK — so the same prompt gives different answers. And an early draw steers everything after it. This is why "try again" sometimes works, and why an agent can go down a wrong path and stay there.`,
  },
  {
    id: 'training', scene: 'training', state: 'pipeline', steps: 5, part: 1, title: 'The training pipeline', time: 2.0, layout: 'compact',
    captions: [
      { kicker: 'How the weights get their values', h: 'Training, step 1: read the internet, guess the next token', sub: 'Billions of times: guess, compare with what was really written, nudge the weights. The score being pushed down is called <b>perplexity</b>.' },
      { h: 'Training, step 2: teach it to answer, not just continue', sub: 'The raw model only continues text. A second round on question → answer examples turns it into an assistant.' },
      { h: 'Training, step 3: people rate the answers', sub: 'The model is tuned toward what humans prefer. It learns the things that <em>sound</em> good to us.' },
      { h: 'Training, step 4: practice on tasks a program can check', sub: 'Write code, run the tests, get rewarded only when they pass.' },
      { h: 'After training, the weights are frozen', sub: 'What you talk to is a snapshot. It stopped reading at its <b>knowledge cutoff</b>.' },
    ],
    notes: `Four stages produce the weights. Go quickly; each one explains a behaviour we'll meet later.

1) PRETRAINING. Hide the next token, let the model guess, compare, nudge the weights. Trillions of tokens. The number being minimised is perplexity: how surprised the model is by the true next token. Note what is NOT in that objective: truth. It is rewarded for being unsurprising, not for being right.

CLICK — 2) INSTRUCTION TUNING. A raw model continues your question like a forum post. Fine-tuning on question/answer pairs gives it the assistant habit.

CLICK — 3) RLHF. People compare answers, a reward model learns their preferences, the model is trained to score well. People tend to prefer agreeable, confident, diligent-sounding answers — "You're absolutely right!" is a trained reflex. It is a proxy for approval, not truth.

CLICK — 4) RL on checkable tasks: the grader is a program. Big reason agents got good at code.

CLICK — and then it's frozen. It doesn't learn from your chats. Anything new or private has to come through the context window — which is where we're heading.`,
  },
  {
    id: 'tokens', scene: 'tokens', state: 'tokens', steps: 2, part: 1, title: 'Tokens (live widget)', time: 1.0, layout: 'compact', interactive: true,
    captions: [
      { kicker: 'What the model actually sees', h: 'Not words. Not letters. Tokens.', sub: 'Text is chopped into pieces from a fixed vocabulary. <b>Type anything in the box below.</b>' },
      { h: 'A token is a number that looks up a vector', sub: 'The model never sees the letters: only the index, and the list of numbers stored at that index.' },
    ],
    notes: `Live demo — type in the box. (Click the box first; PageDown / the on-screen arrow moves on.)

The model doesn't read letters or words. Text is split into tokens from a fixed vocabulary of 50,257 pieces (this is GPT-2's real tokenizer; modern models differ in detail, same idea).

Try: "strawberry", then " Strawberry" with a space and capital, then "strawberries". Same word to us, completely different pieces to the model. Try a long number. Try a SimplicityHL snippet — rare text shatters into many small pieces.

CLICK — each token is just an index into a table. The index looks up a vector: 768 numbers in GPT-2 (first 64 shown). That vector is all the model gets. Nothing in it says "this token contains two r's". Keep that in mind for later.`,
  },
  {
    id: 'attention', scene: 'attention', state: 'attention', steps: 4, part: 1, title: 'Attention', time: 1.0,
    captions: [
      { kicker: '2017 · “Attention is all you need”', h: 'Every token is a vector', sub: 'On their own they are just a list. Meaning comes from how they relate to each other.' },
      { h: 'Each token looks back at all the others', sub: 'This is the <b>attention mechanism</b>. What does “it” refer to? The token scores every earlier token for relevance.' },
      { h: 'The scores become shares of 100%', sub: 'Attention is a <b>fixed budget</b>. More for one token always means less for the rest.' },
      { h: 'Every token gets its own split', sub: 'This happens for every token, in every layer, on every step.' },
    ],
    notes: `The transformer (Vaswani et al., 2017) is built on one operation: attention.

CLICK — to work out what "it" means, the token compares itself with every token before it and gets a relevance score for each. Here it lands mostly on "animal".

CLICK — softmax turns scores into shares that add up to exactly 100%. This is the key fact for using these tools: attention is a fixed pie. Add more text and every slice gets thinner.

CLICK — another token, another split. Multiply by every token, dozens of layers, many heads per layer. (These weights are illustrative; the Transformer Explainer in two slides shows real ones.)`,
  },
  {
    id: 'window', scene: 'context', state: 'window', steps: 4, part: 1, title: 'The context window', time: 1.2,
    captions: [
      { kicker: 'The context window', h: 'One fixed-size buffer', sub: 'The system prompt, your instructions, every message, every file: all in one strip of tokens.' },
      { h: 'The longer the chat, the thinner your slice', sub: '' },
      { h: 'When it is full, the oldest part falls off', sub: 'Or gets squashed into a short summary. Either way, the detail is lost.' },
      { h: 'The window <em>is</em> the memory', sub: '' },
    ],
    notes: `Everything the model can see is one strip of tokens with a hard size limit: the context window.

Example numbers (labelled on the slide): a ~3,500-token system prompt, 500 tokens of your rules and a short question. At the start your rules are about 12% of what it reads.

CLICK — 80,000 tokens of chat later, the same 500 tokens are 0.6%. (The strip is a sketch, not to scale.) And attention isn't even: it's strongest at the beginning and the end, weakest in the middle ("lost in the middle", Liu et al. 2023). Performance drops with length well before the window is full.

CLICK — when it fills up, the oldest content is cut or compacted into a summary. Not blurry — gone. This is the "it forgot what I told it" moment.

CLICK — and there is no memory outside it. For every token it writes, the whole window is read again from scratch. "Memory" features just paste text back into the window.`,
  },
  {
    id: 'explainer', scene: 'explainer', state: 'explainer', steps: 1, part: 1, title: 'Transformer Explainer (live)', time: 0.5, layout: 'compact', interactive: true,
    caption: { kicker: 'Play with a real one', h: 'All of it together: GPT-2, running in this browser', sub: '' },
    notes: `Optional live moment (or keep for Q&A). This is Transformer Explainer from Georgia Tech's Polo Club, running locally with real GPT-2 weights.

Type a prompt, hit Generate. Point at: tokens → embeddings → attention (click a block to see the weights) → probabilities at the end, with the temperature slider changing how adventurous the dice are.

Use the on-screen arrow (bottom right) or PageDown to move on.`,
  },
  // ------------------------------------------------------------------ Part 2
  {
    id: 'chat', scene: 'agent', state: 'chat', steps: 3, part: 2, title: 'Chat vs agent: the harness', time: 1.5,
    captions: [
      { kicker: 'From model to agent', h: 'A chat is you and the model', sub: 'It can read what is in the conversation and write text back. That is all.' },
      { h: 'An agent is the model inside a harness', sub: 'The harness is ordinary software around the model. It gives it <b>tools</b> and keeps feeding results back in.' },
      { h: 'The loop is what makes it an agent', sub: 'Think, act, look at the result, repeat. Dozens of times, without you in between.' },
    ],
    notes: `Part 2: the moving parts around the model. These are the parts you control.

In a chat window (claude.ai, ChatGPT) it's you and the model. Its only memory is the conversation; its only ability is writing text back.

CLICK — same model, different packaging. A harness — Claude Code, Codex, Cursor — wraps it with tools: read and edit files, run commands, search, run tests.

CLICK — and a loop. The model asks for a tool, the harness runs it and pastes the result back, the model reads it and decides the next step. That loop is the entire difference between "chatbot" and "agent".

If the website keeps disappointing you on a multi-step task, this is usually why: no tools, no loop, and you are the one copy-pasting results back.`,
  },
  {
    id: 'tools', scene: 'agent', state: 'tools', steps: 2, part: 2, title: 'Tools & MCP (skippable)', time: 1.0,
    captions: [
      { kicker: 'From model to agent', h: 'A “tool call” is just text', sub: '' },
      { h: 'Connectors give it more reach', sub: '' },
    ],
    notes: `(Skippable: add ?skip=tools to the URL, or set skip: true in js/slides.js.)

Demystify tool use. The model never "does" anything; it writes a small piece of structured text saying which tool it wants. The harness — a normal program — executes it, and the output is appended to the context as more tokens.

CLICK — MCP, the Model Context Protocol, is a standard plug for adding tools: GitHub, Drive, Slack, databases, a browser, your own internal API. Each one adds things the agent can do — and things you now need to supervise.`,
  },
  {
    id: 'agentsmd', scene: 'context', state: 'agents', steps: 2, part: 2, title: 'AGENTS.md', time: 1.0,
    captions: [
      { kicker: 'Context that survives the session', h: 'AGENTS.md: your standing rules, in a file', sub: 'A plain text file in your project: what it is, how to build it, what never to do.' },
      { h: 'Loaded at the start of every session', sub: 'The harness puts it in the window before you type anything.' },
    ],
    notes: `First tool for getting the right things into the window without retyping them.

AGENTS.md is a plain file with standing rules: what this project is, how to build and test it, what never to do. Claude Code calls it CLAUDE.md; on claude.ai and ChatGPT it's "project instructions". Same idea.

CLICK — the harness loads it at the start of every session: Monday, Wednesday, Friday, always there. It's how you fix "I told it on Monday and by Friday it forgot": the rule no longer lives in message 1 of a chat.`,
  },
  {
    id: 'skills', scene: 'context', state: 'skills', steps: 2, part: 2, title: 'Skills', time: 1.0,
    captions: [
      { kicker: 'Context that survives the session', h: 'Skills: knowledge loaded only when needed', sub: 'A skill is a folder of instructions, examples and scripts. Only its one-line description sits in the window.' },
      { h: 'The right knowledge, at the right moment', sub: 'When the task matches, the whole skill is pulled in. This is how your conventions beat the training data.' },
    ],
    notes: `Second tool. A skill is a folder: a SKILL.md with a name, a one-line description and full instructions, plus examples, docs and scripts.

Only the one-line descriptions sit in the window, so ten skills cost almost nothing.

CLICK — when the task matches, the full skill is loaded. This is the answer to "it wrote Rust instead of Simplicity": the model's training barely contains SimplicityHL, so you supply it — docs and examples, exactly when needed.`,
  },
  {
    id: 'ctxeng', scene: 'context', state: 'engineer', steps: 3, part: 2, title: 'Context engineering', time: 1.5, layout: 'compact',
    captions: [
      { kicker: 'Context engineering', h: 'You choose what it gets to see', sub: 'It only knows what is in the window. Context engineering is deciding what goes in, and what stays out.' },
      { h: 'Dump everything in, and it drowns', sub: 'The parts that matter become a sliver between logs, history and dead ends.' },
      { h: 'Curate: small, fresh, relevant', sub: 'The goal, the house rules, the files that matter. The rest of the window stays free for the work.' },
    ],
    notes: `Different question now: not how the window works, but what you put in it. The weights are frozen; the window is the only thing you can change. So "prompting" is really deciding what it gets to see.

Left: everything you could give it. Right: the window, empty. Nothing in there yet means it knows nothing about your situation.

CLICK — the common move: dump it all in. The whole repo, three weeks of chat, pasted logs, old dead ends. It doesn't fit, and the four things that matter become a small part of what it reads, lost in the noise.

CLICK — curate instead: the goal and what done means, the house rules, the two files that matter, a short summary. Hygiene, not clever wording: new task, new chat; durable things in files; summarize and restart; load only what's relevant.`,
  },
  {
    id: 'loop', scene: 'loop', state: 'close', steps: 3, part: 2, title: 'Goals and closing the loop', time: 2.0,
    captions: [
      { kicker: 'Goals and verification', h: '“Done!” is a sentence, not a status', sub: '' },
      { h: 'Give it a goal and a way to check', sub: 'Then the loop can run until the check passes, and the proof comes with the answer.' },
      { kicker: 'Ways to close the loop', h: 'Nothing it <em>says</em> becomes fact until something <em>happens</em>', sub: '' },
    ],
    notes: `The single most useful habit. An open loop: you ask, it answers "done, tested, all passes". That sentence is generated the same way as everything else — it's a plausible continuation, not a report. Look at what actually ran: nothing.

CLICK — close the loop. Give it a goal it can check and the means to check it: "make the tests pass", "it must compile", "the page must render — take a screenshot". Now the agent acts, checks, reads the real output, fixes, repeats — and stops when the check passes. And the evidence is attached.

CLICK — the rule to take home: nothing it says becomes fact until something happens. And there are many ways to make something happen — pick whichever your task allows. Even for non-code work: "check every number in this summary against the source and list any that don't match".`,
  },
  {
    id: 'workflow', scene: 'loop', state: 'workflow', steps: 2, part: 2, title: 'A simple workflow', time: 1.0,
    captions: [
      { kicker: 'A workflow that works', h: 'Plan, do, verify, review', sub: '' },
      { h: 'Small steps, checked often', sub: 'Errors compound inside a long run. A check between steps stops them early.' },
    ],
    notes: `Put together, a workflow that works for almost anything:

Plan — before anything is built, agree on the goal and on what "done" means. Ask it to restate the task, including what's unusual about your case.
Do — one small step.
Verify — a real check, run by the agent.
Review — you look at what changed. Then the next step.

CLICK — why small steps: every token is conditioned on everything before it, so an early mistake becomes a "fact" for the rest of the run. One big leap gives you one chance to catch it, at the end. Small checked steps catch it while it's cheap.`,
  },
  // ------------------------------------------------------------------ Part 3
  {
    id: 'why-forgot', scene: 'why', state: 'forgot', steps: 3, part: 3, title: '“It forgot everything and got dumb”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 1 of 6', h: 'We were talking, and then it forgot everything and got dumb.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> the context window. Your early messages were out-massed, then dropped.' },
      {},
    ],
    notes: `Part 3: the complaints, each traced to the part we've already seen. Go fast — the audience now has the pictures.

"It forgot." The context window again. CLICK and watch: your rules start as most of what it sees, shrink to a sliver, then fall off the edge. It didn't get dumber; it can't see them.

CLICK — fixes: new topic, new chat. Standing rules in a file (AGENTS.md / project instructions), not in message one. For long work: summarise, restart.`,
  },
  {
    id: 'why-rust', scene: 'why', state: 'rust', steps: 3, part: 3, title: '“It changed my Simplicity into Rust”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 2 of 6', h: 'I was writing Simplicity and it changed my code to Rust.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> training. It has read oceans of Rust and almost no SimplicityHL, and they look alike.' },
      {},
    ],
    notes: `Our local favourite. SimplicityHL looks like Rust and is rare; Rust is everywhere in the training data. Pretraining rewards the most probable continuation — and the most probable continuation of Rust-looking code is Rust.

CLICK: the two forces on the next token. Training prior: huge for Rust, tiny for SimplicityHL. Your context: almost nothing. So the prior wins and the file drifts into Rust.

CLICK — you can't change the weights, so change the context: say what's unusual up front; give it docs and examples (a skill); and put the compiler in the loop so every Rust-ism comes back as an error it has to fix.`,
  },
  {
    id: 'why-tested', scene: 'why', state: 'tested', steps: 3, part: 3, title: '“It said it tested it” / “You’re absolutely right!”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 3 of 6', h: 'It said it tested it. It hadn’t. Then it told me I was absolutely right.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> it produces what is plausible and what people approve of. Neither is the same as true.' },
      {},
    ],
    notes: `Two faces of one mechanism. "I tested it and it works" after a block of code is simply a very likely next sentence — the story of the work is generated together with the work. And human-feedback training rewarded confident, diligent, agreeable answers.

Same root for flattery and folding: push back and it agrees, even when you're wrong.

CLICK — fixes: ask for the evidence, not the statement. Better: let the harness run the check so the result is real. And when you disagree, bring a fact — "the compiler says X" — because pressure alone will make it fold whether or not you're right.`,
  },
  {
    id: 'why-strawberry', scene: 'why', state: 'strawberry', steps: 3, part: 3, title: '“It can’t count the r’s in strawberry”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 4 of 6', h: 'It can’t count the r’s in “strawberry”. Or do my sums.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> tokens. It never sees the letters, and it does not calculate: it predicts.' },
      {},
    ],
    notes: `The famous one. Remember the tokenizer: "strawberry" is three tokens, three numbers. There are no letters in there to count. And there's no counter either — the model never executes a procedure, it predicts what an answer usually looks like. Newer models have mostly memorised this particular one; the class of problem remains.

CLICK — the fix is the most important idea in the talk: don't ask it to BE the calculator. Ask it to WRITE the calculator. One line of code, run by the harness, and the answer is exact. Same for arithmetic, dates, sorting, counting rows in a spreadsheet.`,
  },
  {
    id: 'why-injection', scene: 'why', state: 'injection', steps: 3, part: 3, title: '“It followed instructions hidden in a web page”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 5 of 6', h: 'It followed instructions that were hidden in a web page.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> there are no types. Instructions and data are the same stream of tokens.' },
      {},
    ],
    notes: `The one with a security edge. With a database we solved injection decades ago: the query and the data travel separately, the data can never run.

A language model has nothing like that. System prompt, your message, a web page, a file, a tool result — one stream of tokens, one type. Imperative text inside a page is read with the same attention as your own request. There's nothing to escape or sanitise against, so no prompt fully fixes it.

CLICK — so the fix is architectural: give the agent only the tools the task needs; if it's reading untrusted content, don't also hand it dangerous tools; and keep a human approval on anything irreversible — send, pay, delete, deploy.`,
  },
  {
    id: 'why-bland', scene: 'why', state: 'bland', steps: 3, part: 3, title: '“Every answer sounds the same”', time: 0.9, layout: 'quote',
    captions: [
      { kicker: 'Complaint 6 of 6', h: 'Everything it writes sounds the same.', layout: 'quote big' },
      { layout: 'quote', sub: '<b>Because:</b> perplexity. It was trained to be unsurprising, so it lands on the average.' },
      {},
    ],
    notes: `Last one. The training objective rewards being unsurprising, so by default you get the centre of the distribution: the average opinion in the average voice.

CLICK — it can write differently, but you have to pull it away from the centre with context: show two or three examples of the voice you want; name the audience and what to avoid; ask for three genuinely different takes and pick.`,
  },
  {
    id: 'close', scene: 'title', state: 'close', part: 4, title: 'Close', time: 0.6, layout: 'center',
    caption: { kicker: 'To take home', h: 'It predicts. You build the checks.', sub: 'A plausibility engine with a buffer for memory. You control the <em>context</em>, the <em>tools</em> and the <em>loop</em> that checks its work.' },
    notes: `Close. Underneath, it's one machine: it predicts plausible next tokens, from frozen weights, looking at a fixed window.

Models will keep getting better. That machine stays. So the skill that lasts isn't magic prompts — it's the three things you control: what's in the context, which tools it has, and the loop that checks its work.

Then open the floor.`,
  },
];
