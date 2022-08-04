import React from "react";
import {
  Collapse,
  ResultsCard,
  SketchClassTable,
  ClassTable,
  useSketchProperties,
} from "@seasketch/geoprocessing/client-ui";
import {
  ReportResult,
  ReportResultBase,
  toNullSketchArray,
  flattenBySketchAllClass,
  metricsWithSketchId,
  toPercentMetric,
} from "@seasketch/geoprocessing/client-core";
import project from "../../project";

import ousTotals from "../../data/precalc/ousValueOverlapTotals.json";
const precalcTotals = ousTotals as ReportResultBase;

const metricGroup = project.getLegacyOusMetricGroup();

const FishingValue = () => {
  const [{ isCollection }] = useSketchProperties();
  return (
    <>
      <ResultsCard
        title="Fishing Impact - 2022 Ocean Use Survey"
        functionName="ousValueOverlap"
      >
        {(data: ReportResult) => {
          // Single sketch or collection top-level
          const parentMetrics = metricsWithSketchId(
            toPercentMetric(data.metrics, precalcTotals.metrics),
            [data.sketch.properties.id]
          );

          return (
            <>
              <p>
                This report summarizes the proportion of value for each sector
                that overlaps with this plan, as reported in the Ocean Use
                Survey. Plans should consider the potential impact to fisheries
                if access or activities are restricted.
              </p>

              <ClassTable
                rows={parentMetrics}
                dataGroup={metricGroup}
                columnConfig={[
                  {
                    columnLabel: "Sector",
                    type: "class",
                    width: 45,
                  },
                  {
                    columnLabel: "% Value Found Within Plan",
                    type: "metricChart",
                    metricId: metricGroup.metricId,
                    valueFormatter: "percent",
                    chartOptions: {
                      showTitle: true,
                    },
                    width: 45,
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

              <Collapse title="Learn more">
                <p>
                  ℹ️ Overview: to capture the value each commercial fishing
                  sector places on different areas of the EEZ, an Ocean Use
                  Survey was conducted. Individuals identified the sectors they
                  participate in, and were asked to draw the areas they use
                  relative to that sector and assign a value of importance.
                  Individual responses were then combined to produce aggregate
                  heatmaps by sector. This allows the value of areas to be
                  quantified, summed, and compared to one another as more or
                  less valuable.
                </p>
                <p>
                  Fishing value is then used as a proxy for measuring the
                  potential economic loss to fisheries caused by the creation of
                  protected areas. This report can be used to minimize the
                  potential impact of a plan on a fishery, as well as identify
                  and reduce conflict between conservation objectives and
                  fishing activities. The higher the percentage of value within
                  the plan, the greater the potential impact to the fishery if
                  access or activities are restricted.
                </p>
                <p>
                  Note, the resulting heatmaps are only representative of the
                  individuals that were surveyed.
                </p>
                <p>
                  🎯 Planning Objective: there is no specific objective/target
                  for limiting the potential impact to fishing activities.
                </p>
                <p>🗺️ Methods:</p>
                <ul>
                  <li>
                    <a
                      href="https://seasketch.github.io/python-sap-map/index.html"
                      target="_blank"
                    >
                      Spatial Access Priority Mapping Overview
                    </a>
                  </li>
                </ul>
                <p>
                  📈 Report: Percentages are calculated by summing the areas of
                  fishing value within the MPAs in this plan, and dividing it by
                  the total fishing value in the overall planning area. If the
                  plan includes multiple areas that overlap, the overlap is only
                  counted once.
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
    precalcTotals.metrics
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
