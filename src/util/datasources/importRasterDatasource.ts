import path from "path";
import { $ } from "zx";
import fs from "fs-extra";
import {
  ClassStats,
  KeyStats,
  InternalRasterDatasource,
  ImportRasterDatasourceOptions,
  ImportRasterDatasourceConfig,
} from "./types";
import dsConfig from "./config";
import { publishDatasource } from "./publishDatasource";
import { createOrUpdateDatasource } from "./datasources";
import { getDatasetBucketName } from "./helpers";
import { loadCogWindow } from "./cog";
import project from "../../../project";
// @ts-ignore
import geoblaze from "geoblaze";
import LocalFileServer from "../localServer";

export async function importRasterDatasource(
  options: ImportRasterDatasourceOptions,
  extraOptions: {
    newDatasourcePath?: string;
    newDstPath?: string;
    srcUrl?: string;
    doPublish?: boolean;
  }
) {
  const { newDatasourcePath, newDstPath, doPublish = true } = extraOptions;
  const config = await genRasterConfig(options, newDstPath);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  await genCog(config);

  const tempPort = 8001;
  const server = new LocalFileServer({ path: config.dstPath, port: tempPort });
  const url = `${project.dataBucketUrl(true, tempPort)}${getCogFilename(
    config.datasourceId
  )}`;
  console.log(
    `Fetching raster to calculate stats from temp file server ${url}`
  );
  const raster = await loadCogWindow(url, {});
  server.close();

  const classStatsByProperty = await genRasterKeyStats(config, raster);
  console.log("Stats calculated");

  if (doPublish) {
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
  } else {
    console.log("Publish disabled");
  }

  const timestamp = new Date().toISOString();

  const newVectorD: InternalRasterDatasource = {
    src: config.src,
    band: config.band,
    geo_type: "raster",
    datasourceId: config.datasourceId,
    formats: config.formats,
    created: timestamp,
    lastUpdated: timestamp,
    keyStats: classStatsByProperty,
    noDataValue: config.noDataValue,
  };

  await createOrUpdateDatasource(newVectorD, newDatasourcePath);
  return newVectorD;
}

/** Takes import options and creates full import config */
export function genRasterConfig(
  options: ImportRasterDatasourceOptions,
  newDstPath?: string
): ImportRasterDatasourceConfig {
  let {
    geo_type,
    src,
    datasourceId,
    band,
    formats = dsConfig.importDefaultRasterFormats,
    noDataValue,
  } = options;

  if (!band) band = 0;

  const config: ImportRasterDatasourceConfig = {
    geo_type,
    src,
    dstPath: newDstPath || dsConfig.defaultDstPath,
    band,
    datasourceId,
    package: fs.readJsonSync(path.join(".", "package.json")),
    gp: fs.readJsonSync(path.join(".", "geoprocessing.json")),
    formats,
    noDataValue,
  };

  return config;
}

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
export async function genRasterKeyStats(
  options: ImportRasterDatasourceConfig,
  raster: any
): Promise<KeyStats> {
  // continous - sum
  const sum = geoblaze.sum(raster)[0] as number; // assumes single band/layer
  const totalStats = {
    count: null,
    sum,
    area: null,
  };

  // categorical - histogram, count
  const classStats = {};

  return {
    ...classStats,
    total: {
      total: totalStats,
    },
  };
}

export async function genCog(config: ImportRasterDatasourceConfig) {
  const { src } = config;
  const warpDst = getCogPath(config.dstPath, config.datasourceId, "_4326");
  const dst = getCogPath(config.dstPath, config.datasourceId);
  await $`gdalwarp -t_srs "EPSG:4326" ${src} ${warpDst}`;
  await $`gdal_translate -r nearest -of COG -stats ${warpDst} ${dst}`;
  await $`rm ${warpDst}`;
}

export function getCogFilename(datasourceId: string, postfix?: string) {
  return datasourceId + (postfix ? postfix : "") + ".tif";
}

export function getCogPath(
  dstPath: string,
  datasourceId: string,
  postfix?: string
) {
  return path.join(dstPath, datasourceId) + (postfix ? postfix : "") + ".tif";
}
