import { clipLand, clipOutsideEez, clipToOceanEez } from "./clipToOceanEez";
import { getExampleFeatures } from "@seasketch/geoprocessing/scripts/testing";
import {
  ValidationError,
  Feature,
  Polygon,
  MultiPolygon,
} from "@seasketch/geoprocessing";
import booleanValid from "@turf/boolean-valid";
import { selfCrossingSketchPolygon } from "@seasketch/geoprocessing/dist/src/testing/fixtures/invalidSketches";

describe("Basic unit tests", () => {
  test("clipLand", async () => {
    const examples = (await getExampleFeatures("gp-clip-ocean")) as Feature<
      Polygon | MultiPolygon
    >[];
    for (const example of examples) {
      try {
        const result = await clipLand(example);
        if (!result) fail("result should not be null");
        expect(result).toBeTruthy();
        expect(booleanValid(result));
        expect(
          result.geometry.type === "Polygon" ||
            result.geometry.type === "MultiPolygon"
        );
      } catch (e) {
        if (e instanceof ValidationError) {
          // ValidationErrors don't indicate failures, just comprehensive tests
        } else {
          throw e;
        }
      }
    }
  }, 10000);

  test("clipOutsideEez", async () => {
    const examples = (await getExampleFeatures(
      "gp-clip-ocean"
    )) as Feature<Polygon>[];
    for (const example of examples) {
      try {
        const result = await clipOutsideEez(example);
        if (!result) fail("result should not be null");
        expect(result).toBeTruthy();
        expect(booleanValid(result));
        expect(
          result.geometry.type === "Polygon" ||
            result.geometry.type === "MultiPolygon"
        );
      } catch (e) {
        if (e instanceof ValidationError) {
          // ValidationErrors don't indicate failures, just comprehensive tests
        } else {
          throw e;
        }
      }
    }
  }, 10000);

  test("clipToOceanEez - should throw ValidationError if self-crossing", async () => {
    expect(
      async () => await clipToOceanEez(selfCrossingSketchPolygon)
    ).rejects.toThrow(ValidationError);
  });
});
