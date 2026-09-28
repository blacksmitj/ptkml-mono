"use client";

import { useParams, useRouter } from "next/navigation";
import { useUniversity } from "@/hooks/use-universities";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  LayoutDashboard,
  Users,
  UserCog,
  GraduationCap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { SummaryTab } from "@/components/universities/summary-tab";
import { TeamTab } from "@/components/universities/team-tab";
import { MentorsTab } from "@/components/universities/mentors-tab";
import { ApplicantsTab } from "@/components/universities/applicants-tab";
import { WorkspaceRole } from "@/types";
import { useAppStore } from "@/store/use-app-store";

export default function UniversityDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const {
    data: university,
    isLoading,
    isError,
  } = useUniversity(id, currentWorkspaceId || undefined);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-100 w-full" />
      </div>
    );
  }

  if (isError || !university) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Universitas tidak ditemukan</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const universityMembers = university.members || [];
  const universityMentors = universityMembers.filter(
    (m) => m.role === WorkspaceRole.MENTOR,
  );
  // Derive applicants from mentor members' applicant relations
  const universityApplicants = universityMembers.flatMap(
    (m: any) =>
      (m.applicants || []).map((applicant: any) => ({
        ...applicant,
        mentor: applicant.mentor || m,
      })),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Detail Universitas
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-card p-6 rounded-xl border shadow-sm">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border bg-muted/40 overflow-hidden shadow-sm">
          {university.logo ? (
            <Image
              src={normalizeFileUrl(university.logo)}
              alt={university.name}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <span className="text-3xl font-bold uppercase">
              {university.name.substring(0, 2)}
            </span>
          )}
        </div>
        <div className="flex-1 space-y-1">
          <h2 className="text-3xl font-bold">{university.name}</h2>
          <p className="text-muted-foreground font-medium">
            Ditambahkan:{" "}
            {formatDistanceToNow(new Date(university.createdAt), {
              addSuffix: true,
              locale: localeId,
            })}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
            Mitra Universitas
          </p>
        </div>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="summary" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> Ringkasan
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <UserCog className="h-4 w-4" /> Tim Pengelola
          </TabsTrigger>
          <TabsTrigger value="mentors" className="gap-2">
            <Users className="h-4 w-4" /> Pendamping
          </TabsTrigger>
          <TabsTrigger value="applicants" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Peserta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <SummaryTab
            members={universityMembers}
            applicants={universityApplicants}
          />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab members={universityMembers} />
        </TabsContent>

        <TabsContent value="mentors" className="mt-6">
          <MentorsTab
            members={universityMembers}
            allApplicants={universityApplicants}
          />
        </TabsContent>

        <TabsContent value="applicants" className="mt-6">
          <ApplicantsTab applicants={universityApplicants} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
