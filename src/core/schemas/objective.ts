import { z } from "zod";
import { CommentSchema } from "./comment.js";

export const ObjectiveSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string().default(""),
  status: z.enum(["proposed", "accepted", "achieved"]),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  summary: z.string().max(60).default(""),
  schemaVersion: z.number().int().default(1),
  parentId: z.string().uuid().nullable().default(null),
  comments: z.array(CommentSchema).default([]),
  statusQuo: z.string().default(""),
  constraints: z.string().default(""),
  functionalRequirements: z.string().default(""),
  nonfunctionalRequirements: z.string().default(""),
  desiredOutcome: z.string().default(""),
  children: z.array(z.string().uuid()).default([]),
});
