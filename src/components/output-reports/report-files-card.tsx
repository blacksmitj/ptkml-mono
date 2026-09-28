"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { renderOcrStatusAndValidation } from "./ocr-status-helper";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface ReportFilesCardProps {
  report: any;
  onPreviewFile: (file: any, title: string) => void;
}

const bookkeepingLabels: Record<string, string> = {
  NONE: "Tidak Menerapkan",
  MANUAL: "Manual (Buku)",
  EXCEL: "Excel/Spreadsheet",
  APPLICATION: "Aplikasi Digital",
};

export function ReportFilesCard({ report, onPreviewFile }: ReportFilesCardProps) {
  const incomeFile = report.files?.find((f: any) => f.category === "OUTPUT_INCOME_PROOF");
  const cashflowFile = report.files?.find((f: any) => f.category === "OUTPUT_CASHFLOW_PROOF");

  return (
    <div className="space-y-6 w-full">
      {/* Bookkeeping Method Card */}
      <Card>
        <CardHeader>
          <CardTitle>Metode Pembukuan</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-6">
          {/* Column Arus Kas */}
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-bold uppercase">Buku Kas Harian</span>
              <span className="font-medium">{bookkeepingLabels[report.bookkeepingCashflow] || report.bookkeepingCashflow || "-"}</span>
            </div>

            <div className="p-4 border rounded-xl space-y-3 bg-muted/20 min-h-35 flex flex-col justify-between w-full">
              <div className="w-full">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bukti Buku Kas Harian</span>
                {cashflowFile ? (
                  <div className="w-full space-y-2">
                    <button 
                      type="button"
                      onClick={() => onPreviewFile(cashflowFile, "Bukti Buku Kas Harian")}
                      className="block relative w-full h-40 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm mt-2 cursor-pointer text-left"
                    >
                      {cashflowFile.mimeType === "application/pdf" || cashflowFile.url?.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full relative">
                           <PdfThumbnail url={cashflowFile.url} className="w-full h-full object-cover" fallbackIconClassName="size-10" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-foreground text-xs font-bold bg-background/90 px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                              Lihat PDF
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={normalizeFileUrl(cashflowFile.url) || undefined} 
                          alt="Bukti Buku Kas Harian" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                    {renderOcrStatusAndValidation(cashflowFile)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-2">Tidak ada bukti buku kas yang diunggah.</p>
                )}
              </div>
            </div>
          </div>

          {/* Column Laba Rugi */}
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg border flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-bold uppercase">Catatan Laba Rugi Bulanan</span>
              <span className="font-medium">{bookkeepingLabels[report.bookkeepingIncomeStatement] || report.bookkeepingIncomeStatement || "-"}</span>
            </div>

            <div className="p-4 border rounded-xl space-y-3 bg-muted/20 min-h-35 flex flex-col justify-between w-full">
              <div className="w-full">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bukti Catatan Laba Rugi Bulanan</span>
                {incomeFile ? (
                  <div className="w-full space-y-2">
                    <button 
                      type="button"
                      onClick={() => onPreviewFile(incomeFile, "Bukti Catatan Laba Rugi Bulanan")}
                      className="block relative w-full h-40 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm mt-2 cursor-pointer text-left"
                    >
                      {incomeFile.mimeType === "application/pdf" || incomeFile.url?.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full relative">
                           <PdfThumbnail url={incomeFile.url} className="w-full h-full object-cover" fallbackIconClassName="size-10" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-foreground text-xs font-bold bg-background/90 px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                              Lihat PDF
                            </span>
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={normalizeFileUrl(incomeFile.url) || undefined} 
                          alt="Bukti Catatan Laba Rugi Bulanan" 
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                    {renderOcrStatusAndValidation(incomeFile)}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic mt-2">Tidak ada bukti catatan laba rugi bulanan yang diunggah.</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
