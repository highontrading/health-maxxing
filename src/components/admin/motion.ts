"use client";

import { useState } from "react";

/** How long a <Collapse> takes to fold shut (--dur-slow) plus a moment. What it held can be removed after this. */
export const FOLD_MS = 340;

/**
 * Counts the answers a form action has given. Used as the `key` of a result
 * message, so the message arrives again (with its fade) for every new answer,
 * even when the wording is the same as last time.
 */
export function useAnswerCount(state: unknown): number {
  const [seen, setSeen] = useState(state);
  const [count, setCount] = useState(0);
  // Adjusted while rendering, not in an effect.
  if (seen !== state) {
    setSeen(state);
    setCount(count + 1);
  }
  return count;
}
