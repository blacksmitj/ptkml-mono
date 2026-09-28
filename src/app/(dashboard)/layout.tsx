"use client";

import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useAppStore } from "@/store/use-app-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AffiliationModal } from "@/components/affiliation-modal";
import { useMe } from "@/hooks/use-me";
import { useWorkspace } from "@/hooks/use-workspaces";
import { LockIcon, AlertOctagonIcon } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const universityId = useAppStore((state) => state.universityId);
  const currentRole = useAppStore((state) => state.currentRole);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUniversityId = useAppStore((state) => state.setUniversityId);
  const setRole = useAppStore((state) => state.setRole);
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  
  const isLoading = !hasHydrated;
  const router = useRouter();
  const [showAffiliationModal, setShowAffiliationModal] = useState(false);
  const { data: user, isLoading: isLoadingMe, isError } = useMe();
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");

  const activeMembership = user?.workspaceMemberships?.find(
    (m) => m.workspaceId === currentWorkspaceId
  );
  
  const hasUniversity = activeMembership?.universityId || universityId;
  const isBypassAffiliation = user?.globalRole === "SUPER_ADMIN" || user?.globalRole === "WORKSPACE_SUPERVISOR";

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isLoadingMe && (isError || !user)) {
      router.push("/login");
    }
  }, [isLoading, isLoadingMe, isError, user, router]);

  useEffect(() => {
    if (!isLoading && currentWorkspaceId === null && user) {
      router.push("/workspaces");
    }
  }, [currentWorkspaceId, isLoading, user, router]);

  // Sync DB-driven user, role and universityId with context
  useEffect(() => {
    if (!user) return;

    if (user.id && currentUserId !== user.id) {
      setUserId(user.id);
    }

    // 1. If global role is SUPER_ADMIN, user is SUPER_ADMIN
    if (user.globalRole === "SUPER_ADMIN") {
      if (currentRole !== "SUPER_ADMIN") {
        setRole("SUPER_ADMIN");
      }
      if (universityId !== null) {
        setUniversityId(null);
      }
      return;
    }

    // 1b. If global role is WORKSPACE_SUPERVISOR, user is WORKSPACE_SUPERVISOR
    if (user.globalRole === "WORKSPACE_SUPERVISOR") {
      if (currentRole !== "WORKSPACE_SUPERVISOR") {
        setRole("WORKSPACE_SUPERVISOR");
      }
      if (universityId !== null) {
        setUniversityId(null);
      }
      return;
    }

    // 2. Otherwise, check workspace-specific member role and university
    if (activeMembership) {
      if (currentRole !== activeMembership.role) {
        setRole(activeMembership.role);
      }
      if (universityId !== (activeMembership.universityId || null)) {
        setUniversityId(activeMembership.universityId || null);
      }
    } else {
      setUniversityId(null);
    }
  }, [user, currentUserId, setUserId, activeMembership, currentRole, universityId, setRole, setUniversityId]);

  useEffect(() => {
    if (
      !isLoading &&
      !isLoadingMe &&
      currentWorkspaceId &&
      !isBypassAffiliation &&
      !hasUniversity
    ) {
      setShowAffiliationModal(true);
    } else {
      setShowAffiliationModal(false);
    }
  }, [isLoading, isLoadingMe, currentWorkspaceId, isBypassAffiliation, hasUniversity]);

  useEffect(() => {
    if (
      !isLoading &&
      !isLoadingMe &&
      currentWorkspaceId &&
      !isBypassAffiliation
    ) {
      const status = activeMembership?.verificationStatus;
      if (status === "PENDING" || status === "REJECTED") {
        router.push("/workspaces");
      }
    }
  }, [isLoading, isLoadingMe, currentWorkspaceId, isBypassAffiliation, activeMembership, router]);

  if (isLoading || !currentWorkspaceId) {
    return <div className="flex h-screen items-center justify-center">Memuat...</div>;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
          "display": "flex",
          "width": "100%"
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        
        {/* Warning Banner for Frozen Workspace */}
        {workspace?.isInputFrozen && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-300">
            <LockIcon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500" />
            <span>Workspace ini sedang dibekukan oleh Super Admin. Seluruh aktivitas pengisian dan perubahan data dinonaktifkan (Read-Only).</span>
          </div>
        )}

        {/* Warning Banner for Deactivated Workspace */}
        {!workspace?.isActive && (
          <div className="mx-4 lg:mx-6 mt-4 p-4 bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 rounded-xl text-sm font-medium flex items-center gap-2 animate-in fade-in duration-300">
            <AlertOctagonIcon className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-500" />
            <span>Workspace ini telah dinonaktifkan. Anda saat ini mengakses data dalam mode Read-Only.</span>
          </div>
        )}

        <div className="flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden p-4 lg:p-6">
          {children}
        </div>
      </SidebarInset>
      <AffiliationModal 
        open={showAffiliationModal} 
        onOpenChange={setShowAffiliationModal} 
        isForced={true}
      />
    </SidebarProvider>
  )
}
