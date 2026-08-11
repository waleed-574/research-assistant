import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Prose } from "./prose";

/**
 * Rendered to a string via react-dom/server, so these need no DOM and no jsdom.
 *
 * The agent emits markdown into report prose ("markdown-friendly prose" per
 * ResearchReportSchema), and the interesting failures are false positives —
 * asterisks and underscores that are not markup.
 */

const html = (text: string) => renderToStaticMarkup(<Prose text={text} />);

describe("inline formatting", () => {
  it("renders **bold**", () => {
    expect(html("a **strong** b")).toContain("<strong");
    expect(html("a **strong** b")).toContain("strong</strong>");
  });

  it("renders *italic*", () => {
    expect(html("a *slanted* b")).toContain("<em");
  });

  it("renders `inline code`", () => {
    expect(html("call `web_search` now")).toContain("<code");
  });

  it("leaves a bare asterisk between spaces alone", () => {
    // Regression: "5 * 3 * 2" used to render as "5 <em>3</em> 2" because the
    // italic arm accepted a whitespace-padded delimiter.
    const out = html("5 * 3 * 2 stays plain");
    expect(out).not.toContain("<em");
    expect(out).toContain("5 * 3 * 2 stays plain");
  });

  it("does not italicise snake_case identifiers", () => {
    // Field ids appear verbatim in this prose, so `_` must never be a delimiter.
    const out = html("the budget_amount field and has_budget flag");
    expect(out).not.toContain("<em");
    expect(out).toContain("budget_amount");
  });

  it("prefers bold over italic for a doubled delimiter", () => {
    // Inline, not on its own line — a bold-only line is a sub-heading by design
    // (see the block-structure tests below).
    const out = html("text **both** more");
    expect(out).toContain("<strong");
    expect(out).not.toContain("<em");
  });

  it("leaves an unmatched delimiter as literal text", () => {
    expect(html("2 * 3 = 6 and *unclosed")).not.toContain("<em");
  });
});

describe("block structure", () => {
  it("turns a bold-only line into a sub-heading", () => {
    // The model's habitual way of writing a sub-heading inside section content.
    const out = html("**Client Portal Features**\nTeamwork provides portals.");
    expect(out).toContain("<h3");
    expect(out).toContain("Client Portal Features");
  });

  it("turns an ATX heading into a sub-heading", () => {
    expect(html("### Pricing caveats\nPrices exclude VAT.")).toContain("<h3");
  });

  it("groups consecutive bullets into one list", () => {
    const out = html("- one\n- two\n- three");
    expect(out.match(/<ul/g)).toHaveLength(1);
    expect(out.match(/<li/g)).toHaveLength(3);
  });

  it("numbers an ordered list", () => {
    const out = html("1. first\n2. second");
    expect(out).toContain("1.");
    expect(out).toContain("2.");
  });

  it("splits paragraphs on a blank line", () => {
    const out = html("First para.\n\nSecond para.");
    expect(out.match(/<p/g)).toHaveLength(2);
  });

  it("joins wrapped lines within one paragraph", () => {
    const out = html("a sentence that\nwraps across lines");
    expect(out.match(/<p/g)).toHaveLength(1);
    expect(out).toContain("a sentence that wraps across lines");
  });

  it("renders plain prose with no markup as a single paragraph", () => {
    const out = html("Just a sentence.");
    expect(out.match(/<p/g)).toHaveLength(1);
    expect(out).not.toContain("<strong");
  });

  it("produces nothing for empty or whitespace-only input", () => {
    expect(html("")).not.toContain("<p");
    expect(html("   \n  \n ")).not.toContain("<p");
  });

  it("escapes HTML in model output rather than injecting it", () => {
    // Prose builds React nodes, never HTML strings — model text cannot inject
    // markup.
    const out = html('<img src=x onerror="alert(1)">');
    expect(out).not.toContain("<img");
    expect(out).toContain("&lt;img");
  });
});
