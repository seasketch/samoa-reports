/**
 * @jest-environment node
 * @group smoke
 */
import { keyAreaOverlap } from "./keyAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof keyAreaOverlap).toBe("function");
  });
  test("keyAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await keyAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "keyAreaOverlap", example.properties.name);
    }
  }, 120000);
});
