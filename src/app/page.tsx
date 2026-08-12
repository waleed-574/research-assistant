import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Research Assistant — cited web research, guided by the right questions",
  description:
    "A conversational agent interviews you, builds a form tailored to your goal, then runs a live web-research loop and returns a report you can trace to its sources — aware of your region, market, and currency.",
};

/**
 * Marketing landing page (page 1 of the brief). A single-scroll page that sells
 * the tool. Server component — fully static, no client JS. Shares the Logo, the
 * Geist sans/mono pairing, the zinc palette, and the emerald accent with the app
 * so the two pages read as one product.
 */
export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <SiteNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <LocationHighlight />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────────────── Nav ─────────────────────────────── */

function SiteNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4"
      >
        <Logo />
        <div className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            How it works
          </a>
          <a
            href="#features"
            className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 sm:block dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Features
          </a>
          <Link
            href="/app"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Launch app
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ────────────────────────────── Hero ─────────────────────────────── */

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
      {/* Soft accent glow, kept subtle and theme-aware. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-4xl rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/10"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-32">
        <div className="flex flex-col items-start">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Two agents · one research flow
          </span>
          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl dark:text-zinc-50">
            From a vague question to a{" "}
            <span className="text-emerald-600 dark:text-emerald-400">
              cited answer
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            A conversational agent interviews you, builds a form tailored to your
            goal, then runs a live web-research loop and hands back a report you
            can trace to its sources — aware of where you are, in your market and
            currency.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Launch the app
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-zinc-400 dark:text-zinc-500">
            No sign-up. Bring an Anthropic key.
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

/**
 * A static, on-brand snapshot of the product — chat turns into a form turns into
 * a cited report. Built from markup, not an image, so it stays crisp and
 * theme-aware.
 */
function HeroPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/20">
        {/* window chrome */}
        <div className="flex items-center gap-1.5 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="ml-3 font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
            /app
          </span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* chat */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-zinc-100 px-3 py-2 text-xs leading-5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
              What decision are you trying to make?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-zinc-900 px-3 py-2 text-xs leading-5 text-white dark:bg-zinc-100 dark:text-zinc-900">
              Pick a payment processor for my startup.
            </div>
          </div>

          {/* generated form field */}
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Monthly volume
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                conditional
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["< €10k", "€10k–100k", "> €100k"].map((v, i) => (
                <span
                  key={v}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    i === 1
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* report snippet */}
          <div className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-[11px] leading-5 text-zinc-600 dark:text-zinc-400">
              SEPA Direct Debit keeps fees low for EU-based volume, with Stripe
              and Mollie the leading local options
              <sup className="ml-0.5 font-mono text-emerald-600 dark:text-emerald-400">
                [3]
              </sup>
              .
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                12 sources · 8 steps
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── How it works ─────────────────────────── */

const STEPS = [
  {
    title: "Interview",
    body: "The form builder interviews you about your goal — one focused question at a time, never a wall of fields.",
  },
  {
    title: "Build & confirm",
    body: "It designs a conditional form, with follow-up fields that appear based on your answers. Review it, or ask for edits in chat.",
  },
  {
    title: "Research",
    body: "The research agent plans queries, searches the web, reflects on what it found, and chains follow-ups until the evidence is enough.",
  },
  {
    title: "Report",
    body: "You get a structured, cited report — every claim traceable to a page the agent actually retrieved, in your region's terms.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black"
    >
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps, one continuous flow"
          subtitle="A state machine moves you from conversation to a finished report, and lets you step back at any point."
        />
        <ol className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-zinc-200 font-mono text-sm text-emerald-600 dark:border-zinc-800 dark:text-emerald-400">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-gradient-to-r from-zinc-300 to-transparent dark:from-zinc-700"
                  />
                )}
              </div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ──────────────────────────── Features ───────────────────────────── */

const FEATURES = [
  {
    title: "Location-aware",
    body: "Detects your region and factors in local regulations, providers, and currency — without being asked. Correct it any time.",
    icon: (
      <>
        <circle cx="12" cy="10" r="3" />
        <path d="M12 21s-6-5.686-6-11a6 6 0 0 1 12 0c0 5.314-6 11-6 11Z" />
      </>
    ),
  },
  {
    title: "Conditional forms",
    body: "Follow-up questions appear only when they're relevant, modeled as a traversable graph of fields.",
    icon: (
      <>
        <path d="M9 3H5a2 2 0 0 0-2 2v4" />
        <path d="M15 3h4a2 2 0 0 1 2 2v4" />
        <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
        <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
        <circle cx="12" cy="12" r="2" />
      </>
    ),
  },
  {
    title: "Agentic research loop",
    body: "Plan → search → reflect → chain, with retries on failure and clear conditions for when to stop.",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <path d="M21 3v6h-6" />
      </>
    ),
  },
  {
    title: "Cited sources",
    body: "Every section links to the pages the agent actually retrieved. No invented URLs, and unresolved citations are flagged.",
    icon: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </>
    ),
  },
  {
    title: "Live progress",
    body: "Watch each query as it runs. The research is legible in real time — the loop, not a spinner.",
    icon: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
  },
  {
    title: "Typed & validated",
    body: "Zod schemas guarantee well-formed forms and reports across the agent/UI boundary, end to end.",
    icon: (
      <>
        <path d="M20 6 9 17l-5-5" />
      </>
    ),
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Features"
          title="Built to be trusted, not just fast"
          subtitle="Every part of the pipeline is designed so you can see — and verify — how an answer was reached."
        />
        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-200 sm:grid-cols-2 lg:grid-cols-3 dark:border-zinc-800 dark:bg-zinc-800">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col bg-white p-8 dark:bg-zinc-950"
            >
              <span className="mb-5 grid h-10 w-10 place-items-center rounded-lg bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-5 w-5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {feature.icon}
                </svg>
              </span>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── Location differentiator ──────────────────── */

function LocationHighlight() {
  return (
    <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Dynamic context
          </span>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            Aware of where you are.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600 dark:text-zinc-300">
            Ask for the best payment processors for your startup from Berlin, and
            the agent factors in EU regulations, SEPA, and local providers — priced
            in euros. Ask the same thing from Karachi, and it adapts. Your location
            flows into the agent as request context, and you can correct it at any
            time.
          </p>
        </div>

        {/* two location chips showing the same question, different context */}
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              place: "Berlin, DE",
              currency: "EUR",
              notes: ["EU / GDPR", "SEPA Direct Debit", "Stripe, Mollie"],
            },
            {
              place: "Karachi, PK",
              currency: "PKR",
              notes: ["SBP regulations", "IBFT / Raast", "Easypaisa, JazzCash"],
            },
          ].map((ctx) => (
            <div
              key={ctx.place}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {ctx.place}
                </span>
                <span className="font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                  {ctx.currency}
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {ctx.notes.map((note) => (
                  <li
                    key={note}
                    className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
                  >
                    <span className="h-1 w-1 rounded-full bg-emerald-500" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Final CTA ─────────────────────────── */

function FinalCta() {
  return (
    <section className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Ready to research smarter?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Start a conversation, and let the agents turn it into a cited answer.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Launch the app
          <span aria-hidden>→</span>
        </Link>
      </div>
    </section>
  );
}

/* ───────────────────────────── Footer ────────────────────────────── */

function SiteFooter() {
  return (
    <footer className="bg-white dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <Logo />
        <p className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
          Built with Next.js + Mastra · © 2026
        </p>
      </div>
    </footer>
  );
}

/* ──────────────────────────── Shared bits ────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="max-w-2xl">
      <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
        {subtitle}
      </p>
    </div>
  );
}
