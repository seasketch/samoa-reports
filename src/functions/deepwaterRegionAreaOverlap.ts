import {
  Sketch,
  Feature,
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  SketchCollection,
  toNullSketch,
  overlapFeatures,
  rekeyMetrics,
  sortMetrics,
  getFlatGeobufFilename,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";

//// GENERATE THIS ON DATASOURCE IMPORT?  That way the client can use it
export const classKey = "Draft name";
export type DatasourceProperties = {
  [classKey: string]: string;
};
export type DatasourceFeature = Feature<Polygon, DatasourceProperties>;
////

export async function deepwaterRegionAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);

  // one datasource - multi-class
  const metricGroup = project.getMetricGroup("deepwaterRegionAreaOverlap");

  if (!metricGroup.datasourceId) {
    throw new Error(
      `Missing top-level datasource for MetricGroup ${metricGroup.metricId}`
    );
  }
  const ds = project.getInternalVectorDatasourceById(metricGroup.datasourceId);
  const classKey = ds.classKeys[0];

  const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(ds)}`;
  const features = await fgbFetchAll<DatasourceFeature>(url, box);

  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        // Filter out single class, exclude null geometry too
        const classFeatures = features.filter((feat) => {
          return (
            feat.geometry && feat.properties[classKey] === curClass.classId
          );
        }, []);
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          classFeatures,
          sketch
        );
        // Transform from simple to extended metric
        return overlapResult.map(
          (metric): Metric => ({
            ...metric,
            classId: curClass.classId,
          })
        );
      })
    )
  ).reduce(
    // merge
    (metricsSoFar, curClassMetrics) => [...metricsSoFar, ...curClassMetrics],
    []
  );

  return {
    metrics: sortMetrics(rekeyMetrics(metrics)),
    sketch: toNullSketch(sketch, true),
  };
}

export default new GeoprocessingHandler(deepwaterRegionAreaOverlap, {
  title: "deepwaterRegionAreaOverlap",
  description: "Calculate sketch overlap with boundary polygons",
  executionMode: "async",
  timeout: 40,
  requiresProperties: [],
});
