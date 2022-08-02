#! ./node_modules/.bin/ts-node
import inquirer from "inquirer";
import { readDatasources } from "../src/util/datasources/datasources";
import { formatDescriptions } from "../src/util/datasources/formats";
import { importDatasource } from "../src/util/datasources/importDatasource";
import {
  importDatasourceOptionsSchema,
  ImportDatasourceOptions,
  Datasources,
} from "../src/util/datasources/types";

import dsConfig from "../src/util/datasources/config";
import project from "../project";

interface ImportDatasourceAnswers
  extends Pick<
    ImportDatasourceOptions,
    "src" | "datasourceId" | "layerName" | "geo_type" | "formats"
  > {
  classKeys: string;
  propertiesToKeep: string;
}

// Main function, wrapped in an IIFE to avoid top-level await
if (typeof require !== "undefined" && require.main === module) {
  void (async function () {
    const datasources = readDatasources();
    const geoTypeAnswer = await geoTypeQuestion(datasources);
    const inputAnswers = await inputQuestions(datasources);
    const layerNameAnswer = await layerNameQuestion(inputAnswers.datasourceId);
    const detailedGeoAnswers = await detailedGeoQuestions(
      datasources,
      geoTypeAnswer.geo_type
    );

    const config = mapper({
      ...geoTypeAnswer,
      ...inputAnswers,
      ...layerNameAnswer,
      ...detailedGeoAnswers,
    });

    await importDatasource(config, { srcUrl: project.dataBucketUrl });
  })();
}

/** Maps answers object to options */
function mapper(answers: ImportDatasourceAnswers): ImportDatasourceOptions {
  const options: ImportDatasourceOptions = {
    ...answers,
    classKeys: answers.classKeys.length > 0 ? answers.classKeys.split(",") : [],
    propertiesToKeep:
      answers.propertiesToKeep.length > 0
        ? answers.propertiesToKeep.split(",")
        : [],
  };

  const validOptions = importDatasourceOptionsSchema.parse(options);
  return validOptions;
}

async function geoTypeQuestion(
  datasources: Datasources
): Promise<Pick<ImportDatasourceAnswers, "geo_type">> {
  return inquirer.prompt<Pick<ImportDatasourceAnswers, "geo_type">>([
    {
      type: "list",
      name: "geo_type",
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
}

async function inputQuestions(
  datasources: Datasources
): Promise<Pick<ImportDatasourceAnswers, "src" | "datasourceId">> {
  const datasourceIds = datasources.map((ds) => ds.datasourceId);
  return inquirer.prompt<Pick<ImportDatasourceAnswers, "src" | "datasourceId">>(
    [
      {
        type: "input",
        name: "src",
        message: "Enter path to src file (with filename)",
      },
      {
        type: "input",
        name: "datasourceId",
        message:
          "Choose unique datasource name (use letters, numbers, -, _ to ensure will work)",
        validate: (value) =>
          value === "" ||
          (!datasourceIds.includes(value) &&
            (/^[a-zA-Z0-9-_]+$/.test(value)
              ? true
              : "Invalid datasource name. Leave it blank or use alphanumeric strings with dash or underscore and separate with commas")),
      },
    ]
  );
}

async function layerNameQuestion(
  datasourceId: string
): Promise<Pick<ImportDatasourceAnswers, "layerName">> {
  return inquirer.prompt<Pick<ImportDatasourceAnswers, "layerName">>([
    {
      type: "input",
      name: "layerName",
      message: "Enter layer name, defaults to filename",
      default: datasourceId,
    },
  ]);
}

async function detailedGeoQuestions(
  datasources: Datasources,
  geo_type: string
): Promise<
  Pick<ImportDatasourceAnswers, "classKeys" | "propertiesToKeep" | "formats">
> {
  return inquirer.prompt<
    Pick<ImportDatasourceAnswers, "classKeys" | "propertiesToKeep" | "formats">
  >([
    {
      type: "input",
      name: "classKeys",
      message:
        "Enter feature property names that you want to group metrics by (separated by a comma e.g. prop1,prop2,prop3)",
      validate: (value) =>
        value === "" ||
        (/^[a-zA-Z0-9-, _]+$/.test(value)
          ? true
          : "Invalid property names. Leave it blank or use alphanumeric strings with dash or underscore and separate with commas"),
    },
    {
      type: "input",
      name: "propertiesToKeep",
      message:
        "Enter additional feature property names to keep in final datasource (separated by a comma e.g. prop1,prop2,prop3). All others will be filtered out",
      validate: (value) =>
        value === "" ||
        (/^[a-zA-Z0-9-, _]+$/.test(value)
          ? true
          : "Invalid property names. Leave it blank or use alphanumeric strings with dash or underscore and separate with commas"),
    },
    {
      type: "checkbox",
      name: "formats",
      message:
        "What formats would you like published to S3?  Suggested formats already selected",
      choices: dsConfig.importSupportedVectorFormats.map((name) => ({
        value: name,
        name: `${name} - ${formatDescriptions[name]}`,
        checked: dsConfig.importDefaultVectorFormats.includes(name),
      })),
    },
  ]);
}
