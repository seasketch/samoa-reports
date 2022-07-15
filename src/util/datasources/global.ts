import { VectorDataSource, Feature, Polygon } from "@seasketch/geoprocessing";
import { Datasources } from "./types";
import { getExternalDatasourceById } from "./helpers";

export type OsmLandFeature = Feature<Polygon, { gid: number }>;
export type EezLandUnion = Feature<Polygon, { gid: number; UNION: string }>;

export const getLandVectorDatasource = (
  datasources: Datasources
): VectorDataSource<OsmLandFeature> => {
  return new VectorDataSource<OsmLandFeature>(
    getExternalDatasourceById("global-clipping-osm-land", datasources).url
  );
};

export const getEezVectorDatasource = (datasources: Datasources) => {
  return new VectorDataSource<EezLandUnion>(
    getExternalDatasourceById("global-clipping-eez-land-union", datasources).url
  );
};
