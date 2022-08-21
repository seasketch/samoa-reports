import React from "react";
import EbsaCard from "../components/EbsaCard";
import KbaCard from "../components/KbaCard";
import IbaCard from "../components/IbaCard";
import SumaCard from "../components/SumaCard";
import DeepwaterRegions from "./DeepwaterRegions";
import Geomorphology from "./Geomorphology";
import ReefBenthicValue from "./ReefBenthicValue";

const ReportPage = () => {
  return (
    <>
      <DeepwaterRegions />
      <Geomorphology />
      <ReefBenthicValue />
    </>
  );
};

export default ReportPage;
