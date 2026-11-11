// End-to-end: sign up, start a thread, reply, like, report, sign out, sign in again.
// Creates a test member and a thread, so run it against a development database. usage: node scripts/e2e/community.js
const { chromium } = require('playwright');
const { BASE } = require('./lib');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  const stamp = Date.now().toString(36);
  const handle = 'tester_' + stamp.slice(-6);
  const email = `${handle}@example.com`;

  // Public community page
  let res = await page.goto(BASE + '/community', { waitUntil: 'networkidle' });
  console.log('community', res.status(), 'boards:', await page.locator('a[href^="/community/"] >> text=threads').count());

  // Unauthenticated new-thread should bounce to login
  await page.goto(BASE + '/community/new?board=training', { waitUntil: 'networkidle' });
  console.log('new thread while signed out ->', page.url().replace(BASE, ''));

  // Sign up: validation first
  await page.goto(BASE + '/signup?next=/community/new?board=training', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForTimeout(800);
  console.log('empty signup errors:', await page.locator('.field-error').allInnerTexts());
  await page.locator('#name').fill('Test Runner');
  await page.locator('#handle').fill(handle);
  await page.locator('main input[name="email"]:visible').fill(email);
  await page.locator('main input[name="password"]:visible').fill('correct-horse-9');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((u) => u.pathname === '/community/new', { timeout: 15000 });
  console.log('after signup ->', page.url().replace(BASE, ''));

  // Thread validation + create
  await page.getByRole('button', { name: 'Post thread' }).click();
  await page.waitForTimeout(800);
  console.log('empty thread errors:', await page.locator('.field-error').allInnerTexts());
  await page.getByLabel('Title').fill('Is two days a week of lifting enough to start?');
  await page.getByLabel('Your post').fill('I can only train twice a week right now.\n\nIs that **enough** to see progress as a beginner? <script>alert(1)</script>\n\n> quoted line');
  await page.getByRole('button', { name: 'Post thread' }).click();
  await page.waitForURL(/community\/t\/\d+/, { timeout: 15000 });
  console.log('thread created ->', page.url().replace(BASE, ''));
  const html = await page.locator('article').first().innerHTML();
  console.log('script tag escaped:', !/<script>alert/.test(html), '| bold rendered:', /<strong>enough<\/strong>/.test(html), '| quote rendered:', /<blockquote>/.test(html));

  // Reply (links blocked for new accounts)
  await page.getByLabel('Add a reply').fill('See https://example.com/spam for more');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await page.waitForTimeout(1000);
  console.log('link reply ->', await page.locator('.field-error').allInnerTexts());
  await page.getByLabel('Add a reply').fill('Answering my own question: the beginner guide says two sessions is a fine start.');
  await page.getByRole('button', { name: 'Post reply' }).click();
  await page.waitForTimeout(1500);
  console.log('replies shown:', await page.locator('ol > li[id^="post-"]').count());

  // Like the thread
  await page.locator('article footer button[aria-label^="Like"]').click();
  await page.waitForTimeout(1200);
  console.log('thread like button:', await page.locator('article footer form button').first().getAttribute('aria-label'));

  // Report the thread
  await page.locator('article footer').getByRole('button', { name: 'Report' }).click();
  await page.locator('article footer input[name=reason]').fill('Testing the report flow');
  await page.getByRole('button', { name: 'Send report' }).click();
  await page.waitForTimeout(1000);
  console.log('report ->', await page.locator('article footer').innerText());

  // Header account menu + sign out
  await page.goto(BASE + '/account', { waitUntil: 'networkidle' });
  console.log('account h1:', await page.locator('h1').innerText());
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.waitForURL(BASE + '/', { timeout: 15000 });
  await page.goto(BASE + '/account', { waitUntil: 'networkidle' });
  console.log('account while signed out ->', page.url().replace(BASE, ''));

  // Sign in: wrong then right
  await page.locator('main input[name="email"]:visible').fill(email);
  await page.locator('main input[name="password"]:visible').fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(1000);
  console.log('wrong password ->', await page.locator('.field-error').allInnerTexts());
  await page.locator('main input[name="password"]:visible').fill('correct-horse-9');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => u.pathname === '/account', { timeout: 15000 });
  console.log('signed in ->', page.url().replace(BASE, ''));

  if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
