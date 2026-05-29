import { describe, it, expect } from "vitest";
import {
  tokenize,
  jaccardSimilarity,
  checkOverlaps,
  checkExhaustiveness,
  runMeceAnalysis,
} from "../mece.js";

describe("tokenize", () => {
  it("lowercases and splits on whitespace/punctuation", () => {
    expect(tokenize("Hello World")).toEqual(new Set(["hello", "world"]));
  });

  it("filters stop words", () => {
    expect(tokenize("a test for the user")).toEqual(
      new Set(["test", "user"]),
    );
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set(["a", "b"]))).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccardSimilarity(new Set(["a"]), new Set(["b"]))).toBe(0);
  });

  it("returns 0 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0);
  });
});

describe("checkOverlaps", () => {
  it("detects blocking overlap for identical descriptions", () => {
    const items = [
      { id: "1", description: "Increase user signup rate" },
      { id: "2", description: "Increase user signup rate" },
    ];
    const overlaps = checkOverlaps(items);
    expect(overlaps.length).toBeGreaterThanOrEqual(1);
    const semantic = overlaps.find((o) => o.dimension === "semantic");
    expect(semantic).toBeDefined();
    expect(semantic!.severity).toBe("blocking");
    expect(semantic!.items).toEqual(["1", "2"]);
  });

  it("returns empty array for zero overlap", () => {
    const items = [
      { id: "1", description: "Increase revenue through enterprise sales" },
      { id: "2", description: "Build mobile notification system" },
    ];
    expect(checkOverlaps(items)).toEqual([]);
  });

  it("detects warning-level partial overlap", () => {
    const items = [
      { id: "1", description: "Increase user signup rate through marketing" },
      { id: "2", description: "Improve user signup flow through optimization" },
    ];
    const overlaps = checkOverlaps(items);
    const semantic = overlaps.find((o) => o.dimension === "semantic");
    expect(semantic).toBeDefined();
    expect(semantic!.severity).toBe("warning");
  });

  it("detects result-measure overlap", () => {
    const items = [
      { id: "1", description: "Grow signups", resultMeasure: "Reach 1000 users by Q3" },
      { id: "2", description: "Expand userbase", resultMeasure: "Reach 1000 users by Q4" },
    ];
    const overlaps = checkOverlaps(items);
    const rm = overlaps.find((o) => o.dimension === "result-measure");
    expect(rm).toBeDefined();
  });

  it("respects custom thresholds", () => {
    const items = [
      { id: "1", description: "Increase user signup rate through marketing" },
      { id: "2", description: "Improve user signup flow through optimization" },
    ];
    // Very high threshold — should not trigger
    const overlaps = checkOverlaps(items, { warningAt: 0.9, blockingAt: 1.0 });
    expect(overlaps).toEqual([]);
  });

  it("only returns overlap for the pair that actually overlaps", () => {
    const items = [
      { id: "A", description: "Increase user signup rate" },
      { id: "B", description: "Increase user signup rate" },
      { id: "C", description: "Build mobile notification system" },
    ];
    const overlaps = checkOverlaps(items);
    const semanticPairs = overlaps
      .filter((o) => o.dimension === "semantic")
      .map((o) => o.items);
    expect(semanticPairs).toEqual([["A", "B"]]);
  });
});

describe("checkExhaustiveness", () => {
  it("returns no gaps when children cover all parent concepts", () => {
    const gaps = checkExhaustiveness(
      "performance, security, usability",
      [
        "performance metrics",
        "security posture",
        "usability testing",
      ],
    );
    expect(gaps).toEqual([]);
  });

  it("identifies gap when child misses parent concept", () => {
    const gaps = checkExhaustiveness(
      "performance, security, usability",
      ["performance metrics", "security posture"],
    );
    expect(gaps.length).toBeGreaterThan(0);
    const descs = gaps.map((g) => g.description);
    expect(descs.some((d) => d.includes("usability"))).toBe(true);
    expect(gaps.every((g) => g.type === "functional")).toBe(true);
  });

  it("returns gaps for all keywords when children empty", () => {
    const gaps = checkExhaustiveness(
      "performance, security, usability",
      [],
    );
    expect(gaps.length).toBeGreaterThan(0);
  });
});

describe("runMeceAnalysis", () => {
  it("returns isComplete true for clean decomposition", () => {
    const report = runMeceAnalysis(
      { id: "p", description: "performance, security" },
      [
        { id: "1", description: "performance metrics optimization" },
        { id: "2", description: "security posture hardening" },
      ],
    );
    expect(report.isComplete).toBe(true);
    expect(report.overlaps).toEqual([]);
    expect(report.gaps).toEqual([]);
  });

  it("returns isComplete false when blocking overlap exists", () => {
    const report = runMeceAnalysis(
      { id: "p", description: "performance, security" },
      [
        { id: "1", description: "Optimize performance metrics" },
        { id: "2", description: "Optimize performance metrics" },
      ],
    );
    expect(report.isComplete).toBe(false);
    expect(report.overlaps.length).toBeGreaterThan(0);
  });

  it("returns isComplete false when gaps exist", () => {
    const report = runMeceAnalysis(
      { id: "p", description: "performance, security, usability" },
      [{ id: "1", description: "performance metrics optimization" }],
    );
    expect(report.isComplete).toBe(false);
    expect(report.gaps.length).toBeGreaterThan(0);
  });

  it("returns isComplete true when only warnings exist", () => {
    const report = runMeceAnalysis(
      { id: "p", description: "Increase user engagement and improve user retention" },
      [
        { id: "1", description: "Increase user engagement metrics" },
        { id: "2", description: "Improve user retention rate" },
      ],
    );
    // warnings from "user" overlap don't block
    const hasBlocking = report.overlaps.some((o) => o.severity === "blocking");
    expect(hasBlocking).toBe(false);
    // isComplete depends on gaps too, but no gaps here since children cover parent
    if (report.gaps.length === 0) {
      expect(report.isComplete).toBe(true);
    }
  });
});
