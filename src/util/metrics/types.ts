import { z } from "zod";

//// SCHEMA ////

const METRIC_TYPES = ["areaOverlap", "countOverlap", "valueOverlap"] as const;
export const metricTypesSchema = z.enum(METRIC_TYPES);

export const dataClassSchema = z.object({
  /** Unique identifier for class in project */
  classId: z.string(),
  /** Datasource for single data class */
  datasourceId: z.string().optional(),
  /** Name of class suitable for user display */
  display: z.string(),
  /** Optional unique number used by some datasets (e.g. raster) to represent data class instead of string */
  numericClassId: z.number().optional(),
  /** Optional ID of map layer associated with this class */
  layerId: z.string().optional(),
  /** class level objective */
  objectiveId: z.string().optional(),
});

export const metricGroupSchema = z.object({
  /** Unique id of metric in project*/
  metricId: z.string(),
  /** Metric type */
  type: metricTypesSchema,
  /** Datasource for entire group, multi-class */
  datasourceId: z.string().optional(),
  /** data classes used by group */
  classes: z.array(dataClassSchema),
  /** Optional ID of map layer associated with this metric */
  layerId: z.string().optional(),
  /** group level objective, applies to all classes */
  objectiveId: z.string().optional(),
});

export const metricGroupsSchema = z.array(metricGroupSchema);

//// INFERRED TYPES ////

export type MetricGroup = z.infer<typeof metricGroupSchema>;
export type MetricGroups = z.infer<typeof metricGroupsSchema>;
