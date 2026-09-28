"use client";

import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useUniversities } from "@/hooks/use-universities";
import { useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";

export function DownloadTemplateButton() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: universities, isLoading } = useUniversities({
    workspaceId: currentWorkspaceId || undefined,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    if (!universities || universities.length === 0) {
      toast.error("Data universitas belum tersedia. Silakan tunggu sebentar.");
      return;
    }

    try {
      setIsGenerating(true);
      const ExcelJS = (await import("exceljs")).default;
      
      const workbook = new ExcelJS.Workbook();

      // Sheet 1: Template Alokasi (Format inputan)
      const wsTemplate = workbook.addWorksheet("Template Alokasi");
      wsTemplate.columns = [
        { header: "idtkm", key: "idtkm", width: 20 },
        { header: "iduniversitas", key: "iduniversitas", width: 36 }
      ];
      wsTemplate.addRow({ idtkm: "TKM-001", iduniversitas: universities[0]?.id || "UNIV-001" });
      wsTemplate.addRow({ idtkm: "TKM-002", iduniversitas: universities[1]?.id || "UNIV-002" });

      // Sheet 2: Daftar Universitas (Sebagai referensi untuk admin)
      const wsUniv = workbook.addWorksheet("Daftar ID Universitas");
      wsUniv.columns = [
        { header: "ID Universitas", key: "id", width: 36 },
        { header: "Nama Universitas", key: "name", width: 40 },
        { header: "Status", key: "status", width: 15 }
      ];

      universities.forEach(u => {
        wsUniv.addRow({
          id: u.id,
          name: u.name,
          status: u.isActive ? "Aktif" : "Tidak Aktif"
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-alokasi-peserta.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate template:", error);
      toast.error("Terjadi kesalahan saat membuat template Excel.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="gap-2 rounded-xl border-indigo-200 hover:bg-indigo-50"
      onClick={handleDownload}
      disabled={isLoading || isGenerating}
    >
      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {isGenerating ? "Membuat Template..." : "Unduh Template Alokasi"}
    </Button>
  );
}
