import { z } from "zod";
import { CommentSchema } from "./comment.js";

export const KeyResultSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["aspirational", "achieved"]),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  schemaVersion: z.number().int().default(1),
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
});
