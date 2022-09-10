/**
 * @jest-environment node
 * @group smoke
 */
import { ousAreaOverlap } from "./ousAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousAreaOverlap).toBe("function");
  });
  test("ousAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "ousAreaOverlap", example.properties.name);
    }
  }, 30000);
});
