// Adds/updates a ?v= version on style.css and site.js links in every page, so phones and
// browsers fetch the new files right after a push instead of a copy cached for up to 10 minutes.
//   node tools/bump.mjs        (then re-run tools/lock.mjs for the locked pages)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
const v = Date.now().toString(36);
const files = ['index.html', 'about.html',
  ...readdirSync('work').filter(f => f.endsWith('.html')).map(f => 'work/' + f),
  ...(existsSync('_private/work') ? readdirSync('_private/work').filter(f => f.endsWith('.html')).map(f => '_private/work/' + f) : [])];
for (const f of files) {
  const h = readFileSync(f, 'utf8').replace(/((?:\.\.\/)?(?:style\.css|site\.js))(\?v=[a-z0-9]+)?"/g, `$1?v=${v}"`);
  writeFileSync(f, h);
}
console.log('version', v, 'on', files.length, 'pages');
