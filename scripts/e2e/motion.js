// Page-transition checks. Every kind of page must change with the right animation, quickly, with nothing
// left hidden, and must swap at once under reduced motion.
//   node scripts/e2e/motion.js
// Run it against a production build (npm run build, npm start): hover prefetching only exists there.
const { chromium } = require("playwright");
const { BASE, adminCredentials } = require("./lib");

/** Index pages, each followed by the first detail page it links to. */
const SECTIONS = ["/conditions", "/articles", "/topics", "/tools", "/exercises", "/foods", "/body", "/newsletter"];
const STATIC = ["/myths", "/glossary", "/about", "/contact", "/stickers", "/saved", "/search?q=protein", "/community", "/login", "/signup", "/forgot-password", "/"];
const ADMIN = ["/admin/c/articles", "/admin/c/articles/new", "/admin/community", "/admin/users", "/admin/subscribers", "/admin/messages", "/admin/media", "/admin/autopilot", "/admin/api", "/admin/settings", "/admin/activity", "/admin/account", "/admin/guide", "/admin"];

const PUBLIC_ENTER = ["page-rise", "page-from-right", "page-from-left"];
const failures = [];
const browserErrors = [];

/** Records every view transition the page starts: how long it ran and which keyframes played. */
const instrument = () => {
  window.__vt = [];
  const start = Document.prototype.startViewTransition;
  if (!start) return;
  Document.prototype.startViewTransition = function (arg) {
    const rec = { start: performance.now(), names: [], longest: 0, error: null };
    window.__vt.push(rec);
    const transition = start.call(this, arg);
    transition.ready
      .then(() => {
        const running = document.getAnimations().filter((a) => a.effect && a.effect.pseudoElement && a.effect.pseudoElement.startsWith("::view-transition"));
        rec.names = [...new Set(running.map((a) => a.animationName).filter(Boolean))];
        rec.longest = Math.max(0, ...running.map((a) => (a.effect.getTiming().delay || 0) + (Number(a.effect.getTiming().duration) || 0)));
      })
      .catch((error) => { rec.error = String(error); });
    transition.finished.then(() => { rec.end = performance.now(); }).catch((error) => { rec.error = rec.error || String(error); });
    return transition;
  };
};

/** Waits until no transition is running and none has started for a moment. */
async function settled(page) {
  let quiet = 0;
  for (let i = 0; i < 100 && quiet < 4; i++) {
    await page.waitForTimeout(90);
    const busy = await page.evaluate(() => window.__vt.some((r) => r.end === undefined && !r.error));
    quiet = busy ? 0 : quiet + 1;
  }
}

/** What the visitor is left looking at. The previous page stays in the DOM, hidden, so only rendered elements count. */
const inspect = (page) =>
  page.evaluate(() => {
    const rendered = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0; };
    const names = {};
    for (const el of document.querySelectorAll("*")) {
      if (!rendered(el)) continue;
      const name = getComputedStyle(el).viewTransitionName;
      if (name && name !== "none" && name !== "root") names[name] = (names[name] || 0) + 1;
    }
    const h1 = [...document.querySelectorAll("h1")].find(rendered);
    return {
      hiddenReveals: [...document.querySelectorAll(".reveal")].filter((el) => onScreen(el) && getComputedStyle(el).opacity === "0").length,
      duplicateNames: Object.entries(names).filter(([, n]) => n > 1).map(([name]) => name),
      heading: h1 ? h1.textContent.trim().slice(0, 50) : null,
      placeholders: [...document.querySelectorAll('[aria-busy="true"]')].filter(rendered).length,
      scrollY: Math.round(scrollY),
    };
  });

function report(ok, label, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  — " + detail : ""}`);
  if (!ok) failures.push(label);
}

