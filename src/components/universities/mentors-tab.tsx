"use client";

import { WorkspaceMember, Applicant, WorkspaceRole } from "@/types";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { UserAvatar } from "@/components/user-avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatPercentage } from "@/lib/utils";

interface MentorsTabProps {
  members: WorkspaceMember[];
  allApplicants: Applicant[];
}

export function MentorsTab({ members, allApplicants }: MentorsTabProps) {
  const router = useRouter();

  const mentors = members.filter(m => m.role === WorkspaceRole.MENTOR);

  const data = mentors.map(m => {
    const profile = m.user?.profile;
    const guidedApplicants = allApplicants.filter(a => a.mentorId === m.id);
    
    return {
      id: m.id,
      name: profile?.name || "Unknown",
      email: profile?.email || "No Email",
      participantCount: guidedApplicants.length,
      quota: 10, // Assuming fixed quota for now
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
      accessorKey: "participantCount",
      header: "Jumlah Peserta",
      cell: ({ row }) => {
        const count = row.getValue("participantCount") as number;
        const quota = row.original.quota;
        const percentage = (count / quota) * 100;
        
        return (
          <div className="flex flex-col gap-1 w-32">
            <div className="flex justify-between text-[10px] font-bold">
              <span>{count} / {quota}</span>
              <span>{formatPercentage(percentage)}</span>
            </div>
            <Progress value={percentage} className="h-1.5" />
          </div>
        );
      },
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
        <CardTitle>Daftar Pendamping</CardTitle>
        <CardDescription>Para ahli yang mendampingi peserta TKML di universitas ini.</CardDescription>
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
