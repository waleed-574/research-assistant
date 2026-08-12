/**
 * The product mark, shared by the marketing page and the app so the two pages
 * read as one product (the brief asks for "consistent design across both
 * pages"). A rounded tile holding a small search glyph, plus the wordmark.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-900 dark:bg-zinc-100"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[18px] w-[18px] text-emerald-400 dark:text-emerald-600"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l4.5 4.5" />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Research Assistant
      </span>
    </span>
  );
}
