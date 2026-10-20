// Confirms the self-hosted Transformer Explainer loads its model locally and can generate a token
// with all non-local network requests blocked.   Usage: node tools/check-explainer.mjs
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new' });
const page = await browser.newPage();
await page.setViewport({ width: 1840, height: 850 });
const blocked = [], errors = [];
await page.setRequestInterception(true);
page.on('request', (r) => { const u = r.url(); if (/^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/|data:|blob:)/.test(u)) r.continue(); else { blocked.push(u); r.abort(); } });
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto((process.env.DECK_URL || 'http://localhost:4173/') + 'explainer/', { waitUntil: 'load' });
const t0 = Date.now();
await page.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((x) => /generate/i.test(x.textContent)); return b && !b.disabled; }, { timeout: 180000 });
const loadMs = Date.now() - t0;
const before = await page.evaluate(() => document.body.innerText.slice(0, 400));
const input = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /generate/i.test(x.textContent)); b.click(); return true; });
await new Promise((r) => setTimeout(r, 6000));
const after = await page.evaluate(() => document.body.innerText.slice(0, 400));
console.log(JSON.stringify({ modelReadyAfterMs: loadMs, textChangedAfterGenerate: before !== after, before: before.replace(/\s+/g, ' ').slice(0, 160), after: after.replace(/\s+/g, ' ').slice(0, 160), blocked, errors }, null, 2));
await browser.close();
