import React from "react";
import SizeCard from "../components/SizeCard";
import FishingValue from "./FishingValue";
import FishingEffort from "./FishingEffort";

const ReportPage = () => {
  return (
    <>
      <SizeCard />
      <FishingValue />
      <FishingEffort />
    </>
  );
};

export default ReportPage;
