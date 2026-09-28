"use client";

import React, { useState } from "react";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Download, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadRtlExcel } from "../lib/rtl-excel";

interface RtlExportCardProps {
  workspaceId?: string;
  cardNumber?: number;
}

export function RtlExportCard({
  workspaceId,
  cardNumber = 4,
}: RtlExportCardProps) {
  const [exportRtlStatus, setExportRtlStatus] = useState<string>("ALL");
  const [isExportingRtl, setIsExportingRtl] = useState(false);

  const handleExportRtl = async () => {
    if (!workspaceId) {
      toast.error("Workspace ID tidak valid.");
      return;
    }

    try {
      setIsExportingRtl(true);
      await downloadRtlExcel({
        workspaceId,
        statusFilter: exportRtlStatus,
      });
      toast.success("Excel Rekapitulasi RTL berhasil diunduh.");
    } catch (error: any) {
      console.error("Gagal mendownload excel RTL:", error);
      toast.error(
        error?.response?.data?.error || "Gagal mendownload file Excel RTL."
      );
    } finally {
      setIsExportingRtl(false);
    }
  };

  return (
    <Card className="flex flex-col justify-between hover:shadow-md transition-shadow duration-200 border-border/80">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="p-3 rounded-xl border bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted border text-muted-foreground">
            Rencana Tindak Lanjut
          </span>
        </div>
        <CardTitle className="text-lg">
          {cardNumber}. Rekap Rencana Tindak Lanjut (RTL)
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          Unduh rekapan rencana tindak lanjut (RTL), temuan asesmen akhir, dan
          butir program rekomendasi intervensi peserta binaan (.xlsx).
        </CardDescription>

        {/* Filter Section */}
        <div className="pt-3 border-t border-border/60 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5" /> Filter Status RTL:
          </div>

          <Field className="w-full">
            <FieldLabel className="text-[10px] font-semibold text-muted-foreground uppercase p-0 border-0 bg-transparent">
              Status Verifikasi RTL
            </FieldLabel>
            <Select
              value={exportRtlStatus}
              onValueChange={setExportRtlStatus}
            >
              <SelectTrigger className="w-full h-9 text-xs bg-background">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua Status
                </SelectItem>
                <SelectItem value="APPROVED" className="text-xs">
                  Disetujui (Approved)
                </SelectItem>
                <SelectItem value="SUBMITTED" className="text-xs">
                  Menunggu Verifikasi (Submitted)
                </SelectItem>
                <SelectItem value="DRAFT" className="text-xs">
                  Draft Mentor
                </SelectItem>
                <SelectItem value="REJECTED" className="text-xs">
                  Perlu Revisi (Rejected)
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CardHeader>

      <CardFooter className="pt-2 flex justify-end">
        <Button
          onClick={handleExportRtl}
          disabled={isExportingRtl}
          className="w-fit ml-auto gap-2 group bg-teal-600 hover:bg-teal-700 text-white"
        >
          <span className="flex items-center gap-2">
            {isExportingRtl ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengunduh RTL...</span>
              </>
            ) : (
              <span>Unduh Rekap RTL (.xlsx)</span>
            )}
          </span>
          <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
