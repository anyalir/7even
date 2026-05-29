import type { z } from "zod";
import type {
  MeceOverlapSchema,
  MeceGapSchema,
  MeceReportSchema,
} from "./schemas/session.js";

export type MeceOverlap = z.infer<typeof MeceOverlapSchema>;
export type MeceGap = z.infer<typeof MeceGapSchema>;
export type MeceReport = z.infer<typeof MeceReportSchema>;

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "to", "for", "of", "with",
  "and", "or", "in", "on", "at", "by",
]);

/**
 * Tokenize text into a set of meaningful lowercase tokens.
 * Splits on whitespace/punctuation, filters stop words.
 */
export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Compute Jaccard similarity between two sets.
 * Returns intersection size / union size, or 0 if both empty.
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

interface OverlapItem {
  id: string;
  description: string;
  resultMeasure?: string;
}

interface Thresholds {
  warningAt?: number;
  blockingAt?: number;
}

/**
 * Check for overlaps between items using semantic and result-measure dimensions.
 * Uses Jaccard similarity with configurable thresholds.
 */
export function checkOverlaps(
  items: OverlapItem[],
  thresholds?: Thresholds,
): MeceOverlap[] {
  const warningAt = thresholds?.warningAt ?? 0.3;
  const blockingAt = thresholds?.blockingAt ?? 0.6;
  const overlaps: MeceOverlap[] = [];

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];

      // Semantic dimension
      const descSim = jaccardSimilarity(
        tokenize(a.description),
        tokenize(b.description),
      );
      if (descSim >= warningAt) {
        overlaps.push({
          items: [a.id, b.id],
          dimension: "semantic",
          severity: descSim >= blockingAt ? "blocking" : "warning",
          reason: `Description similarity: ${(descSim * 100).toFixed(0)}%`,
        });
      }

      // Result measure dimension (higher thresholds since measures are shorter)
      if (a.resultMeasure && b.resultMeasure) {
        const measureSim = jaccardSimilarity(
          tokenize(a.resultMeasure),
          tokenize(b.resultMeasure),
        );
        const measureWarning = warningAt + 0.1;
        const measureBlocking = blockingAt + 0.1;
        if (measureSim >= measureWarning) {
          overlaps.push({
            items: [a.id, b.id],
            dimension: "result-measure",
            severity: measureSim >= measureBlocking ? "blocking" : "warning",
            reason: `Result measure similarity: ${(measureSim * 100).toFixed(0)}%`,
          });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Check exhaustiveness of child descriptions against a parent description.
 * Identifies parent keywords not covered by any child as potential functional gaps.
 *
 * Note: This provides a structural baseline for gap detection. Non-functional gap
 * detection (e.g., missing security considerations, scalability concerns) requires
 * deeper semantic understanding and is best handled by the agent layer.
 */
export function checkExhaustiveness(
  parentDescription: string,
  childDescriptions: string[],
): MeceGap[] {
  const parentTokens = tokenize(parentDescription);
  const childTokens = new Set<string>();
  for (const desc of childDescriptions) {
    for (const token of tokenize(desc)) {
      childTokens.add(token);
    }
  }

  const uncovered: string[] = [];
  for (const token of parentTokens) {
    if (!childTokens.has(token)) {
      uncovered.push(token);
    }
  }

  if (uncovered.length === 0) return [];

  // Group uncovered keywords into gaps
  // Each uncovered keyword becomes a gap entry describing what's missing
  return uncovered.map((keyword) => ({
    type: "functional" as const,
    description: `Parent concept "${keyword}" not covered by any child item`,
  }));
}

/**
 * Run full MECE analysis: overlap detection + exhaustiveness checking.
 * Returns a report with overlaps, gaps, and completeness status.
 *
 * isComplete is true when there are no blocking overlaps and no gaps.
 * Warning-level overlaps do not block completeness.
 */
export function runMeceAnalysis(
  parent: { id: string; description: string },
  children: OverlapItem[],
  thresholds?: Thresholds,
): MeceReport {
  const overlaps = checkOverlaps(children, thresholds);
  const gaps = checkExhaustiveness(
    parent.description,
    children.map((c) => c.description),
  );
  const hasBlockingOverlaps =
    overlaps.filter((o) => o.severity === "blocking").length > 0;
  return {
    overlaps,
    gaps,
    isComplete: !hasBlockingOverlaps && gaps.length === 0,
  };
}
