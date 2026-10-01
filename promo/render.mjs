// Renders the 45-second explainer: serves the repo locally, captures promo/stage.html frame by frame in Chromium,
// then encodes H.264 + the music track with ffmpeg. Same method and music as the TaskList promo.
//   node promo/render.mjs              full render -> docs/demo/salary-explorer-demo.mp4 (+ poster.jpg)
//   node promo/render.mjs --stills     one PNG per scene -> promo/frames/   (add times: --stills 6.5 12)
// Needs Node 18+, Playwright (PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs if not installed locally),
// Chromium (CHROMIUM_PATH if Playwright's own browser isn't installed) and ffmpeg on PATH (or FFMPEG=/path).
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url)), root = join(here, '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30, DURATION = 45, W = 1920, H = 1080;
const MUSIC = join(here, 'music.m4a'), OUT_DIR = join(root, 'docs', 'demo'), OUT = join(OUT_DIR, 'salary-explorer-demo.mp4');
const stills = process.argv.includes('--stills');

// Static server for the repo, so the stage and the page share an origin.
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.svg': 'image/svg+xml'};
const server = createServer((req, res) => {
  const p = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!p.startsWith(root) || !existsSync(p) || statSync(p).isDirectory()){ res.writeHead(404).end(); return; }
  res.writeHead(200, {'content-type': TYPES[extname(p)] || 'application/octet-stream'}).end(readFileSync(p));
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());   // fonts come from promo/fonts
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(`${base}/promo/stage.html`);
await page.evaluate(() => window.ready);

const frameAt = async (t, type = 'jpeg') => {
  await page.evaluate(s => window.renderAt(s), t);
  return page.screenshot(type === 'jpeg' ? { type, quality: 92 } : { type });
};

if (stills){
  const dir = join(here, 'frames'); mkdirSync(dir, { recursive: true });
  const cuts = await page.evaluate(() => window.CUTS);
  const times = process.argv.slice(3).map(Number).filter(n => !Number.isNaN(n));
  const list = times.length ? times : cuts.slice(0, -1).map((c, i) => (c + cuts[i + 1]) / 2);
  for (const t of list) writeFileSync(join(dir, `t${t.toFixed(2)}.png`), await frameAt(t, 'png'));
  console.log(`wrote ${list.length} stills to ${dir}`);
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  const enc = spawn(FFMPEG, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', MUSIC,
    '-map', '0:v', '-map', '1:a',
    // The track ends on its own; pad to the full length and soften the last beat.
    '-af', `apad,afade=t=out:st=${DURATION - 1}:d=1`,
    '-t', String(DURATION),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', c => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));
  const total = FPS * DURATION;
  for (let i = 0; i < total; i++){
    const buf = await frameAt(i / FPS);
    if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  enc.stdin.end();
  await done;
  // Poster: the end card.
  writeFileSync(join(OUT_DIR, 'poster.jpg'), await frameAt(43, 'jpeg'));
  console.log(`wrote ${OUT}`);
}
await browser.close();
server.close();
