import { z } from "zod";
import { CommentSchema } from "./comment.js";

export const StructuredMeasurementSchema = z.object({
  type: z.enum(["numeric", "boolean", "percentage", "count"]),
  target: z.union([z.number(), z.boolean(), z.string()]),
  operator: z.enum(["gte", "lte", "eq", "gt", "lt"]),
  unit: z.string().optional(),
});

export const KeyResultSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string().default(""),
  status: z.enum(["aspirational", "achieved"]),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  summary: z.string().max(60).default(""),
  schemaVersion: z.number().int().default(2),
  parentId: z.string().uuid().nullable().default(null),
  comments: z.array(CommentSchema).default([]),
  resultMeasure: z.string().default(""),
  goalParameters: z.record(z.string(), z.unknown()).default({}),
  estimationHistory: z
    .array(
      z.object({
        date: z.string().datetime(),
        spRemaining: z.number(),
        estimator: z.string(),
      })
    )
    .default([]),
  children: z.array(z.string().uuid()).default([]),
  structuredMeasurement: StructuredMeasurementSchema.nullable().default(null),
  measureScript: z.string().nullable().default(null),
});
