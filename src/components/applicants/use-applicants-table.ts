"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useDeleteApplicant } from "@/hooks/use-applicants";
import { useWorkspace } from "@/hooks/use-workspaces";
import { useMe } from "@/hooks/use-me";
import { useMembers } from "@/hooks/use-members";
import { toast } from "sonner";
import {
  ApplicantStatus,
  CommunicationStatus,
  Willingness,
  PresenceStatus,
  FundDisbursement,
} from "@/types";
import {
  Ban,
  PauseCircle,
  PhoneOff,
  MapPinOff,
  CircleDollarSign,
  CheckCircle2,
} from "lucide-react";

export interface StatusBadgeInfo {
  type: "positive" | "negative";
  label: string | null;
  icon: any;
  className: string;
}

export function useApplicantsTable() {
  const currentRole = useAppStore((state) => state.currentRole);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentUserId = useAppStore((state) => state.currentUserId);

  const confirm = useConfirm();
  const deleteApplicantMutation = useDeleteApplicant();

  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceInactive = workspace?.isActive === false;

  const { data: me } = useMe();
  const { data: membersData } = useMembers({
    workspaceId: currentWorkspaceId || undefined,
  });
  const members =
    membersData?.data || (Array.isArray(membersData) ? membersData : []);

  const currentMember = React.useMemo(() => {
    if (me?.workspaceMemberships && currentWorkspaceId) {
      const found = me.workspaceMemberships.find(
        (m: any) => m.workspaceId === currentWorkspaceId,
      );
      if (found) return found;
    }
    if (!members || !currentUserId) return null;
    return members.find((m: any) => m.userId === currentUserId) || null;
  }, [me, currentWorkspaceId, members, currentUserId]);

  // Hanya MENTOR yang bisa edit profil peserta
  const checkCanEdit = React.useCallback(
    (applicant: any) => {
      if (isWorkspaceInactive) return false;
      if (currentRole !== "MENTOR") return false;

      const memberId =
        currentMember?.id ||
        me?.workspaceMemberships?.find(
          (m: any) => m.workspaceId === currentWorkspaceId,
        )?.id;
      const isAssignedToMe =
        (memberId &&
          (applicant.mentorId === memberId ||
            applicant.mentor?.id === memberId)) ||
        (currentUserId && applicant.mentor?.user?.id === currentUserId);
      return isAssignedToMe || !applicant.mentorId;
    },
    [
      currentRole,
      currentMember,
      me,
      currentWorkspaceId,
      currentUserId,
      isWorkspaceInactive,
    ],
  );

  // SUPER_ADMIN bisa update status kepesertaan (ACTIVE/DROPPED/PENDING)
  // MENTOR bisa update status pendampingan (komunikasi, kesediaan, keberadaan, penyaluran)
  // Role lain (ADMIN_UNIV, SUPERVISOR) tidak bisa akses
  const checkCanUpdateStatus = React.useCallback(
    (applicant: any) => {
      if (isWorkspaceInactive) return false;
      if (currentRole === "SUPER_ADMIN") return true;
      if (currentRole === "MENTOR") {
        const memberId =
          currentMember?.id ||
          me?.workspaceMemberships?.find(
            (m: any) => m.workspaceId === currentWorkspaceId,
          )?.id;
        const isAssignedToMe =
          (memberId &&
            (applicant.mentorId === memberId ||
              applicant.mentor?.id === memberId)) ||
          (currentUserId && applicant.mentor?.user?.id === currentUserId);
        return isAssignedToMe || !applicant.mentorId;
      }
      return false;
    },
    [
      currentRole,
      currentMember,
      me,
      currentWorkspaceId,
      currentUserId,
      isWorkspaceInactive,
    ],
  );

  const getStatusBadgeInfo = React.useCallback((applicant: any): StatusBadgeInfo => {
    // 1. DROPPED (Gugur / Keluar)
    if (applicant.status === ApplicantStatus.DROPPED) {
      return {
        type: "negative",
        label: "Dropped",
        icon: Ban,
        className:
          "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 shadow-2xs font-semibold",
      };
    }

    // 2. PENDING (Hold)
    if (applicant.status === ApplicantStatus.PENDING) {
      return {
        type: "negative",
        label: "Hold",
        icon: PauseCircle,
        className:
          "bg-muted/80 text-muted-foreground border-border hover:bg-muted dark:bg-muted/60 dark:text-muted-foreground dark:border-border/80 shadow-2xs font-semibold",
      };
    }

    // 3. Status Komunikasi (Tidak Merespon)
    if (applicant.communicationStatus === CommunicationStatus.NO_RESPONSE) {
      return {
        type: "negative",
        label: "Tidak Merespon",
        icon: PhoneOff,
        className:
          "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/60 shadow-2xs font-semibold",
      };
    }

    // 4. Kesediaan (Tidak Bersedia)
    if (applicant.willingness === Willingness.NOT_WILLING) {
      return {
        type: "negative",
        label: "Tidak Bersedia",
        icon: Ban,
        className:
          "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/60 shadow-2xs font-semibold",
      };
    }

    // 5. Keberadaan (Tidak Ditemukan)
    if (applicant.presenceStatus === PresenceStatus.NOT_FOUND) {
      return {
        type: "negative",
        label: "Tidak Ditemukan",
        icon: MapPinOff,
        className:
          "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-950/60 shadow-2xs font-semibold",
      };
    }

    // 6. Penyaluran Dana (Belum Disalurkan)
    if (applicant.fundDisbursement === FundDisbursement.NOT_DISBURSED) {
      return {
        type: "negative",
        label: "Belum Disalurkan",
        icon: CircleDollarSign,
        className:
          "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-950/60 shadow-2xs font-semibold",
      };
    }

    // 7. Semua positif
    return {
      type: "positive",
      label: null,
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-emerald-950/60 shadow-2xs font-semibold",
    };
  }, []);

  const handleDeleteApplicant = React.useCallback(
    async (id: string, name: string) => {
      const isConfirmed = await confirm({
        title: "Hapus Peserta?",
        description: `Apakah Anda yakin ingin menghapus ${name}? Tindakan ini akan menghapus seluruh data terkait peserta secara permanen (termasuk logbook dan capaian output).`,
        confirmText: "Ya, Hapus",
        cancelText: "Batal",
        variant: "destructive",
      });

      if (!isConfirmed) return;

      try {
        await deleteApplicantMutation.mutateAsync(id);
        toast.success("Peserta berhasil dihapus.");
      } catch (err: any) {
        console.error("Gagal menghapus peserta:", err);
        const errorMsg =
          err.response?.data?.error ||
          err.message ||
          "Gagal menghapus peserta.";
        toast.error(errorMsg);
      }
    },
    [confirm, deleteApplicantMutation],
  );

  return {
    currentRole,
    currentWorkspaceId,
    currentUserId,
    isWorkspaceInactive,
    checkCanEdit,
    checkCanUpdateStatus,
    getStatusBadgeInfo,
    handleDeleteApplicant,
  };
}
