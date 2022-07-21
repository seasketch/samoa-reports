import datasources from "./datasources.json";
import metrics from "./metrics.json";
import objectives from "./objectives.json";
import project from "./project.json";
import projectPackage from "../package.json";
import gp from "../geoprocessing.json";

import {
  Datasources,
  Datasource,
  datasourcesSchema,
} from "../src/util/datasources/types";
import { getDatasourceById } from "../src/util/datasources/helpers";
import {
  MetricGroup,
  MetricGroups,
  metricGroupsSchema,
} from "../src/util/metrics/types";
import { ObjectivesNew, objectivesSchema } from "../src/util/objectives/types";
import {
  BBox,
  GeoprocessingJsonConfig,
  Feature,
  Polygon,
} from "@seasketch/geoprocessing";

import {
  getLandVectorDatasource as getGlobalLandVectorDatasource,
  getEezVectorDatasource as getGlobalEezVectorDatasource,
  getGlobalVectorDatasourceById,
} from "../src/util/datasources/global";
import { Package } from "@seasketch/geoprocessing/dist/scripts";
import { Project, projectSchema } from "../src/util/project/types";

/**
 * Read-only client for project configuration for use by clients and functions
 * Merges, validates, and otherwise ties everything together
 */
export class ConfigClient {
  private static _instance: ConfigClient = new ConfigClient();

  private _project: Project = projectSchema.parse(project);
  private _datasources: Datasources = datasourcesSchema.parse(datasources);
  private _metrics: MetricGroups = metricGroupsSchema.parse(metrics);
  private _objectives: ObjectivesNew = objectivesSchema.parse(objectives);
  // ToDo: add zod schema and validate
  private _package: Package = projectPackage as Package;
  // ToDo: add zod schema and validate
  private _geoprocessing: GeoprocessingJsonConfig = gp;

  constructor() {
    if (ConfigClient._instance) {
      throw new Error(
        "Error: Instantiation failed: Use Config.getInstance() instead of new."
      );
    }
    ConfigClient._instance = this;
  }

  public static getInstance(): ConfigClient {
    return ConfigClient._instance;
  }

  // ASSETS //

  /** Returns typed config from project.json */
  public get project(): Project {
    return this._project;
  }

  /** Returns typed config from datasources.json */
  public get datasources(): Datasources {
    return this._datasources;
  }

  /** Returns typed config from metrics.json */
  public get metrics(): MetricGroups {
    return this._metrics;
  }

  /** Returns typed config from objectives.json */
  public get objectives(): ObjectivesNew {
    return this._objectives;
  }

  /** Returns typed config from package.json */
  public get package(): Package {
    return this._package;
  }

  /** Returns typed config from geoprocessing.json */
  public get geoprocessing(): GeoprocessingJsonConfig {
    return this._geoprocessing;
  }

  /**
   * Returns URL to dataset bucket for project.  In test environment will
   * return local URL expected to serve up dist data folder
   */
  public get dataBucketUrl() {
    return process.env.NODE_ENV === "test"
      ? `http://127.0.0.1:8080/`
      : `https://gp-${this._package.name}-datasets.s3.${this._geoprocessing.region}.amazonaws.com/`;
  }

  /** Returns bounding box of the project region */
  public get projectBbox() {
    return this._project.bbox;
  }

  // HELPERS //

  /** Returns Datasource given datasourceId */
  public getDatasourceById(datasourceId: string): Datasource {
    return getDatasourceById(datasourceId, this._datasources);
  }

  /** Returns global VectorDatasource given datasourceId */
  public getGlobalVectorDatasourceById(datasourceId: string) {
    return getGlobalVectorDatasourceById(datasourceId, this._datasources);
  }

  /** Returns global land VectorDatasource */
  public getGlobalLandVectorDatasource() {
    return getGlobalLandVectorDatasource(this._datasources);
  }

  /** Returns global eez VectorDatasource */
  public getGlobalEezVectorDatasource() {
    return getGlobalEezVectorDatasource(this._datasources);
  }

  // METRICS //

  public getMetricGroup(metricId: string): MetricGroup {
    const mg = this._metrics.find((m) => m.metricId === metricId);
    if (!mg) throw new Error(`Missing MetricGroup ${metricId} in metrics.json`);
    return mg;
  }
}

const config = ConfigClient.getInstance();
export default config;
