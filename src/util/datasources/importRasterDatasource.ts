import path from "path";
import { $ } from "zx";
import fs from "fs-extra";
import {
  KeyStats,
  InternalRasterDatasource,
  ImportRasterDatasourceOptions,
  ImportRasterDatasourceConfig,
  ClassStats,
} from "./types";
import dsConfig from "./config";
import { publishDatasource } from "./publishDatasource";
import { createOrUpdateDatasource } from "./datasources";
import {
  getDatasetBucketName,
  getJsonFilename,
  isInternalVectorDatasource,
} from "./helpers";
import { loadCogWindow } from "./cog";
import project from "../../../project";
// @ts-ignore
import geoblaze from "geoblaze";
import LocalFileServer from "../localServer";
import { getCogFilename } from "./helpers";
import dissolve from "@turf/dissolve";
import {
  Histogram,
  isPolygonFeature,
  FeatureCollection,
  Polygon,
} from "@seasketch/geoprocessing";

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
    measurementType: config.measurementType,
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
    measurementType,
    filterDatasource,
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
    measurementType,
    filterDatasource,
  };

  return config;
}

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
export async function genRasterKeyStats(
  options: ImportRasterDatasourceConfig,
  raster: any
): Promise<KeyStats> {
  // Optional filter polygon for raster precalc
  const filterPoly = await (async () => {
    if (!options.filterDatasource) {
      return undefined;
    }
    const ds = project.getDatasourceById(options.filterDatasource);
    if (isInternalVectorDatasource(ds)) {
      const jsonFilename = path.join("./data/dist", getJsonFilename(ds));
      const polys = fs.readJsonSync(jsonFilename) as FeatureCollection<Polygon>;
      const filterPoly = dissolve(polys).features[0];
      console.log(`Using filterDatasource ${options.filterDatasource}`);
      if (isPolygonFeature(filterPoly)) {
        return filterPoly;
      } else {
        `Expected datasource ${ds.datasourceId} to contain a single polygon feature`;
      }
    } else {
      throw new Error(
        `Expected ${ds.datasourceId} to be an internal vector datasource`
      );
    }
  })();

  // continous - sum
  const sum = (() => {
    if (options.measurementType !== "quantitative") {
      return null;
    }
    return geoblaze.sum(raster, filterPoly)[0] as number;
  })();

  // categorical - histogram, count by class
  const classStats: ClassStats = (() => {
    console.log("measurementType", options.measurementType);
    if (options.measurementType !== "categorical") return {};

    const histogram = geoblaze.histogram(raster) as Histogram;
    console.log("histogram");
    console.log(histogram);
    if (!histogram) throw new Error("Histogram not returned");
    // convert histogram to classStats
    const classStats = Object.keys(histogram).reduce<ClassStats>(
      (statsSoFar, curClass) => {
        return {
          ...statsSoFar,
          [curClass]: {
            count: histogram[curClass],
          },
        };
      },
      {}
    );
    console.log("classStats", classStats);
    return classStats;
  })();

  const totalStats = {
    sum,
    count: null,
    area: null,
  };

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
  await $`gdal_translate -b ${config.band} -r nearest -of COG -stats ${warpDst} ${dst}`;
  await $`rm ${warpDst}`;
}

export function getCogPath(
  dstPath: string,
  datasourceId: string,
  postfix?: string
) {
  return path.join(dstPath, datasourceId) + (postfix ? postfix : "") + ".tif";
}
