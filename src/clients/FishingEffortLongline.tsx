import React from "react";
import {
  Collapse,
  ResultsCard,
  SketchClassTable,
  ClassTable,
  useSketchProperties,
  ClassTableColumnConfig,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";

const metricGroup = project.getMetricGroup("wsValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "sum",
  metricGroup.classKey
);

const FishingEffortLongline = () => {
  const [{ isCollection }] = useSketchProperties();
  return (
    <>
      <ResultsCard
        title="Fishing Effort - 2015-2020 Longline Sets"
        functionName="wsValueOverlap"
      >
        {(data: ReportResult) => {
          // Single sketch or collection top-level
          const percMetricIdName = `${metricGroup.metricId}Perc`;

          const metricsValueAndPerc = [
            ...data.metrics,
            ...toPercentMetric(data.metrics, precalcMetrics, percMetricIdName),
          ];

          const colConfigs: ClassTableColumnConfig[] = [
            {
              columnLabel: "Longline",
              type: "class",
              width: 31,
            },
            {
              type: "metricValue",
              metricId: percMetricIdName,
              valueFormatter: "percent",
              columnLabel: "Within Plan",
              width: 15,
              colStyle: { textAlign: "right" },
            },
            {
              type: "metricChart",
              metricId: percMetricIdName,
              valueFormatter: "percent",
              chartOptions: {
                showTitle: false,
              },
              width: 20,
            },
            {
              type: "layerToggle",
              width: 14,
            },
          ];

          return (
            <>
              <p>
                This report summarizes the proportion of longline fishing effort
                from 2015-2020 that is within this plan, as reported by Samoa
                Ministry of Fisheries. The higher the percentage, the greater
                the potential impact to the fishery if access or activities are
                restricted.
              </p>

              <ClassTable
                rows={metricsValueAndPerc}
                dataGroup={metricGroup}
                columnConfig={colConfigs}
              />

              {isCollection && (
                <Collapse title="Show by MPA">{genSketchTable(data)}</Collapse>
              )}

              <Collapse title="Learn more">
                <p>
                  🎯 Planning Objective: there is no specific objective/target
                  for limiting the potential impact to fishing activities.
                </p>
                <p>
                  🗺️ Source Data: <b>Fishing</b> is measured in "hundreds of
                  hooks" per set and "metric tons of catch" per set. A point
                  location is provided for each set and these points are
                  aggregated across all sets for all vessels over all years to
                  produce a heatmap of number of hooks per 5km area.
                </p>
                <p>
                  Fishing effort is then calculated for any area by summing the
                  total for all fishing vessels in that area.
                </p>
                <p>
                  📈 Report: Percentages are calculated by summing the total
                  amount of fishing effort within the MPAs in this plan, and
                  dividing it by the total amount of fishing effort across the
                  overall planning area. If the plan includes multiple areas
                  that overlap, the overlap is only counted once.
                </p>
              </Collapse>
            </>
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

export default FishingEffortLongline;
