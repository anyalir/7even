export { CommentSchema } from "./comment.js";
export { ObjectiveSchema } from "./objective.js";
export { KeyResultSchema } from "./key-result.js";
export { TaskSchema } from "./task.js";

import { z } from "zod";
import { ObjectiveSchema } from "./objective.js";
import { KeyResultSchema } from "./key-result.js";
import { TaskSchema } from "./task.js";

export const ItemSchema = z.union([ObjectiveSchema, KeyResultSchema, TaskSchema]);
