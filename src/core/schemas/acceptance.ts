import { z } from "zod";

export const AcceptanceCriterionSchema = z.object({
  description: z.string(),
  script: z.string(),
  status: z.enum(["pending", "passed", "failed"]).default("pending"),
});
