import { connection } from "next/server";

/**
 * The current time for a server component. Waiting for the connection first
 * tells Next.js this value belongs to the request, so it is never frozen into
 * a prerendered page.
 */
export async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}
