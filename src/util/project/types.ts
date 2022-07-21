import { z } from "zod";

//// SCHEMA ////

export const box2dSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

export const box3dSchema = z.tuple([
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
  z.number(),
]);

export const bboxSchema = box2dSchema.or(box3dSchema);

export const projectSchema = z.object({
  bbox: bboxSchema,
  areaSquareMeters: z.number(),
});

//// INFERRED TYPES ////

export type Project = z.infer<typeof projectSchema>;
export type BBox = z.infer<typeof bboxSchema>;
