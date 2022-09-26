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
  isInternalVectorDatasource,
} from "@seasketch/geoprocessing";
import { fgbFetchAll } from "@seasketch/geoprocessing/dataproviders";
import project from "../../project";

export async function ibaAreaOverlap(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  const metricGroup = project.getMetricGroup("ibaAreaOverlap");

  if (!metricGroup.datasourceId) {
    throw new Error(`Missing datasourceId for metric ${metricGroup.metricId}`);
  }
  const ds = project.getDatasourceById(metricGroup.datasourceId);

  const features = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        if (isInternalVectorDatasource(ds)) {
          const url = `${project.dataBucketUrl()}${getFlatGeobufFilename(ds)}`;
          console.log("url", url);
          // Fetch for entire project area, we want the whole thing
          const polys = await fgbFetchAll<Feature<Polygon>>(
            url,
            project.basic.bbox
          );
          return polys;
        }
        return [];
      })
    )
  ).reduce<Record<string, Feature<Polygon>[]>>((acc, polys, classIndex) => {
    return {
      ...acc,
      [metricGroup.classes[classIndex].classId]: polys,
    };
  }, {});

  const metrics: Metric[] = (
    await Promise.all(
      metricGroup.classes.map(async (curClass) => {
        const overlapResult = await overlapFeatures(
          metricGroup.metricId,
          features[curClass.classId],
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

export default new GeoprocessingHandler(ibaAreaOverlap, {
  title: "ibaAreaOverlap",
  description: "Calculate sketch overlap with iba polygons",
  executionMode: "async",
  memory: 2048,
  timeout: 40,
  requiresProperties: [],
});
