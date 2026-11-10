import { ogImage, OG_SIZE } from "@/lib/og";
import { SITE_TAGLINE } from "@/lib/site";

export const alt = "Health Maxxing";
export const size = OG_SIZE;
export const contentType = "image/png";

/** The default share image, used by every page that does not have its own. */
export default function Image() {
  return ogImage({ title: `${SITE_TAGLINE}.`, color: "lime" });
}
