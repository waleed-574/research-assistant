import { describe, expect, it } from "vitest";
import type { FormGraph } from "@/mastra/schemas";
import {
  emptyAnswer,
  initialAnswers,
  isFieldVisible,
  indexFields,
  mergeAnswers,
  pruneHiddenAnswers,
  validateAnswers,
  visibleFields,
} from "./form-logic";

/**
 * The conditional-form graph is where a bug is least visible: a wrong edge just
 * means a field silently never appears, and the user can't tell it was supposed
 * to. These cover the cases that are awkward to hit by clicking — transitive
 * hiding, loose equality, and required-but-hidden fields.
 */

/** A form exercising every operator, both logic modes, and a nested edge. */
const form: FormGraph = {
  title: "Test form",
  fields: [
    { id: "has_budget", label: "Has budget", type: "boolean", required: false },
    {
      id: "budget",
      label: "Budget",
      type: "number",
      required: true,
      validation: { min: 100, max: 5000 },
      dependsOn: {
        logic: "all",
        conditions: [{ fieldId: "has_budget", operator: "equals", value: true }],
      },
    },
    {
      // Grandchild: only reachable *through* `budget`, itself conditional.
      id: "budget_currency",
      label: "Currency",
      type: "select",
      required: false,
      options: [{ value: "EUR", label: "EUR" }],
      dependsOn: {
        logic: "all",
        conditions: [{ fieldId: "budget", operator: "greater_than", value: 1000 }],
      },
    },
    {
      id: "industry",
      label: "Industry",
      type: "multiselect",
      required: false,
      options: [
        { value: "health", label: "Health" },
        { value: "retail", label: "Retail" },
      ],
    },
    {
      id: "compliance",
      label: "Compliance",
      type: "text",
      required: false,
      dependsOn: {
        logic: "any",
        conditions: [
          { fieldId: "industry", operator: "includes", value: "health" },
          { fieldId: "industry", operator: "includes", value: "finance" },
        ],
      },
    },
    {
      id: "why_not",
      label: "Why not retail",
      type: "text",
      required: false,
      dependsOn: {
        logic: "all",
        conditions: [
          { fieldId: "industry", operator: "not_equals", value: "retail" },
        ],
      },
    },
    { id: "email", label: "Email", type: "email", required: false },
  ],
};

const visible = (answers: Record<string, unknown>) =>
  visibleFields(form, answers as never).map((f) => f.id);

describe("visibility", () => {
  it("shows only unconditional fields before anything is answered", () => {
    expect(visible({ has_budget: false, industry: [] })).toEqual([
      "has_budget",
      "industry",
      "email",
    ]);
  });

  it("reveals a child when its boolean parent is true", () => {
    expect(visible({ has_budget: true, industry: [] })).toContain("budget");
  });

  it("matches a boolean answer against a string condition value", () => {
    // The agent may write `value: "true"` instead of `value: true`; a strict
    // === would silently never match and the field would never appear.
    const stringly: FormGraph = {
      ...form,
      fields: form.fields.map((f) =>
        f.id === "budget"
          ? {
              ...f,
              dependsOn: {
                logic: "all" as const,
                conditions: [
                  { fieldId: "has_budget", operator: "equals" as const, value: "true" },
                ],
              },
            }
          : f,
      ),
    };
    expect(
      visibleFields(stringly, { has_budget: true, industry: [] }).map((f) => f.id),
    ).toContain("budget");
  });

  it("reveals a grandchild when the whole chain is satisfied", () => {
    expect(visible({ has_budget: true, budget: 2000, industry: [] })).toContain(
      "budget_currency",
    );
  });

  it("hides a grandchild when its parent is hidden, despite a stale answer", () => {
    // `budget` still holds 2000, but it is no longer reachable, so nothing
    // hanging off it may show either. This is the transitive case.
    const ids = visible({ has_budget: false, budget: 2000, industry: [] });
    expect(ids).not.toContain("budget");
    expect(ids).not.toContain("budget_currency");
  });

  it("treats `any` logic as a union of its conditions", () => {
    expect(visible({ industry: ["health"] })).toContain("compliance");
    expect(visible({ industry: ["retail"] })).not.toContain("compliance");
  });

  it("requires every condition under `all` logic", () => {
    const bothRequired: FormGraph = {
      title: "t",
      fields: [
        { id: "a", label: "A", type: "boolean", required: false },
        { id: "b", label: "B", type: "boolean", required: false },
        {
          id: "c",
          label: "C",
          type: "text",
          required: false,
          dependsOn: {
            logic: "all",
            conditions: [
              { fieldId: "a", operator: "equals", value: true },
              { fieldId: "b", operator: "equals", value: true },
            ],
          },
        },
      ],
    };
    const ids = (answers: Record<string, unknown>) =>
      visibleFields(bothRequired, answers as never).map((f) => f.id);

    expect(ids({ a: true, b: false })).not.toContain("c");
    expect(ids({ a: true, b: true })).toContain("c");
  });

  it("does not fire not_equals on a blank answer", () => {
    // Blank means "not yet decided", not "not equal" — otherwise conditional
    // fields flash before the user has touched the field they hang off.
    expect(visible({ industry: [] })).not.toContain("why_not");
    expect(visible({ industry: ["health"] })).toContain("why_not");
  });

  it("compares numerically for greater_than / less_than", () => {
    // A string answer from a number input must not be compared lexically:
    // "9" > "1000" as strings, but 9 < 1000.
    expect(visible({ has_budget: true, budget: "9", industry: [] })).not.toContain(
      "budget_currency",
    );
    expect(visible({ has_budget: true, budget: "2000", industry: [] })).toContain(
      "budget_currency",
    );
  });

  it("shows the field rather than recursing forever on a cyclic graph", () => {
    const cyclic: FormGraph = {
      title: "t",
      fields: [
        {
          id: "a",
          label: "A",
          type: "text",
          required: false,
          dependsOn: {
            logic: "all",
            conditions: [{ fieldId: "b", operator: "exists" }],
          },
        },
        {
          id: "b",
          label: "B",
          type: "text",
          required: false,
          dependsOn: {
            logic: "all",
            conditions: [{ fieldId: "a", operator: "exists" }],
          },
        },
      ],
    };
    expect(() =>
      visibleFields(cyclic, { a: "x", b: "y" }),
    ).not.toThrow();
  });

  it("treats a field with no dependsOn as always visible", () => {
    const byId = indexFields(form);
    const root = form.fields.find((f) => f.id === "email")!;
    expect(isFieldVisible(root, {}, byId)).toBe(true);
  });
});

