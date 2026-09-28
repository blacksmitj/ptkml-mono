"use client";

import React from "react";
import { useParams } from "next/navigation";
import { LaporanPendamping } from "@/app/(dashboard)/reports/[reportType]/[id]/components/LaporanPendamping";

export default function MentorPerformanceReportLegacyPage() {
  const params = useParams();
  const id = (params?.id as string) || "me";

  return <LaporanPendamping memberId={id} />;
}
