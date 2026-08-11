"use client";

import { useMemo } from "react";
import type { FormAnswers, FormField, FormGraph } from "@/mastra/schemas";
import { indexFields, isFieldVisible } from "@/lib/form-logic";

/**
 * Renders the agent's form graph. Purely presentational: which fields are
 * reachable is decided by src/lib/form-logic.ts, and answers live in the parent
 * so the graph and the values stay in one place.
 */

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400 dark:focus:ring-zinc-100/10";

interface FormRendererProps {
  form: FormGraph;
  answers: FormAnswers;
  errors: Record<string, string>;
  disabled?: boolean;
  onChange: (fieldId: string, value: FormAnswers[string]) => void;
}

export function FormRenderer({
  form,
  answers,
  errors,
  disabled,
  onChange,
}: FormRendererProps) {
  const byId = useMemo(() => indexFields(form), [form]);

  return (
    <div className="flex flex-col gap-6">
      {form.fields.map((field) => {
        if (!isFieldVisible(field, answers, byId)) return null;
        return (
          <FieldRow
            key={field.id}
            field={field}
            value={answers[field.id]}
            error={errors[field.id]}
            disabled={disabled}
            isConditional={Boolean(field.dependsOn)}
            onChange={(value) => onChange(field.id, value)}
          />
        );
      })}
    </div>
  );
}

interface FieldRowProps {
  field: FormField;
  value: FormAnswers[string];
  error?: string;
  disabled?: boolean;
  isConditional: boolean;
  onChange: (value: FormAnswers[string]) => void;
}

function FieldRow({
  field,
  value,
  error,
  disabled,
  isConditional,
  onChange,
}: FieldRowProps) {
  return (
    <div
      className={
        isConditional
          ? "animate-[fadeIn_150ms_ease-out] border-l-2 border-zinc-200 pl-4 dark:border-zinc-700"
          : undefined
      }
    >
      <div className="mb-1.5 flex items-baseline gap-2">
        <label
          htmlFor={field.id}
          className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
        >
          {field.label}
          {field.required && (
            <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden>
              *
            </span>
          )}
        </label>
        {isConditional && (
          <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
            conditional
          </span>
        )}
      </div>

      {field.helpText && (
        <p className="mb-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {field.helpText}
        </p>
      )}

      <FieldControl
        field={field}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />

      {error && (
        <p
          role="alert"
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function FieldControl({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FormField;
  value: FormAnswers[string];
  disabled?: boolean;
  onChange: (value: FormAnswers[string]) => void;
}) {
  const options = field.options ?? [];

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          id={field.id}
          rows={4}
          className={inputClass}
          placeholder={field.placeholder}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <input
          id={field.id}
          type="number"
          className={inputClass}
          placeholder={field.placeholder}
          disabled={disabled}
          min={field.validation?.min}
          max={field.validation?.max}
          value={typeof value === "number" || typeof value === "string" ? value : ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
      );

    case "boolean":
      return (
        <label className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
          <input
            id={field.id}
            type="checkbox"
            className="h-4 w-4 rounded border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
            disabled={disabled}
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
          />
          {field.placeholder ?? "Yes"}
        </label>
      );

    case "select":
      return (
        <select
          id={field.id}
          className={inputClass}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{field.placeholder ?? "Choose one…"}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case "radio":
      return (
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <label
              key={o.value}
              className="inline-flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="radio"
                name={field.id}
                value={o.value}
                className="h-4 w-4 border-zinc-300 accent-zinc-900 dark:border-zinc-600 dark:accent-zinc-100"
                disabled={disabled}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              {o.label}
            </label>
          ))}
        </div>
      );

    case "multiselect": {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => {
            const isOn = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                aria-pressed={isOn}
                onClick={() =>
                  onChange(
                    isOn
                      ? selected.filter((v) => v !== o.value)
                      : [...selected, o.value],
                  )
                }
                className={`rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                  isOn
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }

    case "date":
    case "email":
    case "text":
    default:
      return (
        <input
          id={field.id}
          type={field.type === "date" ? "date" : field.type === "email" ? "email" : "text"}
          className={inputClass}
          placeholder={field.placeholder}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
