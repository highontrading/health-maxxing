# Health Maxxing: working guide

@AGENTS.md

Health Maxxing is a health magazine, forum and newsletter with an admin panel and a Claude-powered
autopilot. The owner works through AI sessions and has asked for autonomous work: decide, build,
verify, then report plainly. `README.md` is the owner-facing overview; this file is for whoever
changes the code or the content.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Sync content, then start the dev server on port 3000 |
| `npm run build` then `npm start` | Production build and server (content is synced before each) |
| `npm run check` | Content validator, type check, lint and all tests. Run before every commit |
| `npm run content:check` | Validate `content/` only. Add a path fragment to narrow it, `--strict` to fail on warnings |
| `npm run content:sync` | Load `content/` into the database. `--force` overwrites admin edits, `--prune` removes rows whose file is gone |
| `npm run typecheck` | Regenerate route types, then `tsc`. Needed after adding or renaming a route |
| `node scripts/e2e/*.js` | Browser tests (see `scripts/e2e/README.md`). They create data: development database only |
| `node scripts/e2e/motion.js` | Page-transition checks. Run it against a production build |

The admin login for a local database is in `data/admin-credentials.txt`.

## Next.js 16 rules that bite here

`cacheComponents` and `partialPrefetching` are on. Read `node_modules/next/dist/docs/` before using
an API you have not used in this repository.

- **Public content is cached.** Readers in `src/lib/data.ts` use `"use cache"`, `cacheLife("hours")`
  and `cacheTag(...)`. After a write, call `invalidate(tag)` in a Server Action or
  `invalidateFromRoute(tag)` in a Route Handler (`src/lib/cache-tags.ts`).
- **Request data needs a boundary.** `cookies()`, `headers()`, `searchParams`, dynamic `params` and
  uncached database reads must sit inside `<Suspense>` or under a `loading.tsx`. Await `params`
  inside the suspended child, not in the page component. Every admin page folder has a
  `loading.tsx` for this reason: add one when you add an admin page.
- **Signed-in pages must be request-time.** `getSessionUser()` awaits `connection()` first. Without
  it the client router keeps a prefetched copy of a cookie-dependent page, and `refresh()` after a
  Server Action does not update lists in production (it works in dev, which hides the bug). Do not
  remove that call.
- **No clock reads while rendering.** Use `requestTime()` from `src/lib/now.ts` in server
  components, or compare dates in SQL. In client components use the hooks in `src/lib/hooks.ts`.
- **No `setState` in effects.** Lint rejects it. Derive values while rendering, or use
  `useSyncExternalStore` (see `useQueryParam`, `useToday`, `useMounted`).
- **`usePathname()` suspends on routes with unknown params.** Read it in a small child behind its
  own `<Suspense>` (see `PathWatcher` in `HeaderClient.tsx`).
- **Forms reset after an action.** React clears uncontrolled fields, so actions echo `values` back
  and inputs use them as `defaultValue`. Every new form must do the same, or a failed submit wipes
  what the visitor typed.
- **Page files export only what Next.js allows.** Put helpers in `src/lib/`.
- **The previous page stays in the DOM, hidden.** After a client-side navigation Next.js keeps the
  page you left (for back and forward). `document.querySelector` and browser-test selectors can
  match its elements, so scope them to what is rendered.
- **A link prefetches only the shell of a `[slug]` page** (its loading skeleton). `IntentPrefetch`
  in the site layout fetches the whole page on hover, focus or touch, and on touch screens also
  the links in the middle of the screen once scrolling settles, so pages open in one step. Add a
  new content section to its `CONTENT_PAGE` pattern, and a new top-level route to `RESERVED`.
- **Page changes must not smooth-scroll.** `<html data-scroll-behavior="smooth">` makes navigation
  jump to the top while links within a page still scroll smoothly. Do not remove it.
- **`backdrop-filter` (and `filter`, `transform`) turns an element into the box its `position: fixed`
  children are laid out in.** That squashed the phone menu inside the header once. Put the blur on a
  separate layer, never on an element that contains a fixed overlay.
- **Turbopack's disk cache is off** (`next.config.ts`): a warm cache once served a stale stylesheet.
- `generateStaticParams` must return at least one entry. Middleware is `proxy.ts`. `next lint` is gone.
- **Test against a production build before calling something done.** Several bugs here appeared only
  in `next build` + `next start`. When restarting, kill the old `next-server` process first:
  `pkill -f next-server`.

## Data

- `src/lib/db.ts` wraps one libSQL client. Local default: `data/health-maxxing.db`. Hosted: set
  `DATABASE_URL` and `DATABASE_AUTH_TOKEN`.
- Schema changes: append a new migration string to `MIGRATIONS` in `src/lib/db-schema.ts`. Never
  edit one that has shipped. Migrations run once per process, so restart the server after adding one.
- Raw SQL with `?` placeholders. Table and column names in dynamic SQL come only from trusted
  definitions (`src/lib/admin/collections.ts`), never from input.

## Content

- `content/` holds the launch library. `content/CONTENT_GUIDE.md` is the contract for voice,
  accuracy rules and file formats. `content/plan.json` lists planned pieces and valid link targets.
- Sync rules: a row edited in the admin panel (`edited = 1`) is never overwritten by its file. A
  row deleted in the panel is remembered in `deleted_seeds` and not recreated.
- **Fact-check status is an honesty mechanism.** Set `factCheck: verified` only when every figure
  and URL was confirmed against the source in a live search during the session. Otherwise leave it
  `pending`, follow the stricter "no live search" sourcing rules in the guide, and add the claims
  that most need checking to `content/FACT_CHECK_QUEUE.md`. When you verify a piece, remove its
  entry from the queue.
- Never invent a statistic, study, quote, expert, patient story or URL. Never write DOIs or PMIDs
  from memory.
