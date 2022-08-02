/**
 * @jest-environment node
 * @group smoke
 */
import { deepwaterRegionAreaOverlap } from "./deepwaterRegionAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof deepwaterRegionAreaOverlap).toBe("function");
  });
  test("deepwaterRegionAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await deepwaterRegionAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "deepwaterRegionAreaOverlap",
        example.properties.name
      );
    }
  }, 120000);
});
