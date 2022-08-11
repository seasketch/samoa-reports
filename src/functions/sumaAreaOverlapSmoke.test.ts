/**
 * @jest-environment node
 * @group smoke
 */
import { sumaAreaOverlap } from "./sumaAreaOverlap";
import {
  getExamplePolygonSketchAll,
  writeResultOutput,
} from "@seasketch/geoprocessing/scripts/testing";

describe("Basic smoke tests", () => {
  test("handler function is present", () => {
    expect(typeof sumaAreaOverlap).toBe("function");
  });
  test("sumaAreaOverlapSmoke - tests run against all examples", async () => {
    const examples = await getExamplePolygonSketchAll();
    for (const example of examples) {
      const result = await sumaAreaOverlap(example);
      expect(result).toBeTruthy();
      writeResultOutput(result, "sumaAreaOverlap", example.properties.name);
    }
  }, 120000);
});
