import type { Metadata } from "next";
import Link from "next/link";
import { ResearchApp } from "@/components/research-app";
import { Logo } from "@/components/logo";

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
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
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
