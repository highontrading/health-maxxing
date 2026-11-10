// Smoke test: node smoke.js [--base=http://localhost:3000] /path /path2 ...
// Prints status + console/page errors for each path.
const { chromium } = require('playwright');
(async () => {
  const args = process.argv.slice(2);
  const base = (args.find((a) => a.startsWith('--base=')) || '--base=http://localhost:3000').slice(7);
  const paths = args.filter((a) => !a.startsWith('--'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let bad = 0;
  for (const p of paths) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 600)); });
    page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message.slice(0, 600)));
    let status = 0;
    try {
      const res = await page.goto(base + p, { waitUntil: 'networkidle', timeout: 60000 });
      status = res.status();
    } catch (e) { errs.push('NAV ' + e.message.slice(0, 200)); }
    const h1 = await page.locator('h1').first().innerText().catch(() => '(no h1)');
    console.log(String(status).padEnd(4), p.padEnd(44), '|', h1.replace(/\s+/g, ' ').slice(0, 60));
    for (const e of errs) { bad++; console.log('     !! ' + e.replace(/\n/g, '\n        ')); }
    await page.close();
  }
  await browser.close();
  console.log(bad ? `${bad} error(s)` : 'no console errors');
})();
