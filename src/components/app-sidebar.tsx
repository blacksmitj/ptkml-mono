"use client"

import * as React from "react"
import Link from "next/link"
import { 
  LayoutDashboardIcon, 
  SchoolIcon, 
  UsersIcon, 
  UserSquare2Icon, 
  BookOpenIcon, 
  FilePieChartIcon, 
  UserCogIcon, 
  Settings2Icon, 
  CircleHelpIcon, 
  BarChart3Icon,
  BriefcaseIcon,
  ShieldCheckIcon,
  GaugeIcon,
  BellIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAppStore } from "@/store/use-app-store"
import { useMembers } from "@/hooks/use-members"
import { useUniversities } from "@/hooks/use-universities"
import { useMe } from "@/hooks/use-me"
import { useNotificationBadges } from "@/hooks/use-notification-badges"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const currentRole = useAppStore((state) => state.currentRole)
  const currentUserId = useAppStore((state) => state.currentUserId)
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId)
  const universityId = useAppStore((state) => state.universityId)
  
  const { data: badgeData } = useNotificationBadges()
  const badgeCounts = badgeData?.counts
  const pendingData = badgeData?.pending
  const needsActionData = badgeData?.needsAction
  const isMentor = currentRole === "MENTOR"

  const isSuperAdmin = currentRole === "SUPER_ADMIN"
  const isUnivAdmin = currentRole === "UNIVERSITY_ADMIN"
  const isUnivSpv = currentRole === "UNIVERSITY_SUPERVISOR"
  const isWorkspaceSupervisor = currentRole === "WORKSPACE_SUPERVISOR"
  
  const { data: me } = useMe()
  const { data: members } = useMembers({ workspaceId: currentWorkspaceId || undefined })
  const { data: allUniversities } = useUniversities()
  
  // Find university affiliation
  const activeMembership = React.useMemo(() => {
    const list = members?.data || (Array.isArray(members) ? members : []);
    if (!list.length || !currentUserId) return null;
    return list.find((m: any) => m.userId === currentUserId) || null;
  }, [members, currentUserId]);
  
  // Priority: 1. Database membership universityId, 2. Context universityId as fallback
  const effectiveUniversityId = activeMembership?.universityId || universityId;
  const university = React.useMemo(() => {
    if (!allUniversities || !effectiveUniversityId) return null;
    return allUniversities.find((u) => u.id === effectiveUniversityId) || null;
  }, [allUniversities, effectiveUniversityId]);
  
  const mentorId = activeMembership?.id
  
  const applicantIssuesData = badgeData?.applicantIssues

  // Calculate specific badges for Mentor vs Admin
  // Untuk Peserta: jika ada kendala lapangan (issues > 0), prioritaskan badge destructive merah
  const pesertaBadge = isMentor
    ? (applicantIssuesData?.total && applicantIssuesData.total > 0
        ? { count: applicantIssuesData.total, variant: "destructive" as const }
        : needsActionData?.rtl && needsActionData.rtl > 0
        ? { count: needsActionData.rtl, variant: "secondary" as const }
        : pendingData?.rtl && pendingData.rtl > 0
        ? { count: pendingData.rtl, variant: "default" as const }
        : undefined)
    : (applicantIssuesData?.total && applicantIssuesData.total > 0
        ? { count: applicantIssuesData.total, variant: "destructive" as const }
        : badgeCounts?.rtl && badgeCounts.rtl > 0
        ? { count: badgeCounts.rtl, variant: "default" as const }
        : undefined)

  const logbookBadge = isMentor
    ? (needsActionData?.logbook && needsActionData.logbook > 0
        ? { count: needsActionData.logbook, variant: "destructive" as const }
        : pendingData?.logbook && pendingData.logbook > 0
        ? { count: pendingData.logbook, variant: "default" as const }
        : undefined)
    : badgeCounts?.logbook && badgeCounts.logbook > 0
    ? { count: badgeCounts.logbook, variant: "default" as const }
    : undefined

  const outputBadge = isMentor
    ? (needsActionData?.outputReport && needsActionData.outputReport > 0
        ? { count: needsActionData.outputReport, variant: "destructive" as const }
        : pendingData?.outputReport && pendingData.outputReport > 0
        ? { count: pendingData.outputReport, variant: "default" as const }
        : undefined)
    : badgeCounts?.outputReport && badgeCounts.outputReport > 0
    ? { count: badgeCounts.outputReport, variant: "default" as const }
    : undefined

  const data = {
    user: {
      name: me?.profile?.name || "User",
      email: me?.profile?.email || me?.username || "user@example.com",
      avatar: me?.profile?.photo || "",
      universityName: university?.name,
      verificationStatus: activeMembership?.verificationStatus,
    },
    navUtama: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: <LayoutDashboardIcon />,
      },
    ],
    navData: [
      {
        title: "Peserta",
        url: "/applicants",
        icon: <UserSquare2Icon />,
        badge: pesertaBadge?.count,
        badgeVariant: pesertaBadge?.variant,
      },
      {
        title: "Pendamping",
        url: "/mentors",
        icon: <BriefcaseIcon />,
        hidden: currentRole === "MENTOR",
      },
      {
        title: "Universitas",
        url: "/universities",
        icon: <SchoolIcon />,
        hidden: !isSuperAdmin && !isWorkspaceSupervisor,
      },
      {
        title: "Karyawan",
        url: "/employees",
        icon: <UserCogIcon />,
      },
    ],
    navLaporan: [
      {
        title: "Logbook Harian",
        url: "/logbooks",
        icon: <BookOpenIcon />,
        badge: logbookBadge?.count,
        badgeVariant: logbookBadge?.variant,
      },
      {
        title: "Capaian Output",
        url: "/output-reports",
        icon: <FilePieChartIcon />,
        badge: outputBadge?.count,
        badgeVariant: outputBadge?.variant,
      },
      {
        title: "Download Center",
        url: "/reports",
        icon: <BarChart3Icon />,
      },
    ],
    navKelola: [
      {
        title: "User",
        url: "/members",
        icon: <UsersIcon />,
        hidden: !isSuperAdmin && !isUnivAdmin && !isUnivSpv && !isWorkspaceSupervisor,
      },
    ],
    navAdmin: [
      {
        title: "OCR Monitor",
        url: "/ocr-monitor",
        icon: <GaugeIcon />,
      },
      {
        title: "Pengingat Event",
        url: "/dashboard-events",
        icon: <BellIcon />,
      },
    ],
  }

  type NavItem = {
    title: string
    url: string
    icon?: React.ReactNode
    hidden?: boolean
    badge?: number
    badgeVariant?: "destructive" | "default" | "secondary" | "outline"
  }

  // Filter hidden items
  const filteredNavUtama = (data.navUtama as NavItem[]).filter(item => !item.hidden)
  const filteredNavData = (data.navData as NavItem[]).filter(item => !item.hidden)
  const filteredNavLaporan = (data.navLaporan as NavItem[]).filter(item => !item.hidden)
  const filteredNavKelola = (data.navKelola as NavItem[]).filter(item => !item.hidden)
  const filteredNavAdmin = isSuperAdmin ? (data.navAdmin as NavItem[]).filter(item => !item.hidden) : []

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3 flex flex-col justify-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Pendampingan TKML oleh Kemnaker"
            className="h-8 w-auto object-contain dark:brightness-0 dark:invert transition-all duration-200"
          />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="Utama" items={filteredNavUtama} />
        <NavMain label="Data" items={filteredNavData} />
        {filteredNavLaporan.length > 0 && <NavMain label="Laporan" items={filteredNavLaporan} />}
        {filteredNavKelola.length > 0 && <NavMain label="Kelola" items={filteredNavKelola} />}
        {filteredNavAdmin.length > 0 && <NavMain label="Admin" items={filteredNavAdmin} />}
      </SidebarContent>
    </Sidebar>
  )
}
