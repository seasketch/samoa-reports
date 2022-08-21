/**
 * @jest-environment node
 * @group smoke
 */
import { benthicValueOverlap } from "./benthicValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof benthicValueOverlap).toBe("function");
  });
  test("benthicValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await benthicValueOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "benthicValueOverlap", example.properties.name);
    }
  }, 120000);
});
