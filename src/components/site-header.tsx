"use client";

import React from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ChevronRight,
  Bell,
  BookOpen,
  FilePieChart,
  Users,
  Clock,
  AlertTriangle,
  AlertCircle,
  PhoneOff,
  UserX,
  XCircle,
  DollarSign,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { useMembers } from "@/hooks/use-members";
import { useUniversities } from "@/hooks/use-universities";
import { usePathname } from "next/navigation";
import { formatRole } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMe } from "@/hooks/use-me";
import { NavUser } from "@/components/nav-user";
import { useNotificationBadges } from "@/hooks/use-notification-badges";
import { useDashboardEventsMonth, MonthDashboardEvent } from "@/hooks/use-dashboard-events";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "./ui/button";
import { NotificationNavItem } from "@/components/notifications/notification-nav-item";
import { AgendaEventDialog } from "@/components/dashboard/agenda-event-dialog";

const routeMap: Record<string, string> = {
  dashboard: "Dashboard",
  universities: "Universitas",
  members: "Anggota",
  applicants: "Peserta",
  logbooks: "Logbook Harian",
  "output-reports": "Capaian Output",
  employees: "Karyawan",
  analytics: "Analitik",
  settings: "Pengaturan",
  profile: "Profil",
  help: "Bantuan",
  new: "Tambah Baru",
  edit: "Edit Data",
};

