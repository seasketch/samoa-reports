import { z } from "zod";

//// SCHEMA ////

const GEO_TYPES = ["vector", "raster"] as const;
export const geoTypesSchema = z.enum(GEO_TYPES);

const SUPPORTED_FORMATS = ["fgb", "geojson", "cog", "subdivided"] as const;
export const supportedFormatsSchema = z.enum(SUPPORTED_FORMATS);

/** Pre-calculated stats by key by class */
export const classStatsSchema = z.record(
  z.object({
    count: z.number(),
    area: z.number().nullable(),
  })
);

export const keyStatsSchema = z.record(classStatsSchema);

export const baseDatasourceSchema = z.object({
  /** Unique id of datasource in project */
  datasourceId: z.string(),
  /** basic geospatial type */
  geo_type: geoTypesSchema,
  /** keys to generate classes for.  Vector - properties, Raster - numeric string value for categorical raster */
  classKeys: z.array(z.string()),
  /** Pre-calculated stats by key by class */
  keyStats: keyStatsSchema.optional(),
  /** Available formats */
  formats: z.array(supportedFormatsSchema),
  noDataValue: z.number().optional(),
});

/** Define external location of datasource */
export const datasourceLocationSchema = z.object({
  /** Url if external datasource */
  url: z.string(),
});

/** Define timestamps to ease syncing with local/published datasource files */
export const datasourceTimestampSchema = z.object({
  /** Datasource creation timestamp  */
  created: z.string(),
  /** Datasource updated timestamp */
  lastUpdated: z.string(),
});

export const internalDatasourceSchema = z.intersection(
  baseDatasourceSchema,
  datasourceTimestampSchema
);
export const externalDatasourceSchema = z.intersection(
  baseDatasourceSchema,
  datasourceLocationSchema
);
export const datasourceSchema = internalDatasourceSchema.or(
  externalDatasourceSchema
);
export const datasourcesSchema = z.array(datasourceSchema);

//// INFERRED TYPES ////

export type GeoTypes = z.infer<typeof geoTypesSchema>;
export type SupportedFormats = z.infer<typeof supportedFormatsSchema>;
export type ClassStats = z.infer<typeof classStatsSchema>;
export type KeyStats = z.infer<typeof keyStatsSchema>;
export type BaseDatasource = z.infer<typeof baseDatasourceSchema>;
export type InternalDatasource = z.infer<typeof internalDatasourceSchema>;
export type ExternalDatasource = z.infer<typeof externalDatasourceSchema>;
export type Datasource = z.infer<typeof datasourceSchema>;
export type Datasources = z.infer<typeof datasourcesSchema>;
