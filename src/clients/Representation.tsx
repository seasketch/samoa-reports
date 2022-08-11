import React from "react";
import EbsaCard from "../components/EbsaCard";
import KbaCard from "../components/KbaCard";
import SumaCard from "../components/SumaCard";
import DeepwaterRegions from "./DeepwaterRegions";

const ReportPage = () => {
  return (
    <>
      <DeepwaterRegions />
      <KbaCard />
      <EbsaCard />
      <SumaCard />
    </>
  );
};

export default ReportPage;
