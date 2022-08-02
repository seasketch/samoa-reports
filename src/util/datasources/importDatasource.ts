import {
  createMetric,
  FeatureCollection,
  Polygon,
} from "@seasketch/geoprocessing";
import { $ } from "zx";
import fs from "fs-extra";
import path from "path";
import area from "@turf/area";
import { loadCogWindow } from "./cog";
// @ts-ignore
import geoblaze from "geoblaze";

import { createOrUpdateDatasource } from "./datasources";
import { publishDatasource } from "./publishDatasource";

import {
  InternalDatasource,
  ClassStats,
  KeyStats,
  ImportDatasourceOptions,
  ImportDatasourceConfig,
  Stats,
} from "./types";
import dsConfig from "./config";

/**
 * Import a dataset into the project.  Must be a src file that OGR or GDAL can read.
 * Importing means stripping unnecessary properties/layers,
 * converting to cloud optimized format, publishing to the datasets s3 bucket,
 * and adding as datasource.
 */
export async function importDatasource(
  options: ImportDatasourceOptions,
  extraOptions: {
    newDatasourcePath?: string;
    newDstPath?: string;
    srcUrl?: string;
  }
) {
  const { newDatasourcePath, newDstPath, srcUrl } = extraOptions;
  const config = await genConfig(options, newDstPath);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  if (options.geo_type === "vector") {
    await genGeojson(config);
    await genFlatgeobuf(config);
  }
  // else if (options.geo_type === "raster") {
  //   await genCog(config);
  // }

  const classStatsByProperty = (() => {
    // if (options.geo_type === "vector") {
    return genVectorKeyStats(config);
    // }
    // else {
    //   if (!srcUrl) throw new Error("Missing srcUrl in importDatasource");
    //   return genRasterKeyStats(config, srcUrl);
    // }
  })();

  // categorical only? does histogram
  // genRasterKeyStats(config)

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

  const timestamp = new Date().toISOString();
  const newVectorD: InternalDatasource = {
    src: config.src,
    layerName: config.layerName,
    geo_type: "vector",
    datasourceId: config.datasourceId,
    formats: config.formats,
    classKeys: config.classKeys,
    created: timestamp,
    lastUpdated: timestamp,
    keyStats: classStatsByProperty,
    propertiesToKeep: config.propertiesToKeep,
    explodeMulti: config.explodeMulti,
  };

  await createOrUpdateDatasource(newVectorD, newDatasourcePath);
  return newVectorD;
}

/** Takes import options and creates full import config */
export function genConfig(
  options: ImportDatasourceOptions,
  newDstPath?: string
): ImportDatasourceConfig {
  let {
    geo_type,
    src,
    datasourceId,
    propertiesToKeep = [],
    classKeys,
    layerName,
    formats = dsConfig.importDefaultVectorFormats,
    explodeMulti,
  } = options;

  if (!layerName)
    layerName = path.basename(src, "." + path.basename(src).split(".").pop());

  // merge to ensure keep at least classKeys
  propertiesToKeep = Array.from(new Set(propertiesToKeep.concat(classKeys)));

  const config: ImportDatasourceConfig = {
    geo_type,
    src,
    dstPath: newDstPath || dsConfig.defaultDstPath,
    propertiesToKeep,
    classKeys,
    layerName,
    datasourceId,
    package: fs.readJsonSync(path.join(".", "package.json")),
    gp: fs.readJsonSync(path.join(".", "geoprocessing.json")),
    formats,
    explodeMulti,
  };

  return config;
}

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
// export async function genRasterKeyStats(
//   options: ImportDatasourceConfig,
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

/** Returns classes for datasource.  If classKeys not defined then will return a single class with datasourceID */
export function genVectorKeyStats(options: ImportDatasourceConfig): KeyStats {
  const rawJson = fs.readJsonSync(getJsonPath(options));
  const featureColl = rawJson as FeatureCollection<Polygon>;

  if (!options.classKeys || options.classKeys.length === 0)
    return {
      total: {
        total: {
          count: 1,
          area: area(featureColl),
        },
      },
    };

  const totalStats = featureColl.features.reduce<Stats>(
    (statsSoFar, feat) => {
      const featArea = area(feat);
      return {
        count: statsSoFar.count + 1,
        area: statsSoFar?.area || 0 + featArea,
      };
    },
    {
      count: 0,
      area: 0,
    }
  );

  const classStats = options.classKeys.reduce<KeyStats>(
    (statsSoFar, classProperty) => {
      const metrics = featureColl.features.reduce<ClassStats>(
        (classesSoFar, feat) => {
          if (!feat.properties) throw new Error("Missing properties");
          if (!options.classKeys) throw new Error("Missing classProperty");
          const curClass = feat.properties[classProperty];
          const curCount = classesSoFar[curClass]?.count || 0;
          const curArea = classesSoFar[curClass]?.area || 0;
          const featArea = area(feat);
          return {
            ...classesSoFar,
            [curClass]: {
              count: curCount + 1,
              area: curArea + featArea,
            },
          };
        },
        {}
      );

      return {
        ...statsSoFar,
        [classProperty]: metrics,
      };
    },
    {}
  );

  return {
    ...classStats,
    total: {
      total: totalStats,
    },
  };
}

/** Convert vector datasource to GeoJSON */
export async function genGeojson(config: ImportDatasourceConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getJsonPath(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  const explodeOption =
    config.explodeMulti === undefined
      ? "-explodecollections"
      : config.explodeMulti === true
      ? "-explodecollections"
      : "";
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f GeoJSON  ${explodeOption} -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

/** Convert vector datasource to FlatGeobuf */
export async function genFlatgeobuf(config: ImportDatasourceConfig) {
  const { src, propertiesToKeep, layerName } = config;
  const dst = getFlatGeobufPath(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  const explodeOption =
    config.explodeMulti === undefined
      ? "-explodecollections"
      : config.explodeMulti === true
      ? "-explodecollections"
      : "";
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f FlatGeobuf ${explodeOption} -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

export async function genCog(config: ImportDatasourceConfig) {
  const { src } = config;
  const warpDst = getCogPath(config, "_4326");
  const dst = getCogPath(config);
  await $`gdalwarp -t_srs "EPSG:4326" ${src} ${warpDst}`;
  await $`gdal_translate -r nearest -of COG -stats ${warpDst} ${dst}`;
  await $`rm ${warpDst}`;
}

function getJsonPath(config: ImportDatasourceConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".json";
}

function getFlatGeobufPath(config: ImportDatasourceConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".fgb";
}

function getCogPath(config: ImportDatasourceConfig, postfix?: string) {
  return (
    path.join(config.dstPath, config.datasourceId) +
    (postfix ? postfix : "") +
    ".tif"
  );
}

export function getDatasetBucketName(config: ImportDatasourceConfig) {
  return `gp-${config.package.name}-datasets`;
}
