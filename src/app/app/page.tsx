import type { Metadata } from "next";
import Link from "next/link";
import { ResearchApp } from "@/components/research-app";
import { Logo } from "@/components/logo";
import { fixturesEnabled } from "@/mastra/config";

export const metadata: Metadata = {
  title: "Research Assistant — App",
  description:
    "Interview-driven form builder and cited web research, powered by two Mastra agents.",
};

/**
 * The app page (page 2 of the brief). Server component shell: a slim bar that
 * links back to the marketing page and anchors the shared brand, above the
 * interactive client flow. Every agent call still goes through the API routes.
 */
export default function AppPage() {
  // Read at render (build time for this static page). On the demo deploy this is
  // true, so visitors always see it's running on sample data.
  const demo = fixturesEnabled();

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-zinc-950">
      {demo && <DemoBanner />}
      <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3">
          <Link
            href="/"
            className="rounded-md transition-opacity hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 dark:focus-visible:ring-zinc-100/20"
            aria-label="Research Assistant — back to home"
          >
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Home
          </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <ResearchApp />
      </main>
    </div>
  );
}

/**
 * Honest label for the public demo: it replays a captured sample run so it costs
 * nothing and never breaks, whatever the traffic. Shown only when fixtures are on.
 */
function DemoBanner() {
  return (
    <div className="border-b border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/40">
      <p className="mx-auto w-full max-w-3xl px-6 py-2 text-center text-xs text-emerald-800 dark:text-emerald-200">
        <span className="font-medium">Demo mode</span> — this replays one captured
        sample run (no API key, no cost). Clone the repo to run it live on your own
        questions.
      </p>
    </div>
  );
}
