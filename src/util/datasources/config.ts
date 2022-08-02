import { SupportedFormats } from "./types";

const vectorFormats: SupportedFormats[] = ["fgb", "geojson", "subdivided"];
const importSupportedVectorFormats: SupportedFormats[] = ["fgb", "geojson"];
const importDefaultVectorFormats: SupportedFormats[] = ["fgb"];

const defaultDstPath = "data/dist";
/** Default datasource file location, relative to project root */
const defaultDatasourcesPath = "./project/datasources.json";

export default {
  vectorFormats,
  importSupportedVectorFormats,
  importDefaultVectorFormats,
  defaultDstPath,
  defaultDatasourcesPath,
};
