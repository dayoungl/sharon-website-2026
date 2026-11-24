# sharon-website-2026

Personal portfolio at https://dayoung.design, hosted on GitHub Pages.
Some project pages are password-locked.

- `index.html`, `about.html`, `work/*.html` — pages
- `style.css`, `site.js` — shared styles and behaviour (theme slider, mascot, card transitions, unlock)

## Password-locked project pages

The readable versions of locked pages live in `_private/work/` (git-ignored — never commit it,
the repo is public). After editing one, re-encrypt:

    LOCK_PASSWORD='…' node tools/lock.mjs

That rewrites `work/home-nav.html` (the only locked page) with its content encrypted
(AES-GCM). Images are not encrypted. Other project pages are plain HTML in `work/` — edit them directly.

Before pushing CSS/JS changes, run `node tools/bump.mjs` (then the lock script) so browsers
fetch the new files instead of a cached copy. Push to `main` and GitHub Pages redeploys automatically.
