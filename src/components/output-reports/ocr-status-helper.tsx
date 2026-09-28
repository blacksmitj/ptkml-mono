"use client";

import React from "react";
import { Loader2, AlertTriangle, CheckCircle2, Clock, ChevronDown, FileQuestion, FileWarning, FileCheck, FileSearch, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function renderOcrStatusAndValidation(file: any) {
  if (!file) return null;
  
  const ocrResult = file.ocrResult;

  // Determine status and styling
  let status = "UNCHECKED";
  let title = "Belum Diperiksa";
  let colorClass = "bg-muted/40 text-muted-foreground border-muted-foreground/10";
  let icon = <FileQuestion className="size-3.5 text-muted-foreground" />;

  if (ocrResult) {
    if (ocrResult.status === "PENDING" || ocrResult.status === "PROCESSING") {
      status = "PROCESSING";
      title = "Sedang Diperiksa";
      colorClass = "bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      icon = <RefreshCw className="size-3.5 text-yellow-600 dark:text-yellow-400 animate-spin" />;
    } else if (ocrResult.status === "FAILED") {
      status = "FAILED";
      title = "Gagal Dibaca";
      colorClass = "bg-destructive/5 text-destructive border-destructive/10";
      icon = <FileWarning className="size-3.5 text-destructive" />;
    } else {
      const isDocMatch = ocrResult.validations?.every((v: any) => v.isMatch) ?? true;
      if (!isDocMatch) {
        status = "MISMATCH";
        title = "Perlu Periksa";
        colorClass = "bg-yellow-500/5 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
        icon = <FileWarning className="size-3.5 text-yellow-600 dark:text-yellow-400" />;
      } else {
        status = "SUCCESS";
        title = "Telah Sesuai";
        colorClass = "bg-muted/40 text-muted-foreground border-muted-foreground/10";
        icon = <FileCheck className="size-3.5 text-muted-foreground" />;
      }
    }
  }

  const confidencePct = ocrResult?.confidence !== null && ocrResult?.confidence !== undefined
    ? `${(ocrResult.confidence * 100).toFixed(0)}%`
    : null;

  const validations = ocrResult?.validations?.filter((val: any) => val.fieldName !== "ai_analysis") || [];

  return (
    <div className="mt-2 space-y-1.5 w-full text-left">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Atensi</span>
        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border w-fit ${colorClass}`}>
          {icon}
          <span>{title}</span>
        </div>
      </div>

      {status === "FAILED" && ocrResult?.errorMessage && (
        <p className="text-[10px] text-destructive leading-normal mt-1">{ocrResult.errorMessage}</p>
      )}

      {ocrResult && ocrResult.status === "COMPLETED" && (
        validations.length > 0 ? (
          <details className="group border rounded-lg overflow-hidden bg-background mt-1.5">
            <summary className="flex items-center justify-between px-2 py-1 text-[10px] font-bold text-muted-foreground cursor-pointer hover:bg-muted/30 select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-1">
                Hasil Analisis {confidencePct && <span className="font-normal font-mono text-[9px]">({confidencePct})</span>}
              </span>
              <ChevronDown className="size-3 transition-transform group-open:rotate-180 text-muted-foreground" />
            </summary>
            <div className="px-2 pb-2 pt-1 border-t space-y-2 bg-muted/10">
              {validations.map((val: any) => (
                <div key={val.id} className="space-y-1 border-b border-muted/50 last:border-b-0 pb-1.5 last:pb-0">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="capitalize">
                      {val.fieldName === "bpjsNumber"
                        ? "No. BPJS"
                        : val.fieldName === "name"
                        ? "Nama"
                        : val.fieldName === "nik"
                        ? "NIK"
                        : val.fieldName === "kesesuaian_dokumen"
                        ? "Kenesuaian Dokumen"
                        : val.fieldName}
                      {val.confidence !== null && val.confidence !== undefined && (
                        <span className="text-[9px] text-muted-foreground font-normal ml-1">
                          ({(val.confidence * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                    {val.isMatch ? (
                      <Badge className="h-4 text-[9px] bg-emerald-500 hover:bg-emerald-600 border-none text-white px-1.5 font-bold">Sesuai</Badge>
                    ) : (
                      <Badge className="h-4 text-[9px] bg-amber-500 hover:bg-amber-600 border-none text-white px-1.5 font-bold">Perlu Cek</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] text-muted-foreground bg-background p-1.5 rounded border">
                    <div className="truncate">
                      <span className="font-semibold block text-[8px] text-muted-foreground/75 uppercase tracking-wide">
                        {val.fieldName === "kesesuaian_dokumen" || val.fieldName.startsWith("Konteks") ? "Jenis Dokumen:" : "Manual:"}
                      </span>
                      <span className={`font-medium text-foreground text-xs ${(val.fieldName === "nik" || val.fieldName === "bpjsNumber") ? "font-mono" : ""}`}>
                        {val.manualValue || "-"}
                      </span>
                    </div>
                    <div className="truncate">
                      <span className="font-semibold block text-[8px] text-muted-foreground/75 uppercase tracking-wide">
                        {val.fieldName === "kesesuaian_dokumen" || val.fieldName.startsWith("Konteks") ? "Hasil Analisis:" : "OCR:"}
                      </span>
                      <span className={`font-medium text-foreground text-xs ${(val.fieldName === "nik" || val.fieldName === "bpjsNumber") ? "font-mono" : ""}`}>
                        {val.extractedValue || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        ) : (
          <div className="text-[10px] text-muted-foreground italic px-1 mt-1">
            OCR selesai (tidak ada validasi field)
          </div>
        )
      )}
    </div>
  );
}
