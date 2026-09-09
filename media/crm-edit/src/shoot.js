const { chromium } = require('playwright-core');
const path = require('path'), fs = require('fs');

const DIR = __dirname;
const EXE = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

(async () => {
  const args = process.argv.slice(2);
  const mode = args[0] || 'all';
  const outDir = path.join(DIR, mode === 'preview' ? 'preview' : 'frames');
  fs.mkdirSync(outDir, { recursive: true });
  if (mode !== 'preview') for (const f of fs.readdirSync(outDir)) fs.unlinkSync(path.join(outDir, f));

  const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox', '--force-device-scale-factor=1', '--hide-scrollbars', '--disable-lcd-text'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(DIR, 'edit.html'));
  await page.waitForFunction('window.__ready === true');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  let times;
  if (mode === 'preview') {
    times = args.slice(1).map(Number);
  } else {
    const FPS = 60, DUR = 11.10;
    times = [];
    for (let i = 0; i < Math.round(DUR * FPS); i++) times.push(i / FPS);
  }

  const t0 = Date.now();
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    await page.evaluate((tt) => window.renderFrame(tt), t);
    const name = mode === 'preview' ? `p_${t.toFixed(2)}.png` : `f_${String(i).padStart(5, '0')}.png`;
    await page.screenshot({ path: path.join(outDir, name) });
    if (mode !== 'preview' && i % 60 === 0) process.stdout.write(`${i}/${times.length} ${((Date.now()-t0)/1000).toFixed(1)}s\n`);
  }
  console.log(`done ${times.length} frames in ${((Date.now()-t0)/1000).toFixed(1)}s -> ${outDir}`);
  await browser.close();
})();
