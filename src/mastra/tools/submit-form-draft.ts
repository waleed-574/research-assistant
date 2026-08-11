import { createTool } from "@mastra/core/tools";
import { FormGraphSchema } from "../schemas";
import { logger } from "@/lib/logger";

/**
 * The Form Builder Agent calls this once it has interviewed the user enough to
 * propose a form. It does no side effects — it simply validates and echoes the
 * form graph. Two reasons it's a tool rather than plain structured output:
 *
 *   1. The interview is multi-turn chat; the agent decides *when* it's ready.
 *      A tool call is an unambiguous "I'm proposing a form now" signal the
 *      state machine can watch for (INTERVIEWING -> FORM PREVIEW).
 *   2. Zod validation on the tool input guarantees the UI always receives a
 *      well-formed graph, and the model gets a typed schema to fill.
 */
export const submitFormDraftTool = createTool({
  id: "submit_form_draft",
  description:
    "Propose the research form to the user. Call this ONLY when you have gathered enough to design a useful, well-structured form. Include conditional `dependsOn` edges so follow-up fields appear based on earlier answers.",
  inputSchema: FormGraphSchema,
  outputSchema: FormGraphSchema,
  execute: async ({ context }) => {
    logger.info(
      "form-builder",
      `proposed form "${context.title}" with ${context.fields.length} fields`,
    );
    return context;
  },
});
