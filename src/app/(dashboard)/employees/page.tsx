"use client";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useEmployees } from "@/hooks/use-employees";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WorkspaceRole, NikStatus } from "@/types";
import { UserAvatar } from "@/components/user-avatar";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/store/use-app-store";
import { useMembers } from "@/hooks/use-members";
import { RoleGuard } from "@/components/role-guard";

export default function EmployeesPage() {
  const router = useRouter();
  const currentRole = useAppStore((state) => state.currentRole);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  // Fetch memberships to identify the current user's WorkspaceMember ID
  const { data: membersResponse } = useMembers({ workspaceId: currentWorkspaceId || undefined });
  const members = membersResponse?.data || (Array.isArray(membersResponse) ? membersResponse : []);
  const myMembership = members.find((m: any) => m.userId === currentUserId);
  
  // Set mentorId filter if role is MENTOR
  const mentorId = currentRole === "MENTOR" ? myMembership?.id : undefined;

  const { data: employees, isLoading } = useEmployees({ 
    mentorId,
    workspaceId: currentWorkspaceId || undefined 
  });

  const data = (employees || []).map(e => {
    const applicant = (e as any).output?.applicant;
    const applicantProfile = applicant?.profile;
    
    return {
      ...e,
      applicantName: applicantProfile?.name || "N/A",
      applicantIdTkm: applicant?.idTkm || "N/A",
      applicantPhoto: applicantProfile?.photo || null,
      employeePhoto: (e as any).profile?.photo || null,
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Nama Karyawan",
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => (
        <span 
          className="font-medium truncate"
          title={row.getValue("name")}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "applicantName",
      header: "Peserta TKM Lanjutan",
      meta: { className: "w-[220px] truncate" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar name={row.original.applicantName} src={row.original.applicantPhoto} />
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate" title={row.original.applicantName}>{row.original.applicantName}</span>
            <span className="text-xs text-muted-foreground truncate">{row.original.applicantIdTkm}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "nikStatus",
      header: "Status NIK",
      meta: { className: "w-[130px]" },
      cell: ({ row }) => {
        const status = row.getValue("nikStatus") as NikStatus;
        return (
          <Badge variant={status === NikStatus.VALID ? "default" : "destructive"}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "hasIdentityConflict",
      header: "Konflik Identitas",
      meta: { className: "w-[150px]" },
      cell: ({ row }) => {
        const hasConflict = row.getValue("hasIdentityConflict") as boolean;
        return hasConflict ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> Ada Konflik
          </Badge>
        ) : (
          <Badge variant="outline">Aman</Badge>
        );
      },
    },
    {
      id: "actions",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          className="h-8 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/employees/${row.original.id}`);
          }}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "WORKSPACE_SUPERVISOR", WorkspaceRole.UNIVERSITY_ADMIN, WorkspaceRole.UNIVERSITY_SUPERVISOR, WorkspaceRole.MENTOR]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manajemen Karyawan</h1>
            <p className="text-muted-foreground mt-2">
              Verifikasi data tenaga kerja peserta TKM Lanjutan.
            </p>
          </div>
          {currentRole === "SUPER_ADMIN" && (
            <Link href="/employees/import">
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Impor Karyawan
              </Button>
            </Link>
          )}
        </div>

        {isLoading && !employees ? (
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
            searchKey="name" 
            searchPlaceholder="Cari nama karyawan..." 
          />
        )}
      </div>
    </RoleGuard>
  );
}
