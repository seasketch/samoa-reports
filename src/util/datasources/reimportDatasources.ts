import { createOrUpdateDatasource, readDatasources } from "./datasources";
import { publishDatasource } from "./publishDatasource";

import {
  ImportVectorDatasourceOptions,
  importVectorDatasourceOptionsSchema,
  InternalVectorDatasource,
} from "./types";
import { isInternalVectorDatasource } from "./helpers";
import { getDatasetBucketName } from "./helpers";
import {
  genVectorConfig,
  genGeojson,
  genFlatgeobuf,
  genVectorKeyStats,
} from "./importVectorDatasource";

/**
 * Import a dataset into the project.  Must be a src file that OGR or GDAL can read.
 * Importing means stripping unnecessary properties/layers,
 * converting to cloud optimized format, publishing to the datasets s3 bucket,
 * and adding as datasource.
 */
export async function reimportDatasources(
  /** Alternative path to look for datasources than default. useful for testing */
  newDatasourcePath?: string,
  /** Alternative path to store transformed data. useful for testing */
  newDstPath?: string
) {
  const datasources = readDatasources(newDatasourcePath);

  // Process one at a time
  let failed = 0;
  let updated = 0;
  for (const ds of datasources) {
    if (isInternalVectorDatasource(ds) && ds.geo_type === "vector") {
      try {
        console.log(`${ds.datasourceId} reimport started`);
        // parse import options from datasource record, is just a subset
        const options: ImportVectorDatasourceOptions =
          importVectorDatasourceOptionsSchema.parse(ds);
        // generate full config
        const config = genVectorConfig(options, newDstPath);
        await genGeojson(config);
        await genFlatgeobuf(config);
        const classStatsByProperty = genVectorKeyStats(config);

        await Promise.all(
          config.formats.map((format) => {
            return publishDatasource(
              config.dstPath,
              format,
              config.datasourceId,
              getDatasetBucketName(config)
            );
          })
        );

        const newVectorD: InternalVectorDatasource = {
          ...ds,
          keyStats: classStatsByProperty,
        };

        await createOrUpdateDatasource(newVectorD, newDatasourcePath);
        console.log(`${ds.datasourceId} reimport complete`);
        updated += 1;
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.log(e.message);
          console.log(e.stack);
          console.log(
            `Updating datasource ${ds.datasourceId} failed, moving to next`
          );
          failed += 1;
        }
      }
    } else {
      console.log(`Skipping ${ds.datasourceId}, reimport not supported`);
    }
    console.log(" ");
  }

  console.log(`${updated} datasources reimported successfully`);
  if (failed > 0) {
    console.log(
      `${failed} datasources failed to reimported.  Fix them and try again`
    );
  }
}
