import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

/** GET /api/me — the signed-in user for the header menu, or null. */
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json(
    {
      user: user
        ? {
            name: user.name,
            handle: user.handle,
            role: user.role,
            sticker: user.sticker,
            color: user.color,
          }
        : null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
