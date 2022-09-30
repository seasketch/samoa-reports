import {
  ValidationError,
  PreprocessingHandler,
  isPolygonFeature,
  Feature,
  Polygon,
  MultiPolygon,
  clip,
  getLandVectorDatasource,
  getEezVectorDatasource,
  datasourcesSchema,
  getFlatGeobufFilename,
  isInternalVectorDatasource,
  clipMultiMerge,
} from "@seasketch/geoprocessing";
import area from "@turf/area";
import bbox from "@turf/bbox";
import { featureCollection as fc, featureCollection } from "@turf/helpers";
import flatten from "@turf/flatten";
import kinks from "@turf/kinks";
import project from "../../project";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";

const ENFORCE_MAX_SIZE = false;
const MAX_SIZE_KM = 500000 * 1000 ** 2; // Default 500,000 KM

// Defined at module level for potential caching/reuse by serverless process
const datasources = datasourcesSchema.parse(project.datasources);
const landVectorDatasource = getLandVectorDatasource(datasources);
const eezVectorDatasource = getEezVectorDatasource(datasources);

export async function clipLand(feature: Feature<Polygon | MultiPolygon>) {
  const featureBox = bbox(feature);
  const landDatasource = project.getClipDatasource("land");
  const landFeatures = await (async () => {
    if (
      // Default
      landDatasource.datasourceId === "global-clipping-osm-land"
    ) {
      const features = await landVectorDatasource.fetchUnion(featureBox, "gid");
      return features;
    } else {
      // Override
      if (!isInternalVectorDatasource(landDatasource))
        throw new Error(
          `Expected vector datasource for ${landDatasource.datasourceId}`
        );
      const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(
        landDatasource
      )}`;
      const features = await fgbFetchAll<Feature<Polygon>>(url, featureBox);
      return featureCollection(features);
    }
  })();

  if (landFeatures.features.length === 0) return feature;
  return clip(fc([feature, ...landFeatures.features]), "difference");
}

export async function clipOutsideEez(
  feature: Feature<Polygon | MultiPolygon>,
  eezFilterByCountryCodes: string[] = ["Samoa"]
) {
  const featureBox = bbox(feature);
  const eezDatasource = project.getClipDatasource("eez");
  let eezFeatures = await (async () => {
    if (
      // Default
      eezDatasource.datasourceId === "global-clipping-eez-land-union"
    ) {
      let features = await eezVectorDatasource.fetch(featureBox);
      // Optionally filter down to a single country/union EEZ boundary
      if (eezFilterByCountryCodes.length > 0) {
        features = features.filter((e) =>
          eezFilterByCountryCodes.includes(e.properties.UNION)
        );
      }
      return features;
    } else {
      // Override
      if (!isInternalVectorDatasource(eezDatasource))
        throw new Error("Expected vector datasource for offshore");
      const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(
        eezDatasource
      )}`;
      const features = await fgbFetchAll<Feature<Polygon>>(url, featureBox);
      return features;
    }
  })();

  // If nothing to intersect then return the whole input feature
  if (eezFeatures.length === 0) {
    return feature;
  } else {
    return clipMultiMerge(feature, fc(eezFeatures), "intersection");
  }
}

/**
 * Takes a Polygon feature and returns the portion that is in the ocean and within an EEZ boundary
 * If results in multiple polygons then returns the largest
 */
export async function clipToOceanEez(
  feature: Feature,
  eezFilterByNames?: string[]
): Promise<Feature> {
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

  let clipped = await clipLand(feature);
  if (clipped) clipped = await clipOutsideEez(clipped, eezFilterByNames);

  if (!clipped || area(clipped) === 0) {
    throw new ValidationError("Sketch is outside of project boundaries");
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

export default new PreprocessingHandler(clipToOceanEez, {
  title: "clipToOceanEez",
  description:
    "Erases portion of sketch overlapping with land or extending into ocean outsize EEZ boundary",
  timeout: 40,
  requiresProperties: [],
});