export function SiteHeader() {
  const currentRole = useAppStore((state) => state.currentRole);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const pathname = usePathname();

  const { data: workspaces } = useWorkspaces();
  const { data: members } = useMembers({
    workspaceId: currentWorkspaceId || undefined,
  });
  const { data: allUniversities } = useUniversities();
  const { data: me } = useMe();
  const { data: badgeData } = useNotificationBadges();
  const badgeCounts = badgeData?.counts;
  const pendingData = badgeData?.pending;
  const needsActionData = badgeData?.needsAction;
  const scope = badgeData?.scope || "ALL";
  const isMentor = badgeData?.roleType === "MENTOR";

  const workspace = React.useMemo(() => {
    if (!workspaces || !currentWorkspaceId) return null;
    return workspaces.find((w) => w.id === currentWorkspaceId) || null;
  }, [workspaces, currentWorkspaceId]);

  const activeMembership = React.useMemo(() => {
    const list = members?.data || (Array.isArray(members) ? members : []);
    if (!list.length) return null;
    return list.find((m: any) => m.userId === currentUserId) || null;
  }, [members, currentUserId]);

  const university = React.useMemo(() => {
    if (!allUniversities || !activeMembership?.universityId) return null;
    return (
      allUniversities.find((u) => u.id === activeMembership.universityId) ||
      null
    );
  }, [allUniversities, activeMembership]);

  const user = React.useMemo(() => {
    return {
      name: me?.profile?.name || "User",
      email: me?.profile?.email || me?.username || "user@example.com",
      avatar: me?.profile?.photo || "",
      universityName: university?.name,
      verificationStatus: activeMembership?.verificationStatus,
      hasAddress: !!me?.profile?.addresses?.[0],
    };
  }, [me, university, activeMembership]);

  const pathSegments = pathname.split("/").filter(Boolean);
  const filteredSegments = pathSegments.filter(
    (segment) => segment !== "dashboard",
  );

  const applicantIssuesData = badgeData?.applicantIssues;

  const bellBadge = React.useMemo(() => {
    if (!badgeData) return null;
    const actionCount = typeof badgeCounts?.total === "number" ? badgeCounts.total : 0;
    const issueCount = typeof applicantIssuesData?.total === "number" ? applicantIssuesData.total : 0;
    const combinedUrgent = actionCount + issueCount;

    if (combinedUrgent > 0) {
      return {
        count: combinedUrgent,
        variantClass: isMentor
          ? "bg-rose-500 text-white animate-badge-glow-destructive"
          : "bg-primary text-primary-foreground animate-badge-glow-primary",
      };
    }
    if (isMentor && typeof pendingData?.total === "number" && pendingData.total > 0) {
      return {
        count: pendingData.total,
        variantClass: "bg-primary text-primary-foreground animate-badge-glow-primary",
      };
    }
    return null;
  }, [badgeData, badgeCounts, applicantIssuesData, pendingData, isMentor]);

  const defaultTab = isMentor
    ? (needsActionData?.total ?? 0) > 0
      ? "needsAction"
      : (applicantIssuesData?.total ?? 0) > 0
      ? "issues"
      : "pending"
    : (pendingData?.total ?? 0) > 0
      ? "pending"
      : (applicantIssuesData?.total ?? 0) > 0
      ? "issues"
      : "needsAction";

  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const [selectedAgendaEvent, setSelectedAgendaEvent] = React.useState<MonthDashboardEvent | null>(null);

  const now = new Date();
  const currentEventYear = now.getFullYear();
  const currentEventMonth = now.getMonth() + 1;

  const { data: monthEventsData } = useDashboardEventsMonth(
    currentWorkspaceId || undefined,
    currentEventYear,
    currentEventMonth
  );

  const nearestEvent = React.useMemo(() => {
    if (!monthEventsData?.events?.length) return null;
    const activeEvents = monthEventsData.events.filter((e) => !e.isDismissed);
    if (!activeEvents.length) return null;

    return [...activeEvents].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "PENDING" ? -1 : 1;
      }
      return a.daysRemaining - b.daysRemaining;
    })[0];
  }, [monthEventsData]);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sticky top-0 bg-background/95 backdrop-blur z-40">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          <div className="flex items-center gap-1 text-sm font-medium">
            <span
              className="truncate text-muted-foreground/90 dark:text-muted-foreground max-w-20 sm:max-w-30 inline-block"
              title={workspace?.name || "Workspace"}
            >
              {workspace?.name || "Workspace"}
            </span>

            {filteredSegments.map((segment, index) => {
              const hasMapping = !!routeMap[segment];
              let label = routeMap[segment] || segment;
              if (!hasMapping && label.length > 8) {
                label = `${label.slice(0, 5)}...`;
              }
              return (
                <React.Fragment key={index}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 dark:text-muted-foreground/40 shrink-0" />
                  <span
                    className="truncate font-semibold text-foreground dark:text-foreground/95 max-w-15 sm:max-w-25 inline-block"
                    title={routeMap[segment] || segment}
                  >
                    {label}
                  </span>
                </React.Fragment>
              );
            })}
          </div>

          <Separator
            orientation="vertical"
            className="mx-2 hidden data-[orientation=vertical]:h-4 sm:block"
          />

          <Badge
            variant="outline"
            className="hidden sm:inline-flex font-semibold border-primary/25 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground dark:border-primary/40 shadow-2xs"
          >
            {formatRole(currentRole)}
          </Badge>

          {university && (
            <Badge
              variant="outline"
              className="hidden sm:inline-flex bg-muted/80 text-foreground border-border/80 dark:bg-card dark:text-foreground dark:border-border font-medium shadow-2xs"
            >
              {university.name}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Notification Bell Popover */}
          <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent"
                aria-label="Notifikasi Tugas"
              >
                <Bell className="h-4 w-4" />
                {bellBadge && bellBadge.count > 0 && (
                  <span className={`absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full ${bellBadge.variantClass} text-[10px] font-bold shadow-sm transition-all duration-300`}>
                    {bellBadge.count > 99 ? "99+" : bellBadge.count}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-88 sm:w-[420px] p-0 shadow-xl border-border">
              <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Pemantauan Tugas & Kendala</span>
                  <span className="text-[11px] text-muted-foreground">
                    {scope === "ALL"
                      ? "Cakupan: Seluruh Workspace"
                      : scope === "UNIVERSITY"
                        ? "Cakupan: Universitas Anda"
                        : "Cakupan: Tugas & Bimbingan Anda"}
                  </span>
                </div>
                {isMentor ? (
                  (needsActionData?.total ?? 0) > 0 || (applicantIssuesData?.total ?? 0) > 0 ? (
                    <StatusBadge
                      status="HIGH"
                      label={`${(needsActionData?.total ?? 0) + (applicantIssuesData?.total ?? 0)} Perlu Perhatian`}
                    />
                  ) : (pendingData?.total ?? 0) > 0 ? (
                    <StatusBadge
                      status="PENDING"
                      label={`${pendingData?.total} Menunggu Review`}
                    />
                  ) : (
                    <StatusBadge status="ACTIVE" label="Terkendali" />
                  )
                ) : (
                  (pendingData?.total ?? 0) > 0 ? (
                    <StatusBadge
                      status="PENDING"
                      label={`${pendingData?.total} Perlu Verifikasi`}
                    />
                  ) : (applicantIssuesData?.total ?? 0) > 0 ? (
                    <StatusBadge
                      status="HIGH"
                      label={`${applicantIssuesData?.total} Kendala Lapangan`}
                    />
                  ) : (needsActionData?.total ?? 0) > 0 ? (
                    <StatusBadge
                      status="MEDIUM"
                      label={`${needsActionData?.total} Belum Selesai`}
                    />
                  ) : (
                    <StatusBadge status="ACTIVE" label="Terkendali" />
                  )
                )}
              </div>

              <Tabs defaultValue={defaultTab} className="w-full">
                <div className="px-3 pt-2.5 bg-muted/20 border-b">
                  <TabsList className="w-full grid grid-cols-3 h-9 p-1">
                    <TabsTrigger value="pending" className="text-[11px] sm:text-xs flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span className="truncate">Verifikasi</span>
                      {typeof pendingData?.total === "number" && pendingData.total > 0 && (
                        <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-primary/20 text-primary animate-badge-glow-primary">
                          {pendingData.total}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="needsAction" className="text-[11px] sm:text-xs flex items-center justify-center gap-1">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                      <span className="truncate">Revisi/RTL</span>
                      {typeof needsActionData?.total === "number" && needsActionData.total > 0 && (
                        <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-500 text-white animate-badge-glow-destructive">
                          {needsActionData.total}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="issues" className="text-[11px] sm:text-xs flex items-center justify-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span className="truncate">Kendala</span>
                      {typeof applicantIssuesData?.total === "number" && applicantIssuesData.total > 0 && (
                        <span className="ml-0.5 inline-flex items-center justify-center px-1.5 py-0.2 text-[9px] font-bold rounded-full bg-rose-600 text-white animate-badge-glow-destructive">
                          {applicantIssuesData.total}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* TAB 1: MENUNGGU VERIFIKASI */}
                <TabsContent value="pending" className="m-0 divide-y p-1.5 focus-visible:outline-none">
                  <NotificationNavItem
                    href="/logbooks?status=PENDING"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<BookOpen className="h-4 w-4" />}
                    title="Logbook Harian"
                    description={isMentor ? "Diajukan & menunggu review admin" : "Belum diverifikasi verifikator"}
                    count={pendingData?.logbook}
                  />

                  <NotificationNavItem
                    href="/output-reports?status=PENDING"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<FilePieChart className="h-4 w-4" />}
                    title="Capaian Output"
                    description={isMentor ? "Laporan output menunggu review admin" : "Laporan output menunggu verifikasi"}
                    count={pendingData?.outputReport}
                  />

                  <NotificationNavItem
                    href="/applicants"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<Users className="h-4 w-4" />}
                    title="RTL Peserta"
                    description={isMentor ? "RTL diajukan menunggu verifikasi" : "Pengajuan RTL menunggu verifikasi"}
                    count={pendingData?.rtl}
                  />
                </TabsContent>

                {/* TAB 2: PERLU REVISI / RTL */}
                <TabsContent value="needsAction" className="m-0 divide-y p-1.5 focus-visible:outline-none">
                  <NotificationNavItem
                    href="/logbooks?status=REJECTED"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<BookOpen className="h-4 w-4" />}
                    iconContainerClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
                    title="Logbook Ditolak"
                    description={isMentor ? "Logbook Anda yang harus direvisi" : "Logbook ditolak menunggu perbaikan"}
                    count={needsActionData?.logbook}
                    badgeVariant="destructive"
                  />

                  <NotificationNavItem
                    href="/output-reports?status=REJECTED"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<FilePieChart className="h-4 w-4" />}
                    iconContainerClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
                    title="Capaian Output Ditolak"
                    description={isMentor ? "Laporan ditolak butuh revisi pendamping" : "Laporan ditolak butuh perbaikan"}
                    count={needsActionData?.outputReport}
                    badgeVariant="destructive"
                  />

                  <NotificationNavItem
                    href="/applicants"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<Users className="h-4 w-4" />}
                    iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
                    title="Penyusunan RTL"
                    description={isMentor ? "Peserta eligible (B1-B3) belum diajukan RTL" : "Peserta eligible belum diajukan RTL oleh pendamping"}
                    count={needsActionData?.rtl}
                    badgeVariant="amber"
                  />
                </TabsContent>

                {/* TAB 3: KENDALA PESERTA */}
                <TabsContent value="issues" className="m-0 divide-y p-1.5 focus-visible:outline-none">
                  <NotificationNavItem
                    href="/applicants?communicationStatus=NO_RESPONSE"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<PhoneOff className="h-4 w-4" />}
                    iconContainerClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
                    title="Tidak Merespon"
                    description="Peserta belum/tidak merespon komunikasi"
                    count={applicantIssuesData?.noResponse}
                    badgeVariant="destructive"
                  />

                  <NotificationNavItem
                    href="/applicants?presenceStatus=NOT_FOUND"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<UserX className="h-4 w-4" />}
                    iconContainerClassName="bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white"
                    title="Tidak Ditemukan"
                    description="Peserta tidak ditemukan di lokasi/domisili"
                    count={applicantIssuesData?.notFound}
                    badgeVariant="destructive"
                  />

                  <NotificationNavItem
                    href="/applicants?willingness=NOT_WILLING"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<XCircle className="h-4 w-4" />}
                    iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
                    title="Tidak Bersedia"
                    description="Peserta menyatakan tidak bersedia didampingi"
                    count={applicantIssuesData?.notWilling}
                    badgeVariant="amber"
                  />

                  <NotificationNavItem
                    href="/applicants?fundDisbursement=NOT_DISBURSED"
                    onClick={() => setIsNotificationOpen(false)}
                    icon={<DollarSign className="h-4 w-4" />}
                    iconContainerClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white"
                    title="Dana Belum Cair"
                    description="Bantuan dana usaha peserta belum cair"
                    count={applicantIssuesData?.notDisbursed}
                    badgeVariant="amber"
                  />
                </TabsContent>
              </Tabs>

              {/* FOOTER: PENGINGAT & AGENDA TERDEKAT */}
              <div className="border-t bg-muted/30 p-2.5">
                {nearestEvent ? (
                  <div
                    onClick={() => {
                      setIsNotificationOpen(false);
                      setSelectedAgendaEvent(nearestEvent);
                    }}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background/80 hover:bg-accent/80 border border-border/60 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1.5 rounded-md bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-2.5 w-2.5 text-amber-500" />
                            Agenda Terdekat
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[200px] sm:max-w-[240px]" title={nearestEvent.title}>
                          {nearestEvent.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={
                          nearestEvent.status === "COMPLETED"
                            ? "secondary"
                            : nearestEvent.daysRemaining <= 2
                            ? "destructive"
                            : "outline"
                        }
                        className={`text-[10px] px-1.5 py-0 font-semibold ${
                          nearestEvent.daysRemaining <= 2 && nearestEvent.status !== "COMPLETED"
                            ? "animate-badge-glow-destructive"
                            : ""
                        }`}
                      >
                        {nearestEvent.status === "COMPLETED"
                          ? "Selesai"
                          : nearestEvent.daysRemaining <= 0
                          ? "Hari Ini"
                          : `${nearestEvent.daysRemaining}h lagi`}
                      </Badge>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                      Agenda & Pengingat
                    </span>
                    <span className="italic text-[10px]">Tidak ada agenda bulan ini</span>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle />
          {me && <NavUser user={user} />}
        </div>
      </div>

      {/* Modal Dialog Detail Agenda */}
      <AgendaEventDialog
        event={selectedAgendaEvent}
        onClose={() => setSelectedAgendaEvent(null)}
      />
    </header>
  );
}
