# sharon-website-2026

Personal portfolio, hosted on GitHub Pages. Not ready for the public yet: every page has
`noindex`, `robots.txt` blocks crawlers, and some project pages are password-locked.

- `index.html`, `about.html`, `work/*.html` — pages
- `style.css`, `site.js` — shared styles and behaviour (theme slider, mascot, card transitions, unlock)

## Password-locked project pages

The readable versions of locked pages live in `_private/work/` (git-ignored — never commit it,
the repo is public). After editing one, re-encrypt:

    LOCK_PASSWORD='…' node tools/lock.mjs

That rewrites `work/home-nav.html`, `work/model-productization.html` and
`work/growth-experiments.html` with their content encrypted (AES-GCM). Images are not encrypted.

Push to `main` and GitHub Pages redeploys automatically.
