"use client";

/** Header checkbox that ticks every row checkbox (name="ids") in the same form. */
export function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all rows on this page"
      className="size-4 accent-[var(--ink)]"
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((box) => {
          box.checked = e.currentTarget.checked;
        });
      }}
    />
  );
}
