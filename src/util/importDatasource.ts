import {
  FeatureCollection,
  Polygon,
  GeoprocessingJsonConfig,
} from "@seasketch/geoprocessing";
import { Package } from "@seasketch/geoprocessing/dist/scripts";
import { $ } from "zx";
import fs from "fs-extra";
import path from "path";
import area from "@turf/area";

import { createOrUpdateDatasource } from "./datasources";

import {
  InternalDatasource,
  SupportedFormats,
  ClassStats,
  KeyStats,
} from "./types";

/** Flexible options for representing a vector file dataset to import */
export interface ImportVectorOptions {
  /** Path to the src dataset */
  src: string;
  /** Name to call this datasource once imported */
  datasourceId: string;
  /** Path to datasource file */
  datasourcePath?: string;
  /** Path to store imported data */
  dstPath?: string;
  /** Layer name within datasource */
  layerName?: string;
  /** Properties to group by and calculate stats */
  classKeys: string[];
  /** Properties to filter into final dataset, all others will be removed */
  propertiesToKeep?: string[];
  /** Formats to publish to S3 */
  formatsToPublish?: SupportedFormats[];
  /** Whether to publish the datasource to s3 */
  publish?: boolean;
}

/** Full properties of imported dataset */
export interface ImportVectorConfig extends ImportVectorOptions {
  dstPath: string;
  layerName: string;
  propertiesToKeep: string[];
  formatsToPublish: SupportedFormats[];
  meta: {
    package: Package;
    gp: GeoprocessingJsonConfig;
  };
}

/**
 * Import a vector dataset into the project.  Must be a src file that OGR can read.
 * Importing means stripping out all but classProperty and attribsToKeep,
 * converting to geojson/flatgeobuf, publishing to the datasets s3 bucket,
 * and adding as datasource.
 */
export async function importVectorDataset(options: ImportVectorOptions) {
  const config = await genConfig(options);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  await genGeojson(config);
  const classStatsByProperty = genKeyStats(config);
  await genFlatgeobuf(config);
  if (options.publish) {
    await publishData(config);
  }

  const newVectorD: InternalDatasource = {
    geo_type: "vector",
    datasourceId: config.datasourceId,
    formats: config.formatsToPublish,
    classKeys: config.classKeys,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    keyStats: classStatsByProperty,
  };

  await createOrUpdateDatasource(newVectorD, options.datasourcePath);
  return newVectorD;
}

function genConfig(options: ImportVectorOptions): ImportVectorConfig {
  let {
    src,
    dstPath = "data/dist",
    datasourceId,
    propertiesToKeep = [],
    classKeys,
    layerName,
    formatsToPublish = ["fgb"],
    publish = true,
  } = options;
  if (!layerName)
    layerName = path.basename(src, "." + path.basename(src).split(".").pop());
  if (!propertiesToKeep) propertiesToKeep = [layerName];

  const meta = {
    package: fs.readJsonSync(path.join(".", "package.json")),
    gp: fs.readJsonSync(path.join(".", "geoprocessing.json")),
  };

  return {
    src,
    dstPath,
    propertiesToKeep,
    classKeys,
    layerName,
    datasourceId,
    formatsToPublish,
    meta,
    publish,
  };
}

/** Convert vector datasource to GeoJSON */
async function genGeojson(config: ImportVectorConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getJsonFilename(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f GeoJSON -explodecollections -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

/** Returns classes for dataset.  If classProperty not defined then will return a single class with datasourceID */
function genKeyStats(options: ImportVectorConfig): KeyStats {
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
async function genFlatgeobuf(config: ImportVectorConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getFlatGeobufFilename(config);
  const query = `SELECT "${
    propertiesToKeep.length > 0 ? propertiesToKeep.join(",") : "*"
  }" FROM "${layerName}"`;
  fs.removeSync(dst);
  await $`ogr2ogr -t_srs "EPSG:4326" -f FlatGeobuf -explodecollections -dialect OGRSQL -sql ${query} ${dst} ${src}`;
}

/** Publish datasource to datasets bucket */
async function publishData(config: ImportVectorConfig) {
  await Promise.all(
    config.formatsToPublish.map(async (format) => {
      return await $`aws s3 sync ${config.dstPath} s3://${getDatasetBucketName(
        config
      )}`;
    })
  );
}

function getJsonFilename(config: ImportVectorConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".json";
}

function getFlatGeobufFilename(config: ImportVectorConfig) {
  return path.join(config.dstPath, config.datasourceId) + ".fgb";
}

function getDatasetBucketName(config: ImportVectorConfig) {
  return `gp-${config.meta.package.name}-datasets`;
}
