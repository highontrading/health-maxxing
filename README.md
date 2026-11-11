# Health Maxxing

An evidence-based health magazine, community forum and newsletter in one site, with an admin panel
and an autopilot that has Claude research and draft new articles.

## What is in it

| Area | What you get |
| --- | --- |
| Magazine | 119 articles across 16 topics, each with sources, key takeaways, questions and answers |
| Conditions | 101 conditions from A to Z, grouped by 13 body systems, with a clickable body map |
| Tools | 14 calculators: BMI, calories, macros, protein, water, heart-rate zones, one-rep max, body fat, waist-to-height, sleep cycles, due date, blood pressure, calories burned, running pace |
| Library | 140 foods with nutrition values, 77 exercises with steps and cues, 48 myths checked, 200 glossary terms |
| Community | A forum with 8 boards, likes, reports, moderation and spam limits |
| Newsletter | Sign-up forms, a public archive, and sending by email once SMTP is connected |
| Admin panel | Edit everything, moderate, manage members and subscribers, change site settings |
| Autopilot | A topic queue that Claude researches with web search and drafts into articles |
| Content API | Token-protected REST API, so scripts and AI agents can manage content |
| Motion | Page transitions, menus and dialogs that open and close smoothly, scroll reveals and small touches throughout. Visitors who ask their device for reduced motion get none of it |

Built with Next.js 16, React 19, Tailwind CSS 4 and a SQLite (libSQL) database. It needs no outside
service to run.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000. The first start creates the database at `data/health-maxxing.db`, loads
everything from `content/` into it, and creates an admin account. The admin password is random and
is written to `data/admin-credentials.txt`.

The admin panel is at `/admin`.

To choose the admin login yourself, copy `.env.example` to `.env.local`, set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` (10 characters or more), and restart.

## The admin panel

- **Publishing**: articles, conditions, newsletter issues and pages. Markdown editor with a preview,
  sources, scheduling, drafts and bulk actions.
- **Library** and **Structure**: myths, glossary, foods, exercises, topics, body systems, forum boards.
- **Community**: reports, threads and replies; suspend members; subscribers with CSV export; messages
  from the contact form.
- **Site**: image uploads, autopilot, API tokens, settings (home page text, announcement bar, social
  links, switches), an activity log, and a short "How it works" guide.

Editors can write, publish and moderate. Admins can also change settings, roles, tokens,
subscribers and the autopilot.

## How content works

The launch library lives in `content/` as Markdown and JSON files. `npm run content:sync` loads it
into the database, and it also runs automatically before `dev`, `build` and `start`.

- A page you edit in the admin panel is yours from then on: file changes never overwrite it.
- A page you delete in the admin panel stays deleted.
- New files, and files nobody has edited in the panel, are picked up on the next sync.

So there are two ways to add content: write it in the admin panel, or add files to `content/` (the
format is in `content/CONTENT_GUIDE.md`) and deploy.

```bash
npm run content:check
```

validates every file: structure, lengths, citations, internal links and source domains.

### Fact-check status

Every article and condition is marked `verified` or `pending`.

- **Verified** (11 articles and 2 conditions): every figure and link was checked against its source
  with a live web search. Readers see a "Sources verified" badge.
- **Pending** (108 articles and 99 conditions): written from established medical knowledge
  under strict rules (mainstream guidance only, no invented numbers or links), but not yet checked
  line by line against the sources. They are published without the badge.

`content/FACT_CHECK_QUEUE.md` lists the specific claims and links to check first for each piece.
The dashboard shows the count, and each list in the admin panel can be filtered to "Pending". The
food table is the same: its values were written from memory of USDA records and are labelled as
rounded reference values.

## Autopilot

Under **Admin > Autopilot**, add topics to the queue (or let Claude suggest some). For each topic:

1. Claude searches the web for current guidance and studies, and records which pages it found.
2. Claude writes the article in the house style, citing only those pages.
3. The draft is checked for structure and saved as a draft, marked "pending fact check", with a
   list of things to look at before you publish.

It needs an Anthropic API key:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

Settings on the same page choose the model, switch web research on or off, and decide whether
drafts publish without review (off by default, and best left off for health content).

Refusal fallbacks are switched on: if a safety check declines a harmless health topic, the API
retries it on the model's standard fallback instead of failing the draft.

### Run it on a schedule

Set `CRON_SECRET` (16 characters or more), then have any scheduler call the endpoint. Each call
drafts the next topics in the queue.

```bash
curl -fsS -X POST https://www.example.com/api/cron/autopilot -H "Authorization: Bearer $CRON_SECRET"
```

- **cron on a server**: put that line in your crontab, for example `0 6 * * *` for once a day.
- **Vercel Cron**: add a cron for `/api/cron/autopilot` in `vercel.json`; Vercel sends `CRON_SECRET`
  as the bearer token.
- **GitHub Actions**: a scheduled workflow that runs the same `curl` with the secret stored in the
  repository secrets.

## Content API

Create a token under **Admin > API tokens**, then:

```bash
curl https://www.example.com/api/v1 -H "Authorization: Bearer $HM_TOKEN"
```

lists every collection and its fields. `GET`, `POST`, `PATCH` and `DELETE` work on
`/api/v1/<collection>` and `/api/v1/<collection>/<id-or-slug>`. New entries are drafts unless they
ask to be published. `/api/v1/autopilot/topics` and `/api/v1/autopilot/run` drive the autopilot.

## Email

Newsletter sending and password-reset emails use SMTP, which every email provider offers.

```bash
SMTP_URL=smtps://USERNAME:PASSWORD@smtp.example.com:465
EMAIL_FROM=Health Maxxing <hello@yourdomain.com>
```

With these set, a published issue gets a "Send by email" panel in the admin: send yourself a test,
then send to the list. Every email carries an unsubscribe link, mail apps get one-click
unsubscribe, and a send that stops halfway resumes without emailing anyone twice.

Without email, the newsletter still collects subscribers and publishes issues to the web archive;
download the list as CSV to send from another tool. Password resets then go through an admin, who
can create a one-time reset link for a member under **Admin > Members**.

## Deploy

Set `NEXT_PUBLIC_SITE_URL` to the public address in every case.

### A server (VPS)

```bash
npm ci
```

```bash
npm run build
```

```bash
npm start
```

Run it under a process manager, behind a reverse proxy that provides HTTPS. All data is in the
`data/` folder. After pulling new code, run the three commands again.

### Docker

```bash
docker compose up -d --build
```

The database lives on the `hm-data` volume. The site is built when the container starts, so its
pages are generated from the live database; the first minute after a start is the build.

### Vercel with a hosted database

Serverless hosts have no permanent disk, so use a hosted libSQL database such as Turso. Set
`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the project settings,
then deploy. The build loads the content into that database.

