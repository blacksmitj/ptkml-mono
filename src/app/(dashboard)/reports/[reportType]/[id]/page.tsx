"use client";

import React from "react";
import { useParams } from "next/navigation";
import { LaporanPendamping } from "./components/LaporanPendamping";
import { LaporanPendahuluanUniversitas } from "./components/LaporanPendahuluanUniversitas";
import { LaporanAntaraUniversitas } from "./components/LaporanAntaraUniversitas";
import { LaporanAkhirUniversitas } from "./components/LaporanAkhirUniversitas";
import { ReportNotFound } from "./components/ReportNotFound";

export default function GenericReportPage() {
  const params = useParams();
  const reportType = (params?.reportType as string) || "";
  const id = (params?.id as string) || "";

  switch (reportType) {
    case "laporan-pendamping":
      return <LaporanPendamping memberId={id} />;

    case "laporan-pendahuluan-universitas":
    case "laporan-pendahuluan":
      return <LaporanPendahuluanUniversitas universityId={id} />;

    case "laporan-antara-universitas":
    case "laporan-antara":
      return <LaporanAntaraUniversitas universityId={id} />;

    case "laporan-akhir-universitas":
    case "laporan-akhir":
      return <LaporanAkhirUniversitas universityId={id} />;

    default:
      return <ReportNotFound />;
  }
}
