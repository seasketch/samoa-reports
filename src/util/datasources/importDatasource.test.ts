import fs from "fs-extra";

/**
 * @group unit
 */
import { importDatasource } from "./importDatasource";
import { Datasources } from "./types";

afterEach(() => {
  // fs.removeSync("./test/data");
  // fs.remove("./test/datasources_test.json");
});

// Switch to generating a geojson dataset
describe("Import vector data", () => {
  test("importVector single-file multi-class bioregions", async () => {
    // TODO: switch to generating test vector dataset
    const vectorD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Received/Layers_From_Kaituu/Revised Deepwater Bioregions.shp",
        datasourceId: "deepwater_bioregions",
        classKeys: ["Draft name"],
        formats: [],
        propertiesToKeep: [],
      },
      "./test/datasources_test.json",
      "./test/data"
    );

    // ensure folder and files exist with proper contents!
  }, 10000);

  test("importVector single-file single region", async () => {
    // TODO: switch to generating test vector dataset
    const inshoreD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Products/Data_Created/inshore.shp",
        datasourceId: "inshore",
        classKeys: [],
        formats: [],
        propertiesToKeep: [],
      },
      "./test/datasources_test.json",
      "./test/data"
    );
    const offshoreD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Products/Data_Created/offshore.shp",
        datasourceId: "offshore",
        classKeys: [],
        formats: [],
        propertiesToKeep: [],
      },
      "./test/datasources_test.json",
      "./test/data"
    );
    const eezD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Received/Layers_From_Kaituu/Samoa Provisional EEZ.shp",
        datasourceId: "eez",
        classKeys: [],
        formats: [],
        propertiesToKeep: [],
      },
      "./test/datasources_test.json",
      "./test/data"
    );

    // ensure folder and files exist with proper contents!
  }, 10000);
});
