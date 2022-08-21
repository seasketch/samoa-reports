/**
 * @jest-environment node
 * @group smoke
 */
import { ibaAreaOverlap } from "./ibaAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ibaAreaOverlap).toBe("function");
  });
  test("ibaAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ibaAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "ibaAreaOverlap", example.properties.name);
    }
  }, 120000);
});
