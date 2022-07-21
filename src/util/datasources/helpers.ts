import {
  InternalDatasource,
  ExternalDatasource,
  internalDatasourceSchema,
  externalDatasourceSchema,
  Datasource,
  Datasources,
} from "./types";

export const isInternalDatasource = (
  /** InternalDatasource object */
  ds: any
): ds is InternalDatasource => {
  return internalDatasourceSchema.safeParse(ds).success;
};

export const isExternalDatasource = (
  /** ExternalDatasource object */
  ds: any
): ds is ExternalDatasource => {
  return externalDatasourceSchema.safeParse(ds).success;
};

/** find and return datasource from passed datasources, otherwise reads from disk */
export const getDatasourceById = (
  datasourceId: string,
  datasources: Datasources
): Datasource => {
  const ds = datasources.find((ds) => ds.datasourceId === datasourceId);
  if (!ds) {
    throw new Error(`Datasource not found - ${datasourceId}`);
  } else {
    return ds;
  }
};

/** find and return external datasource from passed datasources, otherwise reads from disk */
export const getExternalDatasourceById = (
  datasourceId: string,
  datasources: Datasources
): ExternalDatasource => {
  const ds = getDatasourceById(datasourceId, datasources);
  if (isExternalDatasource(ds)) {
    return ds;
  } else {
    throw new Error(`External datasource not found - ${datasourceId}`);
  }
};

/** find and return internal datasource from passed datasources, otherwise reads from disk */
export const getInternalDatasourceById = (
  datasourceId: string,
  datasources: Datasources
): InternalDatasource => {
  const ds = getDatasourceById(datasourceId, datasources);
  if (isInternalDatasource(ds)) {
    return ds;
  } else {
    throw new Error(`Internal datasource not found -${datasourceId}`);
  }
};

/** Returns datasource filename in geojson format */
export function getJsonFilename(datasource: InternalDatasource) {
  return datasource.datasourceId + ".json";
}

/** Returns datasource filename in flatgeobuf format */
export function getFlatGeobufFilename(datasource: InternalDatasource) {
  return datasource.datasourceId + ".fgb";
}
