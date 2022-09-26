import React from "react";
import {
  ReportResult,
  percentWithEdge,
  keyBy,
  toNullSketchArray,
  nestMetrics,
  valueFormatter,
  toPercentMetric,
  metricsWithSketchId,
  flattenBySketchAllClass,
  squareMeterToKilometer,
} from "@seasketch/geoprocessing/client-core";
import {
  ClassTable,
  Collapse,
  Column,
  ReportTableStyled,
  ResultsCard,
  useSketchProperties,
  ToolbarCard,
  DataDownload,
  SketchClassTable,
} from "@seasketch/geoprocessing/client-ui";
import styled from "styled-components";
import project from "../../project";

const metricGroup = project.getMetricGroup("ousAreaOverlap");
const totalMetrics = project.getPrecalcMetrics(
  metricGroup,
  "area",
  metricGroup.classKey
);

const METRIC_ID = metricGroup.metricId;
const PERC_METRIC_ID = `${metricGroup.metricId}Perc`;

const Number = new Intl.NumberFormat("en", { style: "decimal" });

const TableStyled = styled(ReportTableStyled)`
  font-size: 12px;
  td {
    text-align: right;
  }

  tr:nth-child(1) > th:nth-child(n + 1) {
    text-align: center;
  }

  tr:nth-child(2) > th:nth-child(n + 1) {
    text-align: center;
  }

  tr > td:nth-child(1),
  tr > th:nth-child(1) {
    border-right: 1px solid #777;
  }

  tr:nth-child(1) > th:nth-child(2) {
    border-right: 1px solid #777;
  }

  tr > td:nth-child(3),
  tr > th:nth-child(3) {
    border-right: 1px solid #777;
  }
  tr > td:nth-child(5),
  tr > th:nth-child(5) {
    border-right: 1px solid #777;
  }
`;

const HumanUseCard = () => {
  const [{ isCollection }] = useSketchProperties();
  return (
    <ResultsCard
      title="Human Use Areas - 2022 Ocean Use Survey"
      functionName="ousAreaOverlap"
      useChildCard
    >
      {(data: ReportResult) => {
        if (Object.keys(data).length === 0)
          throw new Error("Results not found");
        return (
          <ToolbarCard
            title="Human Use Areas - 2022 Ocean Use Survey"
            items={
              <>
                <DataDownload
                  filename="humanUse"
                  data={data.metrics}
                  formats={["csv", "json"]}
                  placement="left-end"
                />
              </>
            }
          >
            <p>
              This report summarizes ocean use activities within this plan as a
              proportion of all areas an activity is known to occur.
            </p>

            {genSingleSizeTable(data)}

            {isCollection && (
              <Collapse title="Show by MPA">
                {genNetworkSizeTable(data)}
              </Collapse>
            )}

            <Collapse title="Learn more">
              <p>
                ℹ️ Overview: to capture the ocean areas used for different
                activities, an Ocean Use Survey was conducted. Individuals
                identified the activities they participate in, and were asked to
                draw the areas they use relative to that activity. Individual
                responses were then combined.
              </p>
              <p>
                The combined area for each activity is used as a proxy for
                measuring the potential impact caused by changes in allowed
                uses, such as through the creation of protected areas. This
                report can be used to understand the potential impact of a plan
                on these activites. The higher the proportion of area within the
                plan, the greater the potential impact if access or activities
                are restricted.
              </p>
              <p>
                Note, the activity areas are only representative of the
                individuals that were surveyed.
              </p>
              <p>
                🎯 Planning Objective: there is no specific objective/target for
                limiting the potential impact to ocean use.
              </p>
              <p>
                📈 Report: Percentages are calculated by summing the portion of
                activity areas within the MPAs in this plan, and dividing it by
                all activity areas in the overall planning area. If the plan
                includes multiple MPAs that overlap, the overlap is only counted
                once. If multiple survey respondent drew shapes indicating an
                activity in a given area, that area is only counted once.
              </p>
            </Collapse>
          </ToolbarCard>
        );
      }}
    </ResultsCard>
  );
};

const genSingleSizeTable = (data: ReportResult) => {
  const classesById = keyBy(metricGroup.classes, (c) => c.classId);
  let singleMetrics = data.metrics.filter(
    (m) => m.sketchId === data.sketch.properties.id
  );

  const finalMetrics = [
    ...singleMetrics,
    ...toPercentMetric(singleMetrics, totalMetrics, PERC_METRIC_ID),
  ];

  const aggMetrics = nestMetrics(finalMetrics, ["classId", "metricId"]);

  // Use sketch ID for each table row, index into aggMetrics
  const rows = Object.keys(aggMetrics).map((classId) => ({ classId }));

  const areaColumns: Column<{ classId: string }>[] = [
    {
      Header: " ",
      accessor: (row) => <b>{classesById[row.classId || "missing"].display}</b>,
    },
    {
      Header: "Area Within Plan",
      accessor: (row) => {
        const value = aggMetrics[row.classId][METRIC_ID][0].value;
        return (
          Number.format(Math.round(squareMeterToKilometer(value))) + " sq. km."
        );
      },
    },
    {
      Header: "% Within Plan",
      accessor: (row) => {
        const value = aggMetrics[row.classId][PERC_METRIC_ID][0].value;
        return percentWithEdge(value);
      },
    },
  ];

  return (
    <>
      <ClassTable
        rows={finalMetrics}
        metricGroup={metricGroup}
        columnConfig={[
          {
            columnLabel: "Activity",
            type: "class",
            width: 40,
          },
          {
            columnLabel: "% Area Found Within Plan",
            type: "metricChart",
            metricId: PERC_METRIC_ID,
            valueFormatter: "percent",
            chartOptions: {
              showTitle: true,
              targetLabelPosition: "bottom",
              targetLabelStyle: "tight",
              barHeight: 11,
            },
            width: 45,
            targetValueFormatter: (
              value: number,
              row: number,
              numRows: number
            ) => {
              if (row === 0) {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")} Target`;
              } else {
                return (value: number) =>
                  `${valueFormatter(value / 100, "percent0dig")}`;
              }
            },
          },
          {
            type: "layerToggle",
            width: 15,
            columnLabel: "Map",
          },
        ]}
      />
    </>
  );
};

const genNetworkSizeTable = (data: ReportResult) => {
  // Build agg metric objects for each child sketch in collection with percValue for each class
  const childSketches = toNullSketchArray(data.sketch);
  const childSketchIds = childSketches.map((sk) => sk.properties.id);
  const childSketchMetrics = toPercentMetric(
    metricsWithSketchId(
      data.metrics.filter((m) => m.metricId === metricGroup.metricId),
      childSketchIds
    ),
    totalMetrics
  );
  const sketchRows = flattenBySketchAllClass(
    childSketchMetrics,
    metricGroup.classes,
    childSketches
  );

  return (
    <SketchClassTable rows={sketchRows} metricGroup={metricGroup} formatPerc />
  );
};

export default HumanUseCard;
