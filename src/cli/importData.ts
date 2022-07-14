#! ./node_modules/.bin/ts-node
import inquirer from "inquirer";
import { importVectorDataset } from "../util/importDatasource";
import { GeoTypes } from "../util/types";

export interface DataTypeAnswer {
  dataType: GeoTypes;
}

/** Represents  */
export interface DatasourceIngest {
  srcDatasourceName: string;
  /** Optional name of feature property containing class ID */
  classProperty?: string;
}

// Main function, wrapped in an IIFE to avoid top-level await
if (typeof require !== "undefined" && require.main === module) {
  void (async function () {
    const answers = await askQuestions();

    // PULL THESE FROM QUESTIONS
    const config = {
      src: "data/src/Data_Received/Layers_From_Kaituu/Revised Deepwater Bioregions.shp",
      dstPath: "./test/data",
      datasourceId: "deepwater_bioregions",
      // datasourcePath: "./test/datasources_test.json",
      classKeys: ["Draft name"],
      publish: false,
    };

    await importVectorDataset(config);
  })();
}

/**
 * Collect answers from user
 */
async function askQuestions() {
  const dataTypeAnswer = await inquirer.prompt<DataTypeAnswer>([
    {
      type: "list",
      name: "dataType",
      message: "Type of data?",
      choices: [
        {
          value: "vector",
          name: "Vector",
        },
        {
          value: "raster",
          name: "Raster",
        },
      ],
    },
  ]);

  console.log("the answers", dataTypeAnswer);

  if (dataTypeAnswer.dataType === "vector") {
    // ask for optional classProperty
  }
}
