"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle2, ShieldCheck, X, Briefcase, Users, Award } from "lucide-react";

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

interface CumulativeTranscriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberships: WorkspaceMembershipData[];
  profile: UserProfileData | null;
  username?: string;
}

import { printElement } from "@/lib/print-element";

export function CumulativeTranscriptDialog({
  open,
  onOpenChange,
  memberships,
  profile,
  username,
}: CumulativeTranscriptDialogProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const recipientName = profile?.name || username || "Pengguna Sistem";

  // Total akumulasi
  const totalWorkspaces = memberships.length;
  const totalApplicants = memberships.reduce(
    (acc, m) => acc + (m._count?.applicants || 0),
    0
  );
  const totalLogbooks = memberships.reduce(
    (acc, m) => acc + (m._count?.createdLogbooks || 0),
    0
  );
  const totalVerifications = memberships.reduce(
    (acc, m) =>
      acc + (m._count?.verifiedLogbooks || 0) + (m._count?.verifiedOutputs || 0),
    0
  );

  const docNumber = `TRANSCRIPT/TKML/${new Date().getFullYear()}/${(
    profile?.nik || username || "REC"
  ).slice(0, 6).toUpperCase()}`;

  const handlePrint = () => {
    printElement(printAreaRef.current, {
      title: `Transkrip-${recipientName.replace(/\s+/g, "_")}`,
      pageOrientation: "portrait",
      pageSize: "A4",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="!w-[95vw] !max-w-4xl sm:!max-w-4xl md:!max-w-4xl lg:!max-w-4xl p-0 overflow-hidden bg-background border-none shadow-2xl"
      >
        {/* Header Kontrol Modal (Tidak ikut tercetak) */}
        <div className="p-4 bg-muted/40 border-b flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Transkrip Kumulatif Riwayat Pendampingan
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Rekapitulasi seluruh periode, aktivitas, dan capaian program
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

        {/* Area Dokumen Transkrip (A4 Portrait) */}
        <div className="max-h-[80vh] overflow-y-auto p-4 md:p-8 bg-zinc-900/10 dark:bg-black/30 flex justify-center print:p-0 print:m-0 print:max-h-none print:overflow-visible">
          <div
            ref={printAreaRef}
            id="transcript-print-area"
            className="w-full max-w-[800px] bg-white text-zinc-900 shadow-xl rounded-lg p-8 md:p-12 relative flex flex-col justify-between border border-zinc-300 print:border-none print:shadow-none print:rounded-none print:w-full print:m-0"
          >
            {/* Header Dokumen Formal */}
            <div className="border-b-2 border-zinc-900 pb-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black tracking-tight text-zinc-900 uppercase">
                    TRANSKRIP PORTOFOLIO PENDAMPINGAN
                  </h1>
                  <p className="text-xs font-semibold text-zinc-600">
                    Sistem Manajemen Pendampingan Tenaga Kerja Mandiri (TKML)
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-mono font-bold text-zinc-700">
                    NO: {docNumber}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    Dicetak: {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
                  </p>
                </div>
              </div>
            </div>

            {/* Biodata Pemegang Dokumen */}
            <div className="bg-zinc-50 rounded-lg p-4 border border-zinc-200 mb-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                    Nama Lengkap
                  </span>
                  <span className="font-bold text-zinc-900 text-sm">{recipientName}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                    NIK / No. Identitas
                  </span>
                  <span className="font-mono font-semibold text-zinc-800">
                    {profile?.nik || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                    Email Kontak
                  </span>
                  <span className="text-zinc-800">{profile?.email || "-"}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                    Username
                  </span>
                  <span className="font-mono text-zinc-800">@{username || "user"}</span>
                </div>
              </div>
            </div>

            {/* Ringkasan Akumulasi Angka */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-zinc-100/70 border border-zinc-200 text-center">
                <span className="text-[10px] font-bold uppercase text-zinc-600 block">
                  Total Periode
                </span>
                <span className="text-lg font-black text-zinc-900">{totalWorkspaces}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-100/70 border border-zinc-200 text-center">
                <span className="text-[10px] font-bold uppercase text-zinc-600 block">
                  Binaan Dibina
                </span>
                <span className="text-lg font-black text-zinc-900">{totalApplicants}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-100/70 border border-zinc-200 text-center">
                <span className="text-[10px] font-bold uppercase text-zinc-600 block">
                  Logbook Aktivitas
                </span>
                <span className="text-lg font-black text-zinc-900">{totalLogbooks}</span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-100/70 border border-zinc-200 text-center">
                <span className="text-[10px] font-bold uppercase text-zinc-600 block">
                  Total Verifikasi
                </span>
                <span className="text-lg font-black text-zinc-900">{totalVerifications}</span>
              </div>
            </div>

            {/* Tabel Rinci Kronologis Riwayat Keanggotaan */}
            <div className="mb-8 flex-1">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-2">
                Rincian Rekam Jejak Program & Capaian
              </h2>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-y border-zinc-400 bg-zinc-100 text-zinc-700">
                    <th className="py-2 px-2 text-left font-bold">No</th>
                    <th className="py-2 px-2 text-left font-bold">Program / Workspace</th>
                    <th className="py-2 px-2 text-left font-bold">Peran</th>
                    <th className="py-2 px-2 text-left font-bold">Afiliasi Universitas</th>
                    <th className="py-2 px-2 text-center font-bold">Binaan</th>
                    <th className="py-2 px-2 text-center font-bold">Logbook</th>
                    <th className="py-2 px-2 text-center font-bold">Verif</th>
                    <th className="py-2 px-2 text-center font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {memberships.map((m, index) => {
                    const ws = m.workspace;
                    const univ = m.university;
                    const counts = m._count;

                    let roleLabel = "Anggota";
                    if (m.role === "UNIVERSITY_ADMIN") roleLabel = "Admin Univ";
                    else if (m.role === "UNIVERSITY_SUPERVISOR") roleLabel = "Pengawas Univ";
                    else if (m.role === "MENTOR") roleLabel = "Pendamping";

                    return (
                      <tr key={m.id} className="hover:bg-zinc-50">
                        <td className="py-2 px-2 font-mono text-zinc-500">{index + 1}</td>
                        <td className="py-2 px-2">
                          <p className="font-bold text-zinc-900">{ws?.name || "Workspace"}</p>
                          <p className="text-[10px] text-zinc-500 font-mono">
                            {ws?.year ? `Tahun ${ws.year}` : "-"}
                          </p>
                        </td>
                        <td className="py-2 px-2 font-semibold text-zinc-800">{roleLabel}</td>
                        <td className="py-2 px-2 text-zinc-600">{univ?.name || "-"}</td>
                        <td className="py-2 px-2 text-center font-mono">
                          {counts?.applicants ?? 0}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {counts?.createdLogbooks ?? 0}
                        </td>
                        <td className="py-2 px-2 text-center font-mono">
                          {(counts?.verifiedLogbooks ?? 0) + (counts?.verifiedOutputs ?? 0)}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              m.verificationStatus === "APPROVED"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {m.verificationStatus}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer & Pengesahan */}
            <div className="grid grid-cols-2 items-end border-t pt-4 mt-auto">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <p className="text-[10px] font-bold text-zinc-900">
                    Sistem Informasi Manajemen Pendampingan
                  </p>
                  <p className="text-[9px] text-zinc-500">
                    Dokumen ini dicetak otomatis secara elektronik dan sah tanpa cap basah.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-zinc-500">
                  Dicetak pada: {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
                </p>
                <div className="h-12 flex items-end justify-end">
                  <div className="w-36 border-b border-zinc-800" />
                </div>
                <p className="text-xs font-bold text-zinc-900 uppercase">
                  Koordinator Administrasi Program
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
