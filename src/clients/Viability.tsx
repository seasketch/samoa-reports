import React from "react";
import SizeCard from "../components/SizeCard";
import FishingValue from "./FishingValue";
import FishingEffort from "./FishingEffort";
import { SketchAttributesCard } from "@seasketch/geoprocessing/client-ui";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <FishingValue />
      <FishingEffort />
      <SketchAttributesCard autoHide />
    </>
  );
};

export default ReportPage;
