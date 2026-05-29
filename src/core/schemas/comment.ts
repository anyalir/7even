import { z } from "zod";

export const CommentSchema = z.object({
  author: z.string(),
  date: z.string().datetime(),
  text: z.string(),
  type: z.enum(["human", "agent"]),
});
