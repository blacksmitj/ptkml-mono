"use client";

import * as React from "react";
import { FileText, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { renderOcrStatusAndValidation } from "./ocr-status-helper";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";

import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { BpjsType } from "@/types";

const formatBpjsType = (type?: string | null) => {
  if (!type) return "BPJS";
  if (type === "WAGE_EARNER" || type === BpjsType.WAGE_EARNER) return "Penerima Upah (PU)";
  if (type === "NON_WAGE_EARNER" || type === BpjsType.NON_WAGE_EARNER) return "Bukan Penerima Upah (BPU)";
  return type;
};

const formatEmploymentStatus = (status?: string | null) => {
  if (!status) return "-";
  switch (status.toLowerCase()) {
    case "permanen":
      return "Tetap (Permanen)";
    case "kontrak":
      return "Lepas/Kontrak";
    case "paruh_waktu":
      return "Paruh Waktu/Musiman";
    case "tidak_dibayar":
      return "Tidak Dibayar/Keluarga";
    default:
      return status;
  }
};

const formatDisabilityType = (type?: string | null) => {
  if (!type) return "Penyandang Disabilitas";
  switch (type.toLowerCase()) {
    case "disabilitas_daksa":
      return "Fisik (Daksa)";
    case "disabilitas_netra":
      return "Sensorik (Netra)";
    case "disabilitas_rungu":
      return "Sensorik (Rungu)";
    case "disabilitas_wicara":
      return "Sensorik (Wicara)";
    case "disabilitas_intelektual":
      return "Intelektual";
    case "disabilitas_mental":
      return "Mental";
    default:
      return type;
  }
};

interface EmployeeBpjsCardProps {
  report: any;
  onPreviewFile: (file: any, title: string) => void;
}

export function EmployeeBpjsCard({ report, onPreviewFile }: EmployeeBpjsCardProps) {
  if (!report.employees || report.employees.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-primary" /> Detail Karyawan (<span className="font-mono">{report.employees.length}</span>)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {report.employees.map((emp: any, idx: number) => {
          const empFiles = emp.files || [];
          const empKtp = empFiles.find((f: any) => f.category === "EMPLOYEE_KTP");
          const empBpjs = empFiles.find((f: any) => f.category === "EMPLOYEE_BPJS_CARD");
          const empSalary = empFiles.find((f: any) => f.category === "EMPLOYEE_SALARY_SLIP");

          return (
            <div key={emp.id || idx} className="p-5 border rounded-2xl bg-muted/10 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-muted pb-3">
                <div>
                  <p className="font-bold text-base text-foreground">{emp.name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role} • {formatEmploymentStatus(emp.employmentStatus)}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{emp.gender === "MALE" ? "Laki-laki" : "Perempuan"}</Badge>
                  {emp.hasDisability && <Badge variant="destructive">Disabilitas: {formatDisabilityType(emp.disabilityType)}</Badge>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">NIK</span>
                  <p className="font-semibold text-sm font-mono">{emp.nik}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">BPJS Keanggotaan</span>
                  <p className="font-semibold text-sm">
                    {emp.bpjsStatus === "REGISTERED" ? (
                      <>
                        {formatBpjsType(emp.bpjsType)} (<span className="font-mono">{emp.bpjsNumber || "-"}</span>)
                      </>
                    ) : (
                      "Tidak Terdaftar"
                    )}
                  </p>
                </div>
              </div>
              {/* Employee Files */}
              {(empKtp || empSalary || empBpjs) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-muted/50 w-full">
                  {empKtp && (
                    <div className="space-y-1 w-full">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider block">Foto KTP</span>
                      <button 
                        type="button"
                        onClick={() => onPreviewFile(empKtp, `KTP - ${emp.name}`)}
                        className="block relative w-full h-32 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm cursor-pointer text-left mb-1"
                      >
                        {empKtp.mimeType === "application/pdf" || empKtp.url?.toLowerCase().endsWith(".pdf") ? (
                          <div className="w-full h-full relative">
                            <PdfThumbnail url={empKtp.url} className="w-full h-full object-cover" fallbackIconClassName="size-8" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-foreground text-[10px] font-bold bg-background/90 px-2 py-1 rounded-lg shadow-sm border border-border/50">Lihat PDF</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={normalizeFileUrl(empKtp.url) || undefined} 
                            alt={`KTP ${emp.name}`} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                      {renderOcrStatusAndValidation(empKtp)}
                    </div>
                  )}
                  {empSalary && (
                    <div className="space-y-1 w-full">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider block">Slip Gaji</span>
                      <button 
                        type="button"
                        onClick={() => onPreviewFile(empSalary, `Slip Gaji - ${emp.name}`)}
                        className="block relative w-full h-32 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm cursor-pointer text-left mb-1"
                      >
                        {empSalary.mimeType === "application/pdf" || empSalary.url?.toLowerCase().endsWith(".pdf") ? (
                          <div className="w-full h-full relative">
                            <PdfThumbnail url={empSalary.url} className="w-full h-full object-cover" fallbackIconClassName="size-8" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-foreground text-[10px] font-bold bg-background/90 px-2 py-1 rounded-lg shadow-sm border border-border/50">Lihat PDF</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={normalizeFileUrl(empSalary.url) || undefined} 
                            alt={`Slip Gaji ${emp.name}`} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                      {renderOcrStatusAndValidation(empSalary)}
                    </div>
                  )}
                  {empBpjs && (
                    <div className="space-y-1 w-full">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider block">Kartu BPJS</span>
                      <button 
                        type="button"
                        onClick={() => onPreviewFile(empBpjs, `Kartu BPJS - ${emp.name}`)}
                        className="block relative w-full h-32 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm cursor-pointer text-left mb-1"
                      >
                        {empBpjs.mimeType === "application/pdf" || empBpjs.url?.toLowerCase().endsWith(".pdf") ? (
                          <div className="w-full h-full relative">
                            <PdfThumbnail url={empBpjs.url} className="w-full h-full object-cover" fallbackIconClassName="size-8" />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <span className="text-foreground text-[10px] font-bold bg-background/90 px-2 py-1 rounded-lg shadow-sm border border-border/50">Lihat PDF</span>
                            </div>
                          </div>
                        ) : (
                          <img 
                            src={normalizeFileUrl(empBpjs.url) || undefined} 
                            alt={`BPJS ${emp.name}`} 
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                      {renderOcrStatusAndValidation(empBpjs)}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
