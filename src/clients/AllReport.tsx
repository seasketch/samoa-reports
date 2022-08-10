import React, { useState } from "react";
import { SegmentControl, ReportPage } from "@seasketch/geoprocessing/client-ui";
import Viability from "./Viability";
import Representation from "./Representation";

const enableAllTabs = false;
const AllReports = () => {
  const [tab, setTab] = useState<string>("Viability");
  return (
    <>
      <div style={{ marginTop: 5 }}>
        <SegmentControl
          value={tab}
          onClick={(segment) => setTab(segment)}
          segments={["Viability", "Representation"]}
        />
      </div>
      <ReportPage hidden={!enableAllTabs && tab !== "Viability"}>
        <Viability />
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== "Representation"}>
        <Representation />
      </ReportPage>
    </>
  );
};

export default AllReports;
