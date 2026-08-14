#!/usr/bin/env node
/* Beakdown site checks.
 *
 * Everything here has been verified by hand at least once during development,
 * usually many times. Encoding it means the checks survive whoever is editing
 * next, human or agent. No dependencies: plain Node, run with `node scripts/verify.mjs`.
 *
 * Exits non-zero on any failure, which fails the build and blocks the deploy.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const PUB = 'public';
const DOMAIN = 'beakdown.fun';

const ROUTES = {
  '/': 'index.html',
  '/flappy-bird-online': 'flappy-bird-online.html',
  '/flappy-bird-2': 'flappy-bird-2.html',
  '/what-happened-to-flappy-bird': 'what-happened-to-flappy-bird.html',
  '/about-beakdown': 'about-beakdown.html'
};

let failed = 0;
const pass = (m, d = '') => console.log(`  PASS  ${m}${d ? '   ' + d : ''}`);
const fail = (m, d = '') => { failed++; console.log(`  FAIL  ${m}${d ? '   ' + d : ''}`); };
const check = (m, ok, d = '') => ok ? pass(m) : fail(m, d);

const html = readdirSync(PUB).filter(f => f.endsWith('.html')).sort();
const read = f => readFileSync(join(PUB, f), 'utf8');

console.log('\n== 1. the feel constants ==');
/* Ten numbers set on the first playable evening and unchanged since. Every version
 * has been diffed against them because it is very easy to nudge gravity while adding
 * something else and then spend three versions wondering why the game feels wrong.
 * Changing them deliberately is fine: update .feel-lock in the same commit and the
 * diff makes it visible to a human. */
{
  const src = read('index.html');
  const m = src.match(/\/\* ---- FEEL\..*?\*\/\s*(const G=.*?;)/s);
  if (!m) fail('feel constants block found');
  else {
    const got = createHash('sha256').update(m[1].replace(/\s+/g, '')).digest('hex');
    const want = readFileSync('.feel-lock', 'utf8').trim();
    if (got === want) pass('feel constants unchanged');
    else fail('FEEL CONSTANTS CHANGED',
      `\n        expected ${want}\n        got      ${got}\n` +
      '        If this was deliberate, put the new hash in .feel-lock in the same commit.');
  }
}

