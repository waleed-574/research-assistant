import { Mastra } from "@mastra/core";
import { ConsoleLogger } from "@mastra/core/logger";
import { formBuilderAgent } from "./agents/form-builder";
import { researchAgent } from "./agents/research";

/**
 * The single Mastra instance for the app.
 *
 * Agent logic lives here in `src/mastra/*` and is imported by API routes — the
 * UI never defines an agent inline. That's the "clean separation between agent
 * logic and UI" the brief asks for.
 */
export const mastra = new Mastra({
  agents: {
    formBuilder: formBuilderAgent,
    research: researchAgent,
  },
  logger: new ConsoleLogger({ name: "research-form-builder", level: "info" }),
});
