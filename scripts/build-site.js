const { mkdirSync, copyFileSync } = require('node:fs');
const { resolve } = require('node:path');

// The Windows server stays on the PC. Vercel hosts only its entry page.
const root = resolve(__dirname, '..');
mkdirSync(resolve(root, 'dist'), { recursive: true });
for (const file of ['index.html', 'connect.js']) {
  copyFileSync(resolve(root, 'site', file), resolve(root, 'dist', file));
}
console.log('PC Monitor entry page built in dist/');
