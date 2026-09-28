"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Applicant, FollowUpRecommendation } from "@/types";
import { Building2, GraduationCap, User, Phone, Mail, Award, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface FollowUpParticipantCardProps {
  applicant: Applicant;
  recommendation?: FollowUpRecommendation | null;
}

export function FollowUpParticipantCard({ applicant, recommendation }: FollowUpParticipantCardProps) {
  const profile = applicant.profile;
  const business = applicant.businessProfile;
  const mentorProfile = applicant.mentor?.user?.profile;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1.5"><Award className="h-3.5 w-3.5" /> Disetujui Balai/Admin</Badge>;
      case "SUBMITTED":
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1.5"><Clock className="h-3.5 w-3.5" /> Menunggu Persetujuan</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="gap-1.5">Perlu Revisi / Ditolak</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1.5">Draft Asesmen</Badge>;
    }
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Informasi Peserta & Usaha</CardTitle>
            <CardDescription>Data identitas penerima bantuan TKML dan usaha yang didampingi</CardDescription>
          </div>
          <div>{getStatusBadge(recommendation?.status)}</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Col 1: Profil Peserta */}
          <div className="flex items-start gap-4">
            <UserAvatar name={profile?.name || "Peserta"} src={profile?.photo} className="h-16 w-16 text-xl rounded-xl shadow-xs" previewable />
            <div className="space-y-1">
              <h3 className="font-semibold text-base leading-tight text-foreground">{profile?.name}</h3>
              <div className="inline-flex items-center font-mono text-xs bg-muted px-2 py-0.5 rounded border">
                ID: {applicant.idTkm}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{profile?.whatsapp || "-"}</span>
              </div>
              {profile?.email && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate max-w-45">{profile.email}</span>
                </div>
              )}
            </div>
          </div>

          {/* Col 2: Info Usaha */}
          <div className="space-y-1.5 border-l md:border-l border-t md:border-t-0 pt-4 md:pt-0 pl-0 md:pl-6">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" /> Profil Usaha
            </div>
            <div className="text-base font-semibold text-foreground">
              {business?.businessName || "Usaha Belum Terdaftar"}
            </div>
            <div className="text-xs text-muted-foreground">
              Sektor: <span className="font-medium text-foreground">{business?.businessSector || "-"}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Produk Utama: <span className="font-medium text-foreground">{business?.mainProduct || "-"}</span>
            </div>
          </div>

          {/* Col 3: Pendamping & Kampus */}
          <div className="space-y-1.5 border-l md:border-l border-t md:border-t-0 pt-4 md:pt-0 pl-0 md:pl-6">
            <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5 text-primary" /> Universitas & Pendamping
            </div>
            <div className="text-sm font-medium text-foreground">
              {applicant.university?.name || "Universitas Pengampu"}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Pendamping: <strong className="text-foreground">{mentorProfile?.name || "Belum Ditugaskan"}</strong></span>
            </div>
            {recommendation?.updatedAt && (
              <div className="text-[11px] text-muted-foreground pt-1">
                Terakhir diperbarui: {format(new Date(recommendation.updatedAt), "d MMM yyyy, HH:mm", { locale: localeId })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
