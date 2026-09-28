"use client";

import React from "react";
import { PrintHeader } from "./PrintHeader";
import { useUniversities } from "@/hooks/use-universities";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  universityId: string;
}

export function LaporanPendahuluanUniversitas({ universityId }: Props) {
  const { data: universities, isLoading } = useUniversities();

  const university = universities?.find((u) => u.id === universityId);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-100 w-full" />
      </div>
    );
  }

  return (
    <div className="w-full pb-20 print:pb-0 print:overflow-visible">
      <PrintHeader
        title="Laporan Pendahuluan Universitas"
        subtitle={university?.name || "Universitas"}
      />

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 print:p-0 print:max-w-none print:w-full">
        <div className="bg-white text-black p-8 border rounded-xl shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 print:w-full">
          {/* Header */}
          <div className="text-center font-bold text-lg mb-6 uppercase tracking-wide border-b pb-4">
            Laporan Pendahuluan Program Pendampingan TKM Lanjutan
            <div className="text-sm font-normal normal-case text-gray-600 mt-1">
              {university?.name || "Universitas Mitra"}
            </div>
          </div>

          {/* Table Placeholder */}
          <table className="w-full border-collapse border border-black text-sm text-left">
            <tbody>
              <tr>
                <td className="border border-black p-2 font-medium w-10 text-center">1</td>
                <td className="border border-black p-2 font-medium w-1/3">Nama Perguruan Tinggi</td>
                <td className="border border-black p-2 w-4 text-center">:</td>
                <td className="border border-black p-2">{university?.name || "-"}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">2</td>
                <td className="border border-black p-2 font-medium">Status Akreditasi / Kemitraan</td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">Mitra Pelaksana Pendampingan TKM Lanjutan</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">3</td>
                <td className="border border-black p-2 font-medium">Jumlah Pendamping Terdaftar</td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">{(university as any)?.mentorsCount || university?._count?.mentors || 0} Tenaga Pendamping</td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">4</td>
                <td className="border border-black p-2 font-medium">Jumlah Peserta (TKM) Dampingan</td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">{(university as any)?.applicantsCount || university?._count?.applicants || 0} Kelompok TKM</td>
              </tr>
              <tr className="bg-gray-100 font-bold">
                <td className="border border-black p-2 text-center"></td>
                <td className="border border-black p-2" colSpan={3}>
                  Rencana Kerja Pendampingan (Pendahuluan)
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">5</td>
                <td className="border border-black p-2 font-medium">Tahap Persiapan & Pembekalan</td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  <span className="italic text-gray-500">
                    Format rinci laporan pendahuluan universitas akan disesuaikan setelah petunjuk teknis/template resmi tersedia.
                  </span>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-medium text-center">6</td>
                <td className="border border-black p-2 font-medium">Pemetaan Lokasi Dampingan</td>
                <td className="border border-black p-2 text-center">:</td>
                <td className="border border-black p-2">
                  <span className="italic text-gray-500">Data pemetaan wilayah dampingan terlampir dalam sistem.</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-8 p-4 border border-dashed border-amber-400 bg-amber-50 rounded-lg text-xs text-amber-800 print:hidden">
            <strong>Catatan:</strong> Dokumen ini merupakan template awal Laporan Pendahuluan Universitas. Form & struktur data akan diperbarui sesuai petunjuk juknis terbaru dari Kemnaker.
          </div>
        </div>
      </div>
    </div>
  );
}
