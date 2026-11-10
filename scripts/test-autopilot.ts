/**
 * Integration test for the autopilot's queue, validation and saving, with the
 * two Claude calls replaced by canned answers (no API key, no network).
 *
 *   npm run test:autopilot
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BODY = `Cold water is having a moment. Here is what the evidence says.[^1]

## What happens in cold water

Your heart rate and breathing jump in the first minute.[^2] This is the cold shock response.

> [!WARNING]
> Never swim alone in cold water.

## What the studies found

A small trial found mood improved after a swim.[^3] Larger trials are missing.[^4] See also [how much exercise you need](/articles/how-much-exercise-do-you-need).

## The bottom line

It is safe for most healthy adults who build up slowly, and the mood lift is plausible but unproven.
`;

const draft = {
  title: "Cold-Water Swimming: What the Evidence Actually Shows",
  dek: "It feels incredible, and the claims are bigger than the trials behind them. A calm look at the benefits and the risks.",
  summary: "What cold-water swimming does to your body, what studies support, and how to start safely.",
  category: "fitness",
  kind: "explainer",
  sticker: "not-a-real-sticker",
  tags: ["Cold water", "swimming", "recovery"],
  takeaways: ["Cold shock peaks in the first minute.", "Evidence for mood benefits is early.", "Build up slowly and never swim alone."],
  faqs: [
    { q: "Is cold-water swimming safe?", a: "For most healthy adults, yes, if you enter slowly and do not swim alone." },
    { q: "How cold is cold water?", a: "Below about 15 °C (59 °F) is usually counted as cold." },
  ],
  sources: [
    { title: "Cold water immersion: kill or cure?", publisher: "Experimental Physiology", url: "https://seen.example.org/kill-or-cure", year: 2017 },
    { title: "Cold shock response", publisher: "RNLI", url: "https://seen.example.org/cold-shock/", year: 0 },
    { title: "Mood after swimming", publisher: "Journal of Something", url: "https://unseen.example.org/mood", year: 2020 },
    { title: "A source with a bad link", publisher: "Nobody", url: "not-a-url", year: 2021 },
  ],
  body: BODY,
  editor_notes: "The mood trial was small; check its sample size.",
};

async function main() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hm-autopilot-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  process.env.ANTHROPIC_API_KEY = "test-key-never-sent";

  const { run, queryOne } = await import("../src/lib/db");
  const { addTopic, listTopics, runAutopilot } = await import("../src/lib/autopilot");
  const { AutopilotError } = await import("../src/lib/autopilot/claude");
  type Engine = import("../src/lib/autopilot").Engine;

  await run("INSERT INTO categories (slug, name, description, sticker, color) VALUES ('fitness', 'Fitness', 'Moving your body.', 'dumbbell', 'orange')");

  const calls: string[] = [];
  const usage = { inputTokens: 1000, outputTokens: 500, searches: 0 };
  const engine: Engine = {
    research: async (_model, prompt) => {
      calls.push("research");
      assert.match(prompt, /cold-water swimming/i);
      return { notes: "KEY FACTS\n...", urls: ["https://seen.example.org/kill-or-cure", "https://seen.example.org/cold-shock"], usage: { ...usage, searches: 3 } };
    },
    structured: (async (input: { prompt: string; system: string }) => {
      calls.push("structured");
      assert.match(input.prompt, /<research>/, "the draft prompt carries the research notes");
      assert.match(input.system, /fitness: Fitness/, "the system prompt lists the site's topics");
      return { value: draft, servedBy: "test-model", usage };
    }) as unknown as Engine["structured"],
  };

  // 1. A queued topic becomes a hidden draft, pending a fact check.
  const added = await addTopic({ topic: "Is cold-water swimming actually good for you?", category: "fitness" }, "tester");
  assert.equal(added.ok, true);
  const first = await runAutopilot({ engine });
  assert.equal(first.drafted, 1, first.messages.join(" "));
  assert.deepEqual(calls, ["research", "structured"]);

  const article = await queryOne<Record<string, unknown>>("SELECT * FROM articles WHERE id = ?", [first.articleIds[0]]);
  assert.ok(article);
  assert.equal(article.status, "draft");
  assert.equal(article.origin, "autopilot");
  assert.equal(article.fact_check, "pending");
  assert.equal(article.slug, "cold-water-swimming-what-the-evidence-actually-shows");
  assert.equal(article.sticker, "dumbbell", "an unknown sticker falls back to the topic's sticker");
  assert.deepEqual(JSON.parse(String(article.tags)), ["cold water", "swimming", "recovery"]);
  assert.equal(JSON.parse(String(article.sources)).length, 3, "the source without a usable link is dropped");
  assert.ok(Number(article.word_count) > 50);

  const topic = (await listTopics()).find((t) => t.id === (added as { id: number }).id)!;
  assert.equal(topic.status, "done");
  assert.equal(topic.report?.researched, true);
  assert.equal(topic.report?.searches, 3);
  const warnings = topic.report!.warnings.join("\n");
  assert.match(warnings, /unseen\.example\.org\/mood/, "a source the search never showed is flagged");
  assert.doesNotMatch(warnings, /seen\.example\.org\/cold-shock/, "a trailing slash does not make a seen URL look unseen");
  assert.match(warnings, /no usable link/);
  assert.match(warnings, /house range/, "a short body is flagged");
  assert.equal(topic.report?.editorNotes, draft.editor_notes);

  // 2. The same headline again gets a new URL name instead of failing.
  await addTopic({ topic: "Cold-water swimming, second look for the test" }, "tester");
  const second = await runAutopilot({ engine });
  assert.equal(second.drafted, 1, second.messages.join(" "));
  const dupe = await queryOne<{ slug: string }>("SELECT slug FROM articles WHERE id = ?", [second.articleIds[0]]);
  assert.equal(dupe?.slug, "cold-water-swimming-what-the-evidence-actually-shows-2");

  // 3. If research fails, the draft is still written, from the stricter no-search rules.
  await addTopic({ topic: "A topic whose research step breaks down" }, "tester");
  const third = await runAutopilot({
    engine: {
      research: async () => {
        throw new AutopilotError("search unavailable");
      },
      structured: (async (input: { prompt: string }) => {
        assert.match(input.prompt, /No research notes are attached/);
        return { value: { ...draft, title: "A Different Headline For The Third Draft Here" }, servedBy: "test-model", usage };
      }) as unknown as Engine["structured"],
    },
  });
  assert.equal(third.drafted, 1, third.messages.join(" "));
  const thirdTopic = (await listTopics()).find((t) => t.topic.startsWith("A topic whose research"))!;
  assert.equal(thirdTopic.report?.researched, false);
  assert.match(thirdTopic.report!.warnings.join("\n"), /research step failed/i);

  // 4. A rejected API key marks the topic failed and stops the run.
  await addTopic({ topic: "This one fails because the key is rejected" }, "tester");
  await addTopic({ topic: "This one must stay queued after the failure" }, "tester");
  const fourth = await runAutopilot({
    max: 2,
    engine: {
      research: async () => {
        throw new AutopilotError("Anthropic rejected the API key.", true);
      },
      structured: engine.structured,
    },
  });
  assert.equal(fourth.failed, 1);
  assert.equal(fourth.drafted, 0);
  const after = await listTopics();
  assert.equal(after.find((t) => t.topic.startsWith("This one fails"))?.status, "failed");
  assert.equal(after.find((t) => t.topic.startsWith("This one must stay"))?.status, "queued");

  // 5. Without an API key nothing is attempted.
  delete process.env.ANTHROPIC_API_KEY;
  const fifth = await runAutopilot({ engine });
  assert.equal(fifth.drafted, 0);
  assert.match(fifth.messages.join(" "), /ANTHROPIC_API_KEY/);

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("autopilot queue, validation and saving: ok");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
