/**
 * @jest-environment node
 * @group smoke
 */
import { ebsaAreaOverlap } from "./ebsaAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ebsaAreaOverlap).toBe("function");
  });
  test("ebsaAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ebsaAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "ebsaAreaOverlap", example.properties.name);
    }
  }, 120000);
});
