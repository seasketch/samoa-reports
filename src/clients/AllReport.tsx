import React, { useState } from "react";
import { SegmentControl, ReportPage } from "@seasketch/geoprocessing/client-ui";
import config from "../../config";

const enableAllTabs = false;
const AllReports = () => {
  console.log(config.datasources);
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
        <div>foo</div>
      </ReportPage>
      <ReportPage hidden={!enableAllTabs && tab !== "Representation"}>
        <div>bar</div>
      </ReportPage>
    </>
  );
};

export default AllReports;
