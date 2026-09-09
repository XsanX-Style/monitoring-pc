const { mkdirSync, cpSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');

// The Windows server stays on the PC. Vercel hosts only its entry page,
// so the whole site/ folder is copied as-is (html, css, js, icon).
const root = resolve(__dirname, '..');
const siteDir = resolve(root, 'site');
const distDir = resolve(root, 'dist');

mkdirSync(distDir, { recursive: true });
cpSync(siteDir, distDir, { recursive: true });

console.log(`PC Monitor entry page built in dist/: ${readdirSync(distDir).sort().join(', ')}`);
