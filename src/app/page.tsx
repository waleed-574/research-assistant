import { ResearchApp } from "@/components/research-app";

/**
 * Server component shell. The interactive flow is a client component so the
 * page itself stays static — every agent call goes through the API routes.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <ResearchApp />
    </main>
  );
}
