import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Markdown } from "../lib/markdown";
import { compact, salaryRange, scoreBand, titleCaseSkill } from "../lib/format";

describe("Markdown", () => {
  it("renders bold text and lists", () => {
    render(<Markdown text={"**Top 2 candidates:**\n1. **Avery** — 82% match\n2. Jordan"} />);
    expect(screen.getByText("Top 2 candidates:").tagName).toBe("STRONG");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("list").tagName).toBe("OL");
  });

  it("never renders model output as HTML", () => {
    const { container } = render(<Markdown text={'<img src=x onerror="alert(1)"> **hi**'} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x");
  });
});

describe("format", () => {
  it("compacts large numbers only", () => {
    expect(compact(746)).toBe("746");
    expect(compact(9_999)).toBe("9,999");
    expect(compact(12_900)).toBe("12.9K");
  });

  it("formats salary ranges", () => {
    expect(salaryRange(150000, 190000)).toBe("$150K – $190K");
    expect(salaryRange(null, null)).toBeNull();
    expect(salaryRange(90000, null, "EUR")).toBe("From €90K");
  });

  it("bands match scores", () => {
    expect([scoreBand(82), scoreBand(58), scoreBand(45), scoreBand(null)]).toEqual(["good", "warning", "critical", "none"]);
  });

  it("title-cases skills with known spellings", () => {
    expect(titleCaseSkill("node.js")).toBe("Node.js");
    expect(titleCaseSkill("system design")).toBe("System Design");
  });
});
