import { FeatureCollection, Polygon } from "@seasketch/geoprocessing";
import { $ } from "zx";
import fs from "fs-extra";
import path from "path";
import area from "@turf/area";

import { createOrUpdateDatasource } from "./datasources";
import { publishDatasource } from "./publishDatasource";

import {
  InternalDatasource,
  ClassStats,
  KeyStats,
  ImportDatasourceOptions,
  ImportDatasourceConfig,
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
  newDatasourcePath?: string,
  newDstPath?: string
) {
  const config = await genConfig(options, newDstPath);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  if (options.geo_type === "vector") {
    await genGeojson(config);
    await genFlatgeobuf(config);
  }
  const classStatsByProperty = genKeyStats(config);

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

  const newVectorD: InternalDatasource = {
    src: config.src,
    geo_type: "vector",
    datasourceId: config.datasourceId,
    formats: config.formats,
    classKeys: config.classKeys,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    keyStats: classStatsByProperty,
    propertiesToKeep: config.propertiesToKeep,
  };

  await createOrUpdateDatasource(newVectorD, newDatasourcePath);
  return newVectorD;
}

/** Takes import options and creates full import config */
function genConfig(
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
  };

  return config;
}

/** Convert vector datasource to GeoJSON */
async function genGeojson(config: ImportDatasourceConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getJsonFilename(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f GeoJSON -explodecollections -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

/** Returns classes for dataset.  If classKeys not defined then will return a single class with datasourceID */
function genKeyStats(options: ImportDatasourceConfig): KeyStats {
  const rawJson = fs.readJsonSync(getJsonFilename(options));
  const featureColl = rawJson as FeatureCollection<Polygon>;

  if (!options.classKeys || options.classKeys.length === 0)
    return {
      all: {
        [options.datasourceId]: {
          count: 1,
          area: area(featureColl),
        },
      },
    };

  return options.classKeys.reduce<KeyStats>((statsSoFar, classProperty) => {
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
  }, {});
}

/** Convert vector datasource to FlatGeobuf */
async function genFlatgeobuf(config: ImportDatasourceConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getFlatGeobufFilename(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f FlatGeobuf -explodecollections -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

function getJsonFilename(config: ImportDatasourceConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".json";
}

function getFlatGeobufFilename(config: ImportDatasourceConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".fgb";
}

function getDatasetBucketName(config: ImportDatasourceConfig) {
  return `gp-${config.package.name}-datasets`;
}
