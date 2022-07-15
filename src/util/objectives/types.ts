import { z } from "zod";

//// SCHEMA ////

const OBJECTIVE_COUNTS_ANSWERS = ["yes", "no", "maybe"] as const;
export const objectiveAnswerSchema = z.enum(OBJECTIVE_COUNTS_ANSWERS);

export const objectiveAnswerMapSchema = z.record(objectiveAnswerSchema);

export const objectiveSchema = z.object({
  id: z.string(),
  shortDesc: z.string(),
  target: z.number().nonnegative(),
  countsToward: objectiveAnswerMapSchema,
});

export const objectivesSchema = z.array(objectiveSchema);

//// INFERRED TYPES ////

export type ObjectiveAnswerNew = z.infer<typeof objectiveAnswerSchema>;
export type ObjectiveNew = z.infer<typeof objectiveSchema>;
export type ObjectivesNew = z.infer<typeof objectivesSchema>;
