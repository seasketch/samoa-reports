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

const metricGroup = project.getMetricGroup("gfwValueOverlap");
const precalcMetrics = project.getPrecalcMetrics(
  metricGroup,
  "sum",
  metricGroup.classKey
);

const FishingValue = () => {
  const [{ isCollection }] = useSketchProperties();
  return (
    <>
      <ResultsCard
        title="Fishing Effort - 2017-2021"
        functionName="gfwValueOverlap"
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
              columnLabel: "All Fishing",
              type: "class",
              width: 31,
            },
            {
              type: "metricValue",
              metricId: metricGroup.metricId,
              valueFormatter: "integer",
              valueLabel: "hours",
              width: 20,
              colStyle: { textAlign: "right" },
              columnLabel: "Fishing Effort",
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
                This report summarizes the proportion of fishing effort from
                2019-2022 that is within this plan, as reported by Global
                Fishing Watch. The higher the percentage, the greater the
                potential impact to the fishery if access or activities are
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
                  🗺️ Source Data: <b>Apparent fishing effort</b> is measured
                  using transmissions (or "pings") broadcast by fishing vessels
                  using the automatic identification system (AIS) vessel
                  tracking system.
                </p>
                <p>
                  Machine learning models are then used to classify fishing
                  vessels and predict when they are fishing based on their
                  movement patterns and changes in speed.
                </p>
                <p>
                  Apparent fishing effort can then be calculated for any area by
                  summarizing the fishing hours for all fishing vessels in that
                  area.
                </p>
                <p>
                  📈 Report: Percentages are calculated by summing the total
                  amount of fishing effort (in hours) within the MPAs in this
                  plan, and dividing it by the total amount of fishing effort
                  (in hours) across the overall planning area. If the plan
                  includes multiple areas that overlap, the overlap is only
                  counted once.
                </p>
                <p>
                  There are a number of caveats and limitations to this data.
                  For further information:{" "}
                  <a
                    target="_blank"
                    href={`${project.basic.externalLinks.gfwFishingEffort}`}
                  >
                    Global Fishing Watch - Apparent Fishing Effort
                  </a>
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

export default FishingValue;
