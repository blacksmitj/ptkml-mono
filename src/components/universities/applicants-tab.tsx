"use client";

import { Applicant, WorkspaceMember, Profile } from "@/types";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
// Remove @/data import

import { Button } from "@/components/ui/button";

interface ApplicantsTabProps {
  applicants: Applicant[];
}

export function ApplicantsTab({ applicants }: ApplicantsTabProps) {
  const router = useRouter();

  const data = applicants.map(a => {
    const profile = a.profile;
    const mentorUser = (a.mentor as any)?.user;
    const mentorProfile = mentorUser?.profile || (a.mentor as any)?.profile;
    const mentorName = mentorProfile?.name || mentorUser?.name;

    return {
      ...a,
      name: profile?.name || "N/A",
      nik: profile?.nik || "N/A",
      mentorName: mentorName || "Belum ada mentor",
      hasMentor: Boolean(mentorName),
    };
  });

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Nama Peserta",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={row.getValue("name")} src={row.original.profile?.photo} />
          <div className="flex flex-col">
            <span className="text-xs font-mono text-muted-foreground">{row.original.idTkm}</span>
            <span className="font-medium">{row.getValue("name")}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "mentorName",
      header: "Pendamping",
      cell: ({ row }) => {
        const hasMentor = row.original.hasMentor;
        const name = row.getValue("mentorName") as string;
        return (
          <Badge
            variant={hasMentor ? "secondary" : "outline"}
            className={hasMentor ? "font-normal" : "font-normal text-muted-foreground italic"}
          >
            {name}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.getValue("status")} />,
    },
    {
      id: "actions",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs font-medium cursor-pointer"
          onClick={() => router.push(`/applicants/${row.original.id}`)}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Peserta</CardTitle>
        <CardDescription>Seluruh peserta TKML yang berada di bawah naungan pendamping universitas ini.</CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns} 
          data={data} 
          searchKey="name"
          searchPlaceholder="Cari peserta..."
        />
      </CardContent>
    </Card>
  );
}
