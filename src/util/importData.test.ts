import fs from "fs-extra";

/**
 * @group unit
 */
import { importVectorDataset } from "./importDatasource";

afterEach(() => {
  fs.removeSync("./test/data");
  fs.remove("./test/datasources_test.json");
});

// Switch to generating a geojson dataset
describe("Import vector data", () => {
  test("importVector multi-class", async () => {
    // TODO: switch to generating test vector dataset
    const vectorD = await importVectorDataset({
      src: "data/src/Data_Received/Layers_From_Kaituu/Revised Deepwater Bioregions.shp",
      dstPath: "./test/data",
      datasourceId: "deepwater_bioregions",
      // datasourcePath: "./test/datasources_test.json",
      classKeys: ["Draft name"],
      publish: false,
    });

    // ensure folder and files exist with proper contents!
  }, 10000);
});
