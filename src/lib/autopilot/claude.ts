/**
 * The Claude API calls behind the autopilot.
 *
 * Two request shapes, both streamed (drafts are long, and streaming avoids HTTP
 * timeouts):
 * - research: free-text notes, with Anthropic's server-side web search tool;
 * - structured: a JSON object that matches a schema, with no tools.
 *
 * Both opt in to server-side refusal fallbacks. Health topics can trip a safety
 * classifier by accident, and with "default" the API retries the request on
 * the model's standard fallback instead of failing the draft.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

const FALLBACK_BETA = "server-side-fallback-2026-07-01";
/** A paused server-tool turn is resumed at most this many times. */
const MAX_CONTINUATIONS = 4;

export type Usage = { inputTokens: number; outputTokens: number; searches: number };

/** A failure the admin can read. `fatal` means retrying other topics is pointless. */
export class AutopilotError extends Error {
  constructor(
    message: string,
    public fatal = false,
  ) {
    super(message);
    this.name = "AutopilotError";
  }
}

export function autopilotConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let shared: Anthropic | undefined;
function client(): Anthropic {
  // Reads ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) from the environment.
  shared ??= new Anthropic();
  return shared;
}

function friendly(error: unknown): AutopilotError {
  if (error instanceof AutopilotError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new AutopilotError("Anthropic rejected the API key. Check ANTHROPIC_API_KEY.", true);
  if (error instanceof Anthropic.PermissionDeniedError) return new AutopilotError("This API key is not allowed to use that model or feature.", true);
  if (error instanceof Anthropic.NotFoundError) return new AutopilotError("The chosen Claude model is not available to this API key. Pick another under Autopilot settings.", true);
  if (error instanceof Anthropic.RateLimitError) return new AutopilotError("The Claude API is rate limiting this key. Try again in a few minutes.", true);
  if (error instanceof Anthropic.BadRequestError) return new AutopilotError(`The Claude API rejected the request: ${error.message}`);
  if (error instanceof Anthropic.APIConnectionError) return new AutopilotError("Could not reach the Claude API. Check the server's network access.", true);
  if (error instanceof Anthropic.APIError) return new AutopilotError(`The Claude API returned an error (${error.status ?? "unknown status"}). Try again later.`);
  return new AutopilotError(error instanceof Error ? error.message : "Unknown error");
}

function addUsage(total: Usage, usage: Anthropic.Beta.BetaUsage): void {
  total.inputTokens += usage.input_tokens + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
  total.outputTokens += usage.output_tokens;
  total.searches += usage.server_tool_use?.web_search_requests ?? 0;
}

function checkStop(message: Anthropic.Beta.BetaMessage): void {
  if (message.stop_reason === "refusal") {
    const category = message.stop_details?.category;
    throw new AutopilotError(`Claude declined to write this${category ? ` (safety category: ${category})` : ""}. Rephrase the topic or remove it.`);
  }
  if (message.stop_reason === "max_tokens") throw new AutopilotError("The response was cut off before it finished. Try again.");
}

const cachedSystem = (text: string): Anthropic.Beta.BetaTextBlockParam[] => [{ type: "text", text, cache_control: { type: "ephemeral" } }];

export type Research = { notes: string; urls: string[]; usage: Usage };

/** Step 1: look the topic up with web search and return notes plus every URL the search showed. */
export async function research(model: string, prompt: string): Promise<Research> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0, searches: 0 };
  const urls = new Set<string>();
  // The dynamic-filtering search tool needs a Sonnet-class model or better; Haiku takes the basic one.
  const tools: Anthropic.Beta.BetaToolUnion[] = [
    model.includes("haiku") ? { type: "web_search_20250305", name: "web_search", max_uses: 8 } : { type: "web_search_20260209", name: "web_search", max_uses: 8 },
  ];
  const question: Anthropic.Beta.BetaMessageParam = { role: "user", content: prompt };
  let messages: Anthropic.Beta.BetaMessageParam[] = [question];
  // Everything the assistant has produced in this turn so far, across pauses.
  const turnSoFar: Anthropic.Beta.BetaContentBlock[] = [];
  const parts: string[] = [];

  try {
    for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
      const message = await client()
        .beta.messages.stream({
          model,
          max_tokens: 16000,
          betas: [FALLBACK_BETA],
          fallbacks: "default",
          output_config: { effort: "medium" },
          tools,
          messages,
        })
        .finalMessage();
      addUsage(usage, message.usage);
      checkStop(message);
      for (const block of message.content) {
        if (block.type === "text") parts.push(block.text);
        // A failed search carries an error object instead of a list of results.
        else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
          for (const result of block.content) urls.add(result.url);
        }
      }
      if (message.stop_reason !== "pause_turn") break;
      // The server paused a long tool loop. Send the partial turn back, unchanged,
      // and it resumes where it stopped (no "continue" message is needed).
      turnSoFar.push(...message.content);
      messages = [question, { role: "assistant", content: turnSoFar }];
    }
  } catch (error) {
    throw friendly(error);
  }
  const notes = parts.join("").trim();
  if (notes.length < 200) throw new AutopilotError("The research step returned almost nothing.");
  return { notes, urls: [...urls], usage };
}

/** Step 2 (and topic suggestions): one request whose answer is JSON matching `schema`. */
export async function structured<Schema extends z.ZodType>(input: {
  model: string;
  system: string;
  prompt: string;
  schema: Schema;
  effort: "medium" | "high";
}): Promise<{ value: z.infer<Schema>; servedBy: string; usage: Usage }> {
  const usage: Usage = { inputTokens: 0, outputTokens: 0, searches: 0 };
  try {
    const message = await client()
      .beta.messages.stream({
        model: input.model,
        max_tokens: 64000,
        betas: [FALLBACK_BETA],
        fallbacks: "default",
        // Thinking is adaptive by default on the supported models; effort sets its depth.
        output_config: { effort: input.effort, format: betaZodOutputFormat(input.schema) },
        system: cachedSystem(input.system),
        messages: [{ role: "user", content: input.prompt }],
      })
      .finalMessage();
    addUsage(usage, message.usage);
    checkStop(message);
    if (message.parsed_output == null) throw new AutopilotError("Claude's answer did not match the expected format. Try again.");
    return { value: message.parsed_output as z.infer<Schema>, servedBy: message.model, usage };
  } catch (error) {
    throw friendly(error);
  }
}
