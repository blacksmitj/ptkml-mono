"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMembers, useUpdateMember, useVerifyMember, useDeleteMember } from "@/hooks/use-members";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceRole, VerificationStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { Plus, UserPlus, ShieldCheck, XCircle, Check, X, Loader2, Trash2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/store/use-app-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/components/providers/confirm-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RoleGuard } from "@/components/role-guard";


export default function MembersPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const universityId = useAppStore((state) => state.universityId);
  const router = useRouter();
  const updateMember = useUpdateMember();
  const verifyMember = useVerifyMember();
  const deleteMemberMutation = useDeleteMember();
  const confirm = useConfirm();
  
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  const isUnivRole = currentRole === "UNIVERSITY_ADMIN" || currentRole === "UNIVERSITY_SUPERVISOR";
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isUnivAdmin = currentRole === "UNIVERSITY_ADMIN";

  const { data: members, isLoading, isFetching, refetch } = useMembers({
    workspaceId: currentWorkspaceId || undefined,
    universityId: (isUnivRole && universityId) ? universityId : undefined,
  });

  const handleVerify = async (memberId: string, status: VerificationStatus) => {
    setUpdatingMemberId(`${memberId}-status`);
    try {
      await verifyMember.mutateAsync({
        id: memberId,
        verificationStatus: status
      });
      toast.success(
        status === VerificationStatus.APPROVED
          ? "Anggota berhasil disetujui."
          : "Anggota berhasil ditolak."
      );
    } catch (err) {
      console.error("Gagal melakukan verifikasi anggota:", err);
      toast.error("Gagal melakukan verifikasi anggota.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    setUpdatingMemberId(`${memberId}-role`);
    try {
      await updateMember.mutateAsync({
        id: memberId,
        role: newRole
      });
      toast.success("Role berhasil diperbarui.");
    } catch (err) {
      console.error("Gagal memperbarui role anggota:", err);
      toast.error("Gagal memperbarui role anggota.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleDeleteMember = async (memberId: string, name: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Anggota?",
      description: `Apakah Anda yakin ingin mengeluarkan/menghapus ${name} dari workspace?`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive",
    });

    if (!isConfirmed) return;
    setUpdatingMemberId(`${memberId}-delete`);
    try {
      await deleteMemberMutation.mutateAsync(memberId);
      toast.success("Anggota berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus anggota:", err);
      toast.error("Gagal menghapus anggota.");
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const memberList = members?.data || (Array.isArray(members) ? members : []);
  const data = memberList.map((m: any) => {
    const profile = m.user?.profile;
    const univ = m.university;
    return {
      ...m,
      name: profile?.name || "N/A",
      email: m.user?.profile?.email || "N/A",
      photo: profile?.photo || null,
      universityName: univ?.name || "N/A",
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Nama Lengkap",
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={row.getValue("name")} src={row.original.photo} />
          <span 
            className="font-medium truncate"
            title={row.getValue("name")}
          >
            {row.getValue("name")}
          </span>
        </div>
      ),
    },

    {
      accessorKey: "role",
      header: "Role",
      meta: { className: "w-[200px]" },
      cell: ({ row }) => {
        const memberId = row.original.id;
        const currentRoleValue = row.getValue("role") as WorkspaceRole;
        const isUpdatingRole = updatingMemberId === `${memberId}-role`;

        // Permission: ONLY Super Admin can change roles now (Univ Admin is disabled/cannot change role)
        const canChangeRole = isSuperAdmin;

        if (canChangeRole) {
          return (
            <Select
              value={currentRoleValue}
              disabled={isUpdatingRole}
              onValueChange={(newRole) => handleRoleChange(memberId, newRole as WorkspaceRole)}
            >
              <SelectTrigger 
                className="h-8 px-2 min-w-42.5 border bg-card text-card-foreground text-xs shadow-none hover:bg-accent/50 cursor-pointer font-medium rounded-md flex items-center justify-between gap-1.5"
              >
                {isUpdatingRole ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    <span>Menyimpan...</span>
                  </span>
                ) : (
                  <SelectValue placeholder="Pilih Role" />
                )}
              </SelectTrigger>
              <SelectContent align="start" className="min-w-47.5">
                <SelectItem value={WorkspaceRole.UNIVERSITY_ADMIN} className="text-xs">
                  Admin Universitas
                </SelectItem>
                <SelectItem value={WorkspaceRole.MENTOR} className="text-xs">
                  Pendamping
                </SelectItem>
                <SelectItem value={WorkspaceRole.UNIVERSITY_SUPERVISOR} className="text-xs">
                  Pengawas Universitas
                </SelectItem>
              </SelectContent>
            </Select>
          );
        }

        return (
          <Badge variant="outline" className="capitalize text-xs py-0.5 px-2 bg-muted/30">
            {currentRoleValue === WorkspaceRole.UNIVERSITY_ADMIN 
              ? "Admin Universitas" 
              : currentRoleValue === WorkspaceRole.UNIVERSITY_SUPERVISOR 
                ? "Pengawas Universitas" 
                : currentRoleValue === WorkspaceRole.MENTOR 
                  ? "Pendamping" 
                  : (currentRoleValue as string).replace(/_/g, " ").toLowerCase()}
          </Badge>
        );
      },
    },
    {
      accessorKey: "universityName",
      header: "Universitas",
      meta: { className: "w-[180px] truncate" },
      cell: ({ row }) => (
        <span className="truncate block" title={row.getValue("universityName")}>
          {row.getValue("universityName")}
        </span>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      meta: { className: "w-[200px] truncate" },
      cell: ({ row }) => (
        <span className="truncate block" title={row.getValue("email")}>
          {row.getValue("email")}
        </span>
      ),
    },
    {
      accessorKey: "verificationStatus",
      header: "Status",
      meta: { className: "w-[130px]" },
      cell: ({ row }) => {
        const status = row.getValue("verificationStatus") as VerificationStatus;
        return (
          <Badge
            variant={
              status === VerificationStatus.APPROVED
                ? "default"
                : status === VerificationStatus.REJECTED
                ? "destructive"
                : "outline"
            }
            className={
              status === VerificationStatus.APPROVED
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/15"
                : status === VerificationStatus.REJECTED
                ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/15 animate-pulse"
            }
          >
            {status === VerificationStatus.APPROVED
              ? "Aktif"
              : status === VerificationStatus.REJECTED
              ? "Ditolak"
              : "Menunggu"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      meta: { className: "w-[160px]" },
      cell: ({ row }) => {
        const memberId = row.original.id;
        const targetRole = row.original.role;
        const targetUnivId = row.original.universityId;
        const status = row.original.verificationStatus;
        const isUpdatingStatus = updatingMemberId === `${memberId}-status`;
        const isDeleting = updatingMemberId === `${memberId}-delete`;
        const applicantsCount = row.original._count?.applicants ?? 0;

        const isReadOnly = currentRole === "WORKSPACE_SUPERVISOR";

        // Check verification permission:
        // - Super Admin can verify any role.
        // - University Admin can verify only MENTOR from their own university.
        const canApproveReject =
          !isReadOnly &&
          (isSuperAdmin ||
            (isUnivAdmin &&
              targetRole === WorkspaceRole.MENTOR &&
              targetUnivId === universityId));

        // Delete permission:
        // - Super Admin can delete MENTOR if applicants count is 0
        // - University Admin can delete MENTOR from their own university if applicants count is 0
        const canDelete =
          !isReadOnly &&
          targetRole === WorkspaceRole.MENTOR &&
          applicantsCount === 0 &&
          (isSuperAdmin || (isUnivAdmin && targetUnivId === universityId));

        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/members/${memberId}`)}
              className="h-8 text-xs font-medium cursor-pointer"
            >
              Detail
            </Button>

            {status === VerificationStatus.PENDING && canApproveReject && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={isUpdatingStatus || isDeleting}
                        onClick={() => handleVerify(memberId, VerificationStatus.APPROVED)}
                        className="h-8 w-8 rounded-md bg-emerald-50/50 hover:bg-emerald-100 hover:text-emerald-700 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 dark:border-emerald-500/30 transition-all duration-200 cursor-pointer"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Setujui Anggota</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={isUpdatingStatus || isDeleting}
                        onClick={() => handleVerify(memberId, VerificationStatus.REJECTED)}
                        className="h-8 w-8 rounded-md bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:border-rose-500/30 transition-all duration-200 cursor-pointer"
                      >
                        {isUpdatingStatus ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>Tolak Anggota</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}

            {canDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      disabled={isUpdatingStatus || isDeleting}
                      onClick={() => handleDeleteMember(memberId, row.original.name)}
                      className="h-8 w-8 rounded-md bg-rose-50/50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:border-rose-500/30 transition-all duration-200 cursor-pointer"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Hapus Mentor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "WORKSPACE_SUPERVISOR", WorkspaceRole.UNIVERSITY_ADMIN, WorkspaceRole.UNIVERSITY_SUPERVISOR]}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Anggota Workspace</h1>
            <p className="text-muted-foreground mt-2">
              Kelola tim pendamping (Admin Univ, Mentor, Pengawas).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                toast.info("Memperbarui status pengguna...");
              }}
              disabled={isLoading || isFetching}
              className="h-9 gap-2 cursor-pointer shadow-sm hover:bg-accent"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : ""}`} />
              <span>{isFetching ? "Memperbarui..." : "Refresh"}</span>
            </Button>
          </div>
        </div>

        {isLoading && !members ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            isLoading={isLoading}
            isFetching={isFetching}
            searchKey="name" 
            searchPlaceholder="Cari anggota..." 
          />
        )}
      </div>
    </RoleGuard>
  );
}
