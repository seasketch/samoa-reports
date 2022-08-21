import React from "react";
import {
  Collapse,
  ClassTable,
  SketchClassTable,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  LayerToggle,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
  valueFormatter,
  Metric,
  MetricDimension,
  keyBy,
  MetricGroup,
  Nullable,
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";

const metricGroup = project.getMetricGroup("geomorphAreaOverlap");
const legacyMetricGroup = project.getLegacyMetricGroup("geomorphAreaOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "area",
  metricGroup.classKey
);

const getMetricGroupDatasource = (
  mg: MetricGroup,
  classId: Nullable<string>
) => {
  if (metricGroup.datasourceId) {
    return metricGroup.datasourceId;
  } else if (classId) {
    return keyBy(metricGroup.classes, (m) => m.classId)[classId].datasourceId;
  }
};

const getClassDatasource = (mg: MetricGroup, classId: string) => {
  return keyBy(metricGroup.classes, (m) => m.classId)[classId].datasourceId;
};

const datasourceCounts = metricGroup.classes.reduce<Record<string, number>>(
  (soFar, curClass) => {
    const classDatasourceId = getClassDatasource(metricGroup, curClass.classId);
    if (!classDatasourceId)
      throw new Error(`Expected datasourceId for class ${curClass.classId}`);
    return {
      ...soFar,
      [classDatasourceId]: soFar[classDatasourceId]
        ? soFar[classDatasourceId] + 1
        : 1,
    };
  },
  {}
);

const dsGroups = Object.keys(datasourceCounts).reduce<string[][]>(
  (soFar, curDatasourceId) => {
    if (datasourceCounts[curDatasourceId] > 1) {
      return [soFar[0], soFar[1].concat(curDatasourceId)];
    } else {
      return [soFar[0].concat(curDatasourceId), soFar[1]];
    }
  },
  [[], []]
);

/**
 * Sorts metrics to a consistent order for readability
 * Defaults to [metricId, classId, sketchId]
 */
export const sortMetrics = (
  metrics: Metric[],
  sortIds: string[] = ["datasourceId", "display"]
) => {
  return metrics.sort((a, b) => {
    return sortIds.reduce((sortResult, idName) => {
      // if sort result alread found then skip
      if (sortResult !== 0) return sortResult;
      const aVal = (() => {
        if (idName === "display") {
          return keyBy(metricGroup.classes, (m) => m.classId)[a.classId!]
            .display;
        } else if (idName === "datasourceId") {
          return getMetricGroupDatasource(metricGroup, a.classId);
        } else {
          return a[idName as MetricDimension];
        }
      })();
      const bVal = (() => {
        if (idName === "display") {
          return keyBy(metricGroup.classes, (m) => m.classId)[b.classId!]
            .display;
        } else if (idName === "datasourceId") {
          return getMetricGroupDatasource(metricGroup, b.classId);
        } else {
          return b[idName as MetricDimension];
        }
      })();
      if (aVal && bVal) return aVal.localeCompare(bVal);
      return 0;
    }, 0);
  });
};

const Geomorphology = () => {
  const [{ isCollection }] = useSketchProperties();

  return (
    <>
      <ResultsCard
        title="Geomorphology"
        functionName="geomorphAreaOverlap"
        useChildCard
      >
        {(data: ReportResult) => {
          // Generate percent metrics - supports collection or single sketch
          const parentMetrics = metricsWithSketchId(
            toPercentMetric(
              data.metrics.filter((m) => m.metricId === metricGroup.metricId),
              precalcMetrics
            ),
            [data.sketch.properties.id]
          );
          const sortedMetrics = sortMetrics(parentMetrics);

          const singleClassMetrics = sortedMetrics.filter((m) => {
            // get metric datasourceId, return true if single array includes
            const datasourceId = getMetricGroupDatasource(
              metricGroup,
              m.classId
            );
            if (!datasourceId)
              throw new Error(`Expected datasourceId in class ${m.classId}`);
            return dsGroups[0].includes(datasourceId);
          });
          const multiClassMetrics = sortedMetrics.filter((m) => {
            // get metric datasourceId, return true if single array includes
            const datasourceId = getMetricGroupDatasource(
              metricGroup,
              m.classId
            );
            if (!datasourceId)
              throw new Error(`Expected datasourceId in class ${m.classId}`);
            return dsGroups[1].includes(datasourceId);
          });

          return (
            <ToolbarCard
              title="Geomorphology"
              items={
                <LayerToggle label="Map" layerId={metricGroup.layerId} simple />
              }
            >
              <p>
                The seafloor (benthic zone) has many unique physical features,
                each creating habitats that support different ecological
                communities. Plans should include a portion of each seafloor
                type (geomorphology class).
              </p>
              <p>
                This report summarizes the percentage of each seafloor type that
                overlaps with this plan.
              </p>
              <ClassTable
                rows={singleClassMetrics}
                dataGroup={legacyMetricGroup}
                columnConfig={[
                  {
                    columnLabel: "Class",
                    type: "class",
                    width: 40,
                  },
                  {
                    columnLabel: "% Found Within Plan",
                    type: "metricChart",
                    metricId: legacyMetricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                      targetLabelPosition: "bottom",
                      targetLabelStyle: "tight",
                      barHeight: 11,
                    },
                    width: 50,
                    targetValueFormatter: (
                      value: number,
                      row: number,
                      numRows: number
                    ) => {
                      if (row === 0) {
                        return (value: number) =>
                          `${valueFormatter(
                            value / 100,
                            "percent0dig"
                          )} Target`;
                      } else {
                        return (value: number) =>
                          `${valueFormatter(value / 100, "percent0dig")}`;
                      }
                    },
                  },
                  {
                    columnLabel: "Map",
                    type: "layerToggle",
                    width: 10,
                  },
                ]}
              />
              <ClassTable
                rows={multiClassMetrics}
                dataGroup={legacyMetricGroup}
                columnConfig={[
                  {
                    columnLabel: "Class",
                    type: "class",
                    width: 40,
                  },
                  {
                    columnLabel: "% Found Within Plan",
                    type: "metricChart",
                    metricId: legacyMetricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                      targetLabelPosition: "bottom",
                      targetLabelStyle: "tight",
                      barHeight: 11,
                    },
                    width: 50,
                    targetValueFormatter: (
                      value: number,
                      row: number,
                      numRows: number
                    ) => {
                      if (row === 0) {
                        return (value: number) =>
                          `${valueFormatter(
                            value / 100,
                            "percent0dig"
                          )} Target`;
                      } else {
                        return (value: number) =>
                          `${valueFormatter(value / 100, "percent0dig")}`;
                      }
                    },
                  },
                  {
                    columnLabel: "Map",
                    type: "layerToggle",
                    width: 10,
                  },
                ]}
              />
              {isCollection && (
                <Collapse title="Show by MPA">{genSketchTable(data)}</Collapse>
              )}
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </>
  );
};

const genSketchTable = (data: ReportResult) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === legacyMetricGroup.metricId),
      childSketchIds
    ),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    legacyMetricGroup.classes,
    childSketches
  );
  return (
    <SketchClassTable
      rows={sketchRows}
      dataGroup={legacyMetricGroup}
      formatPerc
    />
  );
};

export default Geomorphology;
