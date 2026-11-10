# Browser tests

These scripts drive a real browser against a running copy of the site. They are plain Node scripts
that need [Playwright](https://playwright.dev):

```bash
npm install --no-save playwright
```

```bash
npx playwright install chromium
```

Start the site first (`npm run dev`, or `npm run build` then `npm start`), then:

| Script | What it checks |
| --- | --- |
| `node scripts/e2e/smoke.js / /articles /tools/bmi` | Each page loads, has a heading and logs no console errors |
| `node scripts/e2e/overflow.js / /about /signup` | No sideways scrolling or cut-off text at phone width (`--w=360` to change) |
| `node scripts/e2e/community.js` | Sign-up, posting, replying, liking, reporting, sign-out and sign-in |
| `node scripts/e2e/admin.js` | 18 admin steps: editing, validation, create and delete, bulk actions, settings, API tokens and the content API, uploads, moderation, members, the activity log and the CSV export |
| `node scripts/e2e/motion.js` | Page transitions on every kind of page: one or two short animations, nothing left hidden, the page starts at the top, no animation on back and forward, an instant swap under reduced motion, and (production build only) that hovering a link makes the page open in one step |

`BASE=https://staging.example.com` points them at another address. The admin test signs in with
`ADMIN_EMAIL` and `ADMIN_PASSWORD`, or with the generated `data/admin-credentials.txt`.

`community.js` and `admin.js` create and delete data, so run them against a development database,
never production. Sign-ups and logins are rate limited per hour; if a run reports "Too many
attempts", clear the limits in the development database:

```bash
npx tsx -e "import('./src/lib/db').then(m => m.run('DELETE FROM rate_limits')).then(() => process.exit(0))"
```

The moderation step needs at least one open report, which `community.js` creates. Run it first.
