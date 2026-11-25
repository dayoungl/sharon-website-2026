// Encrypts password-locked content. Readable sources live in _private/work/ (git-ignored);
// this writes the encrypted pages to work/.
//   PAGES:    the whole <main> is locked behind a full-page password screen.
//   SECTIONS: only <section … data-lock> blocks are locked, each with an inline password form
//             (e.g. the Impact numbers on an otherwise public page).
//
//   LOCK_PASSWORD='…' node tools/lock.mjs
//
// AES-256-GCM, key from PBKDF2-SHA256 (600k iterations), random salt + IV per page.
// site.js decrypts in the browser after the visitor enters the password.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const PAGES = ['home-nav.html'];
const SECTIONS = ['apps.html'];
const ITER = 600000;
const pw = process.env.LOCK_PASSWORD;
if (!pw) { console.error('Set LOCK_PASSWORD'); process.exit(1); }

// Reuse the homepage mascot so locked pages still have something to play with
const home = readFileSync('index.html', 'utf8');
const mascotMatch = home.match(/<span class="mascot"[\s\S]*?<\/svg>\s*<\/span>/);
const MASCOT = mascotMatch ? mascotMatch[0].replace('class="mascot"', 'class="mascot lock-mascot"') : '';

const b64 = (buf) => Buffer.from(buf).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

async function encrypt(text) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return `data-salt="${b64(salt)}" data-iv="${b64(iv)}" data-iter="${ITER}" data-ct="${b64(ct)}"`;
}

const FORM = `<form class="lock-form" autocomplete="on">
          <input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required>
          <button type="submit">Unlock</button>
        </form>
        <p class="lock-error" role="alert" hidden>That’s not it. Try again.</p>`;

for (const page of SECTIONS) {
  const src = readFileSync(`_private/work/${page}`, 'utf8');
  const re = /<section class="([^"]*)" data-lock(?: data-label="([^"]*)")?>([\s\S]*?)\n    <\/section>/g;
  const parts = [...src.matchAll(re)];
  if (!parts.length) throw new Error(`no <section data-lock> in ${page}`);
  let out = src;
  for (const m of parts) {
    const label = m[2] || 'Impact';
    // Blurred sneak peek: the same layout with every digit scrambled, so the real numbers never ship
    const teaser = m[3]
      .replace(/<p class="label">[\s\S]*?<\/p>\s*/, '')
      .replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
    const gate = `<section class="${m[1]} lock-section" ${await encrypt(m[3])}>
      <div class="showcase-text"><p class="label">${label}</p></div>
      <div class="lock-peek">
        <div class="lock-teaser" aria-hidden="true" inert>${teaser}
        </div>
        <div class="lock-inline">
          <p class="lock-note">The numbers are password protected.</p>
          ${FORM}
        </div>
      </div>
    </section>`;
    out = out.replace(m[0], gate);
  }
  writeFileSync(`work/${page}`, out);
  console.log(`locked ${parts.length} section(s) in work/${page}`);
}

for (const page of PAGES) {
  const src = readFileSync(`_private/work/${page}`, 'utf8');
  const m = src.match(/(<main class="(case[^"]*)"[^>]*>)([\s\S]*?)(\n  <\/main>)/);   // keeps extra classes, e.g. "case wide-shots"
  if (!m) throw new Error(`no <main> in ${page}`);
  const title = (m[3].match(/<h1>([\s\S]*?)<\/h1>/) || [, 'Project'])[1];

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(m[3]));

  const gate = `<main class="${m[2]} locked" data-salt="${b64(salt)}" data-iv="${b64(iv)}" data-iter="${ITER}" data-ct="${b64(ct)}">
    <div class="lock-gate">
      ${MASCOT}
      <h1>${title}</h1>
      <p class="case-sub">This project is password protected.</p>
      <form class="lock-form" autocomplete="on">
        <input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" required>
        <button type="submit">Unlock</button>
      </form>
      <p class="lock-error" role="alert" hidden>That’s not it. Try again.</p>
      <noscript><p class="lock-error">Turn on JavaScript to unlock this page.</p></noscript>
    </div>`;
  const out = src.replace(m[0], gate + m[4]);
  writeFileSync(`work/${page}`, out);
  console.log(`locked work/${page} (${esc(title)})`);
}
