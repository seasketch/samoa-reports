import fs from "fs-extra";
import path from "path";
import { datasourcesSchema, Datasource, Datasources } from "./types";
import { isInternalDatasource } from "./helpers";

/**
 * Manages datasources for a geoprocessing project
 */

// Default datasource file location, relative to project root
export const DATASOURCE_PATH = "./datasources.json";

/** Creates or updates datasource record on disk */
export async function createOrUpdateDatasource(
  inputDatasource: Datasource,
  newDatasourcePath?: string
) {
  let dSources = readDatasources(newDatasourcePath);

  const dIndex = dSources.findIndex(
    (dSource) => dSource.datasourceId === inputDatasource.datasourceId
  );
  const dExists = dIndex > -1;
  if (dExists) {
    console.log(`Updating datasource ${inputDatasource.datasourceId}`);
    // Update in place
    let dsToUpdate = dSources[dIndex];
    if (isInternalDatasource(dsToUpdate)) {
      dsToUpdate = {
        ...inputDatasource,
        created: dsToUpdate.created,
      };
    } else {
      dsToUpdate = inputDatasource;
    }
  } else {
    console.log(`Updating datasource ${inputDatasource.datasourceId}`);
    // Just add onto the end
    dSources = dSources.concat(inputDatasource);
  }

  writeDatasources(dSources, newDatasourcePath);
}

/**
 * Reads datasources from disk and returns deep copy.
 * If datasource file not exist then start a new one and ensure directory exists
 */
export function readDatasources(filePath?: string) {
  // Start with default datasources
  let pds: Datasources = [
    {
      datasourceId: "global-clipping-osm-land",
      geo_type: "vector",
      url: "https://d3p1dsef9f0gjr.cloudfront.net/",
      formats: ["subdivided"],
      classKeys: [],
    },
    {
      datasourceId: "global-clipping-eez-land-union",
      geo_type: "vector",
      url: "https://d3muy0hbwp5qkl.cloudfront.net",
      formats: ["subdivided"],
      classKeys: [],
    },
  ];
  // Override datasources path
  const finalFilePath =
    filePath && filePath.length > 0 ? filePath : DATASOURCE_PATH;

  const diskPds = (() => {
    try {
      const dsString = fs.readFileSync(finalFilePath).toString();
      try {
        return JSON.parse(dsString);
      } catch (err: unknown) {
        throw new Error(
          `Unable to parse JSON found in ${finalFilePath}, fix it and try again`
        );
      }
    } catch (err: unknown) {
      console.log(
        `Datasource file not found at ${finalFilePath}, using default datasources`
      );
      fs.ensureDirSync(path.dirname(DATASOURCE_PATH));
      // fallback to default
      return pds;
    }
  })();

  const result = datasourcesSchema.safeParse(diskPds);
  if (!result.success) {
    console.error("Malformed datasources");
    console.log(JSON.stringify(result.error.issues, null, 2));
    throw new Error("Please fix or report this issue");
  } else {
    return result.data;
  }
}

export function writeDatasources(pd: Datasources, filePath?: string) {
  const finalFilePath =
    filePath && filePath.length > 0 ? filePath : DATASOURCE_PATH;
  fs.writeJSONSync(finalFilePath, pd, { spaces: 2 });
}
