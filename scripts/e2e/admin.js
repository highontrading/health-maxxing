// End-to-end walk through the admin panel. Each step prints PASS/FAIL and the run continues.
// Run against a development database: it creates and deletes rows. usage: node scripts/e2e/admin.js
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const { BASE, adminCredentials, tmpFile } = require('./lib');
const { email: EMAIL, password: PASSWORD } = adminCredentials();
let failures = 0;
const results = [];
async function step(name, fn) {
  try { const note = await fn(); results.push(`PASS  ${name}${note ? '  — ' + note : ''}`); }
  catch (e) { failures++; results.push(`FAIL  ${name}\n      ${String(e.message || e).split('\n').slice(0, 4).join('\n      ')}`); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const curl = (args) => execFileSync('curl', ['-s', '-w', '\n%{http_code}', ...args], { encoding: 'utf8' });
const api = (method, path, token, body) => {
  const args = ['-X', method, BASE + path, '-H', `Authorization: Bearer ${token}`];
  if (body) args.push('-H', 'Content-Type: application/json', '-d', JSON.stringify(body));
  const out = curl(args); const i = out.lastIndexOf('\n');
  let json = null; try { json = JSON.parse(out.slice(0, i)); } catch {}
  return { status: Number(out.slice(i + 1)), json, text: out.slice(0, i) };
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(page.url().replace(BASE, '') + ' :: ' + m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErrors.push(page.url().replace(BASE, '') + ' :: PAGEERROR ' + e.message.slice(0, 300)));
  const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'load', timeout: 60000 }); await page.waitForSelector('main h1', { timeout: 30000 }); await page.waitForTimeout(500); };
  const saveAndWait = async () => {
    await page.getByRole('button', { name: /Save changes|Create / }).click();
    await page.waitForFunction(() => { const s = document.querySelector('aside [role=status]'); return s && /Saved|Not saved/.test(s.textContent || ''); }, null, { timeout: 30000 });
    return (await page.locator('aside [role=status]').innerText()).trim();
  };

  await step('signed-out visitor is sent to the staff sign-in page', async () => {
    await go('/admin/c/articles');
    expect(new URL(page.url()).pathname === '/admin/login', 'landed on ' + page.url());
  });

  await step('admin signs in', async () => {
    await page.locator('main input[name="email"]:visible').fill(EMAIL);
    await page.locator('main input[name="password"]:visible').fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => u.pathname === '/admin', { timeout: 30000 });
  });

  let articleId, originalDek;
  await step('edit an article and see the change on the public page', async () => {
    await go('/admin/c/articles?q=how-many-steps');
    await page.locator('tbody a').first().click();
    await page.waitForURL(/\/admin\/c\/articles\/\d+/);
    articleId = Number(page.url().split('/').pop().split('?')[0]);
    originalDek = await page.locator('#dek').inputValue();
    await page.locator('#dek').fill('EDITED IN TEST. ' + originalDek);
    const status = await saveAndWait();
    expect(/Saved/.test(status), 'status was: ' + status);
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/articles/how-many-steps-a-day', { waitUntil: 'load' }); await pub.waitForTimeout(800);
    const body = await pub.locator('main').innerText();
    await pub.close();
    expect(body.includes('EDITED IN TEST.'), 'public page does not show the edit');
  });

  await step('a failed save keeps what was typed and explains the problem', async () => {
    await page.locator('#title').fill('');
    await page.locator('#body').evaluate((el) => { el.value = el.value + '\n\nUNSAVED TAIL MARKER'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    const status = await saveAndWait();
    expect(/Not saved/.test(status), 'status was: ' + status);
    const alert = await page.locator('[role=alert]').first().innerText();
    expect(/Headline/.test(alert), 'error summary: ' + alert);
    const bodyNow = await page.locator('#body').inputValue();
    expect(bodyNow.includes('UNSAVED TAIL MARKER'), 'the article body was reset after the failed save');
    expect(bodyNow.length > 3000, 'body looks truncated: ' + bodyNow.length);
  });

  await step('restore the article', async () => {
    await go(`/admin/c/articles/${articleId}`);
    await page.locator('#dek').fill(originalDek);
    const status = await saveAndWait();
    expect(/Saved/.test(status), status);
  });

  await step('markdown preview renders', async () => {
    await page.getByRole('tab', { name: 'preview' }).click();
    await page.waitForSelector('[data-prose] h2', { timeout: 20000 });
    const h2 = await page.locator('[data-prose] h2').first().innerText();
    await page.getByRole('tab', { name: 'write' }).click();
    return 'first heading: ' + h2;
  });

  let termId;
  await step('create a glossary term, find it on the site, then delete it', async () => {
    await go('/admin/c/glossary/new');
    await page.locator('#term').fill('Zzz Test Term');
    await page.locator('#definition').fill('A term that exists only for the automated admin test and is removed straight after.');
    await page.locator('#category').selectOption('sleep');
    await page.locator('#status').selectOption('published');
    await page.getByRole('button', { name: 'Create term' }).click();
    await page.waitForURL(/\/admin\/c\/glossary\/\d+/, { timeout: 30000 });
    termId = Number(new URL(page.url()).pathname.split('/').pop());
    await page.waitForSelector('text=The term was created.', { timeout: 30000 });
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/glossary', { waitUntil: 'load' }); await pub.waitForTimeout(800);
    const has = (await pub.locator('main').innerText()).includes('Zzz Test Term');
    await pub.close();
    expect(has, 'new term not on the public glossary');
    await page.getByRole('button', { name: 'Delete this term' }).click();
    await page.waitForTimeout(500); // a confirm button ignores a click that comes with the one that asked
    await page.getByRole('button', { name: 'Yes, delete' }).click();
    await page.waitForURL((u) => u.pathname === '/admin/c/glossary', { timeout: 30000 });
    const pub2 = await ctx.newPage();
    await pub2.goto(BASE + '/glossary', { waitUntil: 'load' }); await pub2.waitForTimeout(800);
    const still = (await pub2.locator('main').innerText()).includes('Zzz Test Term');
    await pub2.close();
    expect(!still, 'deleted term is still on the public glossary');
  });

  await step('bulk move to drafts, then publish again', async () => {
    await go('/admin/c/myths');
    const title = await page.locator('tbody tr').first().locator('a').first().innerText();
    await page.locator('tbody tr').first().locator('input[name=ids]').check();
    await page.getByRole('button', { name: 'Move to drafts' }).click();
    await page.waitForURL(/notice=/, { timeout: 30000 });
    expect((await page.locator('tbody tr').first().innerText()).includes('Draft'), 'row is not a draft');
    await page.locator('tbody tr').first().locator('input[name=ids]').check();
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await page.waitForURL(/notice=.*published/, { timeout: 30000 });
    expect((await page.locator('tbody tr').first().innerText()).includes('Published'), 'row is not published');
    return title;
  });

  await step('settings: announcement bar turns on and off on the public site', async () => {
    await go('/admin/settings');
    await page.getByLabel('Show the announcement bar').check();
    await page.locator('[id="announcement.text"]').fill('Test announcement from the admin flow');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await page.waitForSelector('text=Settings saved.', { timeout: 30000 });
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/', { waitUntil: 'load' }); await pub.waitForTimeout(800);
    const on = (await pub.locator('body').innerText()).includes('Test announcement from the admin flow');
    expect(on, 'announcement not shown on the home page');
    await page.getByLabel('Show the announcement bar').uncheck();
    await page.locator('[id="announcement.text"]').fill('');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await page.waitForTimeout(1500);
    await pub.reload({ waitUntil: 'load' }); await pub.waitForTimeout(800);
    const off = !(await pub.locator('body').innerText()).includes('Test announcement from the admin flow');
    await pub.close();
    expect(off, 'announcement still shown after switching it off');
  });

  await step('settings: a bad link is rejected with a field error', async () => {
    await go('/admin/settings');
    await page.locator('[id="social.instagram"]').fill('instagram.com/nope');
    await page.getByRole('button', { name: 'Save settings' }).click();
    await page.waitForSelector('text=Use a full link starting with https://', { timeout: 30000 });
    expect((await page.locator('[id="social.instagram"]').inputValue()) === 'instagram.com/nope', 'typed value was lost');
  });

  let token;
  await step('create an API token and use the content API', async () => {
    await go('/admin/api');
    await page.locator('#token-name').fill('admin flow test');
    await page.getByRole('button', { name: 'Create token' }).click();
    await page.waitForSelector('[role=status] code', { timeout: 30000 });
    token = (await page.locator('[role=status] code').first().innerText()).trim();
    expect(/^hm_[A-Za-z0-9_-]{20,}$/.test(token), 'token looks wrong: ' + token);
    expect(api('GET', '/api/v1/articles?status=published', 'hm_wrong').status === 401, 'bad token was accepted');
    const list = api('GET', '/api/v1/articles?status=published&q=protein', token);
    expect(list.status === 200 && list.json.data.length > 0, 'list failed: ' + list.text.slice(0, 200));
    const index = api('GET', '/api/v1', token);
    expect(index.status === 200 && index.json.collections.length === 11, 'index failed');
    const bad = api('POST', '/api/v1/glossary', token, { term: 'X' });
    expect(bad.status === 422 && bad.json.error.fields.definition, 'validation not reported: ' + bad.text.slice(0, 200));
    const made = api('POST', '/api/v1/glossary', token, { term: 'Api Test Term', definition: 'Created through the API by the automated test and deleted right after.', category: 'sleep', see_also: ['sleep', 'rest'] });
    expect(made.status === 201 && made.json.data.status === 'draft' && made.json.data.slug === 'api-test-term', 'create failed: ' + made.text.slice(0, 300));
    const patched = api('PATCH', '/api/v1/glossary/api-test-term', token, { status: 'published' });
    expect(patched.status === 200 && patched.json.data.status === 'published' && patched.json.data.definition.startsWith('Created through'), 'patch failed: ' + patched.text.slice(0, 300));
    const pub = await ctx.newPage();
    await pub.goto(BASE + '/glossary', { waitUntil: 'load' }); await pub.waitForTimeout(800);
    const has = (await pub.locator('main').innerText()).includes('Api Test Term');
    await pub.close();
    expect(has, 'API-published term is not on the public glossary');
    const del = api('DELETE', '/api/v1/glossary/api-test-term', token);
    expect(del.status === 200, 'delete failed');
    expect(api('GET', '/api/v1/glossary/api-test-term', token).status === 404, 'still there after delete');
    const topic = api('POST', '/api/v1/autopilot/topics', token, { topic: 'API queued topic for the admin flow test' });
    expect(topic.status === 201, 'topic queue failed: ' + topic.text.slice(0, 200));
    const run = api('POST', '/api/v1/autopilot/run', token);
    expect(run.status === 200 && /ANTHROPIC_API_KEY/.test(run.json.messages.join(' ')), 'run without a key should explain itself: ' + run.text.slice(0, 200));
  });

  await step('autopilot page shows the queued topic and can remove it', async () => {
    await go('/admin/autopilot');
    expect((await page.locator('main').innerText()).includes('API queued topic for the admin flow test'), 'queued topic not listed');
    await page.locator('#ap-topic').fill('Another topic added from the form in the test');
    await page.getByRole('button', { name: 'Add to queue' }).click();
    await page.waitForSelector('text=Added to the queue.', { timeout: 30000 });
    for (let i = 0; i < 2; i++) {
      await page.getByRole('button', { name: 'Remove', exact: true }).first().click();
      await page.waitForTimeout(500); // a confirm button ignores a click that comes with the one that asked
      await page.getByRole('button', { name: 'Remove', exact: true }).first().click();
      await page.waitForURL(/notice=/, { timeout: 30000 });
      await go('/admin/autopilot');
    }
    expect(!(await page.locator('main').innerText()).includes('topic'.concat(' added from the form')), 'topic was not removed');
  });

  await step('revoke the API token', async () => {
    await go('/admin/api');
    await page.getByRole('button', { name: 'Revoke' }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Revoke' }).first().click();
    await page.waitForURL(/notice=/, { timeout: 30000 });
    expect(api('GET', '/api/v1', token).status === 401, 'revoked token still works');
  });

  await step('upload an image, fetch it, delete it', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(tmpFile('pixel.png'), png);
    fs.writeFileSync(tmpFile('fake.png'), '<svg onload=alert(1)>');
    await go('/admin/media');
    await page.locator('#media-file').setInputFiles(tmpFile('fake.png'));
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForSelector('text=That file is not a PNG', { timeout: 30000 });
    await page.locator('#media-file').setInputFiles(tmpFile('pixel.png'));
    await page.locator('#media-alt').fill('A single test pixel');
    await page.getByRole('button', { name: 'Upload' }).click();
    await page.waitForSelector('text=Uploaded.', { timeout: 30000 });
    const url = /\/media\/\d+/.exec(await page.locator('main').innerText())[0];
    const head = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code} %{content_type} %{size_download}', BASE + url], { encoding: 'utf8' });
    expect(head.startsWith('200 image/png'), 'image fetch: ' + head);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.waitForURL(/notice=/, { timeout: 30000 });
    const gone = execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', BASE + url], { encoding: 'utf8' });
    expect(gone === '404', 'deleted image still served: ' + gone);
    return url + ' -> ' + head;
  });

  await step('moderation: hide a reported thread (closes its report), then unhide', async () => {
    await go('/admin/community');
    const before = await page.locator('h2:has-text("Open reports")').innerText();
    await page.getByRole('button', { name: 'Hide it' }).first().click();
    await page.waitForURL(/notice=/, { timeout: 30000 });
    const after = await page.locator('h2:has-text("Open reports")').innerText();
    expect(before !== after, `report count did not change (${before})`);
    await page.getByRole('button', { name: 'Unhide' }).first().click();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Unhide'), null, { timeout: 30000 });
    return `${before} -> ${after}`;
  });

  await step('members: suspend and reinstate a test account', async () => {
    await go('/admin/users?q=tester_');
    const row = page.locator('tbody tr').first();
    const handle = (await row.locator('td').first().innerText()).split('\n').find((l) => l.startsWith('@'));
    await row.getByRole('button', { name: 'Suspend' }).click();
    await page.waitForSelector('text=is suspended.', { timeout: 30000 });
    expect((await page.locator('tbody tr').first().innerText()).includes('Suspended'), 'not marked suspended');
    await page.locator('tbody tr').first().getByRole('button', { name: 'Lift suspension' }).click();
    await page.waitForSelector('text=can post again.', { timeout: 30000 });
    expect(!(await page.locator('tbody tr').first().innerText()).includes('Suspended'), 'still suspended');
    return handle;
  });

  await step('activity log recorded the session', async () => {
    await go('/admin/activity');
    const text = await page.locator('main').innerText();
    for (const needle of ['updated articles', 'created glossary', 'deleted glossary', 'API (admin flow test)', 'suspended']) expect(text.includes(needle), 'missing in log: ' + needle);
  });

  await step('subscribers CSV export downloads for an admin', async () => {
    const cookies = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join('; ');
    const out = curl([BASE + '/admin/export/subscribers', '-H', `Cookie: ${cookies}`]);
    expect(out.startsWith('email,name,status,source,subscribed_at') && out.trim().endsWith('200'), 'unexpected export: ' + out.slice(0, 120));
    const anon = curl([BASE + '/admin/export/subscribers']);
    expect(anon.trim().endsWith('403'), 'export is open to signed-out visitors');
  });

  await browser.close();
  console.log(results.join('\n'));
  if (consoleErrors.length) console.log('\nCONSOLE ERRORS:\n' + [...new Set(consoleErrors)].slice(0, 12).join('\n'));
  console.log(failures ? `\n${failures} step(s) failed` : '\nall steps passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