/** Follows `path` the way a link does and checks the page change. */
async function visit(page, path, { enter, maxAnimation }) {
  await page.evaluate(() => { window.__vt = []; });
  await page.evaluate((to) => window.next.router.push(to), path);
  await page.waitForFunction((to) => location.pathname + location.search === to, path, { timeout: 20000 });
  await settled(page);
  const transitions = await page.evaluate(() => window.__vt.map((r) => ({ ms: Math.round((r.end || r.start) - r.start), longest: Math.round(r.longest), names: r.names, error: r.error })));
  const seen = await inspect(page);
  const names = transitions.flatMap((t) => t.names);
  const problems = [];
  if (transitions.length === 0) problems.push("no transition");
  if (transitions.length > 2) problems.push(`${transitions.length} transitions in a row`);
  for (const t of transitions) if (t.error) problems.push(`transition failed: ${t.error}`);
  if (transitions.length && !names.some((n) => enter.includes(n))) problems.push(`no enter animation (saw ${names.join(", ") || "none"})`);
  if (Math.max(0, ...transitions.map((t) => t.longest)) > maxAnimation) problems.push(`an animation runs longer than ${maxAnimation} ms`);
  if (seen.hiddenReveals) problems.push(`${seen.hiddenReveals} reveal element(s) hidden on screen`);
  if (seen.duplicateNames.length) problems.push(`duplicate view-transition-name: ${seen.duplicateNames.join(", ")}`);
  if (!seen.heading) problems.push("no visible h1");
  if (seen.placeholders) problems.push("a loading placeholder is still showing");
  if (seen.scrollY !== 0) problems.push(`scrolled to ${seen.scrollY}, expected the top`);
  report(problems.length === 0, path, problems.length ? problems.join("; ") : `${transitions.length} transition(s), ${transitions.map((t) => t.ms + " ms").join(" + ")}`);
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.addInitScript(instrument);
  page.on("pageerror", (error) => browserErrors.push(`page error: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && !/favicon|Failed to load resource/.test(message.text())) browserErrors.push(`console: ${message.text().slice(0, 200)}`);
  });

  await page.goto(BASE + "/", { waitUntil: "load" });
  await page.waitForTimeout(800);
  if (!(await page.evaluate(() => "startViewTransition" in document))) throw new Error("This browser has no View Transitions API.");
  const development = await page.evaluate(() => Boolean(document.querySelector("nextjs-portal")));

  console.log("Public pages");
  // Start scrolled, so the first page change also proves that navigation jumps to the top.
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: "instant" }));
  const publicRules = { enter: PUBLIC_ENTER, maxAnimation: 320 };
  for (const section of SECTIONS) {
    await visit(page, section, publicRules);
    const detail = await page.evaluate((prefix) => {
      const links = [...document.querySelectorAll(`main a[href^="${prefix}/"]`)].filter((a) => a.getBoundingClientRect().width > 0);
      const link = links.find((a) => !/\/(unsubscribe|new)$/.test(a.getAttribute("href")));
      return link ? link.getAttribute("href") : null;
    }, section);
    if (detail) await visit(page, detail, publicRules);
    else report(false, `${section}/…`, "no link to a detail page found");
  }
  for (const path of STATIC) await visit(page, path, publicRules);

  console.log("\nBack and forward");
  await page.evaluate(() => { window.__vt = []; });
  await page.goBack();
  await page.waitForTimeout(700);
  const back = await page.evaluate(() => ({ count: window.__vt.length, path: location.pathname }));
  report(back.count === 0, `back to ${back.path} restores the page without a transition`, back.count ? `${back.count} transition(s) ran` : "");

  console.log("\nHover, then click");
  if (development) {
    console.log("SKIP  hover prefetch: links are only prefetched in a production build");
  } else {
    await page.goto(BASE + "/articles", { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const card = page.locator('main a[href^="/articles/"]').nth(5);
    const href = await card.getAttribute("href");
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(600);
    await page.evaluate(() => { window.__vt = []; });
    await card.click();
    await page.waitForURL("**" + href);
    await settled(page);
    const steps = await page.evaluate(() => window.__vt.length);
    report(steps === 1, `${href} opens in one step after a hover`, steps === 1 ? "" : `${steps} transitions: the page was not prefetched`);
  }

  console.log("\nAdmin panel");
  const { email, password } = adminCredentials();
  await page.goto(BASE + "/admin/login", { waitUntil: "load" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin");
  await page.waitForTimeout(800);
  for (const path of ADMIN) await visit(page, path, { enter: ["fade-in"], maxAnimation: 260 });
  await context.close();

  console.log("\nReduced motion");
  const calm = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const still = await calm.newPage();
  await still.addInitScript(instrument);
  await still.goto(BASE + "/", { waitUntil: "load" });
  await still.waitForTimeout(800);
  for (const path of ["/conditions", "/tools", "/"]) {
    await still.evaluate(() => { window.__vt = []; });
    await still.evaluate((to) => window.next.router.push(to), path);
    await still.waitForFunction((to) => location.pathname === to, path);
    await settled(still);
    const longest = await still.evaluate(() => Math.max(0, ...window.__vt.map((r) => r.longest || 0)));
    const hidden = await still.evaluate(() => [...document.querySelectorAll(".reveal")].filter((el) => el.getBoundingClientRect().width > 0 && getComputedStyle(el).opacity === "0").length);
    report(longest <= 1 && hidden === 0, `${path} swaps at once`, longest > 1 ? `an animation ran for ${longest} ms` : hidden ? `${hidden} element(s) hidden` : "");
  }
  await calm.close();
  await browser.close();

  if (browserErrors.length) {
    console.log("\nBrowser errors:");
    for (const error of [...new Set(browserErrors)].slice(0, 10)) console.log("  " + error);
  }
  console.log(failures.length || browserErrors.length ? `\n${failures.length} check(s) failed, ${browserErrors.length} browser error(s)` : "\nall checks passed");
  process.exit(failures.length || browserErrors.length ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
