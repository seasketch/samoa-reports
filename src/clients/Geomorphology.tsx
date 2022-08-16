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
} from "@seasketch/geoprocessing/client-core";

import project from "../../project";

const metricGroup = project.getMetricGroup("geomorphAreaOverlap");
const legacyMetricGroup = project.getLegacyMetricGroup("geomorphAreaOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "area",
  metricGroup.classKey
);

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

          return (
            <ToolbarCard
              title="Geomorphology"
              items={
                <LayerToggle label="Map" layerId={metricGroup.layerId} simple />
              }
            >
              <p>
                5 different deepwater subregions have been identified in the
                offshore, each supporting distinct habitats and related
                ecosystems. Plans should include a representative portion of
                each subregion.
              </p>
              <p>
                This report summarizes the percentage of each offshore subregion
                that overlaps with this plan.
              </p>
              <ClassTable
                rows={parentMetrics}
                dataGroup={legacyMetricGroup}
                columnConfig={[
                  {
                    columnLabel: "Class",
                    type: "class",
                    width: 30,
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
                    width: 40,
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