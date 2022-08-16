import React from "react";
import EbsaCard from "../components/EbsaCard";
import KbaCard from "../components/KbaCard";
import SumaCard from "../components/SumaCard";
import DeepwaterRegions from "./DeepwaterRegions";
import Geomorphology from "./Geomorphology";

const ReportPage = () => {
  return (
    <>
      <DeepwaterRegions />
      <KbaCard />
      <EbsaCard />
      <SumaCard />
      <Geomorphology />
    </>
  );
};

export default ReportPage;
