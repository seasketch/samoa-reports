import { reimportDatasources } from "../util/datasources/reimportDatasources";

// Main function, wrapped in an IIFE to avoid top-level await
if (typeof require !== "undefined" && require.main === module) {
  void (async function () {
    await reimportDatasources();
  })();
}
