import path from "path";
import { FeatureCollection, Polygon } from "@seasketch/geoprocessing";
import { $ } from "zx";
import fs from "fs-extra";
import {
  ClassStats,
  KeyStats,
  InternalVectorDatasource,
  ImportVectorDatasourceOptions,
  Stats,
  ImportVectorDatasourceConfig,
} from "./types";
import dsConfig from "./config";
import { publishDatasource } from "./publishDatasource";
import { createOrUpdateDatasource } from "./datasources";
import area from "@turf/area";
import { getDatasetBucketName } from "./helpers";

export async function importVectorDatasource(
  options: ImportVectorDatasourceOptions,
  extraOptions: {
    newDatasourcePath?: string;
    newDstPath?: string;
    srcUrl?: string;
    doPublish?: boolean;
  }
) {
  const { newDatasourcePath, newDstPath, doPublish = true } = extraOptions;
  const config = await genVectorConfig(options, newDstPath);

  // Ensure dstPath is created
  fs.ensureDirSync(config.dstPath);

  await genGeojson(config);
  await genFlatgeobuf(config);

  const classStatsByProperty = genVectorKeyStats(config);

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

  const newVectorD: InternalVectorDatasource = {
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
export function genVectorConfig(
  options: ImportVectorDatasourceOptions,
  newDstPath?: string
): ImportVectorDatasourceConfig {
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

  const config: ImportVectorDatasourceConfig = {
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
export function genVectorKeyStats(
  config: ImportVectorDatasourceConfig
): KeyStats {
  const rawJson = fs.readJsonSync(
    getJsonPath(config.dstPath, config.datasourceId)
  );
  const featureColl = rawJson as FeatureCollection<Polygon>;

  if (!config.classKeys || config.classKeys.length === 0)
    return {
      total: {
        total: {
          count: featureColl.features.length,
          sum: null,
          area: area(featureColl),
        },
      },
    };

  const totalStats = featureColl.features.reduce<Stats>(
    (statsSoFar, feat) => {
      const featArea = area(feat);
      return {
        count: statsSoFar.count! + 1,
        sum: null,
        area: statsSoFar.area! + featArea,
      };
    },
    {
      count: 0,
      sum: null,
      area: 0,
    }
  );

  const classStats = config.classKeys.reduce<KeyStats>(
    (statsSoFar, classProperty) => {
      const metrics = featureColl.features.reduce<ClassStats>(
        (classesSoFar, feat) => {
          if (!feat.properties) throw new Error("Missing properties");
          if (!config.classKeys) throw new Error("Missing classProperty");
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
export async function genGeojson(config: ImportVectorDatasourceConfig) {
  let { src, propertiesToKeep, layerName } = config;
  const dst = getJsonPath(config.dstPath, config.datasourceId);
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
export async function genFlatgeobuf(config: ImportVectorDatasourceConfig) {
  const { src, propertiesToKeep, layerName } = config;
  const dst = getFlatGeobufPath(config.dstPath, config.datasourceId);
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

function getJsonPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".json";
}

function getFlatGeobufPath(dstPath: string, datasourceId: string) {
  return path.join(dstPath, datasourceId) + ".fgb";
}
