import { z } from "zod";

// ToDo: move to first class type in geoprocessing
import { Package } from "@seasketch/geoprocessing/dist/scripts";
import { GeoprocessingJsonConfig } from "@seasketch/geoprocessing";

//// DATASOURCES ////

// SCHEMA //

const GEO_TYPES = ["vector", "raster"] as const;
export const geoTypesSchema = z.enum(GEO_TYPES);

const SUPPORTED_FORMATS = ["fgb", "geojson", "cog", "subdivided"] as const;
export const supportedFormatsSchema = z.enum(SUPPORTED_FORMATS);

export const statsSchema = z.object({
  count: z.number(),
  area: z.number().nullable(),
});

/** Pre-calculated stats by key by class */
export const classStatsSchema = z.record(statsSchema);

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
  /** Raster nodata value */
  noDataValue: z.number().optional(),
  /** Import - Layer name/band within datasource to extract */
  layerName: z.string().optional(),
});

/** Define external location of datasource */
export const externalSourceSchema = z.object({
  /** Url if external datasource */
  url: z.string(),
});

/** Define external location of datasource */
export const internalImportSchema = z.object({
  /** Import - Path to source data, with filename */
  src: z.string(),
  /** Import - Properties to filter into final dataset, all others will be removed */
  propertiesToKeep: z.array(z.string()),
  /** Import - Whether to explode multi-geometries into single e.g. MultiPolygon to Polygon. Defaults to false */
  explodeMulti: z.boolean().optional(),
});

/** Define timestamps to ease syncing with local/published datasource files */
export const datasourceTimestampSchema = z.object({
  /** Datasource creation timestamp  */
  created: z.string(),
  /** Datasource updated timestamp */
  lastUpdated: z.string(),
});

export const internalDatasourceSchema = baseDatasourceSchema
  .merge(datasourceTimestampSchema)
  .merge(internalImportSchema);
export const externalDatasourceSchema =
  baseDatasourceSchema.and(externalSourceSchema);
export const datasourceSchema = internalDatasourceSchema.or(
  externalDatasourceSchema
);
export const datasourcesSchema = z.array(datasourceSchema);

// INFERRED TYPES //

export type GeoTypes = z.infer<typeof geoTypesSchema>;
export type SupportedFormats = z.infer<typeof supportedFormatsSchema>;
export type Stats = z.infer<typeof statsSchema>;
export type ClassStats = z.infer<typeof classStatsSchema>;
export type KeyStats = z.infer<typeof keyStatsSchema>;
export type BaseDatasource = z.infer<typeof baseDatasourceSchema>;
export type InternalDatasource = z.infer<typeof internalDatasourceSchema>;
export type ExternalDatasource = z.infer<typeof externalDatasourceSchema>;
export type Datasource = z.infer<typeof datasourceSchema>;
export type Datasources = z.infer<typeof datasourcesSchema>;

//// IMPORT DATSOURCE ////

// SCHEMA //

export const importDatasourceOptionsSchema =
  baseDatasourceSchema.merge(internalImportSchema);

// INFERRED TYPES //

export type ImportDatasourceOptions = z.infer<
  typeof importDatasourceOptionsSchema
>;

// NATIVE TYPES //

/** Full configuration needed to import a dataset */
export interface ImportDatasourceConfig extends ImportDatasourceOptions {
  /** Path to store imported datasets after transformation, ready to be published or accessed via local web server for tests */
  dstPath: string;
  /** project package metadata */
  package: Package;
  /** geoprocessing metadata */
  gp: GeoprocessingJsonConfig;
}
