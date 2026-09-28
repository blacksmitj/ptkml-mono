"use client";

import { useParams, useRouter } from "next/navigation";
import { useEmployee } from "@/hooks/use-employee";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { ChevronLeft, Save, AlertTriangle, Fingerprint, Briefcase, ShieldCheck, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { NikStatus, Gender, BpjsStatus, BpjsType } from "@/types";
import { MaskedData } from "@/components/masked-data";

export default function EmployeeDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const { data: employee, isLoading, isError } = useEmployee(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold">Karyawan tidak ditemukan</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const output = (employee as any).output;
  const applicant = output?.applicant;
  const applicantProfile = applicant?.profile;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detail Karyawan</h1>
            <p className="text-muted-foreground">Kelola informasi dan validasi data karyawan.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>Kembali</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile Summary */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-lg bg-linear-to-b from-primary/5 to-card">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-4 pt-4">
                <div className="relative">
                  <UserAvatar name={employee.name} className="h-28 w-28 text-4xl ring-4 ring-background shadow-xl" />
                  <div className="absolute -bottom-2 -right-2 bg-background p-1.5 rounded-full shadow-md border">
                    {employee.nikStatus === NikStatus.VALID ? (
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                  </div>
                </div>
              </div>
              <CardTitle className="text-2xl">{employee.name}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-1 mt-1">
                <Briefcase className="h-3 w-3" /> {employee.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              <div className="flex flex-col gap-3 p-4 bg-background/50 rounded-xl border border-border/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Status NIK</span>
                  <Badge variant={employee.nikStatus === NikStatus.VALID ? "default" : "destructive"} className="capitalize">
                    {employee.nikStatus.toLowerCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Konflik Identitas</span>
                  {employee.hasIdentityConflict ? (
                    <Badge variant="destructive" className="animate-pulse">Ada Konflik</Badge>
                  ) : (
                    <Badge variant="outline">Aman</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4 px-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Peserta TKM Lanjutan</span>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-dashed">
                    <UserAvatar name={applicantProfile?.name || ""} className="h-8 w-8" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{applicantProfile?.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{applicant?.idTkm}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Waktu Pendaftaran</span>
                  <span className="text-sm">{new Date(employee.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {employee.hasIdentityConflict && (
            <Card className="border-destructive/50 bg-destructive/5 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5" /> Detail Konflik
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">
                  Sistem mendeteksi adanya penggunaan NIK yang sama pada entitas lain atau ketidaksesuaian data kependudukan.
                </p>
                <div className="p-3 bg-destructive/10 rounded-lg text-xs font-medium text-destructive border border-destructive/20">
                  Sumber: {employee.conflictSource || "Sistem Validasi Pusat"}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Detailed Inputs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Informasi Identitas</CardTitle>
                <CardDescription>Data pribadi sesuai dengan KTP karyawan.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nama Lengkap</Label>
                <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">{employee.name}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nomor Induk Kependudukan (NIK)</Label>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
                  <MaskedData value={employee.nik} showToggle={true} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Jenis Kelamin</Label>
                <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">
                  {employee.gender === Gender.MALE ? "Laki-laki" : "Perempuan"}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Jabatan / Posisi</Label>
                <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">{employee.role}</div>
              </div>
            </CardContent>
          </Card>

          {/* Employment & BPJS */}
          <Card className="shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center gap-3 border-b pb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Status & Jaminan Sosial</CardTitle>
                <CardDescription>Informasi ketenagakerjaan dan kepesertaan BPJS.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-6">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Status Pekerjaan</Label>
                <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">
                  {employee.employmentStatus.toLowerCase() === "permanen"
                    ? "Tetap (Permanen)"
                    : employee.employmentStatus.toLowerCase() === "kontrak"
                    ? "Lepas/Kontrak"
                    : employee.employmentStatus.toLowerCase() === "paruh_waktu"
                    ? "Paruh Waktu/Musiman"
                    : employee.employmentStatus.toLowerCase() === "tidak_dibayar"
                    ? "Tidak Dibayar/Keluarga"
                    : employee.employmentStatus}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Kepesertaan BPJS Ketenagakerjaan</Label>
                <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">
                  {employee.bpjsStatus === BpjsStatus.REGISTERED ? "Terdaftar (Aktif)" : "Belum Terdaftar"}
                </div>
              </div>
              {employee.bpjsStatus === BpjsStatus.REGISTERED && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Jenis BPJS</Label>
                    <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40">
                      {employee.bpjsType === BpjsType.WAGE_EARNER ? "Penerima Upah (PU)" : "Bukan Penerima Upah (BPU)"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nomor Kartu BPJS</Label>
                    <div className="text-sm font-medium p-2 rounded-md bg-muted/20 border border-border/40 font-mono">
                      {employee.bpjsNumber || "-"}
                    </div>
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Kategori Disabilitas</Label>
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/40">
                  <span className="text-sm font-medium">
                    {employee.hasDisability
                      ? employee.disabilityType === "disabilitas_daksa"
                        ? "Fisik (Daksa)"
                        : employee.disabilityType === "disabilitas_netra"
                        ? "Sensorik (Netra)"
                        : employee.disabilityType === "disabilitas_rungu"
                        ? "Sensorik (Rungu)"
                        : employee.disabilityType === "disabilitas_wicara"
                        ? "Sensorik (Wicara)"
                        : employee.disabilityType === "disabilitas_intelektual"
                        ? "Intelektual"
                        : employee.disabilityType === "disabilitas_mental"
                        ? "Mental"
                        : employee.disabilityType || "Penyandang Disabilitas"
                      : "Bukan Disabilitas"}
                  </span>
                  <Badge variant={employee.hasDisability ? "default" : "secondary"} className="text-[10px]">
                    {employee.hasDisability ? "Ya" : "Tidak"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Log / Additional Info could go here */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="px-8" onClick={() => router.back()}>Kembali</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
