import * as React from "react";
import {
  GraduationCapIcon,
  UsersIcon,
  MapPinIcon,
  StoreIcon,
  SchoolIcon,
} from "lucide-react";
import { V2RadarChart } from "../widgets/v2-radar-chart";
import { V2DonutChart } from "../widgets/v2-donut-chart";
import { V2BarList } from "../widgets/v2-bar-list";
import { V2RankedList } from "../widgets/v2-ranked-list";
import { DashboardV2Data } from "@/hooks/use-dashboard-v2-data";

export interface DashboardDemographicsTabProps {
  data: DashboardV2Data;
}

export function DashboardDemographicsTab({ data }: DashboardDemographicsTabProps) {
  const { demographics, stats, currentRole } = data;
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isSupervisor = currentRole === "WORKSPACE_SUPERVISOR";
  const showUniversities = isSuperAdmin || isSupervisor;

  const topProvinces = (demographics.topProvinces || []).map((p) => ({
    label: p.name,
    value: p.count,
  }));

  const topSectors = (demographics.topSectors || []).map((s) => ({
    label: s.name,
    value: s.count,
  }));

  const topUniversities = (stats?.topUniversities || []).map((u) => ({
    name: u.name,
    count: u.count,
  }));

  return (
    <div className="space-y-6">
      {/* 1. Demographics Grid: Education Radar + Age Donut + Gender Donut */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Education Profile */}
        <V2RadarChart
          title="Latar Belakang Pendidikan"
          description="Distribusi jenjang pendidikan terakhir peserta"
          icon={<GraduationCapIcon className="size-4 text-blue-500" />}
          data={demographics.topEducations || []}
          accentColor="var(--brand-seq-1)"
        />

        {/* Age Groups */}
        <V2DonutChart
          title="Komposisi Umur"
          description="Sebaran kelompok usia pelaku usaha TKM"
          icon={<UsersIcon className="size-4 text-amber-500" />}
          data={demographics.ageGroups || []}
          centerLabel="Peserta"
        />

        {/* Gender Groups */}
        <V2DonutChart
          title="Distribusi Gender"
          description="Proporsi peserta berdasarkan jenis kelamin"
          icon={<UsersIcon className="size-4 text-emerald-500" />}
          data={(demographics.genderGroups || []).map((g, idx) => ({
            name: g.name,
            count: g.count,
            color:
              idx === 0
                ? "var(--brand-seq-1)"
                : idx === 1
                ? "var(--brand-seq-4)"
                : "var(--brand-seq-3)",
          }))}
          centerLabel="Peserta"
        />
      </div>

      {/* 2. Geographic & Business Landscape */}
      <div
        className={`grid grid-cols-1 ${
          showUniversities ? "lg:grid-cols-3" : "lg:grid-cols-2"
        } gap-6`}
      >
        {/* Top Provinces */}
        <V2BarList
          title="Sebaran Provinsi Teratas"
          description="Wilayah dengan konsentrasi peserta terbanyak"
          icon={<MapPinIcon className="size-4 text-rose-500" />}
          items={topProvinces}
          maxDisplay={5}
        />

        {/* Top Sectors */}
        <V2BarList
          title="Sektor Usaha Teratas"
          description="Bidang usaha kelompok dampingan"
          icon={<StoreIcon className="size-4 text-emerald-500" />}
          items={topSectors}
          maxDisplay={5}
        />

        {/* Top Universities (for Super Admin & Supervisor) */}
        {showUniversities && (
          <V2RankedList
            title="Universitas Mitra Teraktif"
            description="Perguruan tinggi dengan kontribusi terbesar"
            icon={<SchoolIcon className="size-4 text-indigo-500" />}
            items={topUniversities}
            maxDisplay={5}
            badgeSuffix="Peserta"
          />
        )}
      </div>
    </div>
  );
}
