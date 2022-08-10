/**
 * @jest-environment node
 * @group smoke
 */
import { kbaAreaOverlap } from "./kbaAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof kbaAreaOverlap).toBe("function");
  });
  test("kbaAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await kbaAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "kbaAreaOverlap", example.properties.name);
    }
  }, 120000);
});
