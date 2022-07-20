import {
  GeoprocessingHandler,
  Metric,
  Polygon,
  ReportResult,
  Sketch,
  SketchCollection,
  toNullSketch,
} from "@seasketch/geoprocessing";
import config from "../../config";

export async function deepwaterRegions(
  sketch: Sketch<Polygon> | SketchCollection<Polygon>
): Promise<ReportResult> {
  console.log("config function!", config.datasources);
  const ds = config.getDatasourceById("deepwater_bioregions");
  return {
    metrics: [],
    sketch: toNullSketch(sketch),
  };
}

export default new GeoprocessingHandler(deepwaterRegions, {
  title: "deepwaterRegions",
  description: "Calculate sketch overlap with offshore bioregion polygons",
  executionMode: "async",
  timeout: 40,
  requiresProperties: [],
});
