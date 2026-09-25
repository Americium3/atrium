// Rasterise the marks for icons/gen.py --brand: node icons/raster.js jobs.json
// jobs.json is [{ "svg": "<file.svg>", "size": 32, "out": "<file.png>" }, ...].
//
// Runs only under the Atrium kit's Playwright shim
// (NODE_PATH=/x/Github/atrium-wt/_kit/shim), which launches every browser on a
// seeded profile. A headless Chrome on a fresh profile probes the Windows
// password with a blank one, and a few of those lock the owner out of the
// machine. One browser for the whole batch, closed at the end.
'use strict';
const fs = require('fs');

const shim = (process.env.NODE_PATH || '').replace(/\\/g, '/');
if (!/atrium-wt\/_kit\/shim/.test(shim)) {
  console.error('refusing to launch a browser: set NODE_PATH=/x/Github/atrium-wt/_kit/shim');
  process.exit(2);
}
const { chromium } = require('playwright');   // the shim's wrapper, never a bare install

(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  try {
    for (const j of jobs) {
      const svg = fs.readFileSync(j.svg, 'utf8');
      await page.setViewportSize({ width: j.size, height: j.size });
      await page.setContent('<!DOCTYPE html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}' +
        'svg{display:block;width:' + j.size + 'px;height:' + j.size + 'px}</style>' + svg);
      await page.screenshot({ path: j.out, omitBackground: true, clip: { x: 0, y: 0, width: j.size, height: j.size } });
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
