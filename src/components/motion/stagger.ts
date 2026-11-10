import type { CSSProperties } from "react";

/**
 * The position of an item among siblings that arrive one after another:
 * `<li className="reveal" style={stagger(i)}>` or `className="enter-pop"`.
 * Each step waits one `--stagger` longer. Keep the last step small (cap long
 * lists with `stagger(Math.min(i, 6))`), so nothing arrives late.
 */
export function stagger(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
