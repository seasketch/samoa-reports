/**
 * @group unit
 */
import { importVector } from "./importData";

afterEach(() => {
  // fs.removeSync("./test/data");
  // fs.remove("./test/datasources_test.json");
});

describe("Import vector data", () => {
  test("importVector multi-class", async () => {
    const vectorD = await importVector({
      src: "data/src/Data_Received/Layers_From_Kaituu/Revised Deepwater Bioregions.shp",
      dstPath: "./test/data",
      datasourceId: "deepwater_bioregions",
      datasourcePath: "./test/datasources_test.json",
      classProperty: "Draft name",
      publish: false,
    });

    // ensure folder and files exist with proper contents!
  }, 10000);
});
