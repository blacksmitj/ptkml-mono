"use client";

import * as React from "react";
import { 
  UserCircleIcon, 
  ShieldIcon, 
  ExternalLinkIcon,
  CheckCircle2Icon,
  ArrowLeft,
  Briefcase,
  School,
  Users,
  FileText,
  Award,
  LayoutGrid,
  Sparkles,
  GraduationCap,
  Lock,
  Info,
  MapPin,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { useRouter } from "next/navigation";
import { CertificateDialog } from "@/components/profile/certificate-dialog";
import { CumulativeTranscriptDialog } from "@/components/profile/cumulative-transcript-dialog";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { User, WorkspaceMember } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const currentRole = useAppStore((state) => state.currentRole);
  const { data: user, isLoading: isLoadingUser } = useMe();

  const [selectedCertMembership, setSelectedCertMembership] = React.useState<WorkspaceMember | null>(null);
  const [isCertDialogOpen, setIsCertDialogOpen] = React.useState(false);
  const [isTranscriptDialogOpen, setIsTranscriptDialogOpen] = React.useState(false);

  const profile = user?.profile;
  const existingAddress = profile?.addresses?.[0];

  const queryClient = useQueryClient();

  // Address cascade state
  const [provinces, setProvinces] = React.useState<any[]>([]);
  const [cities, setCities] = React.useState<any[]>([]);
  const [districts, setDistricts] = React.useState<any[]>([]);
  const [subdistricts, setSubdistricts] = React.useState<any[]>([]);

  const [provinceId, setProvinceId] = React.useState<string>("");
  const [cityId, setCityId] = React.useState<string>("");
  const [districtId, setDistrictId] = React.useState<string>("");
  const [subdistrictId, setSubdistrictId] = React.useState<string>("");
  const [detailAddress, setDetailAddress] = React.useState<string>("");
  const [postalCode, setPostalCode] = React.useState<string>("");
  const [isSavingAddress, setIsSavingAddress] = React.useState(false);

  // Initialize address values from existingAddress
  React.useEffect(() => {
    if (existingAddress) {
      setProvinceId(existingAddress.provinceId || "");
      setCityId(existingAddress.cityId || "");
      setDistrictId(existingAddress.districtId || "");
      setSubdistrictId(existingAddress.subdistrictId || "");
      setDetailAddress(existingAddress.address || "");
      setPostalCode(existingAddress.postalCode || "");
    }
  }, [existingAddress]);

  // Load provinces on mount
  React.useEffect(() => {
    apiClient
      .get("/provinces")
      .then((res) => setProvinces(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load provinces", err);
        setProvinces([]);
      });
  }, []);

  // Load cities when province changes
  React.useEffect(() => {
    if (!provinceId) {
      setCities([]);
      return;
    }
    apiClient
      .get("/cities", { params: { provinceId } })
      .then((res) => setCities(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load cities", err);
        setCities([]);
      });
  }, [provinceId]);

  // Load districts when city changes
  React.useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      return;
    }
    apiClient
      .get("/districts", { params: { cityId } })
      .then((res) => setDistricts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load districts", err);
        setDistricts([]);
      });
  }, [cityId]);

  // Load subdistricts when district changes
  React.useEffect(() => {
    if (!districtId) {
      setSubdistricts([]);
      return;
    }
    apiClient
      .get("/subdistricts", { params: { districtId } })
      .then((res) => setSubdistricts(Array.isArray(res.data) ? res.data : []))
      .catch((err) => {
        console.error("Failed to load subdistricts", err);
        setSubdistricts([]);
      });
  }, [districtId]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provinceId || !cityId || !districtId || !subdistrictId || !detailAddress.trim() || !postalCode.trim()) {
      toast.error("Mohon lengkapi seluruh isian alamat.");
      return;
    }

    setIsSavingAddress(true);
    try {
      await apiClient.put("/me/address", {
        label: "Domisili",
        address: detailAddress.trim(),
        provinceId,
        cityId,
        districtId,
        subdistrictId,
        postalCode: postalCode.trim(),
      });
      toast.success("Alamat domisili berhasil disimpan.");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Gagal menyimpan alamat.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Rekam Jejak Pengalaman Pengguna Berdasarkan Riwayat Workspace yang Telah Selesai / Ditutup (isActive === false)
  const completedMemberships = user?.workspaceMemberships?.filter(
    (m) => m.verificationStatus === "APPROVED" && m.workspace?.isActive === false
  ) || [];

  const mentorMemberships = completedMemberships.filter((m) => m.role === "MENTOR");
  const univAdminMemberships = completedMemberships.filter((m) => m.role === "UNIVERSITY_ADMIN");
  const univSpvMemberships = completedMemberships.filter((m) => m.role === "UNIVERSITY_SUPERVISOR");

  const hasEverMentored = mentorMemberships.length > 0;
  const hasEverBeenUnivAdmin = univAdminMemberships.length > 0;
  const hasEverBeenUnivSpv = univSpvMemberships.length > 0;
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";
  const isWorkspaceSupervisor = user?.globalRole === "WORKSPACE_SUPERVISOR";

  if (isLoadingUser) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9 border-border/80 shrink-0"
            onClick={() => router.push("/workspaces")}
            title="Kembali ke Pilih Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <UserCircleIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profil Saya</h1>
            <p className="text-sm text-muted-foreground">
              Kelola detail akun, informasi kontak, dan afiliasi instansi Anda.
            </p>
          </div>
        </div>
      </div>

      {/* 1. KARTU IDENTITAS & BANNER FOTO PROFIL PALING ATAS */}
      <Card className="border-primary/10 shadow-sm overflow-hidden bg-gradient-to-r from-card via-card to-primary/5">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Foto Profil */}
            <div className="relative group shrink-0">
              <Avatar className="h-28 w-28 rounded-full border-4 border-background shadow-lg ring-2 ring-primary/20">
                <AvatarImage
                  src={profile?.photo ? normalizeFileUrl(profile.photo) : undefined}
                  alt={profile?.name || user?.username || "Foto Profil"}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl font-black bg-primary/10 text-primary rounded-full">
                  {(profile?.name || user?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Detail Pengguna & Deretan Badge Pengalaman */}
            <div className="space-y-3 text-center md:text-left flex-1">
              <div>
                <div className="flex flex-col md:flex-row md:items-center gap-2.5">
                  <h2 className="text-2xl font-black tracking-tight text-foreground">
                    {profile?.name || user?.username || "Pengguna"}
                  </h2>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      @{user?.username || "user"}
                    </Badge>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 text-xs font-semibold">
                      {isSuperAdmin ? "Super Admin" : isWorkspaceSupervisor ? "Pengawas Global" : "Anggota"}
                    </Badge>
                    {!existingAddress && (
                      <Badge variant="destructive" className="text-xs font-semibold gap-1 animate-pulse">
                        <AlertCircle className="w-3 h-3" />
                        Alamat Belum Diisi
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile?.email || "Email belum disetel"} • NIK: {profile?.nik || "-"}
                </p>
              </div>

              {/* Rekam Jejak Pengalaman (Course Badges 60x60) */}
              <div className="pt-3 border-t border-border/50">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-center md:justify-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lencana Pengalaman & Peran</span>
                </p>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5">
                  {/* 1. Lencana Mentor / Pendamping (Hijau Zamrud) */}
                  {hasEverMentored && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-105">
                          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                            {/* Counter Badge Pill di pojok kanan atas */}
                            <div className="absolute -top-1 -right-1 z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-mono font-bold text-[10px] shadow-sm ring-2 ring-background pointer-events-none">
                              {mentorMemberships.length}x
                            </div>
                            {/* Scalloped / Rosette Medallion SVG */}
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm transition-all group-hover:drop-shadow-md">
                              <path
                                d="M50 0 C54 7 60 8 66 5 C72 2 77 6 81 11 C85 16 90 18 92 24 C95 30 96 36 99 41 C101 47 99 53 99 59 C98 64 95 70 92 76 C90 82 85 84 81 89 C77 94 72 98 66 95 C60 92 54 93 50 100 C46 93 40 92 34 95 C28 98 23 94 19 89 C15 84 10 82 8 76 C5 70 2 64 1 59 C1 53 -1 47 1 41 C4 36 5 30 8 24 C10 18 15 16 19 11 C23 6 28 2 34 5 C40 8 46 7 50 0 Z"
                                className="fill-emerald-600 dark:fill-emerald-500 transition-colors"
                              />
                              {/* Inner Ring */}
                              <circle cx="50" cy="50" r="38" className="fill-emerald-700/30 dark:fill-emerald-950/40" />
                              <circle cx="50" cy="50" r="34" className="stroke-emerald-200/50 stroke-[1.5] fill-emerald-500 dark:fill-emerald-600 stroke-dasharray-[3,2]" />
                              <circle cx="50" cy="50" r="26" className="fill-white/15 dark:fill-black/20" />
                            </svg>
                            {/* Center Icon */}
                            <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-xs">
                              <Briefcase className="w-5 h-5 stroke-[2.2]" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 max-w-[64px] text-center leading-tight">
                            Mentor
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="flex flex-col items-center justify-center text-center p-3 min-w-[170px] max-w-[240px] rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mb-1" />
                        <p className="font-bold text-xs text-foreground tracking-tight">
                          Mentor Pendamping ({mentorMemberships.length}x)
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Telah menyelesaikan pendampingan di {mentorMemberships.length} workspace program yang telah ditutup
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-2 pt-2 border-t border-border/50 w-full">
                          {mentorMemberships.map((m, idx) => (
                            <span key={m.id || idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                              {m.workspace?.year ? `${m.workspace.year}` : m.workspace?.name || "Workspace"}
                            </span>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* 2. Lencana Admin Universitas (Biru Samudra) */}
                  {hasEverBeenUnivAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-105">
                          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                            {/* Counter Badge Pill di pojok kanan atas */}
                            <div className="absolute -top-1 -right-1 z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-600 dark:bg-blue-500 text-white font-mono font-bold text-[10px] shadow-sm ring-2 ring-background pointer-events-none">
                              {univAdminMemberships.length}x
                            </div>
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm transition-all group-hover:drop-shadow-md">
                              <path
                                d="M50 0 C54 7 60 8 66 5 C72 2 77 6 81 11 C85 16 90 18 92 24 C95 30 96 36 99 41 C101 47 99 53 99 59 C98 64 95 70 92 76 C90 82 85 84 81 89 C77 94 72 98 66 95 C60 92 54 93 50 100 C46 93 40 92 34 95 C28 98 23 94 19 89 C15 84 10 82 8 76 C5 70 2 64 1 59 C1 53 -1 47 1 41 C4 36 5 30 8 24 C10 18 15 16 19 11 C23 6 28 2 34 5 C40 8 46 7 50 0 Z"
                                className="fill-blue-600 dark:fill-blue-500 transition-colors"
                              />
                              <circle cx="50" cy="50" r="38" className="fill-blue-700/30 dark:fill-blue-950/40" />
                              <circle cx="50" cy="50" r="34" className="stroke-blue-200/50 stroke-[1.5] fill-blue-500 dark:fill-blue-600 stroke-dasharray-[3,2]" />
                              <circle cx="50" cy="50" r="26" className="fill-white/15 dark:fill-black/20" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-xs">
                              <School className="w-5 h-5 stroke-[2.2]" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 mt-1 max-w-[64px] text-center leading-tight">
                            Admin Univ
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="flex flex-col items-center justify-center text-center p-3 min-w-[170px] max-w-[240px] rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mb-1" />
                        <p className="font-bold text-xs text-foreground tracking-tight">
                          Admin Universitas ({univAdminMemberships.length}x)
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Telah menyelesaikan tugas kelola di {univAdminMemberships.length} workspace yang telah ditutup
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-2 pt-2 border-t border-border/50 w-full">
                          {univAdminMemberships.map((m, idx) => (
                            <span key={m.id || idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                              {m.workspace?.year ? `${m.workspace.year}` : m.workspace?.name || "Workspace"}
                            </span>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* 3. Lencana Pengawas Universitas (Oranye Hangat) */}
                  {hasEverBeenUnivSpv && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-105">
                          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                            {/* Counter Badge Pill di pojok kanan atas */}
                            <div className="absolute -top-1 -right-1 z-10 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-600 dark:bg-amber-500 text-white font-mono font-bold text-[10px] shadow-sm ring-2 ring-background pointer-events-none">
                              {univSpvMemberships.length}x
                            </div>
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm transition-all group-hover:drop-shadow-md">
                              <path
                                d="M50 0 C54 7 60 8 66 5 C72 2 77 6 81 11 C85 16 90 18 92 24 C95 30 96 36 99 41 C101 47 99 53 99 59 C98 64 95 70 92 76 C90 82 85 84 81 89 C77 94 72 98 66 95 C60 92 54 93 50 100 C46 93 40 92 34 95 C28 98 23 94 19 89 C15 84 10 82 8 76 C5 70 2 64 1 59 C1 53 -1 47 1 41 C4 36 5 30 8 24 C10 18 15 16 19 11 C23 6 28 2 34 5 C40 8 46 7 50 0 Z"
                                className="fill-amber-600 dark:fill-amber-500 transition-colors"
                              />
                              <circle cx="50" cy="50" r="38" className="fill-amber-700/30 dark:fill-amber-950/40" />
                              <circle cx="50" cy="50" r="34" className="stroke-amber-200/50 stroke-[1.5] fill-amber-500 dark:fill-amber-600 stroke-dasharray-[3,2]" />
                              <circle cx="50" cy="50" r="26" className="fill-white/15 dark:fill-black/20" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-xs">
                              <GraduationCap className="w-5 h-5 stroke-[2.2]" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 mt-1 max-w-[64px] text-center leading-tight">
                            Pengawas
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="flex flex-col items-center justify-center text-center p-3 min-w-[170px] max-w-[240px] rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-amber-500 mb-1" />
                        <p className="font-bold text-xs text-foreground tracking-tight">
                          Pengawas Univ ({univSpvMemberships.length}x)
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Telah menyelesaikan pengawasan di {univSpvMemberships.length} workspace yang telah ditutup
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-1 mt-2 pt-2 border-t border-border/50 w-full">
                          {univSpvMemberships.map((m, idx) => (
                            <span key={m.id || idx} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                              {m.workspace?.year ? `${m.workspace.year}` : m.workspace?.name || "Workspace"}
                            </span>
                          ))}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* 4. Lencana Super Admin (Merah Royal / Emas) */}
                  {isSuperAdmin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group relative flex flex-col items-center cursor-pointer transition-transform hover:scale-105">
                          <div className="relative w-[60px] h-[60px] flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-sm transition-all group-hover:drop-shadow-md">
                              <path
                                d="M50 0 C54 7 60 8 66 5 C72 2 77 6 81 11 C85 16 90 18 92 24 C95 30 96 36 99 41 C101 47 99 53 99 59 C98 64 95 70 92 76 C90 82 85 84 81 89 C77 94 72 98 66 95 C60 92 54 93 50 100 C46 93 40 92 34 95 C28 98 23 94 19 89 C15 84 10 82 8 76 C5 70 2 64 1 59 C1 53 -1 47 1 41 C4 36 5 30 8 24 C10 18 15 16 19 11 C23 6 28 2 34 5 C40 8 46 7 50 0 Z"
                                className="fill-rose-600 dark:fill-rose-500 transition-colors"
                              />
                              <circle cx="50" cy="50" r="38" className="fill-rose-700/30 dark:fill-rose-950/40" />
                              <circle cx="50" cy="50" r="34" className="stroke-rose-200/50 stroke-[1.5] fill-rose-500 dark:fill-rose-600 stroke-dasharray-[3,2]" />
                              <circle cx="50" cy="50" r="26" className="fill-white/15 dark:fill-black/20" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-xs">
                              <Award className="w-5 h-5 stroke-[2.2]" />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 mt-1 max-w-[64px] text-center leading-tight">
                            Super Admin
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="flex flex-col items-center justify-center text-center p-3 min-w-[170px] max-w-[220px] rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mb-1" />
                        <p className="font-bold text-xs text-foreground tracking-tight">Super Admin</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Otoritas tertinggi manajemen sistem & seluruh workspace
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {!hasEverMentored && !hasEverBeenUnivAdmin && !hasEverBeenUnivSpv && !isSuperAdmin && (
                    <span className="text-xs text-muted-foreground italic">
                      Lencana akan diberikan secara otomatis setelah workspace program yang Anda ikuti resmi selesai dan ditutup.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. KONTEN UTAMA: DUA KOLOM DENGAN TABS BERSEBELAHAN & STATUS AKSES */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        {/* Kolom Kiri (2 Kolom): Tabs Konten Profil */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="identity" className="w-full space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-11 p-1 bg-muted/70 rounded-2xl border border-border/60">
              <TabsTrigger
                value="identity"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <UserCircleIcon className="w-4 h-4 shrink-0" />
                <span className="truncate">Identitas</span>
              </TabsTrigger>
              <TabsTrigger
                value="address"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">Alamat Domisili</span>
                {!existingAddress && (
                  <span className="relative flex h-2 w-2 shrink-0 ml-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="rounded-xl text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all gap-1.5"
              >
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="truncate">Riwayat Workspace</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: INFORMASI DATA PRIBADI (SIAP KERJA) */}
            <TabsContent value="identity" className="m-0 focus-visible:outline-none">
              <Card className="overflow-hidden border-primary/10 shadow-xs">
                <CardHeader className="bg-muted/30 pb-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">Informasi Data Pribadi</CardTitle>
                      <CardDescription>
                        Data akun dan kontak yang terhubung dengan akun Kemnaker Anda.
                      </CardDescription>
                    </div>
                    <div className="p-2 bg-background rounded-xl shadow-xs border">
                      <UserCircleIcon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 text-blue-900 dark:text-blue-200">
                    <Info className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold text-blue-950 dark:text-blue-100">Data Terintegrasi Siap Kerja</p>
                      <p className="text-blue-800/90 dark:text-blue-300/90 mt-0.5">
                        Seluruh informasi identitas dan kontak (Nama, NIK, Email, dan WhatsApp) disinkronkan langsung dari akun <strong>Siap Kerja (Kemnaker)</strong>. Jika Anda memperbarui data di portal Siap Kerja, data pada sistem ini akan otomatis diperbarui saat Anda masuk kembali.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="name">Nama Lengkap</Label>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Lock className="w-3 h-3" /> Siap Kerja
                        </span>
                      </div>
                      <Input 
                        id="name" 
                        defaultValue={profile?.name} 
                        placeholder="Nama lengkap" 
                        className="rounded-xl bg-muted/50 cursor-not-allowed font-medium text-foreground" 
                        disabled 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="nik">NIK</Label>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Lock className="w-3 h-3" /> Siap Kerja
                        </span>
                      </div>
                      <Input 
                        id="nik" 
                        defaultValue={profile?.nik} 
                        placeholder="Nomor Induk Kependudukan" 
                        className="rounded-xl bg-muted/50 cursor-not-allowed font-medium text-foreground" 
                        disabled 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="email">Email</Label>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Lock className="w-3 h-3" /> Siap Kerja
                        </span>
                      </div>
                      <Input 
                        id="email" 
                        type="email" 
                        defaultValue={profile?.email || ""} 
                        placeholder="Email" 
                        className="rounded-xl bg-muted/50 cursor-not-allowed font-medium text-foreground" 
                        disabled 
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="whatsapp">Nomor WhatsApp / HP</Label>
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                          <Lock className="w-3 h-3" /> Siap Kerja
                        </span>
                      </div>
                      <Input 
                        id="whatsapp" 
                        defaultValue={profile?.whatsapp} 
                        placeholder="Nomor WhatsApp" 
                        className="rounded-xl bg-muted/50 cursor-not-allowed font-medium text-foreground" 
                        disabled 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: FORM ALAMAT DOMISILI (CASCADE REGION) */}
            <TabsContent value="address" className="m-0 focus-visible:outline-none">
              <Card className="overflow-hidden border-primary/10 shadow-xs">
                <CardHeader className="bg-muted/30 pb-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">Alamat Domisili / Tempat Tinggal</CardTitle>
                      <CardDescription>
                        Lokasi domisili aktif Anda untuk pemetaan penugasan pendampingan.
                      </CardDescription>
                    </div>
                    <div className="p-2 bg-background rounded-xl shadow-xs border">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleSaveAddress} className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* 1. Provinsi */}
                      <div className="space-y-2">
                        <Label htmlFor="province">Provinsi *</Label>
                        <Select
                          value={provinceId}
                          onValueChange={(val) => {
                            setProvinceId(val);
                            setCityId("");
                            setDistrictId("");
                            setSubdistrictId("");
                          }}
                        >
                          <SelectTrigger id="province" className="w-full rounded-xl">
                            <SelectValue placeholder="Pilih Provinsi" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. Kota / Kabupaten */}
                      <div className="space-y-2">
                        <Label htmlFor="city">Kabupaten / Kota *</Label>
                        <Select
                          value={cityId}
                          disabled={!provinceId}
                          onValueChange={(val) => {
                            setCityId(val);
                            setDistrictId("");
                            setSubdistrictId("");
                          }}
                        >
                          <SelectTrigger id="city" className="w-full rounded-xl">
                            <SelectValue placeholder={provinceId ? "Pilih Kab/Kota" : "Pilih Provinsi terlebih dahulu"} />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Kecamatan */}
                      <div className="space-y-2">
                        <Label htmlFor="district">Kecamatan *</Label>
                        <Select
                          value={districtId}
                          disabled={!cityId}
                          onValueChange={(val) => {
                            setDistrictId(val);
                            setSubdistrictId("");
                          }}
                        >
                          <SelectTrigger id="district" className="w-full rounded-xl">
                            <SelectValue placeholder={cityId ? "Pilih Kecamatan" : "Pilih Kab/Kota terlebih dahulu"} />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 4. Kelurahan / Desa */}
                      <div className="space-y-2">
                        <Label htmlFor="subdistrict">Kelurahan / Desa *</Label>
                        <Select
                          value={subdistrictId}
                          disabled={!districtId}
                          onValueChange={(val) => {
                            setSubdistrictId(val);
                          }}
                        >
                          <SelectTrigger id="subdistrict" className="w-full rounded-xl">
                            <SelectValue placeholder={districtId ? "Pilih Kelurahan/Desa" : "Pilih Kecamatan terlebih dahulu"} />
                          </SelectTrigger>
                          <SelectContent>
                            {subdistricts.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 5. Kode Pos */}
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Kode Pos *</Label>
                        <Input
                          id="postalCode"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Contoh: 40391"
                          maxLength={10}
                          className="rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    {/* 6. Alamat Lengkap */}
                    <div className="space-y-2">
                      <Label htmlFor="detailAddress">Alamat Lengkap (Jalan, RT/RW, No. Rumah) *</Label>
                      <Textarea
                        id="detailAddress"
                        value={detailAddress}
                        onChange={(e) => setDetailAddress(e.target.value)}
                        placeholder="Contoh: Jl. Raya Lembang No. 123, RT 02/RW 05"
                        rows={3}
                        className="rounded-xl"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" disabled={isSavingAddress} className="rounded-xl px-8 font-bold">
                        {isSavingAddress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Menyimpan...
                          </>
                        ) : (
                          "Simpan Alamat"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: RIWAYAT KEANGGOTAAN WORKSPACE */}
            <TabsContent value="history" className="m-0 focus-visible:outline-none">
              <Card className="border-primary/10 shadow-xs overflow-hidden">
                <CardHeader className="bg-muted/30 pb-6 border-b">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        <CardTitle className="text-xl">Riwayat Keanggotaan & Capaian Workspace</CardTitle>
                      </div>
                      <CardDescription>
                        Daftar periode program TKML yang Anda ikuti beserta status keanggotaan dan rekap aktivitas.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-xl text-xs font-semibold"
                      onClick={() => router.push("/workspaces")}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      Pilih Workspace
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {user?.workspaceMemberships && user.workspaceMemberships.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {user.workspaceMemberships.map((membership) => {
                        const ws = membership.workspace;
                        const univ = membership.university;
                        const counts = membership._count;

                        const isApproved = membership.verificationStatus === "APPROVED";
                        const isPending = membership.verificationStatus === "PENDING";

                        let roleText = "Anggota";
                        let roleBadgeClass = "bg-muted text-muted-foreground";
                        if (membership.role === "UNIVERSITY_ADMIN") {
                          roleText = "Admin Universitas";
                          roleBadgeClass = "bg-blue-500/10 text-blue-600 border-blue-500/20";
                        } else if (membership.role === "UNIVERSITY_SUPERVISOR") {
                          roleText = "Pengawas Universitas";
                          roleBadgeClass = "bg-orange-500/10 text-orange-600 border-orange-500/20";
                        } else if (membership.role === "MENTOR") {
                          roleText = "Pendamping";
                          roleBadgeClass = "bg-green-500/10 text-green-600 border-green-500/20";
                        }

                        return (
                          <Card key={membership.id} className="flex flex-col justify-between border-border/80 hover:border-primary/40 transition-all shadow-xs">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-mono font-bold text-muted-foreground">
                                  {ws?.year ? `Tahun ${ws.year}` : "Workspace"}
                                </span>
                                <Badge
                                  variant={isApproved ? "default" : isPending ? "outline" : "destructive"}
                                  className={cn(
                                    "text-[10px] px-2 py-0.5",
                                    isApproved && "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20",
                                    isPending && "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                  )}
                                >
                                  {isApproved ? "Disetujui" : isPending ? "Menunggu Verifikasi" : "Ditolak"}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-bold mt-1 line-clamp-1">
                                {ws?.name || "Workspace"}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={cn("text-[10px]", roleBadgeClass)}>
                                  {roleText}
                                </Badge>
                                {ws?.code && (
                                  <span className="text-[11px] text-muted-foreground">
                                    Kode: {ws.code}
                                  </span>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-1 flex-1">
                              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border text-xs">
                                {univ?.logo ? (
                                  <div className="relative w-6 h-6 rounded-md overflow-hidden bg-white shrink-0 border">
                                    <Image
                                      src={normalizeFileUrl(univ.logo)}
                                      alt={univ.name}
                                      fill
                                      className="object-contain p-0.5"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <School className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className="font-semibold text-foreground truncate">
                                  {univ?.name || "Tanpa Universitas"}
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Capaian Aktivitas
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="p-2 rounded-lg bg-background border shadow-2xs">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                      <Users className="w-3 h-3 text-blue-500" />
                                      <span className="text-[10px]">Binaan</span>
                                    </div>
                                    <p className="text-base font-bold text-foreground">
                                      {counts?.applicants ?? 0}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-background border shadow-2xs">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                      <FileText className="w-3 h-3 text-emerald-500" />
                                      <span className="text-[10px]">Logbook</span>
                                    </div>
                                    <p className="text-base font-bold text-foreground">
                                      {counts?.createdLogbooks ?? 0}
                                    </p>
                                  </div>
                                  <div className="p-2 rounded-lg bg-background border shadow-2xs">
                                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
                                      <Award className="w-3 h-3 text-purple-500" />
                                      <span className="text-[10px]">Verif</span>
                                    </div>
                                    <p className="text-base font-bold text-foreground">
                                      {(counts?.verifiedLogbooks ?? 0) + (counts?.verifiedOutputs ?? 0)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 px-4 rounded-2xl bg-muted/20 border border-dashed text-muted-foreground space-y-3">
                      <Briefcase className="w-10 h-10 mx-auto opacity-30" />
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Belum Terdaftar di Workspace Manapun</p>
                        <p className="text-xs max-w-sm mx-auto">
                          Anda belum terdaftar atau belum mengajukan diri ke dalam workspace aktif. Buka halaman Pilih Workspace untuk mendaftar.
                        </p>
                      </div>
                      <Button
                        className="rounded-xl text-xs font-bold"
                        onClick={() => router.push("/workspaces")}
                      >
                        Buka Pilih Workspace
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Kolom Kanan (1 Kolom): Status Akses (Sticky & Selalu Terlihat) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-primary/5 shadow-xs sticky top-6">
            <CardHeader className="bg-muted/20 pb-4">
              <div className="flex items-center gap-2">
                <ShieldIcon className="h-4 w-4 text-primary" />
                <CardTitle className="text-lg">Status Akses Akun</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                  <span className="text-sm font-medium">Role Aktif</span>
                  <Badge variant="default" className="capitalize">
                    {user?.globalRole === "SUPER_ADMIN"
                      ? "Super Admin"
                      : currentRole === "UNIVERSITY_ADMIN"
                      ? "Admin Universitas"
                      : currentRole === "UNIVERSITY_SUPERVISOR"
                      ? "Pengawas Universitas"
                      : currentRole === "MENTOR"
                      ? "Pendamping"
                      : currentRole
                      ? currentRole.replace("_", " ").toLowerCase()
                      : "Pengguna"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Akses Fitur</p>
                  <ul className="space-y-2">
                    {[
                      { label: "Kelola Admin Global", allowed: user?.globalRole === "SUPER_ADMIN" },
                      { label: "Kelola Workspace", allowed: user?.globalRole === "SUPER_ADMIN" },
                      { label: "Monitoring Global", allowed: user?.globalRole === "SUPER_ADMIN" || user?.globalRole === "WORKSPACE_SUPERVISOR" },
                      { label: "Akses Workspace Terpilih", allowed: true },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        {item.allowed ? (
                          <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                        ) : (
                          <Badge variant="outline" className="text-[10px] scale-90 opacity-50">Terkunci</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <Button variant="ghost" className="w-full text-xs text-primary gap-2 h-8" asChild>
                <a href="#">
                  Pelajari lebih lanjut tentang Role
                  <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DIALOG SERTIFIKAT & TRANSKRIP (DI-HIDE SEMENTARA) */}
      {/* <CertificateDialog
        open={isCertDialogOpen}
        onOpenChange={setIsCertDialogOpen}
        membership={selectedCertMembership}
        profile={profile || null}
        username={user?.username}
      />

      <CumulativeTranscriptDialog
        open={isTranscriptDialogOpen}
        onOpenChange={setIsTranscriptDialogOpen}
        memberships={user?.workspaceMemberships || []}
        profile={profile || null}
        username={user?.username}
      /> */}
    </main>
  );
}