Only the plain Node route (`npm run build`, `npm start`) was run and tested while building this.
The Docker and Vercel recipes follow each platform's documented behaviour but have not been run.

### Back up

On a server or in Docker, the whole site (content, members, posts, uploads, settings) is the file
`data/health-maxxing.db`. Copy it somewhere safe on a schedule. On a hosted database, use the
provider's backups.

## Check your changes

```bash
npm run check
```

runs the content validator, the type checker, the linter and the tests (calculator maths,
newsletter sending against a local mail server, the autopilot pipeline with canned Claude answers,
and password-reset links).

Browser tests for the public site, the community, the admin panel and the page transitions are in
`scripts/e2e/`.

## Motion

Pages cross-fade when you follow a link, menus and dialogs open and close with a short animation,
content below the first screen rises in as you scroll, and stickers and buttons react to hover and
press. Hovering a link fetches the page in the background, so most pages open at once.

- Every speed and curve is a named value in `src/app/styles/motion/tokens.css`. Change a number
  there and the whole site follows.
- Visitors who switch on "reduce motion" on their device get instant page changes and no movement.
- Page transitions use the browser's View Transitions API, which recent versions of Chrome, Edge,
  Safari and Firefox have. A browser without it changes pages without the fade and everything
  else still works. The transitions were tested in Chromium only, so look at them once in Safari
  and Firefox.

## What still needs you

- **Fact-check the pending pages.** This is the big one. See "Fact-check status" above.
- **Legal pages.** The privacy policy and terms are sensible starting texts, not legal advice. Have
  them reviewed for where you operate, and add your company details.
- **Email.** Connect SMTP and verify your sending domain with your provider before the first send.
- **Autopilot.** The queue, validation and saving are tested, but the live calls to Claude have not
  been run here (there was no API key). Draft one topic and read the result before scheduling it.
- **The forum starts empty** apart from welcome threads posted by the team account.
- **Calculators** give estimates from published formulas. They are not medical devices.

## Project map

```text
content/             the launch library (Markdown and JSON), the writing guide, the fact-check queue
scripts/             content sync and validation, tests, browser tests
src/app/(site)/      public pages
src/app/admin/       admin panel and its server actions
src/app/api/         search, view tracking, the content API, the scheduled autopilot endpoint
src/components/      UI, including the sticker artwork in components/stickers/
src/lib/             database, queries, auth, markdown, calculators, autopilot, email
```

`CLAUDE.md` is the working guide for AI coding sessions on this repository.
