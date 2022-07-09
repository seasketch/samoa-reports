#! ./node_modules/.bin/ts-node

import { $ } from "zx";
import {
  FeatureCollection,
  Polygon,
  GeoprocessingJsonConfig,
  ISO8601DateTime,
  groupBy,
} from "@seasketch/geoprocessing";
import { Package } from "@seasketch/geoprocessing/dist/scripts";
import fs from "fs-extra";
import inquirer from "inquirer";
import path from "path";
import area from "@turf/area";
import cloneDeep from "lodash/cloneDeep";

type SUPPORTED_VECTOR_FORMATS = "fgb" | "json";
type SUPPORTED_RASTER_FORMATS = "tif";

type ClassStats = Record<string, { count: number; area: number }>;

let DATASOURCE_PATH = "./datasources.json";

/** Flexible options for representing a vector dataset to import */
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
  /** Property to use to group by class */
  classProperty?: string;
  /** Properties to filter into final dataset, all others will be removed */
  propertiesToKeep?: string[];
  /** Formats to publish to S3 */
  formatsToPublish?: SUPPORTED_VECTOR_FORMATS[];
  /** Whether to publish the datasource to s3 */
  publish?: boolean;
}

/** Full properties of imported dataset */
export interface ImportVectorConfig extends ImportVectorOptions {
  dstPath: string;
  layerName: string;
  propertiesToKeep: string[];
  formatsToPublish: SUPPORTED_VECTOR_FORMATS[];
  meta: {
    package: Package;
    gp: GeoprocessingJsonConfig;
  };
}

interface Datasource {
  /** File basename */
  datasourceId: string;
  created: ISO8601DateTime;
  lastUpdated: ISO8601DateTime;
}

export interface VectorDatasource extends Datasource {
  /** Formats published */
  formats: SUPPORTED_VECTOR_FORMATS[];
  /** Property to use to group by class */
  classProperty?: string;
  /**  */
  classStats: ClassStats;
}

export interface RasterDatasource extends Datasource {
  /** Formats published */
  formats: SUPPORTED_RASTER_FORMATS[];
  classStats: ClassStats;
}

export interface PublishedDatasources {
  vector: VectorDatasource[];
  raster: RasterDatasource[];
}

export interface DataTypeAnswer {
  dataType: "raster" | "vector";
}

/** Represents  */
export interface DatasourceIngest {
  srcDatasourceName: string;
  /** Optional name of feature property containing class ID */
  classProperty?: string;
}

// Main function, wrapped in an IIFE to avoid top-level await
if (typeof require !== "undefined" && require.main === module) {
  void (async function () {
    await askQuestions();
  })();
}

/**
 * Collect answers from user
 */
async function askQuestions() {
  const dataTypeAnswer = await inquirer.prompt<DataTypeAnswer>([
    {
      type: "list",
      name: "dataType",
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

  console.log("the answers", dataTypeAnswer);

  if (dataTypeAnswer.dataType === "vector") {
    // ask for optional classProperty
  }
}

/**
 * Import a vector dataset into the project.  Must be a src file that OGR can read.
 * Importing means stripping out all but classProperty and attribsToKeep, converting to geojson/flatgeobuf and publishing to the datasets s3 bucket
 */
export async function importVector(options: ImportVectorOptions) {
  const config = await genConfig(options);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  await genGeojson(config);
  const classStats = genClassStats(config);
  await genFlatgeobuf(config);
  if (options.publish) {
    await publishData(config);
  } else {
  }

  // Override datasources path
  if (options.datasourcePath && options.datasourcePath.length > 0)
    DATASOURCE_PATH = options.datasourcePath;

  const newVectorD: VectorDatasource = {
    datasourceId: config.datasourceId,
    formats: config.formatsToPublish,
    classProperty: config.classProperty,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    classStats,
  };

  await createOrUpdateVectorDatasource(newVectorD);
  return newVectorD;
}

function genConfig(options: ImportVectorOptions): ImportVectorConfig {
  let {
    src,
    dstPath = "data/dist",
    datasourceId,
    propertiesToKeep = [],
    classProperty,
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
    classProperty,
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
function genClassStats(options: ImportVectorConfig): ClassStats {
  const rawJson = fs.readJsonSync(getJsonFilename(options));
  const featureColl = rawJson as FeatureCollection<Polygon>;

  if (!options.classProperty)
    return {
      [options.datasourceId]: {
        count: 1,
        area: area(featureColl),
      },
    };

  const classStats = featureColl.features.reduce<ClassStats>(
    (classesSoFar, feat) => {
      if (!feat.properties) throw new Error("Missing properties");
      if (!options.classProperty) throw new Error("Missing classProperty");
      const curClass = feat.properties[options.classProperty];
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
  return classStats;
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

/** Creates a new vector datasource record */
async function createOrUpdateVectorDatasource(newVectorD: VectorDatasource) {
  const oldPds = readPublishedDatasources();

  const newPds = (() => {
    const dIndex = oldPds.vector.findIndex(
      (vd) => vd.datasourceId === newVectorD.datasourceId
    );
    const dExists = dIndex > -1;
    if (dExists) {
      console.log(`Updating datasource ${newVectorD.datasourceId}`);
      // Clone
      const newPds = cloneDeep(oldPds);
      // Update in place
      newPds.vector[dIndex] = {
        ...newVectorD,
        created: newPds.vector[dIndex].created,
      };
      return newPds;
    } else {
      console.log(`Updating datasource ${newVectorD.datasourceId}`);
      // Just add onto the end
      return {
        ...oldPds,
        vector: oldPds.vector.concat(newVectorD),
      };
    }
  })();

  writePublishedDatasources(newPds);
}

/** Read datasources from disk, and if no exist then start a new one and ensure directory exists */
function readPublishedDatasources() {
  let pd: PublishedDatasources = {
    vector: [],
    raster: [],
  };
  try {
    const diskPD = fs.readJSONSync(DATASOURCE_PATH) as PublishedDatasources;
    if (Array.isArray(diskPD.raster) && Array.isArray(diskPD.vector)) {
      pd = diskPD;
    }
  } catch {
    fs.ensureDirSync(path.dirname(DATASOURCE_PATH));
  }
  return pd;
}

function writePublishedDatasources(pd: PublishedDatasources) {
  fs.writeJSONSync(DATASOURCE_PATH, pd, { spaces: 2 });
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
