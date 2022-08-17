/**
 * @jest-environment node
 * @group unit
 */

import fs from "fs-extra";
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
      {
        newDatasourcePath: "./test/datasources_test.json",
        newDstPath: "./test/data",
      }
    );

    // ensure folder and files exist with proper contents!
  }, 10000);

  test("importVectorDatasource single-file single region", async () => {
    // TODO: switch to generating test vector dataset
    const inshoreD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Products/Boundaries/inshore.shp",
        datasourceId: "inshore",
        classKeys: [],
        formats: [],
        propertiesToKeep: [],
      },
      {
        newDatasourcePath: "./test/datasources_test.json",
        newDstPath: "./test/data",
      }
    );
    const offshoreD = await importDatasource(
      {
        geo_type: "vector",
        src: "data/src/Data_Products/Boundaries/offshore.shp",
        datasourceId: "offshore",
        classKeys: [],
        formats: [],
        propertiesToKeep: [],
      },
      {
        newDatasourcePath: "./test/datasources_test.json",
        newDstPath: "./test/data",
      }
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
      {
        newDatasourcePath: "./test/datasources_test.json",
        newDstPath: "./test/data",
      }
    );

    // ensure folder and files exist with proper contents!
  }, 10000);
});

// Switch to generating a geojson dataset
describe("Import raster data", () => {
  test("importRasterDatasource single class", async () => {
    // TODO: switch to generating test raster dataset
    const vectorD = await importDatasource(
      {
        geo_type: "raster",
        src: "data/src/Data_Products/OUS/heatmaps/Commercial_Fishing.tif",
        datasourceId: "ous_commercial",
        formats: [],
        noDataValue: 0,
        band: 1,
      },
      {
        newDatasourcePath: "./test/datasources_test.json",
        newDstPath: "./test/data",
      }
    );

    // ensure folder and files exist with proper contents!
  }, 10000);
});
