"use client";

import { useParams, useRouter } from "next/navigation";
import { useMember } from "@/hooks/use-member";
import { useLogbooks } from "@/hooks/use-logbooks";
import { useOutputReports } from "@/hooks/use-output-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import {
  ChevronLeft,
  Mail,
  Phone,
  School,
  Users,
  FileText,
  ClipboardList,
  BookOpen,
  BarChart3,
  MapPin,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

export default function MemberDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const { data: member, isLoading, isError } = useMember(id);

  const isMentor = member?.role === "MENTOR";

  const { data: logbooks, isLoading: isLogbooksLoading } = useLogbooks(
    isMentor ? member?.workspaceId : undefined,
    isMentor ? member?.id : undefined,
  );

  const { data: outputReports, isLoading: isOutputsLoading } = useOutputReports(
    isMentor ? member?.workspaceId : undefined,
    undefined,
    isMentor ? member?.id : undefined,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !member) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Anggota tidak ditemukan</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const profile = member.user?.profile;
  const university = member.university;
  const guidedApplicants = member.applicants || [];

  // Calculate dynamic stats
  const finishedLogbooks =
    logbooks?.filter((l: any) => l.verificationStatus === "APPROVED").length ||
    0;
  const pendingLogbooks =
    logbooks?.filter((l: any) => l.verificationStatus === "PENDING").length ||
    0;
  const pendingOutputs =
    outputReports?.filter((o: any) => o.verificationStatus === "PENDING")
      .length || 0;
  const totalPending = pendingLogbooks + pendingOutputs;

  // Flatten data for DataTable search compatibility
  const formattedApplicants = guidedApplicants.map((app: any) => ({
    ...app,
    name: app.profile?.name || "N/A",
    email: app.profile?.email || "-",
    whatsapp: app.profile?.whatsapp || "-",
  }));

  const formattedOutputs = (outputReports || []).map((o: any) => ({
    ...o,
    applicantName: o.applicant?.profile?.name || "N/A",
  }));

  // Columns for Binaan Table
  const applicantColumns: ColumnDef<any>[] = [
    {
      accessorKey: "name",
      header: "Nama Peserta",
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <UserAvatar name={name} src={row.original.profile?.photo} />
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate" title={name}>
                {name}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                TKM ID: {row.original.idTkm}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email / WA",
      meta: { className: "w-[220px] truncate" },
      cell: ({ row }) => (
        <div className="flex flex-col text-xs text-muted-foreground">
          <span className="truncate">{row.original.email}</span>
          <span>{row.original.whatsapp}</span>
        </div>
      ),
    },
    {
      accessorKey: "willingness",
      header: "Kesediaan",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => (
        <Badge
          variant={
            row.getValue("willingness") === "WILLING" ? "default" : "outline"
          }
          className={
            row.getValue("willingness") === "WILLING"
              ? "bg-emerald-500 hover:bg-emerald-600"
              : ""
          }
        >
          {row.getValue("willingness") === "WILLING"
            ? "Bersedia"
            : "Tidak Bersedia"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => (
        <Badge
          variant={
            row.getValue("status") === "ACTIVE" ? "secondary" : "outline"
          }
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "actions",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/applicants/${row.original.id}`);
          }}
        >
          Detail
        </Button>
      ),
    },
  ];

  // Columns for Logbook Table
  const logbookColumns: ColumnDef<any>[] = [
    {
      accessorKey: "logbookDate",
      header: "Tanggal Kegiatan",
      meta: { className: "w-[150px]" },
      cell: ({ row }) => {
        const date = new Date(row.getValue("logbookDate"));
        return <span>{format(date, "dd MMM yyyy", { locale: localeId })}</span>;
      },
    },
    {
      accessorKey: "mentoringMaterial",
      header: "Materi Pendampingan",
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => (
        <div
          className="font-medium truncate"
          title={row.getValue("mentoringMaterial")}
        >
          {row.getValue("mentoringMaterial")}
        </div>
      ),
    },
    {
      accessorKey: "meetingType",
      header: "Metode & Jenis",
      meta: { className: "w-[180px]" },
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.deliveryMethod} - {row.original.meetingType}
        </span>
      ),
    },
    {
      accessorKey: "verificationStatus",
      header: "Status",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => {
        const status = row.getValue("verificationStatus") as string;
        return (
          <Badge
            variant={
              status === "APPROVED"
                ? "default"
                : status === "REJECTED"
                  ? "destructive"
                  : "outline"
            }
            className={
              status === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : ""
            }
          >
            {status}
          </Badge>
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
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/logbooks/${row.original.id}`);
          }}
        >
          Detail
        </Button>
      ),
    },
  ];

  // Columns for Output Table
  const outputColumns: ColumnDef<any>[] = [
    {
      accessorKey: "monthReport",
      header: "Bulan Laporan",
      meta: { className: "w-[100px]" },
      cell: ({ row }) => {
        const m = row.getValue("monthReport") as number;
        return (
          <span className="font-medium">
            {m === 0 ? "Data Awal" : `Bulan ${m}`}
          </span>
        );
      },
    },
    {
      accessorKey: "applicantName",
      header: "Nama Peserta",
      meta: { className: "w-[200px] truncate" },
      cell: ({ row }) => {
        const name = row.getValue("applicantName") as string;
        return (
          <span className="font-medium truncate" title={name}>
            {name}
          </span>
        );
      },
    },
    {
      accessorKey: "revenue",
      header: "Omzet",
      meta: { className: "w-[180px]" },
      cell: ({ row }) => {
        const amount = row.getValue("revenue") as number;
        return (
          <span className="font-mono">
            {new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              maximumFractionDigits: 0,
            }).format(amount)}
          </span>
        );
      },
    },
    {
      accessorKey: "verificationStatus",
      header: "Status",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => {
        const status = row.getValue("verificationStatus") as string;
        return (
          <Badge
            variant={
              status === "APPROVED"
                ? "default"
                : status === "REJECTED"
                  ? "destructive"
                  : "outline"
            }
            className={
              status === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : ""
            }
          >
            {status}
          </Badge>
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
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/output-reports/${row.original.id}`);
          }}
        >
          Detail
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          Detail Anggota Workspace
        </h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-col items-center gap-4 py-8 text-center">
            <UserAvatar
              name={profile?.name || "N/A"}
              src={profile?.photo}
              className="h-24 w-24 text-3xl shadow-lg ring-4 ring-primary/10"
              previewable
            />
            <div className="space-y-1">
              <CardTitle className="text-2xl">{profile?.name}</CardTitle>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  {member.role}
                </Badge>
                {isMentor && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                    onClick={() =>
                      router.push(`/mentors/${id}/laporan-kinerja`)
                    }
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Laporan Kinerja
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{profile?.whatsapp}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <School className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{university?.name || "N/A"}</span>
              </div>
              <div className="flex items-start gap-3 text-sm pt-1">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                {profile?.addresses && profile.addresses.length > 0 ? (
                  <div className="flex flex-col text-xs leading-relaxed">
                    <span className="font-semibold text-foreground">
                      {profile.addresses[0].address}
                    </span>
                    <span className="text-muted-foreground mt-0.5">
                      {[
                        profile.addresses[0].subdistrictName && `Kel. ${profile.addresses[0].subdistrictName}`,
                        profile.addresses[0].districtName && `Kec. ${profile.addresses[0].districtName}`,
                        profile.addresses[0].cityName,
                        profile.addresses[0].provinceName,
                        profile.addresses[0].postalCode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Belum mengisi alamat domisili
                  </span>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">
                Status Akses
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">
                  Aktif dalam Workspace
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5 text-blue-500" />}
              label="Peserta TKM Lanjutan"
              value={guidedApplicants.length.toString()}
              description="Total peserta yang didampingi"
            />
            <StatCard
              icon={<FileText className="h-5 w-5 text-emerald-500" />}
              label="Logbook Disetujui"
              value={isMentor ? finishedLogbooks.toString() : "0"}
              description="Sesi pendampingan sukses"
            />
            <StatCard
              icon={<ClipboardList className="h-5 w-5 text-amber-500" />}
              label="Verifikasi Pending"
              value={isMentor ? totalPending.toString() : "0"}
              description="Total tugas pending"
            />
          </div>

          {isMentor ? (
            <Card>
              <CardContent className="p-6">
                <Tabs defaultValue="binaan" className="space-y-6">
                  <TabsList className="grid grid-cols-3 w-full max-w-112.5">
                    <TabsTrigger value="binaan" className="gap-2">
                      <Users className="h-4 w-4" /> TKM Lanjutan
                    </TabsTrigger>
                    <TabsTrigger value="logbook" className="gap-2">
                      <BookOpen className="h-4 w-4" /> Logbook
                    </TabsTrigger>
                    <TabsTrigger value="output" className="gap-2">
                      <BarChart3 className="h-4 w-4" /> Output
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="binaan"
                    className="space-y-4 outline-none"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">
                        Daftar Peserta TKM Lanjutan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Seluruh wirausaha TKM Lanjutan yang didampingi oleh mentor
                        ini.
                      </p>
                    </div>
                    <DataTable
                      columns={applicantColumns}
                      data={formattedApplicants}
                      searchKey="name"
                      searchPlaceholder="Cari nama peserta..."
                    />
                  </TabsContent>

                  <TabsContent
                    value="logbook"
                    className="space-y-4 outline-none"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">
                        Logbook Harian
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Catatan aktivitas pendampingan harian yang dibuat oleh
                        pendamping ini.
                      </p>
                    </div>
                    {isLogbooksLoading && !logbooks ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <DataTable
                        columns={logbookColumns}
                        data={logbooks || []}
                        isLoading={isLogbooksLoading}
                        searchKey="mentoringMaterial"
                        searchPlaceholder="Cari materi pendampingan..."
                      />
                    )}
                  </TabsContent>

                  <TabsContent
                    value="output"
                    className="space-y-4 outline-none"
                  >
                    <div>
                      <h3 className="text-lg font-semibold">
                        Laporan Capaian Output TKM Lanjutan
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Laporan capaian usaha bulanan dari peserta TKM Lanjutan mentor
                        ini.
                      </p>
                    </div>
                    {isOutputsLoading && !outputReports ? (
                      <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    ) : (
                      <DataTable
                        columns={outputColumns}
                        data={formattedOutputs}
                        isLoading={isOutputsLoading}
                        searchKey="applicantName"
                        searchPlaceholder="Cari nama peserta..."
                      />
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Informasi Tambahan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">ID Anggota</p>
                    <p className="font-mono font-medium">{member.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Terdaftar Pada</p>
                    <p className="font-medium">
                      {new Date(member.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="p-2 bg-muted rounded-lg">{icon}</div>
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
