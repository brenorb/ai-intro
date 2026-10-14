// Walks the whole deck in headless Chrome like a presenter would (→ key, one step at a time),
// with every non-local network request blocked. Saves a screenshot of every step and reports
// console errors, failed requests and anything that tried to reach the network.
//
// Needs: the deck server running (python3 serve.py), Google Chrome, and puppeteer-core
//   (cd tools && npm install   once, then:
//    node tools/verify.mjs <outdir> [width] [height] [mode])
// mode: "walk" (default: real key presses, animated transitions) or "jump" (instant jumps, faster)
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const [out = 'shots', W = '1920', H = '1080', mode = 'walk'] = process.argv.slice(2);
const URL_ = process.env.DECK_URL || 'http://localhost:4173/ai-talk/';
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: [`--window-size=${W},${H}`, '--hide-scrollbars'] });
const page = await browser.newPage();
await page.setViewport({ width: +W, height: +H });
const problems = [], blocked = [], failed = [];
await page.setRequestInterception(true);
page.on('request', (r) => { const u = r.url(); if (/^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/|data:|blob:|about:)/.test(u)) r.continue(); else { blocked.push(u); r.abort(); } });
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console.error: ${m.text()}`); });
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(URL_ + '#title', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.deck && window.deck.cur');
const slides = await page.evaluate(() => deck.SLIDES.map((s) => ({ id: s.id, steps: s.steps || 1, interactive: !!s.interactive })));
let n = 0; const log = [];
for (let i = 0; i < slides.length; i++) {
  for (let st = 0; st < slides[i].steps; st++) {
    if (n > 0) {
      if (mode === 'jump') await page.evaluate((a, b) => deck.show(a, b, { instant: true }), i, st);
      else await page.keyboard.press(slides[i - (st === 0 ? 1 : 0)].interactive ? 'PageDown' : 'ArrowRight');
    }
    await sleep(mode === 'jump' ? 1200 : slides[i].id === 'explainer' ? 9000 : 2800);
    const cur = await page.evaluate(() => ({ ...deck.cur, hash: location.hash }));
    if (cur.idx !== i || cur.step !== st) problems.push(`navigation mismatch: expected ${slides[i].id}.${st}, at ${cur.hash}`);
    // layout checks: caption inside the stage, no caption text clipped
    const cap = await page.evaluate(() => { const s = document.querySelector('#stage').getBoundingClientRect(); const c = document.querySelector('#caption').getBoundingClientRect(); return { over: c.right > s.right + 1 || c.bottom > s.bottom + 1, bottom: Math.round((c.bottom - s.top) / (s.height / 1080)) }; });
    if (cap.over) problems.push(`caption overflows stage at ${slides[i].id}.${st}`);
    const name = `${String(i).padStart(2, '0')}-${slides[i].id}.${st}.png`;
    await page.screenshot({ path: `${out}/${name}` });
    log.push(`${name}  captionBottom=${cap.bottom}`);
    n++;
  }
}
// back-navigation smoke test
for (let k = 0; k < 5; k++) { await page.keyboard.press('ArrowLeft'); await sleep(500); }
const back = await page.evaluate(() => location.hash);
const report = { url: URL_, size: `${W}x${H}`, mode, steps: n, slides: slides.length, afterFiveBack: back, problems, blockedNetworkRequests: blocked, failedRequests: failed };
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
writeFileSync(`${out}/captions.txt`, log.join('\n'));
console.log(JSON.stringify(report, null, 2));
await browser.close();
