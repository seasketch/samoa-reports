/**
 * @jest-environment node
 * @group smoke
 */
import { wsValueOverlap } from "./wsValueOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof wsValueOverlap).toBe("function");
  });
  test("wsValueOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await wsValueOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "wsValueOverlap", example.properties.name);
    }
  }, 120000);
});
