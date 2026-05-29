import { z } from "zod";

export const SessionProposalSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: z
    .enum(["proposed", "accepted", "rejected", "modified"])
    .default("proposed"),
  feedback: z.string().optional(),
  meceWarnings: z.array(z.string()).default([]),
});

export const MeceOverlapSchema = z.object({
  items: z.tuple([z.string(), z.string()]),
  dimension: z.enum(["semantic", "deliverable", "result-measure"]),
  severity: z.enum(["warning", "blocking"]),
  reason: z.string(),
});

export const MeceGapSchema = z.object({
  type: z.enum(["functional", "non-functional"]),
  description: z.string(),
});

export const MeceReportSchema = z.object({
  overlaps: z.array(MeceOverlapSchema).default([]),
  gaps: z.array(MeceGapSchema).default([]),
  isComplete: z.boolean(),
});

export const SessionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["objective-to-kr", "kr-to-task"]),
  targetId: z.string().uuid(),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  proposals: z.array(SessionProposalSchema).default([]),
  meceReport: MeceReportSchema.optional(),
});
