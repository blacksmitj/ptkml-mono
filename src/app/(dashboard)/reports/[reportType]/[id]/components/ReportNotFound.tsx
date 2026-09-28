"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";

export function ReportNotFound() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
      <div className="p-4 rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-10 w-10" />
      </div>
      <h1 className="text-2xl font-bold">Jenis Laporan Tidak Ditemukan</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        Tipe laporan yang Anda minta tidak terdaftar atau URL yang Anda tuju tidak valid.
      </p>
      <Button onClick={() => router.push("/reports")} className="gap-2">
        <ChevronLeft className="h-4 w-4" />
        Kembali ke Download Center
      </Button>
    </div>
  );
}
