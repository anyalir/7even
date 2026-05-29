import { z } from "zod";
import { CommentSchema } from "./comment.js";
import { AcceptanceCriterionSchema } from "./acceptance.js";

export const TaskSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["to-do", "in-progress", "done"]),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  schemaVersion: z.number().int().default(2),
  parentId: z.string().uuid().nullable().default(null),
  comments: z.array(CommentSchema).default([]),
  assignee: z
    .object({
      email: z.string().email(),
      github: z.string(),
    })
    .nullable()
    .default(null),
  estimationHistory: z
    .array(
      z.object({
        date: z.string().datetime(),
        spRemaining: z.number(),
        estimator: z.string(),
      })
    )
    .default([]),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).default([]),
});
