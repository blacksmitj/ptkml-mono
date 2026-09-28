"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboardIcon,
  PieChartIcon,
  TablePropertiesIcon,
  ShieldCheckIcon,
} from "lucide-react";
import { useDashboardV2Data } from "@/hooks/use-dashboard-v2-data";
import { DashboardHeroBanner } from "./subcomponents/dashboard-hero-banner";
import { DashboardOverviewTab } from "./subcomponents/dashboard-overview-tab";
import { DashboardDemographicsTab } from "./subcomponents/dashboard-demographics-tab";
import { DashboardDataControlTab } from "./subcomponents/dashboard-data-control-tab";
import { useAppStore } from "@/store/use-app-store";
import { useWorkspace } from "@/hooks/use-workspaces";

export interface UnifiedDashboardViewProps {
  role?: string | null;
}

export function UnifiedDashboardView({ role }: UnifiedDashboardViewProps) {
  const data = useDashboardV2Data();
  const { currentWorkspaceId } = useAppStore();
  const { data: currentWorkspace } = useWorkspace(currentWorkspaceId || "");
  const [activeTab, setActiveTab] = React.useState("overview");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const activeRole = role || data.currentRole;
  const isSuperAdmin = activeRole === "SUPER_ADMIN";
  const isSupervisor = activeRole === "WORKSPACE_SUPERVISOR";

  const handleRefresh = React.useCallback(() => {
    setIsRefreshing(true);
    data.refetchAll();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, [data]);

  const thirdTabLabel = isSuperAdmin
    ? "Audit & Kontrol"
    : isSupervisor
    ? "Monitoring & Audit"
    : "Data & Pelaporan";

  const thirdTabIcon = isSuperAdmin || isSupervisor ? (
    <ShieldCheckIcon className="size-3.5 mr-1.5" />
  ) : (
    <TablePropertiesIcon className="size-3.5 mr-1.5" />
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 gap-5 overflow-y-auto">
      {/* 1. Hero Welcome Banner */}
      <DashboardHeroBanner
        userName={data.me?.profile?.name || data.me?.name}
        role={activeRole}
        workspaceName={currentWorkspace?.name}
        universityName={data.me?.university?.name}
        greeting={data.greeting}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        memberId={data.mentorMember?.id}
      />

      {/* 2. Main 3-Tab System */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col space-y-4"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
          <TabsList className="bg-muted/70 p-1 rounded-xl h-9">
            <TabsTrigger
              value="overview"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
            >
              <LayoutDashboardIcon className="size-3.5 mr-1.5" />
              Ringkasan & Kinerja
            </TabsTrigger>
            <TabsTrigger
              value="demographics"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
            >
              <PieChartIcon className="size-3.5 mr-1.5" />
              Analisis Demografi
            </TabsTrigger>
            <TabsTrigger
              value="control"
              className="rounded-lg text-xs font-semibold px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
            >
              {thirdTabIcon}
              {thirdTabLabel}
            </TabsTrigger>
          </TabsList>

          <span className="text-xs text-muted-foreground hidden md:inline font-medium">
            {isSuperAdmin || isSupervisor ? (
              <>
                Total Peserta Terdaftar:{" "}
                <strong className="text-foreground font-mono">
                  {data.stats?.totalApplicantsAll ?? 0}
                </strong>
              </>
            ) : (
              <>
                Peserta Binaan:{" "}
                <strong className="text-foreground font-mono">
                  {data.applicants.length}
                </strong>
              </>
            )}
          </span>
        </div>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
          <DashboardOverviewTab data={data} />
        </TabsContent>

        {/* Tab 2: Demographics */}
        <TabsContent value="demographics" className="mt-0 focus-visible:outline-none">
          <DashboardDemographicsTab data={data} />
        </TabsContent>

        {/* Tab 3: Data & Control */}
        <TabsContent value="control" className="mt-0 focus-visible:outline-none">
          <DashboardDataControlTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
