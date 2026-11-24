// Encrypts the <main> content of password-locked project pages.
// Readable sources live in _private/work/ (git-ignored); this writes the encrypted pages to work/.
//
//   LOCK_PASSWORD='…' node tools/lock.mjs
//
// AES-256-GCM, key from PBKDF2-SHA256 (600k iterations), random salt + IV per page.
// site.js decrypts in the browser after the visitor enters the password.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const PAGES = ['team-plan.html'];
const ITER = 600000;
const pw = process.env.LOCK_PASSWORD;
if (!pw) { console.error('Set LOCK_PASSWORD'); process.exit(1); }

// Reuse the homepage mascot so locked pages still have something to play with
const home = readFileSync('index.html', 'utf8');
const mascotMatch = home.match(/<span class="mascot"[\s\S]*?<\/svg>\s*<\/span>/);
const MASCOT = mascotMatch ? mascotMatch[0].replace('class="mascot"', 'class="mascot lock-mascot"') : '';

const b64 = (buf) => Buffer.from(buf).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

for (const page of PAGES) {
  const src = readFileSync(`_private/work/${page}`, 'utf8');
  const m = src.match(/(<main class="case"[^>]*>)([\s\S]*?)(\n  <\/main>)/);
  if (!m) throw new Error(`no <main> in ${page}`);
  const title = (m[2].match(/<h1>([\s\S]*?)<\/h1>/) || [, 'Project'])[1];

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(m[2]));

  const gate = `<main class="case locked" data-salt="${b64(salt)}" data-iv="${b64(iv)}" data-iter="${ITER}" data-ct="${b64(ct)}">
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
  const out = src.replace(m[0], gate + m[3]);
  writeFileSync(`work/${page}`, out);
  console.log(`locked work/${page} (${esc(title)})`);
}
