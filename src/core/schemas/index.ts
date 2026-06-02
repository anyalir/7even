export { CommentSchema } from "./comment.js";
export { ProjectConfigSchema, type ProjectConfig } from "./config.js";
export { ObjectiveSchema } from "./objective.js";
export { KeyResultSchema, StructuredMeasurementSchema } from "./key-result.js";
export { TaskSchema } from "./task.js";
export { AcceptanceCriterionSchema } from "./acceptance.js";
export {
  SessionSchema,
  SessionProposalSchema,
  MeceReportSchema,
  MeceOverlapSchema,
  MeceGapSchema,
} from "./session.js";

import { z } from "zod";
import { ObjectiveSchema } from "./objective.js";
import { KeyResultSchema } from "./key-result.js";
import { TaskSchema } from "./task.js";

export const ItemSchema = z.union([ObjectiveSchema, KeyResultSchema, TaskSchema]);
