import path from "path";
import { $ } from "zx";
import fs from "fs-extra";
import {
  ClassStats,
  KeyStats,
  InternalRasterDatasource,
  ImportRasterDatasourceOptions,
  Stats,
  ImportRasterDatasourceConfig,
} from "./types";
import dsConfig from "./config";
import { publishDatasource } from "./publishDatasource";
import { createOrUpdateDatasource } from "./datasources";
import { getDatasetBucketName } from "./helpers";
import { loadCogWindow } from "./cog";
// @ts-ignore
import geoblaze from "geoblaze";

// export async function importRasterDatasource(
//   options: ImportRasterDatasourceOptions,
//   extraOptions: {
//     newDatasourcePath?: string;
//     newDstPath?: string;
//     srcUrl?: string;
//   }
// ) {
//   const { newDatasourcePath, newDstPath, srcUrl } = extraOptions;
//   const config = await genVectorConfig(options, newDstPath);

//   // Ensure dstPath is created
//   fs.ensureDirSync(config.dstPath);

//   await genCog(config);

//   const classStatsByProperty = genRasterKeyStats(config);

//   await Promise.all(
//     config.formats.map((format) => {
//       return publishDatasource(
//         config.dstPath,
//         format,
//         config.datasourceId,
//         getDatasetBucketName(config)
//       );
//     })
//   );

//   const timestamp = new Date().toISOString();

//   const newVectorD: InternalRasterDatasource = {
//     src: config.src,
//     layerName: config.layerName,
//     geo_type: "vector",
//     datasourceId: config.datasourceId,
//     formats: config.formats,
//     classKeys: config.classKeys,
//     created: timestamp,
//     lastUpdated: timestamp,
//     keyStats: classStatsByProperty,
//     propertiesToKeep: config.propertiesToKeep,
//     explodeMulti: config.explodeMulti,
//   };

//   await createOrUpdateDatasource(newVectorD, newDatasourcePath);
//   return newVectorD;
// }

// /** Takes import options and creates full import config */
// export function genVectorConfig(
//   options: ImportVectorDatasourceOptions,
//   newDstPath?: string
// ): ImportVectorDatasourceConfig {
//   let {
//     geo_type,
//     src,
//     datasourceId,
//     propertiesToKeep = [],
//     classKeys,
//     layerName,
//     formats = dsConfig.importDefaultVectorFormats,
//     explodeMulti,
//   } = options;

//   if (!layerName)
//     layerName = path.basename(src, "." + path.basename(src).split(".").pop());

//   // merge to ensure keep at least classKeys
//   propertiesToKeep = Array.from(new Set(propertiesToKeep.concat(classKeys)));

//   const config: ImportRasterDatasourceConfig = {
//     geo_type,
//     src,
//     dstPath: newDstPath || dsConfig.defaultDstPath,
//     propertiesToKeep,
//     classKeys,
//     layerName,
//     datasourceId,
//     package: fs.readJsonSync(path.join(".", "package.json")),
//     gp: fs.readJsonSync(path.join(".", "geoprocessing.json")),
//     formats,
//     explodeMulti,
//   };

//   return config;
// }

// /** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
// export async function genRasterKeyStats(
//   options: ImportRasterDatasourceConfig,
//   srcUrl: string
// ): KeyStats {
//   console.log(`Fetching ${srcUrl}`);
//   const raster = await loadCogWindow(srcUrl, {});

//   // continous - sum
//   const value = geoblaze.sum(raster)[0] as number; // assumes single band/layer
//   return createMetric({
//     classId: curClass.classId,
//     metricId: METRIC.metricId,
//     value,
//   });

//   // categorical - histogram
// }

export async function genCog(config: ImportRasterDatasourceConfig) {
  const { src } = config;
  const warpDst = getCogPath(config, "_4326");
  const dst = getCogPath(config);
  await $`gdalwarp -t_srs "EPSG:4326" ${src} ${warpDst}`;
  await $`gdal_translate -r nearest -of COG -stats ${warpDst} ${dst}`;
  await $`rm ${warpDst}`;
}

function getCogPath(config: ImportRasterDatasourceConfig, postfix?: string) {
  return (
    path.join(config.dstPath, config.datasourceId) +
    (postfix ? postfix : "") +
    ".tif"
  );
}
