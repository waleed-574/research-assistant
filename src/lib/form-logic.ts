import type {
  Condition,
  FormAnswers,
  FormField,
  FormGraph,
} from "@/mastra/schemas";

/**
 * Traversal logic for the conditional form graph.
 *
 * The agent returns fields (nodes) carrying `dependsOn` edges. This module is
 * the only place that decides which nodes are reachable given the current
 * answers, so the renderer stays presentational. Pure functions, no React —
 * the graph rules can be reasoned about (and tested) on their own.
 */

function isBlank(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Compare loosely by string form. Option values are always strings, but the
 * agent may write a condition value as a number or boolean (`value: true` vs
 * `value: "true"`), and a strict `===` would silently never match.
 */
function looseEquals(a: unknown, b: unknown): boolean {
  if (isBlank(a) || b === undefined) return false;
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function evaluateCondition(condition: Condition, answers: FormAnswers): boolean {
  const answer = answers[condition.fieldId];

  switch (condition.operator) {
    case "exists":
      return !isBlank(answer);
    case "equals":
      return looseEquals(answer, condition.value);
    case "not_equals":
      // An unanswered field is "not yet decided", not "not equal" — treating
      // blank as a match would flash conditional fields before the user has
      // touched the field they hang off.
      return isBlank(answer) ? false : !looseEquals(answer, condition.value);
    case "includes":
      if (Array.isArray(answer)) {
        return answer.some((v) => looseEquals(v, condition.value));
      }
      if (typeof answer === "string" && condition.value !== undefined) {
        return answer.toLowerCase().includes(String(condition.value).toLowerCase());
      }
      return false;
    case "greater_than": {
      const [a, b] = [toNumber(answer), toNumber(condition.value)];
      return Number.isFinite(a) && Number.isFinite(b) && a > b;
    }
    case "less_than": {
      const [a, b] = [toNumber(answer), toNumber(condition.value)];
      return Number.isFinite(a) && Number.isFinite(b) && a < b;
    }
    default:
      return true;
  }
}

/**
 * Is this node reachable? A field is visible when its own conditions hold AND
 * every field those conditions read is itself visible — otherwise a stale
 * answer left behind by a now-hidden parent would keep a grandchild on screen.
 */
export function isFieldVisible(
  field: FormField,
  answers: FormAnswers,
  fieldsById: Map<string, FormField>,
  seen: ReadonlySet<string> = new Set(),
): boolean {
  if (!field.dependsOn) return true;
  // Cycle guard: a malformed graph shouldn't recurse forever. Show the field
  // rather than hiding a chunk of the form.
  if (seen.has(field.id)) return true;
  const trail = new Set(seen).add(field.id);

  const results = field.dependsOn.conditions.map((condition) => {
    const parent = fieldsById.get(condition.fieldId);
    if (parent && parent.id !== field.id) {
      if (!isFieldVisible(parent, answers, fieldsById, trail)) return false;
    }
    return evaluateCondition(condition, answers);
  });

  return field.dependsOn.logic === "any"
    ? results.some(Boolean)
    : results.every(Boolean);
}

export function indexFields(form: FormGraph): Map<string, FormField> {
  return new Map(form.fields.map((f) => [f.id, f]));
}

/** The fields to render right now, in the agent's display order. */
export function visibleFields(form: FormGraph, answers: FormAnswers): FormField[] {
  const byId = indexFields(form);
  return form.fields.filter((f) => isFieldVisible(f, answers, byId));
}

/** Sensible empty value per field type, so inputs start controlled. */
export function emptyAnswer(field: FormField): FormAnswers[string] {
  switch (field.type) {
    case "multiselect":
      return [];
    case "boolean":
      return false;
    default:
      return "";
  }
}

export function initialAnswers(form: FormGraph): FormAnswers {
  return Object.fromEntries(form.fields.map((f) => [f.id, emptyAnswer(f)]));
}

/**
 * Carry answers across a revised form. The agent returns the FULL form on every
 * edit, so without this a user who asks "add one more field" loses everything
 * they had already typed. A value is only kept when the field still exists and
 * its type is unchanged (a select's value is meaningless on a number input).
 */
export function mergeAnswers(
  form: FormGraph,
  previous: FormAnswers,
  previousFields: readonly FormField[],
): FormAnswers {
  const priorTypes = new Map(previousFields.map((f) => [f.id, f.type]));

  return Object.fromEntries(
    form.fields.map((field) => {
      const carried =
        priorTypes.get(field.id) === field.type ? previous[field.id] : undefined;
      return [field.id, carried === undefined ? emptyAnswer(field) : carried];
    }),
  );
}

/**
 * Drop answers to fields that aren't currently reachable. The research agent
 * should never see a value the user can't see — e.g. a budget they typed before
 * flipping "I have a budget" back to no.
 */
export function pruneHiddenAnswers(
  form: FormGraph,
  answers: FormAnswers,
): FormAnswers {
  const visible = new Set(visibleFields(form, answers).map((f) => f.id));
  return Object.fromEntries(
    Object.entries(answers).filter(([id]) => visible.has(id)),
  );
}

/** fieldId -> message, for visible fields only. Empty object means valid. */
export function validateAnswers(
  form: FormGraph,
  answers: FormAnswers,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of visibleFields(form, answers)) {
    const answer = answers[field.id];

    if (field.required && isBlank(answer)) {
      errors[field.id] = "This field is required.";
      continue;
    }
    if (isBlank(answer)) continue;

    // Format checks that apply regardless of whether the agent supplied a
    // `validation` block for the field.
    if (
      field.type === "email" &&
      typeof answer === "string" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer)
    ) {
      errors[field.id] = "Enter a valid email address.";
      continue;
    }

    const { validation } = field;
    if (!validation) continue;

    if (field.type === "number") {
      const n = toNumber(answer);
      if (!Number.isFinite(n)) {
        errors[field.id] = "Enter a number.";
        continue;
      }
      if (validation.min !== undefined && n < validation.min) {
        errors[field.id] = `Must be at least ${validation.min}.`;
        continue;
      }
      if (validation.max !== undefined && n > validation.max) {
        errors[field.id] = `Must be at most ${validation.max}.`;
        continue;
      }
    }

    if (typeof answer === "string") {
      if (
        validation.minLength !== undefined &&
        answer.trim().length < validation.minLength
      ) {
        errors[field.id] = `Use at least ${validation.minLength} characters.`;
        continue;
      }
      if (
        validation.maxLength !== undefined &&
        answer.trim().length > validation.maxLength
      ) {
        errors[field.id] = `Use at most ${validation.maxLength} characters.`;
        continue;
      }
      if (validation.pattern) {
        try {
          if (!new RegExp(validation.pattern).test(answer)) {
            errors[field.id] = "This doesn't look right.";
            continue;
          }
        } catch {
          // A malformed pattern from the model must not block submission.
        }
      }
    }
  }

  return errors;
}
