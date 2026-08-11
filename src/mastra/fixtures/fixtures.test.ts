import { describe, expect, it } from "vitest";
import {
  fixtureForm,
  fixtureReport,
  fixtureResearchEvents,
  fixtureResearchSteps,
} from "./index";
import { validateAnswers, visibleFields } from "@/lib/form-logic";

/**
 * The fixtures stand in for live agent output during UI work, so they are only
 * useful if they're realistic. If they drift into shapes the real agents never
 * produce, fixture-mode development starts proving nothing.
 *
 * Importing `./index` already parses both through their Zod schemas, so these
 * tests assert the properties the schemas can't: that the form actually
 * exercises conditional logic, and that the report's citations resolve.
 */

describe("fixture form graph", () => {
  it("has at least one conditional field, so the graph logic is exercised", () => {
    expect(fixtureForm.fields.some((f) => f.dependsOn)).toBe(true);
  });

  it("hides conditional fields until their condition is met", () => {
    const initial = visibleFields(fixtureForm, {});
    expect(initial.length).toBeLessThan(fixtureForm.fields.length);
  });

  it("references only real field ids in its conditions", () => {
    const ids = new Set(fixtureForm.fields.map((f) => f.id));
    for (const field of fixtureForm.fields) {
      for (const condition of field.dependsOn?.conditions ?? []) {
        expect(ids).toContain(condition.fieldId);
      }
    }
  });

  it("gives every select-like field options to choose from", () => {
    for (const field of fixtureForm.fields) {
      if (["select", "radio", "multiselect"].includes(field.type)) {
        expect(field.options?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("is answerable — an empty form reports only its visible required fields", () => {
    const errors = validateAnswers(fixtureForm, {});
    const visibleIds = new Set(visibleFields(fixtureForm, {}).map((f) => f.id));
    for (const id of Object.keys(errors)) expect(visibleIds).toContain(id);
  });
});

describe("fixture research run", () => {
  it("replays a realistic event sequence", () => {
    const types = fixtureResearchEvents.map((e) => e.type);
    expect(types[0]).toBe("planning");
    expect(types).toContain("search");
    expect(types).toContain("search-result");
    expect(types).toContain("synthesizing");
    expect(fixtureResearchEvents.length).toBeGreaterThan(10);
  });

  it("contains no error events", () => {
    expect(fixtureResearchEvents.filter((e) => e.type === "error")).toEqual([]);
  });

  it("gives every event a message for the UI to render", () => {
    for (const event of fixtureResearchEvents) {
      expect(typeof event.message).toBe("string");
      expect(event.message.length).toBeGreaterThan(0);
    }
  });

  it("reports a step count", () => {
    expect(fixtureResearchSteps).toBeGreaterThan(0);
  });
});

describe("fixture report", () => {
  it("has sources and sections", () => {
    expect(fixtureReport.sources.length).toBeGreaterThan(0);
    expect(fixtureReport.sections.length).toBeGreaterThan(0);
    expect(fixtureReport.keyFindings.length).toBeGreaterThan(0);
  });

  it("has no dangling citations", () => {
    // The property the UI depends on: every [n] chip must resolve to a source.
    const ids = new Set(fixtureReport.sources.map((s) => s.id));
    const dangling = fixtureReport.sections
      .flatMap((s) => s.citations)
      .filter((id) => !ids.has(id));
    expect(dangling).toEqual([]);
  });

  it("uses unique source ids", () => {
    const ids = fixtureReport.sources.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cites real http(s) URLs, not placeholders", () => {
    for (const source of fixtureReport.sources) {
      expect(source.url).toMatch(/^https?:\/\//);
      expect(source.url).not.toContain("example.com/mock");
    }
  });

  it("includes regional notes, the feature the fixture is meant to demo", () => {
    expect(fixtureReport.regionalNotes?.length ?? 0).toBeGreaterThan(0);
  });
});
