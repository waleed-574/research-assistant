import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_RESEARCH_MAX_STEPS,
  fixturesEnabled,
  researchMaxSteps,
} from "./config";

/**
 * Both of these knobs exist to control API spend, so their failure modes matter:
 * a mis-parsed step cap silently costs money, and a fixture flag left on in
 * production would serve a canned report as though it were freshly researched.
 */

const ORIGINAL = { ...process.env };

beforeEach(() => {
  delete process.env.RESEARCH_MAX_STEPS;
  delete process.env.USE_AGENT_FIXTURES;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("researchMaxSteps", () => {
  it("defaults when unset", () => {
    expect(researchMaxSteps()).toBe(DEFAULT_RESEARCH_MAX_STEPS);
  });

  it("reads a valid value", () => {
    process.env.RESEARCH_MAX_STEPS = "3";
    expect(researchMaxSteps()).toBe(3);
  });

  it("tolerates surrounding whitespace", () => {
    process.env.RESEARCH_MAX_STEPS = "  4  ";
    expect(researchMaxSteps()).toBe(4);
  });

  it("clamps an absurdly high value so a typo can't run up a bill", () => {
    process.env.RESEARCH_MAX_STEPS = "500";
    expect(researchMaxSteps()).toBe(20);
  });

  it("falls back to the default on garbage rather than throwing", () => {
    for (const bad of ["", "   ", "abc", "NaN", "-5", "0", "1e400"]) {
      process.env.RESEARCH_MAX_STEPS = bad;
      const steps = researchMaxSteps();
      expect(steps).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(steps)).toBe(true);
    }
  });

  it("floors a fractional value", () => {
    process.env.RESEARCH_MAX_STEPS = "3.9";
    expect(researchMaxSteps()).toBe(3);
  });
});

describe("fixturesEnabled", () => {
  it("is off by default", () => {
    expect(fixturesEnabled()).toBe(false);
  });

  it("accepts the documented truthy spellings", () => {
    for (const on of ["1", "true", "TRUE", "yes"]) {
      process.env.USE_AGENT_FIXTURES = on;
      expect(fixturesEnabled()).toBe(true);
    }
  });

  it("ignores values that aren't an explicit yes", () => {
    for (const off of ["0", "false", "no", "", "maybe"]) {
      process.env.USE_AGENT_FIXTURES = off;
      expect(fixturesEnabled()).toBe(false);
    }
  });

  it("refuses to engage in production even when the flag is set", () => {
    // Serving a canned report as a fresh one would mislead the user, and this is
    // exactly the flag that gets left on by accident.
    process.env.USE_AGENT_FIXTURES = "1";
    const previous = process.env.NODE_ENV;
    try {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: "production",
        configurable: true,
      });
      expect(fixturesEnabled()).toBe(false);
    } finally {
      Object.defineProperty(process.env, "NODE_ENV", {
        value: previous,
        configurable: true,
      });
    }
  });
});
