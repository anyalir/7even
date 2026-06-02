import { z } from "zod";

export const ProjectConfigSchema = z.object({
  teamSize: z.number().int().min(1).default(1),
  /** Team velocity in SP per week. Used as seed when no historical data exists. */
  initialVelocity: z.number().min(0).nullable().default(null),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
