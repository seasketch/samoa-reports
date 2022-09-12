import React from "react";
import SizeCard from "../components/SizeCard";
import FishingValue from "./FishingValue";
import FishingEffort from "./FishingEffort";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";
import HumanUseCard from "../components/HumanUseCard";
import ConflictAreaCard from "../components/ConflictAreaCard";
import FishingEffortLongline from "./FishingEffortLongline";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <HumanUseCard />
      <ConflictAreaCard />
      <FishingValue />
      <FishingEffort />
      <FishingEffortLongline />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
