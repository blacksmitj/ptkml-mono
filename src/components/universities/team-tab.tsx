"use client";

import { WorkspaceMember, WorkspaceRole } from "@/types";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/user-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface TeamTabProps {
  members: WorkspaceMember[];
}

export function TeamTab({ members }: TeamTabProps) {
  const router = useRouter();

  // Filter only Admins and Supervisors
  const managementTeam = members.filter(m => 
    m.role === WorkspaceRole.UNIVERSITY_ADMIN || 
    m.role === WorkspaceRole.UNIVERSITY_SUPERVISOR
  );

  const data = managementTeam.map(m => {
    const profile = m.user?.profile;
    return {
      id: m.id,
      name: profile?.name || "Unknown",
      email: profile?.email || "No Email",
      role: m.role,
      avatar: profile?.photo,
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.getValue("name")} src={row.original.avatar} />
          <span className="font-medium">{row.getValue("name")}</span>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <StatusBadge status={row.getValue("role")} />,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      id: "actions",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium cursor-pointer"
          onClick={() => router.push(`/members/${row.original.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tim Pengelola Universitas</CardTitle>
        <CardDescription>Daftar administrator dan pengawas yang bertanggung jawab atas koordinasi di universitas ini.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={data} 
        />
      </CardContent>
    </Card>
  );
}
