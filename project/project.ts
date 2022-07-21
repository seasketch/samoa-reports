import datasources from "./datasources.json";
import metrics from "./metrics.json";
import objectives from "./objectives.json";
import basic from "./basic.json";
import projectPackage from "../package.json";
import gp from "../geoprocessing.json";

import {
  Datasources,
  Datasource,
  datasourcesSchema,
} from "../src/util/datasources/types";
import {
  getDatasourceById,
  isInternalDatasource,
} from "../src/util/datasources/helpers";
import {
  MetricGroup,
  MetricGroups,
  metricGroupsSchema,
} from "../src/util/metrics/types";
import { ObjectivesNew, objectivesSchema } from "../src/util/objectives/types";
import {
  GeoprocessingJsonConfig,
  createMetric,
  Metric,
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
export class ProjectClient {
  private static _instance: ProjectClient = new ProjectClient();

  private _project: Project = projectSchema.parse(basic);
  private _datasources: Datasources = datasourcesSchema.parse(datasources);
  private _metrics: MetricGroups = metricGroupsSchema.parse(metrics);
  private _objectives: ObjectivesNew = objectivesSchema.parse(objectives);
  // ToDo: add zod schema and validate
  private _package: Package = projectPackage as Package;
  // ToDo: add zod schema and validate
  private _geoprocessing: GeoprocessingJsonConfig = gp;

  constructor() {
    if (ProjectClient._instance) {
      throw new Error(
        "Error: Instantiation failed: Use ProjectClient.getInstance() instead of new."
      );
    }
    ProjectClient._instance = this;
  }

  public static getInstance(): ProjectClient {
    return ProjectClient._instance;
  }

  // ASSETS //

  /** Returns typed config from project.json */
  public get basic(): Project {
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

  public getMetricGroupTotalByClass(mg: MetricGroup): Metric[] {
    const metrics = mg.classes
      .map((curClass) => {
        if (!curClass.datasourceId) {
          throw new Error(`Missing datasourceId ${curClass.classId}`);
        }
        const ds = this.getDatasourceById(curClass.datasourceId);
        if (isInternalDatasource(ds)) {
          const totalArea = ds.keyStats?.total.total.area;
          if (!totalArea)
            throw new Error(
              `Missing total area stat for ${ds.datasourceId} ${curClass.classId}`
            );
          return [
            createMetric({
              metricId: mg.metricId,
              classId: curClass.classId,
              value: totalArea,
            }),
          ];
        }
        return [];
      })
      .reduce<Metric[]>((metricsSoFar, curClassMetrics) => {
        return metricsSoFar.concat(curClassMetrics);
      }, []);

    return metrics;
  }
}

const project = ProjectClient.getInstance();
export default project;
