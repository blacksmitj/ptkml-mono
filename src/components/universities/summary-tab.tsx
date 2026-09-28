"use client";

import { WorkspaceMember, Applicant, WorkspaceRole } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, UserCog, ShieldCheck, BarChart3 } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie } from "recharts";

interface SummaryTabProps {
  members: WorkspaceMember[];
  applicants: Applicant[];
}

export function SummaryTab({ members, applicants }: SummaryTabProps) {
  const admins = members.filter(m => m.role === WorkspaceRole.UNIVERSITY_ADMIN);
  const mentors = members.filter(m => m.role === WorkspaceRole.MENTOR);
  const supervisors = members.filter(m => 
    m.role === WorkspaceRole.UNIVERSITY_SUPERVISOR
  );

  const stats = [
    { label: "Admin Univ", value: admins.length, icon: UserCog, color: "text-blue-500" },
    { label: "Pendamping", value: mentors.length, icon: Users, color: "text-emerald-500" },
    { label: "Pengawas", value: supervisors.length, icon: ShieldCheck, color: "text-amber-500" },
    { label: "Total Peserta", value: applicants.length, icon: GraduationCap, color: "text-indigo-500" },
  ];

  // Prepare chart data: Applicants per Mentor
  const chartData = mentors.map((mentor, index) => {
    const mentorApplicants = applicants.filter(a => a.mentorId === mentor.id);
    return {
      mentor: `mentor_${index}`,
      count: mentorApplicants.length,
      fill: `var(--color-mentor_${index})`,
    };
  }).filter(d => d.count > 0);

  const chartConfig = {
    count: {
      label: "Jumlah Peserta",
    },
    ...mentors.reduce((acc, mentor, index) => ({
      ...acc,
      [`mentor_${index}`]: {
        label: mentor.user?.profile?.name || `Pendamping ${mentor.id.split("-").pop()}`,
        color: `var(--chart-${(index % 5) + 1})`,
      },
    }), {}),
  } satisfies ChartConfig;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-bold">
                Aktif dalam Workspace
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Beban Kerja Pendamping
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="mentor"
                    innerRadius={60}
                    strokeWidth={5}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground italic border-2 border-dashed rounded-lg">
                Belum ada data peserta untuk ditampilkan
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Ringkasan Aktivitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-xl border border-dashed">
              <p className="text-sm text-center text-muted-foreground italic">
                Data aktivitas universitas akan terus diperbarui secara berkala seiring dengan perkembangan pendampingan oleh para pendamping.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold uppercase text-muted-foreground">Status Kapasitas</h4>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm">Rata-rata Peserta per Pendamping</span>
                <span className="font-bold">{mentors.length > 0 ? (applicants.length / mentors.length).toFixed(1) : 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
