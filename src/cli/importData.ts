#! ./node_modules/.bin/ts-node
import inquirer from "inquirer";
import { readDatasources } from "../util/datasources/datasources";
import { formatDescriptions } from "../util/datasources/formats";
import { importDatasource } from "../util/datasources/importDatasource";
import {
  importDatasourceOptionsSchema,
  ImportDatasourceOptions,
} from "../util/datasources/types";

import dsConfig from "../util/datasources/config";

interface ImportDatasourceAnswers
  extends Pick<
    ImportDatasourceOptions,
    "src" | "geo_type" | "datasourceId" | "formats"
  > {
  classKeys: string;
  propertiesToKeep: string;
}

// Main function, wrapped in an IIFE to avoid top-level await
if (typeof require !== "undefined" && require.main === module) {
  void (async function () {
    const answers = await askQuestions();

    const config = mapper(answers);

    await importDatasource(config);
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

/**
 * Collect answers from user
 */
async function askQuestions(): Promise<ImportDatasourceAnswers> {
  const datasources = readDatasources();
  const datasourceIds = datasources.map((ds) => ds.datasourceId);
  const answers = await inquirer.prompt<ImportDatasourceAnswers>([
    {
      type: "list",
      name: "geo_type",
      message: "Type of data?",
      choices: [
        {
          value: "vector",
          name: "Vector",
        },
      ],
    },
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

  return answers;
}
