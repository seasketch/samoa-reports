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
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import bbox from "@turf/bbox";
import project from "../../project";
import {
  getFlatGeobufFilename,
  isInternalVectorDatasource,
} from "../util/datasources/helpers";

export async function sumaAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const box = sketch.bbox || bbox(sketch);
  const metricGroup = project.getMetricGroup("sumaAreaOverlap");

  if (!metricGroup.datasourceId) {
    throw new Error(`Missing datasourceId ${metricGroup.metricId}`);
  }
  const ds = project.getDatasourceById(metricGroup.datasourceId);
  const features = await (async () => {
    if (isInternalVectorDatasource(ds)) {
      const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(ds)}`;
      console.log("url", url);
      // Fetch for entire project area, we want the whole thing
      const polys = await fgbFetchAll<Feature<Polygon>>(url, box);
      return polys;
    } else {
      throw new Error(`Datasource is not internal vector: ${ds}`);
    }
  })();

  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        // Filter out single class, exclude null geometry too
        const classFeatures = features.filter((feat) => {
          if (!metricGroup.classKey) {
            throw new Error(`Missing classKey ${metricGroup.metricId}`);
          }
          return (
            feat.geometry &&
            feat.properties &&
            feat.properties[metricGroup.classKey] === curClass.classId
          );
        }, []);
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          classFeatures,
          sketch
        );
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

export default new GeoprocessingHandler(sumaAreaOverlap, {
  title: "sumaAreaOverlap",
  description: "Calculate sketch overlap with suma polygons",
  executionMode: "async",
  memory: 4096,
  timeout: 40,
  requiresProperties: [],
});
