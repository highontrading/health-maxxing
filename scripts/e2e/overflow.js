// Finds horizontal overflow at a phone width. usage: node overflow.js [--w=390] /path ...
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
(async () => {
  const args = process.argv.slice(2);
  const w = Number((args.find((a) => a.startsWith('--w=')) || '--w=390').slice(4));
  const paths = args.filter((a) => !a.startsWith('--'));
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  let bad = 0;
  for (const p of paths) {
    const page = await ctx.newPage();
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(700);
    const res = await page.evaluate((w) => {
      const doc = document.documentElement;
      const over = doc.scrollWidth - doc.clientWidth;
      const culprits = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > w + 1 || r.left < -1) {
          // Skip things inside a horizontal scroller or a clipping ancestor.
          let a = el.parentElement, clipped = false;
          while (a && a !== document.body) {
            const cs = getComputedStyle(a);
            if (['auto', 'scroll', 'hidden', 'clip'].includes(cs.overflowX)) { clipped = true; break; }
            a = a.parentElement;
          }
          if (!clipped) culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
      }
      // Text that runs off-screen inside a clipping container is cut off for the reader.
      const cut = [];
      for (const el of document.querySelectorAll('body p, body h1, body h2, body h3, body li, body a, body span, body dd, body dt, body td, body label')) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || (r.right <= w + 1 && r.left >= -1)) continue;
        if (el.closest('[aria-hidden="true"], .marquee, .sr-only') || getComputedStyle(el).position === 'absolute' && el.classList.contains('sr-only')) continue;
        let a = el.parentElement, scroller = false, fixedOff = false;
        while (a && a !== document.body) {
          const cs = getComputedStyle(a);
          if (['auto', 'scroll'].includes(cs.overflowX)) { scroller = true; break; }
          if (cs.position === 'absolute' && a.getBoundingClientRect().left < -500) { fixedOff = true; break; }
          a = a.parentElement;
        }
        if (!scroller && !fixedOff && r.left > -500) cut.push(`${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}" [${Math.round(r.left)}..${Math.round(r.right)}]`);
      }
      return { over, culprits: culprits.slice(0, 4), cut: cut.slice(0, 4) };
    }, w);
    if (res.over > 1) { bad++; console.log(`OVERFLOW ${res.over}px  ${p}\n    ${res.culprits.join('\n    ')}`); }
    else if (res.cut.length) { bad++; console.log(`CUT TEXT  ${p}\n    ${res.cut.join('\n    ')}`); }
    else console.log(`ok        ${p}`);
    await page.close();
  }
  await browser.close();
  console.log(bad ? `${bad} page(s) overflow at ${w}px` : `no horizontal overflow at ${w}px`);
})().catch((e) => { console.error(e.message); process.exit(1); });
