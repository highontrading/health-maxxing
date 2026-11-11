import Link from "next/link";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

/** Heart sticker plus wordmark. `stacked` gives the two-line lockup. */
export function Logo({ className, stacked = false, inverse = false }: { className?: string; stacked?: boolean; inverse?: boolean }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2", className)} aria-label="Health Maxxing home">
      {/* The sticker's own transition (globals.css) gives the tilt and the springy growth; a press squeezes it quickly. */}
      <Sticker name="heart" size={stacked ? 46 : 36} rotate={-8} className="group-hover:rotate-6 group-hover:scale-110 group-active:scale-95 group-active:duration-(--dur-fast)" />
      <span
        className={cn(
          "font-semibold tracking-[-0.03em]",
          stacked ? "text-[1.6rem] leading-[0.92]" : "text-[1.1875rem] leading-none",
          inverse ? "text-paper" : "text-ink",
        )}
      >
        Health{stacked ? <br /> : " "}
        <span className="serif-accent text-[1.12em] font-normal">Maxxing</span>
      </span>
    </Link>
  );
}
