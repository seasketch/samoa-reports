import {
  ValidationError,
  PreprocessingHandler,
  isPolygonFeature,
  Feature,
  Polygon,
  MultiPolygon,
  getFlatGeobufFilename,
  isInternalVectorDatasource,
  clipMultiMerge,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import area from "@turf/area";
import { featureCollection as fc } from "@turf/helpers";
import flatten from "@turf/flatten";
import kinks from "@turf/kinks";
import project from "../../project";

const ENFORCE_MAX_SIZE = false;
const MAX_SIZE_KM = 500000 * 1000 ** 2; // Default 500,000 KM

// Defined at module level for potential caching/reuse by serverless process
const ds = project.getDatasourceById("offshore");

export async function clipOutsideOffshore(
  feature: Feature<Polygon | MultiPolygon>
) {
  if (!isInternalVectorDatasource(ds))
    throw new Error("Expected vector datasource for offshore");
  const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(ds)}`;
  console.log("url", url);
  // Fetch for entire project area, we want the whole thing
  const polys = await fgbFetchAll<Feature<Polygon>>(url, project.basic.bbox);
  return clipMultiMerge(feature, fc(polys), "intersection");
}

/**
 * Takes a Polygon feature and returns the portion that is in the ocean and within an EEZ boundary
 * If results in multiple polygons then returns the largest
 */
export async function clipToOffshore(feature: Feature): Promise<Feature> {
  if (!isPolygonFeature(feature)) {
    throw new ValidationError("Input must be a polygon");
  }

  if (ENFORCE_MAX_SIZE && area(feature) > MAX_SIZE_KM) {
    throw new ValidationError(
      `Please limit sketches to under ${MAX_SIZE_KM} square km`
    );
  }

  const kinkPoints = kinks(feature);
  if (kinkPoints.features.length > 0) {
    throw new ValidationError("Your sketch polygon crosses itself.");
  }

  let clipped = await clipOutsideOffshore(feature);

  if (!clipped || area(clipped) === 0) {
    throw new ValidationError("Sketch is outside of offshore boundary");
  } else {
    if (clipped.geometry.type === "MultiPolygon") {
      const flattened = flatten(clipped);
      let biggest = [0, 0];
      for (var i = 0; i < flattened.features.length; i++) {
        const a = area(flattened.features[i]);
        if (a > biggest[0]) {
          biggest = [a, i];
        }
      }
      return flattened.features[biggest[1]] as Feature<Polygon>;
    } else {
      return clipped;
    }
  }
}

export default new PreprocessingHandler(clipToOffshore, {
  title: "clipToOceanOffshore",
  description: "Erases portion of sketch overlapping with offshore boundary",
  timeout: 40,
  requiresProperties: [],
});
