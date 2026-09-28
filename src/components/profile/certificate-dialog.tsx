"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, Award, CheckCircle2, ShieldCheck, X } from "lucide-react";
import Image from "next/image";
import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface WorkspaceMembershipData {
  id: string;
  role: string;
  verificationStatus: string;
  joinedAt?: string | Date;
  createdAt?: string | Date;
  workspace?: {
    id: string;
    name: string;
    year?: number | null;
    code?: string | null;
  };
  university?: {
    id: string;
    name: string;
    code?: string;
    logo?: string | null;
  } | null;
  _count?: {
    applicants?: number;
    createdLogbooks?: number;
    verifiedLogbooks?: number;
    verifiedOutputs?: number;
  };
}

interface UserProfileData {
  name?: string | null;
  nik?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  photo?: string | null;
}

interface CertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: WorkspaceMembershipData | null;
  profile: UserProfileData | null;
  username?: string;
}

import { printElement } from "@/lib/print-element";

export function CertificateDialog({
  open,
  onOpenChange,
  membership,
  profile,
  username,
}: CertificateDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!membership) return null;

  const recipientName = profile?.name || username || "Peserta Pendampingan";
  const ws = membership.workspace;
  const univ = membership.university;
  const counts = membership._count;

  // Format peran
  let roleTitle = "Pendamping Peserta";
  if (membership.role === "UNIVERSITY_ADMIN") {
    roleTitle = "Admin Universitas";
  } else if (membership.role === "UNIVERSITY_SUPERVISOR") {
    roleTitle = "Pengawas Universitas";
  } else if (membership.role === "MENTOR") {
    roleTitle = "Mentor Pendamping";
  }

  // Generate ID / Nomor Sertifikat Unik
  const certYear = ws?.year || new Date().getFullYear();
  const certIdShort = membership.id.slice(0, 8).toUpperCase();
  const certNumber = `TKML-CERT/${certYear}/${certIdShort}`;

  const handlePrint = () => {
    printElement(printAreaRef.current, {
      title: `Sertifikat-${recipientName.replace(/\s+/g, "_")}`,
      pageOrientation: "landscape",
      pageSize: "A4",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="!w-[95vw] !max-w-5xl sm:!max-w-5xl md:!max-w-5xl lg:!max-w-5xl p-0 overflow-hidden bg-background border-none shadow-2xl"
      >
        {/* Header Kontrol Modal (Tidak ikut tercetak) */}
        <div className="p-4 bg-muted/40 border-b flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Pratinjau Sertifikat Resmi
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Sertifikat Partisipasi & Kontribusi Program TKML
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-2 rounded-xl text-xs font-bold shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Area Sertifikat (Bisa di-scroll di layar dan full-page di @media print) */}
        <div className="max-h-[80vh] overflow-y-auto p-4 md:p-8 bg-zinc-900/10 dark:bg-black/30 flex justify-center print:p-0 print:m-0 print:max-h-none print:overflow-visible">
          <div
            ref={printAreaRef}
            id="certificate-print-area"
            className="w-full max-w-[900px] aspect-[1.414/1] bg-white text-zinc-900 shadow-xl rounded-lg p-8 md:p-12 relative flex flex-col justify-between border-[12px] border-double border-amber-600/30 dark:border-amber-500/40 select-none print:shadow-none print:border-[10px] print:rounded-none print:w-full print:h-full print:m-0"
            style={{
              backgroundImage: `radial-gradient(circle at center, rgba(251, 191, 36, 0.04) 0%, rgba(255, 255, 255, 1) 70%)`,
            }}
          >
            {/* Ornamen Sudut Sertifikat */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-700/60" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-700/60" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-700/60" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-700/60" />

            {/* Bagian 1: Header / Kop Sertifikat */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-between border-b pb-4 mb-2">
                <div className="flex items-center gap-3">
                  {univ?.logo ? (
                    <div className="relative w-12 h-12">
                      <Image
                        src={normalizeFileUrl(univ.logo)}
                        alt={univ.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center border border-amber-300">
                      <Award className="w-6 h-6 text-amber-700" />
                    </div>
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-800">
                      {univ?.name || "Program Pendampingan Universitas"}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-mono">
                      Afiliasi Instansi Program TKML
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-mono text-zinc-500 font-bold">
                    NOMOR: {certNumber}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Status: <span className="text-emerald-700 font-bold">TERVERIFIKASI RESMI</span>
                  </p>
                </div>
              </div>

              <h1 className="text-3xl md:text-4xl font-serif font-black tracking-wide text-amber-950 uppercase pt-2">
                SERTIFIKAT PENGHARGAAN
              </h1>
              <p className="text-xs font-medium text-zinc-600 tracking-widest uppercase">
                Certificate of Appreciation & Recognition
              </p>
            </div>

            {/* Bagian 2: Pernyataan & Nama Penerima */}
            <div className="text-center space-y-4 my-auto py-4">
              <p className="text-xs text-zinc-500 italic">
                Diberikan dengan penuh hormat dan apresiasi setinggi-tingginya kepada:
              </p>
              <div>
                <h2 className="text-2xl md:text-3xl font-serif font-black text-zinc-900 underline decoration-amber-600/40 underline-offset-8">
                  {recipientName}
                </h2>
                {profile?.nik && (
                  <p className="text-[11px] font-mono text-zinc-500 mt-2">
                    NIK / Nomor Identitas: {profile.nik}
                  </p>
                )}
              </div>
              <p className="text-xs md:text-sm text-zinc-700 max-w-xl mx-auto leading-relaxed">
                Atas dedikasi, kontribusi, dan integritas yang luar biasa dalam menjalankan peran sebagai{" "}
                <span className="font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  {roleTitle}
                </span>{" "}
                pada program pendampingan{" "}
                <span className="font-bold text-zinc-900">{ws?.name || "Workspace TKML"}</span>
                {ws?.year ? ` Periode ${ws.year}` : ""}.
              </p>

              {/* Rincian Capaian Ringkas */}
              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="text-center px-4 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Peserta Binaan</p>
                  <p className="text-base font-bold text-zinc-900">{counts?.applicants ?? 0} Orang</p>
                </div>
                <div className="text-center px-4 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Logbook Dibuat</p>
                  <p className="text-base font-bold text-zinc-900">{counts?.createdLogbooks ?? 0} Aktivitas</p>
                </div>
                <div className="text-center px-4 py-1.5 rounded-lg bg-zinc-50 border border-zinc-200">
                  <p className="text-[10px] uppercase font-bold text-zinc-500">Verifikasi Diselesaikan</p>
                  <p className="text-base font-bold text-zinc-900">
                    {(counts?.verifiedLogbooks ?? 0) + (counts?.verifiedOutputs ?? 0)} Berkas
                  </p>
                </div>
              </div>
            </div>

            {/* Bagian 3: Footer, QR Code Verifikasi, dan Tanda Tangan */}
            <div className="grid grid-cols-3 items-end border-t pt-4 mt-2">
              {/* QR Code & Kode Keamanan */}
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 bg-white border border-zinc-300 p-1 rounded shadow-2xs flex flex-col items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-full h-full text-zinc-800" fill="currentColor">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm13-2h3v3h-3v-3zm0 5h5v3h-5v-3zm3-2h2v2h-2v-2zM5 5h2v2H5V5zm12 0h2v2h-2V5zM5 17h2v2H5v-2z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dokumen Sah & Asli</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 max-w-[140px] leading-tight mt-0.5">
                    Diverifikasi secara digital melalui Sistem Pendampingan Terpadu.
                  </p>
                </div>
              </div>

              {/* Stempel / Medallion Rosette */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-full border-2 border-dashed border-amber-600/60 flex items-center justify-center bg-amber-50/50">
                  <Award className="w-7 h-7 text-amber-700" />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-900 mt-1">
                  OFFICIAL RECOGNITION
                </span>
              </div>

              {/* Tanda Tangan Resmi */}
              <div className="text-right space-y-1">
                <p className="text-[10px] text-zinc-500">
                  Ditetapkan pada:{" "}
                  <span className="font-semibold text-zinc-700">
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <div className="h-10 flex items-end justify-end">
                  <div className="w-32 border-b border-zinc-800 border-dashed" />
                </div>
                <p className="text-xs font-bold text-zinc-900 uppercase">
                  Pengelola Program TKML
                </p>
                <p className="text-[10px] text-zinc-500">
                  {univ?.name || "Kementerian & Mitra Perguruan Tinggi"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
