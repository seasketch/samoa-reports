import React from "react";
import {
  Collapse,
  ResultsCard,
  SketchClassTable,
  ClassTable,
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
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";

const metricGroup = project.getMetricGroup("benthicValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "sum",
  metricGroup.classKey
);

const ReefBenthicValue = () => {
  const [{ isCollection }] = useSketchProperties();
  return (
    <>
      <ResultsCard title="Reef" functionName="benthicValueOverlap" useChildCard>
        {(data: ReportResult) => {
          // Single sketch or collection top-level
          const parentMetrics = metricsWithSketchId(
            toPercentMetric(
              data.metrics.filter((m) => m.metricId === metricGroup.metricId),
              precalcMetrics
            ),
            [data.sketch.properties.id]
          );

          return (
            <ToolbarCard
              title="Reef"
              items={
                <LayerToggle label="Map" layerId={metricGroup.layerId} simple />
              }
            >
              <p>
                The Reef seafloor (benthic zone) has been categorized into 9
                distinct types by the Allen Coral Atlas project, each supporting
                different ecological communities. Plans should include a portion
                of each reef type.
              </p>

              <ClassTable
                rows={parentMetrics}
                dataGroup={metricGroup}
                columnConfig={[
                  {
                    columnLabel: "Reef Type",
                    type: "class",
                    width: 40,
                  },
                  {
                    columnLabel: "% Value Found Within Plan",
                    type: "metricChart",
                    metricId: metricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 60,
                  },
                ]}
              />

              {isCollection && (
                <Collapse title="Show by MPA">{genSketchTable(data)}</Collapse>
              )}

              <Collapse title="Learn more">
                <p>
                  {" "}
                  This report summarizes the percentage of each reef type that
                  overlaps with this plan.
                </p>
                <p>
                  If MPA boundaries overlap with each other, the overlap is only
                  counted once.
                </p>
              </Collapse>
            </ToolbarCard>
          );
        }}
      </ResultsCard>
    </>
  );
};

const genSketchTable = (data: ReportResult) => {
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(data.metrics, childSketchIds),
    precalcMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );

  return (
    <SketchClassTable rows={sketchRows} dataGroup={metricGroup} formatPerc />
  );
};

export default ReefBenthicValue;