describe("pruneHiddenAnswers", () => {
  it("drops answers the user cannot currently see", () => {
    // The research agent must never receive a value the user can't see.
    const pruned = pruneHiddenAnswers(form, {
      has_budget: false,
      budget: 2000,
      industry: [],
    });
    expect(Object.keys(pruned)).toEqual(["has_budget", "industry"]);
  });

  it("keeps answers that are still reachable", () => {
    const pruned = pruneHiddenAnswers(form, {
      has_budget: true,
      budget: 2000,
      industry: [],
    });
    expect(pruned).toHaveProperty("budget", 2000);
  });
});

describe("validateAnswers", () => {
  it("passes a fully valid form", () => {
    expect(validateAnswers(form, { has_budget: false, industry: [] })).toEqual({});
  });

  it("does not enforce a required field that is hidden", () => {
    // `budget` is required but unreachable — it must not block submission.
    expect(validateAnswers(form, { has_budget: false, industry: [] })).toEqual({});
  });

  it("enforces a required field once it becomes visible", () => {
    expect(
      validateAnswers(form, { has_budget: true, budget: "", industry: [] }),
    ).toEqual({ budget: "This field is required." });
  });

  it("enforces numeric min and max", () => {
    expect(
      validateAnswers(form, { has_budget: true, budget: 50, industry: [] }),
    ).toEqual({ budget: "Must be at least 100." });
    expect(
      validateAnswers(form, { has_budget: true, budget: 99999, industry: [] }),
    ).toEqual({ budget: "Must be at most 5000." });
  });

  it("checks email format even when the field has no validation block", () => {
    // Regression: the format check used to sit behind the `validation` guard,
    // so a field without one was never checked.
    expect(validateAnswers(form, { industry: [], email: "nope" })).toEqual({
      email: "Enter a valid email address.",
    });
    expect(validateAnswers(form, { industry: [], email: "a@b.co" })).toEqual({});
  });

  it("ignores a malformed regex from the model instead of blocking submission", () => {
    const badPattern: FormGraph = {
      title: "t",
      fields: [
        {
          id: "code",
          label: "Code",
          type: "text",
          required: false,
          validation: { pattern: "([unclosed" },
        },
      ],
    };
    expect(validateAnswers(badPattern, { code: "anything" })).toEqual({});
  });

  it("enforces string length bounds", () => {
    const bounded: FormGraph = {
      title: "t",
      fields: [
        {
          id: "notes",
          label: "Notes",
          type: "text",
          required: false,
          validation: { minLength: 5, maxLength: 10 },
        },
      ],
    };
    expect(validateAnswers(bounded, { notes: "hi" })).toEqual({
      notes: "Use at least 5 characters.",
    });
    expect(validateAnswers(bounded, { notes: "way too long to fit" })).toEqual({
      notes: "Use at most 10 characters.",
    });
    expect(validateAnswers(bounded, { notes: "just fine" })).toEqual({});
  });
});

describe("answer initialisation and merging", () => {
  it("starts each field at a controlled empty value for its type", () => {
    expect(emptyAnswer(form.fields[3])).toEqual([]); // multiselect
    expect(emptyAnswer(form.fields[0])).toBe(false); // boolean
    expect(emptyAnswer(form.fields[6])).toBe(""); // email
    expect(Object.keys(initialAnswers(form))).toHaveLength(form.fields.length);
  });

  it("carries answers across a revision and resets retyped fields", () => {
    // The agent resends the FULL form on every edit, so without merging a user
    // who asks "add one more field" loses everything they typed.
    const revised: FormGraph = {
      title: "t",
      fields: [
        { id: "has_budget", label: "Has budget", type: "boolean", required: false },
        // Was a multiselect before; a stale array is meaningless on a text input.
        { id: "industry", label: "Industry", type: "text", required: false },
        { id: "new_field", label: "New", type: "text", required: false },
      ],
    };

    expect(
      mergeAnswers(revised, { has_budget: true, industry: ["health"] }, form.fields),
    ).toEqual({ has_budget: true, industry: "", new_field: "" });
  });

  it("drops answers for fields removed by a revision", () => {
    const trimmed: FormGraph = {
      title: "t",
      fields: [{ id: "email", label: "Email", type: "email", required: false }],
    };
    const merged = mergeAnswers(
      trimmed,
      { email: "a@b.co", industry: ["health"] },
      form.fields,
    );
    expect(merged).toEqual({ email: "a@b.co" });
  });
});
