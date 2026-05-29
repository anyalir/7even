import type { z } from "zod";
import type { ObjectiveSchema } from "../core/schemas/objective.js";
import type { KeyResultSchema } from "../core/schemas/key-result.js";
import type { TaskSchema } from "../core/schemas/task.js";
import type { CommentSchema } from "../core/schemas/comment.js";

export type Objective = z.infer<typeof ObjectiveSchema>;
export type KeyResult = z.infer<typeof KeyResultSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Comment = z.infer<typeof CommentSchema>;

export type ItemType = "objective" | "key-result" | "task";

export type AnyItem = Objective | KeyResult | Task;