console.log('\n== 2. zero external requests ==');
/* The only thing any page may fetch is from our own domain. Third-party requests are
 * blocked by the content filters this audience sits behind, and every one is a way for
 * the page to fail before it starts. Outbound <a href> links are fine, they fetch nothing. */
{
  const bad = [];
  for (const f of html) {
    const s = read(f);
    for (const m of s.matchAll(/<(?:script|img|iframe|audio|video|source)[^>]+src="(https?:\/\/[^"]+)"/g))
      if (!m[1].includes(DOMAIN)) bad.push(`${f}: ${m[1]}`);
    for (const m of s.matchAll(/<link([^>]+)>/g)) {
      if (/canonical|alternate/.test(m[1])) continue;
      const u = m[1].match(/href="(https?:\/\/[^"]+)"/);
      if (u && !u[1].includes(DOMAIN)) bad.push(`${f}: ${u[1]}`);
    }
    for (const m of s.matchAll(/url\((https?:\/\/[^)]+)\)/g)) bad.push(`${f}: ${m[1]}`);
    for (const m of s.matchAll(/@import\s+["']([^"']+)/g)) bad.push(`${f}: ${m[1]}`);
  }
  check('nothing is fetched off-domain', bad.length === 0, bad.join(', '));
  check('no audio, video or font files shipped',
    !readdirSync(PUB).some(f => /\.(mp3|ogg|wav|m4a|mp4|woff2?|ttf)$/i.test(f)));
}

console.log('\n== 3. links and routing ==');
{
  /* Every route must have a file behind it. Added after a page was uploaded in a batch
   * that silently dropped one file: four pages linked to it, the sitemap listed it, and
   * nothing else in this script noticed. */
  const noFile = Object.entries(ROUTES)
    .filter(([, f]) => !existsSync(join(PUB, f)))
    .map(([r, f]) => `${r} -> ${f}`);
  check('every route has a file behind it', noFile.length === 0, noFile.join(', '));

  const inbound = Object.fromEntries(Object.keys(ROUTES).map(r => [r, 0]));
  const dangling = [], dotHtml = [];
  for (const f of html) {
    const s = read(f);
    for (const m of new Set([...s.matchAll(/href="(\/[^"#?]*)/g)].map(x => x[1]))) {
      if (ROUTES[m]) { if (ROUTES[m] !== f) inbound[m]++; }
      else if (!/\.(png|xml|txt|ico|svg)$/.test(m)) dangling.push(`${f} -> ${m}`);
    }
    for (const m of s.matchAll(/href="(\/[a-z0-9-]+\.html)"/g)) dotHtml.push(`${f} -> ${m[1]}`);
  }
  check('every internal link resolves', dangling.length === 0, dangling.join(', '));
  check('no internal link uses the .html form', dotHtml.length === 0, dotHtml.join(', '));
  const orphans = Object.entries(inbound).filter(([, v]) => v === 0).map(([k]) => k);
  check('no page is orphaned', orphans.length === 0, orphans.join(', '));

  const sm = new Set([...read('sitemap.xml')
    .matchAll(new RegExp(`<loc>https://${DOMAIN.replace('.', '\\.')}(/[^<]*)</loc>`, 'g'))]
    .map(m => m[1]));
  const missing = Object.keys(ROUTES).filter(r => !sm.has(r));
  const extra = [...sm].filter(u => !ROUTES[u]);
  check('sitemap matches the routes', !missing.length && !extra.length,
    `missing ${missing.join(',')} extra ${extra.join(',')}`);
  check('404 page is not in the sitemap', !read('sitemap.xml').includes('404'));
  check('robots.txt points at the sitemap', read('robots.txt').includes('Sitemap:'));
}

console.log('\n== 4. content rules ==');
{
  /* Content filters on school networks keyword-match URLs before fetching, so the word
   * belongs in titles and body copy, never in a path or filename. */
  check('no "unblocked" in any filename',
    !readdirSync(PUB).some(f => /unblocked/i.test(f)),
    readdirSync(PUB).filter(f => /unblocked/i.test(f)).join(', '));

  const banned = ['Joust', 'Skirmish', 'Williams', 'Midway', 'Harriman'];
  const hits = banned.filter(w => html.some(f => new RegExp(w, 'i').test(read(f))));
  check('no removed attribution anywhere', hits.length === 0, hits.join(', '));

  const dashes = html.filter(f => /[\u2014\u2013]/.test(read(f)));
  check('no em or en dashes', dashes.length === 0, dashes.join(', '));

  const ph = html.filter(f => /PASTE_|YOUR_TOKEN|TODO_|XXXX/.test(read(f)));
  check('no leftover placeholders', ph.length === 0, ph.join(', '));
}

console.log('\n== 5. structured data and previews ==');
{
  const bad = [], noCanon = [], noOg = [];
  for (const f of html) {
    const s = read(f);
    for (const m of s.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
      try { JSON.parse(m[1]); } catch { bad.push(f); }
    }
    if (f !== '404.html') {
      if (!/rel="canonical"/.test(s)) noCanon.push(f);
      if (!/property="og:image"/.test(s)) noOg.push(f);
    }
  }
  check('all JSON-LD parses', bad.length === 0, [...new Set(bad)].join(', '));
  check('every indexable page has a canonical', noCanon.length === 0, noCanon.join(', '));
  check('every indexable page has an og:image', noOg.length === 0, noOg.join(', '));
  check('og and icon images exist',
    existsSync(join(PUB, 'og.png')) && existsSync(join(PUB, 'icon.png')));
}

console.log('\n== 6. the game still runs ==');
{
  const src = read('index.html');
  /* ctx.roundRect is Chrome 99, Safari 16, Firefox 112. Without the polyfill the game
   * throws on its first draw and shows a black screen on anything older, including the
   * managed Chromebooks a large part of the search audience arrives on. */
  check('roundRect polyfill present', src.includes('CanvasRenderingContext2D.prototype.roundRect'));
  check('adaptive glow degradation present', src.includes('slowFrames'));
  check('audio defaults respect framing', src.includes('FRAMED'));
  check('storage access is wrapped', /try\s*\{[^}]*localStorage/.test(src));

  /* Boot the script with localStorage throwing and Web Audio absent. Both happen in
   * the wild: private browsing, locked-down profiles, old browsers. */
  const js = src.split('<script>').pop().split('</scr' + 'ipt>')[0];
  const stubEl = new Proxy({}, {
    get: (t, k) => k === 'classList' ? { add() {}, remove() {}, toggle() {} }
      : k === 'style' ? {}
        : k === 'querySelector' ? () => null
          : k === 'getContext' ? () => new Proxy({}, { get: () => () => {} })
            : typeof k === 'string' && /^(textContent|innerHTML)$/.test(k) ? ''
              : () => {},
    set: () => true
  });
  const g = globalThis;
  g.CanvasRenderingContext2D = function () {};
  g.CanvasRenderingContext2D.prototype = { roundRect() {} };
  g.window = { addEventListener() {}, innerWidth: 390, innerHeight: 780, devicePixelRatio: 2, self: 1, top: 1 };
  g.document = { getElementById: () => stubEl, addEventListener() {}, hidden: false };
  g.performance = { now: () => 0 };
  g.requestAnimationFrame = () => {};
  g.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  try { new Function(js)(); pass('boots with storage blocked and no Web Audio'); }
  catch (e) { fail('boots with storage blocked and no Web Audio', e.message); }
}

console.log('\n== manifest ==');
for (const f of readdirSync(PUB).sort()) {
  const b = readFileSync(join(PUB, f));
  console.log(`  ${f.padEnd(34)} ${String(b.length).padStart(7)}  ${createHash('sha256').update(b).digest('hex').slice(0, 12)}`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED. Deploy blocked.\n` : '\nAll checks passed.\n');
process.exit(failed ? 1 : 0);
