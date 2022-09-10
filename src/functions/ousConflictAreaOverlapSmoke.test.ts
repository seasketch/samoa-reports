/**
 * @jest-environment node
 * @group smoke
 */
import { ousConflictAreaOverlap } from "./ousConflictAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof ousConflictAreaOverlap).toBe("function");
  });
  test("ousConflictAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await ousConflictAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(
        result,
        "ousConflictAreaOverlap",
        example.properties.name
      );
    }
  }, 30000);
});