- New stickers: draw the art in `src/components/stickers/art.tsx` first, then add the id to
  `content/stickers.json`.

## Admin panel

- Collections are described as data in `src/lib/admin/collections.ts`. The list page, the edit
  form, validation (`src/lib/admin/store.ts`) and the content API are generated from them: adding
  a field there is usually the whole change.
- Every admin page and every admin action calls `requireStaff()` or `requireAdmin()` itself. The
  layout does not protect pages.
- Actions redirect back with `?notice=` or `?error=`, or return a `FormState` for `useActionState`.
- Record changes with `logActivity()`.

## Autopilot and the Claude API

- Code is in `src/lib/autopilot/`. `claude.ts` holds the two API calls (web-search research, then
  a structured-output draft); `index.ts` holds the queue, validation and saving; `prompt.ts` holds
  the prompts, which mirror the content guide. Keep the two in step.
- Load the `claude-api` skill before changing `claude.ts`. The default model is `claude-opus-5-5`,
  and the selectable models are listed in `AUTOPILOT_MODELS` in `src/lib/settings.ts`.
- `npm run test:autopilot` runs the pipeline with canned answers. The live API calls have never
  been run in development (no key), so treat the first real run as a test.

## Design

- Sticker-sheet look: warm sand and white, charcoal ink, die-cut stickers with a white border and
  soft shadow, bento cards in bright tones, pill buttons, a dark footer.
- Tokens and component classes are in `src/app/globals.css`. Use `.tone-<color>` with
  `bg-tone-soft`, `text-tone-ink` and `bg-tone-solid` instead of hard-coded colours.
- Fonts: Figtree for text, Instrument Serif italic for accents (`.serif-accent`), Pixelify Sans for
  small labels (`.pixel-tag`, `.eyebrow`). All are self-hosted in `src/fonts/`.
- Use `<Sticker name>` for artwork. Do not add stock photos or emoji.
- Charts in the admin follow the `dataviz` skill: one series colour (`--viz-series`), text in ink
  tokens, a table view for every chart.
- Check phone widths with `node scripts/e2e/overflow.js`. In grids and flex rows, add `min-w-0` to
  children that hold long or truncated text.

## Motion

The site moves a little everywhere and it must never get in the way. Shared pieces:

| Where | What |
| --- | --- |
| `src/app/styles/motion/tokens.css` | Durations (`--dur-fast` to `--dur-slower`), curves (`--ease-enter`, `--ease-exit`, `--ease-move`, `--ease-pop`), distances, `--stagger` |
| `src/app/styles/motion/keyframes.css`, `utilities.css` | Shared keyframes and classes: `reveal`, `enter-*`, `motion-menu/dialog/fade/sheet`, `collapse-y`, `pressable`, `link-draw`, `skeleton` |
| `src/app/styles/motion/page-transitions.css` | How one page swaps for the next |
| `src/app/styles/motion/<area>.css` | Motion that belongs to one area (chrome, home, reading, explore, tools, forms, admin) |
| `src/components/motion/` | `PageTransition`, `Swap`, `usePresence`, `Collapse`, `CountUp`, `Spinner`, `MenuToggleIcon`, `useScrollLock`, `stagger`, `IntentPrefetch`, `RouteProgress` |

- **Every `page.tsx` wraps what it returns in `<PageTransition>`** (`variant="panel"` in the admin,
  `variant="skeleton"` or `"panel-skeleton"` around a loading placeholder). It must be in the page,
  not a layout, with nothing between a `<Suspense>` and it. A new page without it changes with no
  animation. Read the comment in `PageTransition.tsx`.
- **Each layout wraps its root element in `<LayoutTransition>`.** A page's own transition does not
  play when the layout around it appears or disappears in the same step (site to admin, signing
  in), so the layout fades instead.
- **A loading skeleton stays invisible for a quarter of a second** and is a full screen tall on the
  public site. Most pages arrive sooner, so visitors see one cross-fade, not page, skeleton, page.
- **Keep page transitions short.** While one runs the page cannot be clicked, and React waits for
  it before showing what loads next. They do not run on first load, back and forward, `refresh()`
  or a query-string change.
- **No `view-transition-name` and no `<ViewTransition name>`.** Two elements with one name on a page
  cancel the whole transition. The header and the admin bar are named in CSS only while a
  transition runs (`vt-site-header`, `vt-admin-bar`); a permanent name switches off the header blur.
- **Visible by default.** Nothing in the server-rendered page may need JavaScript or a finished
  animation to be seen. `reveal` (scroll) hides an element only once `RevealObserver` is holding it;
  `enter-*` classes are for decoration, never the main heading or body text.
- **Things that open also close with motion:** `usePresence(open)` plus a `motion-*` class and
  `data-state`. A closed layer is unmounted or `inert`; a closing one never blocks a click.
- **Reduced motion** is handled in CSS for every animation and transition. Motion driven from
  JavaScript must check `useReducedMotion()`.
- Use the tokens, animate `opacity`, `translate`, `scale` and `rotate` (height only through
  `Collapse`), keep feedback within about 300 ms, and put hover movement inside `@media (hover: hover)`.
- The admin panel is calmer than the public site: fades only.

## Writing for the interface

Plain, specific, friendly. Sentence case. Say what happened and what to do next in error messages.
Avoid health hype words (superfood, detox, miracle). American English.

## Before you finish

1. `npm run check`
2. For anything visible, build and test against production: `npm run build`, `npm start`, then the
   relevant `scripts/e2e` script. After touching pages, layouts or motion, run `scripts/e2e/motion.js`.
3. Commit with a clear message and push to the working branch. Do not open a pull request unless asked.
4. Report honestly: what was verified, what was not, and what is still pending.
