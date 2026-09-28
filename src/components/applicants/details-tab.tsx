"use client";

import * as React from "react";
import { Applicant, Profile } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/user-avatar";
import { MaskedData } from "@/components/masked-data";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { Mail, Phone, MapPin, Calendar, CreditCard, User, CheckCircle2, XCircle, Briefcase, Edit, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import { useMembers } from "@/hooks/use-members";
import { useWorkspace } from "@/hooks/use-workspaces";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ApplicantStatusModal } from "@/components/applicants/applicant-status-modal";

interface DetailsTabProps {
  applicant: Applicant;
  profile: Profile;
  mentorProfile: Profile | null;
}

export function DetailsTab({ applicant, profile, mentorProfile }: DetailsTabProps) {
  const currentRole = useAppStore((state) => state.currentRole);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceInactive = workspace?.isActive === false;
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  const { data: me } = useMe();
  // Fetch members to identify current logged-in member ID & University ID
  const { data: membersData } = useMembers({ workspaceId: currentWorkspaceId || undefined });
  const members = membersData?.data || (Array.isArray(membersData) ? membersData : []);
  const currentMember = React.useMemo(() => {
    if (me?.workspaceMemberships && currentWorkspaceId) {
      const found = me.workspaceMemberships.find((m: any) => m.workspaceId === currentWorkspaceId);
      if (found) return found;
    }
    if (!members || !currentUserId) return null;
    return members.find((m: any) => m.userId === currentUserId) || null;
  }, [me, currentWorkspaceId, members, currentUserId]);

  // Hanya MENTOR yang bisa edit profil
  const canEditProfile = React.useMemo(() => {
    if (isWorkspaceInactive) return false;
    if (currentRole !== "MENTOR") return false;

    const memberId =
      currentMember?.id ||
      me?.workspaceMemberships?.find(
        (m: any) => m.workspaceId === currentWorkspaceId,
      )?.id;
    const isAssignedToMe =
      (memberId &&
        (applicant.mentorId === memberId ||
          applicant.mentor?.id === memberId)) ||
      (currentUserId && applicant.mentor?.user?.id === currentUserId);
    return isAssignedToMe || !applicant.mentorId;
  }, [
    currentRole,
    currentMember,
    me,
    currentWorkspaceId,
    currentUserId,
    applicant.mentorId,
    applicant.mentor,
    isWorkspaceInactive,
  ]);

  // SUPER_ADMIN (status kepesertaan) & MENTOR (status pendampingan)
  const canUpdateStatus = React.useMemo(() => {
    if (isWorkspaceInactive) return false;
    if (currentRole === "SUPER_ADMIN") return true;
    if (currentRole === "MENTOR") {
      const memberId =
        currentMember?.id ||
        me?.workspaceMemberships?.find(
          (m: any) => m.workspaceId === currentWorkspaceId,
        )?.id;
      const isAssignedToMe =
        (memberId &&
          (applicant.mentorId === memberId ||
            applicant.mentor?.id === memberId)) ||
        (currentUserId && applicant.mentor?.user?.id === currentUserId);
      return isAssignedToMe || !applicant.mentorId;
    }
    return false;
  }, [
    currentRole,
    currentMember,
    me,
    currentWorkspaceId,
    currentUserId,
    applicant.mentorId,
    applicant.mentor,
    isWorkspaceInactive,
  ]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-xl">Profil Lengkap</CardTitle>
              <CardDescription>Informasi identitas dan kontak peserta.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {canUpdateStatus && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 cursor-pointer"
                  onClick={() => setStatusModalOpen(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  {currentRole === "SUPER_ADMIN" ? "Status Kepesertaan" : "Update Status"}
                </Button>
              )}
              {canEditProfile && (
                <Button asChild variant="outline" size="sm" className="gap-2">
                  <Link href={`/applicants/${applicant.id}/edit`}>
                    <Edit className="h-4 w-4" />
                    Edit Profil
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> ID TKM
                </p>
                <p className="font-mono font-bold text-primary">{applicant.idTkm}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-3 w-3" /> NIK
                </p>
                <MaskedData value={profile.nik} className="font-medium" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Tempat, Tanggal Lahir
                </p>
                <p className="font-medium">
                  {profile.birthPlace}, {profile.birthDate ? new Date(profile.birthDate).toLocaleDateString("id-ID") : "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Jenis Kelamin
                </p>
                <p className="font-medium">{profile.gender}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium">{profile.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Phone className="h-3 w-3" /> WhatsApp
                </p>
                <p className="font-medium">{profile.whatsapp}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-3 w-3" /> Status Disabilitas
                </p>
                <p className="font-medium text-sm">
                  {profile.hasDisability 
                    ? `Penyandang Disabilitas (${profile.disabilityType || "Lainnya"})` 
                    : "Bukan Penyandang Disabilitas"
                  }
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Alamat Terdaftar
              </p>
              
              {profile.addresses && profile.addresses.length > 0 ? (
                <div className="grid sm:grid-cols-3 gap-4">
                  {["KTP", "DOMICILE", "BUSINESS"].map((label) => {
                    const addr = profile.addresses?.find((a) => a.label === label);
                    if (!addr) return null;
                    return (
                      <div key={label} className="p-3 bg-muted/40 rounded-lg border">
                        <p className="text-[10px] font-bold text-primary uppercase mb-1">
                          {label === "BUSINESS" ? "Usaha" : label === "DOMICILE" ? "Domisili" : "KTP"}
                        </p>
                        <p className="text-xs font-medium leading-relaxed">
                          {addr.address}
                          {(addr.subdistrictName || addr.districtName || addr.cityName || addr.provinceName) && (
                            <>
                              <br />
                              <span className="text-[10px] text-muted-foreground">
                                Kel. {addr.subdistrictName || "-"}, Kec. {addr.districtName || "-"}, {addr.cityName || "-"}, {addr.provinceName || "-"} {addr.postalCode || ""}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="font-medium leading-relaxed text-sm text-muted-foreground italic">
                  Belum ada data alamat terdaftar.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Profile Card */}
        {applicant.businessProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Profil Usaha</CardTitle>
                  <CardDescription>Informasi usaha yang terdaftar.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nama Usaha</p>
                  <p className="font-bold text-primary">{applicant.businessProfile.businessName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sektor Usaha</p>
                  <p className="font-medium">{applicant.businessProfile.businessSector}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Jenis Usaha</p>
                  <p className="font-medium">{applicant.businessProfile.businessType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Produk Utama</p>
                  <p className="font-medium">{applicant.businessProfile.mainProduct || "-"}</p>
                </div>
              </div>
              {applicant.businessProfile.description && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Deskripsi Usaha</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {applicant.businessProfile.description}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Status Pendampingan</CardTitle>
            <CardDescription>Informasi status administratif dan komitmen peserta.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StatusItem label="Status Komunikasi" value={applicant.communicationStatus} />
              <StatusItem label="Penyaluran Dana" value={applicant.fundDisbursement} />
              <StatusItem label="Kesediaan" value={applicant.willingness} />
              <StatusItem label="Kehadiran (Ditemukan)" value={applicant.presenceStatus} />
            </div>
            {applicant.reasonNotWilling && (
              <div className="mt-4 p-3 bg-muted rounded-lg border">
                <p className="text-xs text-muted-foreground mb-1 uppercase font-bold">Alasan Tidak Bersedia</p>
                <p className="text-sm italic">"{applicant.reasonNotWilling}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-1 space-y-6">
        {/* University Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Universitas Mitra</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            {applicant.university?.logo ? (
              <img 
                src={normalizeFileUrl(applicant.university.logo)} 
                alt={applicant.university.name} 
                className="h-20 w-20 object-contain"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
                {applicant.university?.name?.substring(0, 2).toUpperCase() || "UN"}
              </div>
            )}
            <div className="text-center">
              <p className="font-bold text-lg">{applicant.university?.name || "Belum Dibagikan"}</p>
              <p className="text-sm text-muted-foreground italic">Alokasi Universitas</p>
            </div>
          </CardContent>
        </Card>

        {/* Mentor Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Pendamping</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 py-6">
            <UserAvatar name={mentorProfile?.name || "N/A"} src={mentorProfile?.photo} className="h-24 w-24 text-2xl" />
            <div className="text-center">
              <p className="font-bold text-lg">{mentorProfile?.name || "Belum ada pendamping"}</p>
              <p className="text-sm text-muted-foreground italic">Pendamping</p>
            </div>
            <Separator />
            <div className="w-full space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{mentorProfile?.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{mentorProfile?.whatsapp || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ApplicantStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        applicant={applicant}
        currentRole={currentRole ?? undefined}
      />
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  const isPositive = ["RESPONDED", "DISBURSED", "WILLING", "FOUND"].includes(value);
  
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        {isPositive ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="font-medium text-sm capitalize">{value.replace("_", " ").toLowerCase()}</span>
      </div>
    </div>
  );
}
