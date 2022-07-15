import datasources from "./datasources.json";
import metrics from "./metrics.json";
import objectives from "./objectives.json";

import {
  Datasources,
  Datasource,
  datasourcesSchema,
} from "../src/util/datasources/types";
import { getDatasourceById } from "../src/util/datasources/helpers";
import { MetricGroups, metricGroupsSchema } from "../src/util/metrics/types";
import { ObjectivesNew, objectivesSchema } from "../src/util/objectives/types";

/**
 * Read-only client for project configuration for use by clients and functions
 * Merges, validates, and otherwise ties everything together
 */
export class ConfigClient {
  private static _instance: ConfigClient = new ConfigClient();

  /** Published datasources */
  private _datasources: Datasources = datasourcesSchema.parse(datasources);
  private _metrics: MetricGroups = metricGroupsSchema.parse(metrics);
  private _objectives: ObjectivesNew = objectivesSchema.parse(objectives);

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

  public get datasources(): Datasources {
    return this._datasources;
  }

  public get metrics(): MetricGroups {
    return this.metrics;
  }

  public get objectives(): ObjectivesNew {
    return this._objectives;
  }

  public getDatasourceById(datasourceId: string): Datasource {
    return getDatasourceById(datasourceId, this._datasources);
  }
}

const config = ConfigClient.getInstance();
export default config;

// TRY TO ADD NEARSHORE/OFFSHORE/EEZ - how to handle multiple datasources with one datasourceId?
// DataClass also needs a datasourceId
