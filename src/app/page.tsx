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
 * the tool. Server component — fully static, no client JS. Dark-first with an
 * emerald glow aesthetic; a Playfair serif pairs with Geist for the headings.
 */
export default function MarketingPage() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-50">
      <SiteNav />
      <main>
        <Hero />
        <Highlights />
        <HowItWorks />
        <Features />
        <LocationHighlight />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

/* ─────────────────────── Reusable glow blob ──────────────────────── */

function Glow({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full bg-emerald-500/20 blur-[100px] ${className ?? ""}`}
    />
  );
}

/* ─────────────────────────────── Nav ─────────────────────────────── */

function SiteNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/70 backdrop-blur-xl">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4"
      >
        <Logo />
        <div className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 sm:block"
          >
            How it works
          </a>
          <a
            href="#features"
            className="hidden text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100 sm:block"
          >
            Features
          </a>
          <Link
            href="/app"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400"
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
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      <Glow className="-top-40 left-1/2 h-[420px] w-[720px] -translate-x-1/2 opacity-70 [animation:glowPulse_7s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)]" />

      <div className="relative mx-auto grid w-full max-w-6xl gap-16 px-6 py-24 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:py-32">
        <div className="flex flex-col items-start">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-zinc-400 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
            Two agents · one research flow
          </span>
          <h1 className="font-serif text-5xl font-medium leading-[1.05] tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl">
            From a vague question to a{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              cited answer
            </span>
            .
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-400">
            A conversational agent interviews you, builds a form tailored to your
            goal, then runs a live web-research loop and hands back a report you
            can trace to its sources — aware of where you are, in your market and
            currency.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/app"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-medium text-zinc-950 shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)] transition-colors hover:bg-emerald-400"
            >
              Launch the app
              <span aria-hidden>→</span>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 px-6 py-3 text-sm font-medium text-zinc-200 backdrop-blur transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              See how it works
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-zinc-500">
            No sign-up. Bring an Anthropic key.
          </p>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-3xl bg-emerald-500/10 blur-2xl" aria-hidden />
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-emerald-500/10 backdrop-blur">
        <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="ml-3 font-mono text-[11px] text-zinc-500">/app</span>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-zinc-800 px-3 py-2 text-xs leading-5 text-zinc-200">
              What decision are you trying to make?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl bg-emerald-500 px-3 py-2 text-xs leading-5 text-zinc-950">
              Pick a payment processor for my startup.
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">
                Monthly volume
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wide text-emerald-400">
                conditional
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["< €10k", "€10k–100k", "> €100k"].map((v, i) => (
                <span
                  key={v}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    i === 1
                      ? "bg-emerald-500 text-zinc-950"
                      : "border border-zinc-700 text-zinc-400"
                  }`}
                >
                  {v}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
            <p className="text-[11px] leading-5 text-zinc-400">
              SEPA Direct Debit keeps fees low for EU-based volume, with Stripe
              and Mollie the leading local options
              <sup className="ml-0.5 font-mono text-emerald-400">[3]</sup>.
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_6px_1px_rgba(52,211,153,0.7)]" />
              <span className="font-mono text-[10px] text-zinc-500">
                12 sources · 8 steps
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Highlights (honest) ─────────────────────── */

const HIGHLIGHTS = [
  { stat: "2", label: "cooperating agents", sub: "form builder + researcher" },
  { stat: "5", label: "explicit states", sub: "interview → cited report" },
  { stat: "100%", label: "traceable claims", sub: "no invented sources" },
  { stat: "Local", label: "by default", sub: "your region, currency, rules" },
];

function Highlights() {
  return (
    <section className="border-b border-zinc-800/70">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-800 lg:grid-cols-4 lg:my-0 my-0">
        {HIGHLIGHTS.map((h) => (
          <div key={h.label} className="bg-zinc-950 p-6 text-center sm:p-8">
            <div className="font-serif text-4xl font-medium text-emerald-400">
              {h.stat}
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-200">{h.label}</div>
            <div className="mt-0.5 text-xs text-zinc-500">{h.sub}</div>
          </div>
        ))}
      </div>
    </section>
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
    <section id="how-it-works" className="scroll-mt-20 border-b border-zinc-800/70">
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
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 font-mono text-sm text-emerald-400 shadow-[0_0_20px_-6px_rgba(16,185,129,0.6)]">
                  {i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-gradient-to-r from-zinc-700 to-transparent"
                  />
                )}
              </div>
              <h3 className="text-base font-semibold text-zinc-100">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{step.body}</p>
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
    icon: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  },
  {
    title: "Typed & validated",
    body: "Zod schemas guarantee well-formed forms and reports across the agent/UI boundary, end to end.",
    icon: <path d="M20 6 9 17l-5-5" />,
  },
];

function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-b border-zinc-800/70">
      <div className="mx-auto w-full max-w-6xl px-6 py-24">
        <SectionHeading
          eyebrow="Features"
          title="Built to be trusted, not just fast"
          subtitle="Every part of the pipeline is designed so you can see — and verify — how an answer was reached."
        />
        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 transition-colors hover:border-emerald-500/40"
            >
              <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 shadow-[0_0_24px_-8px_rgba(16,185,129,0.6)]">
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
              <h3 className="text-base font-semibold text-zinc-100">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{feature.body}</p>
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
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      <Glow className="bottom-0 right-0 h-80 w-80 opacity-40" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
            Dynamic context
          </span>
          <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight text-zinc-50 sm:text-5xl">
            Aware of where you are.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
            Ask for the best payment processors for your startup from Berlin, and
            the agent factors in EU regulations, SEPA, and local providers — priced
            in euros. Ask the same thing from Karachi, and it adapts. Your location
            flows into the agent as request context, and you can correct it at any
            time.
          </p>
        </div>

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
              className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-100">
                  {ctx.place}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  {ctx.currency}
                </span>
              </div>
              <ul className="mt-4 flex flex-col gap-2">
                {ctx.notes.map((note) => (
                  <li
                    key={note}
                    className="flex items-center gap-2 text-xs text-zinc-400"
                  >
                    <span className="h-1 w-1 rounded-full bg-emerald-400" />
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
    <section className="relative overflow-hidden border-b border-zinc-800/70">
      <Glow className="left-1/2 top-1/2 h-72 w-[560px] -translate-x-1/2 -translate-y-1/2 opacity-50" />
      <div className="relative mx-auto w-full max-w-3xl px-6 py-28 text-center">
        <h2 className="font-serif text-4xl font-medium tracking-tight text-zinc-50 sm:text-5xl">
          Ready to research smarter?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-zinc-400">
          Start a conversation, and let the agents turn it into a cited answer.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-medium text-zinc-950 shadow-[0_0_40px_-8px_rgba(16,185,129,0.6)] transition-colors hover:bg-emerald-400"
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
    <footer className="bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 sm:flex-row">
        <Logo />
        <p className="font-mono text-xs text-zinc-500">
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
      <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
        {eyebrow}
      </span>
      <h2 className="mt-4 font-serif text-4xl font-medium tracking-tight text-zinc-50 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-zinc-400">{subtitle}</p>
    </div>
  );
}
