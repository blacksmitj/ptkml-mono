"use client";

import * as React from "react";
import { VerificationStatus, DeliveryMethod, MeetingType, VisitType } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, Users, BookOpen, MessageSquare, AlertCircle, Lightbulb } from "lucide-react";

import { renderOcrStatusAndValidation } from "@/components/output-reports/ocr-status-helper";
import { PdfThumbnail } from "@/components/ui/pdf-thumbnail";
import { RupiahDisplay } from "@/components/ui/rupiah-display";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface LogbookDetailCardProps {
  logbook: any;
  onPreviewFile: (file: any, title: string) => void;
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

export function LogbookDetailCard({ logbook, onPreviewFile }: LogbookDetailCardProps) {
  const expenseFile = logbook.files?.find((f: any) => f.category === "EXPENSE_PROOF");
  const documentationFile = logbook.files?.find((f: any) => f.category === "LOGBOOK_DOCUMENTATION");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="size-5 text-primary" /> {logbook.mentoringMaterial}
          </CardTitle>
          <CardDescription>Rincian kegiatan pendampingan yang telah dilaksanakan.</CardDescription>
        </div>
        <Badge variant={logbook.verificationStatus === VerificationStatus.APPROVED ? "default" : "outline"}>
          {logbook.verificationStatus}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <InfoItem icon={<Calendar className="size-4" />} label="Tanggal" value={<span className="font-mono">{new Date(logbook.logbookDate).toLocaleDateString("id-ID")}</span>} />
          <InfoItem 
            icon={<Clock className="size-4" />} 
            label="Waktu" 
            value={<span className="font-mono">{`${new Date(logbook.startTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} - ${new Date(logbook.endTime).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}`}</span>} 
          />
          <InfoItem icon={<MapPin className="size-4" />} label="Metode" value={logbook.deliveryMethod === DeliveryMethod.OFFLINE ? "Luring (Offline)" : "Daring (Online)"} />
          <InfoItem icon={<Users className="size-4" />} label="Tipe" value={logbook.meetingType === MeetingType.INDIVIDUAL ? "Individu" : "Kelompok"} />
          {logbook.meetingType === MeetingType.GROUP ? (
            <InfoItem icon={<Clock className="size-4" />} label="JPL" value={<span><span className="font-mono">{logbook.jpl ?? 0}</span> JPL</span>} />
          ) : logbook.deliveryMethod === DeliveryMethod.OFFLINE && logbook.visitType !== VisitType.NONE ? (
            <InfoItem icon={<MapPin className="size-4" />} label="Kunjungan" value={logbook.visitType === VisitType.LOCAL ? "Lokal" : "Luar Kota"} />
          ) : (
            <InfoItem icon={<MapPin className="size-4" />} label="Kunjungan" value="-" />
          )}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" /> Ringkasan Kegiatan
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/30 rounded-lg border italic">
              "{logbook.activitySummary}"
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 border rounded-xl space-y-2 bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/50">
              <p className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertCircle className="size-4" /> Kendala
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{logbook.obstacle}</p>
            </div>
            <div className="p-4 border rounded-xl space-y-2 bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/50">
              <p className="text-sm font-semibold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <Lightbulb className="size-4" /> Solusi
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{logbook.solutions}</p>
            </div>
          </div>

          <Separator />

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Expense Section */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <span className="text-primary font-extrabold text-base">Rp</span> Biaya Operasional
              </p>
              <div className="p-4 border rounded-xl space-y-3 bg-muted/20">
                <RupiahDisplay
                  value={logbook.totalExpense}
                  className="text-2xl font-black text-primary block"
                />
                {(!logbook.totalExpense || logbook.totalExpense === 0) && logbook.reasonNoExpense && (
                  <p className="text-xs text-muted-foreground italic">
                    Alasan tanpa biaya: {logbook.reasonNoExpense}
                  </p>
                )}
                {expenseFile && (
                  <div className="space-y-1.5 pt-2 border-t border-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Bukti Kuitansi / Biaya</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => onPreviewFile(expenseFile, "Bukti Kuitansi / Biaya")}
                      className="block relative w-full h-40 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm cursor-zoom-in text-left mb-1"
                    >
                      {expenseFile.mimeType === "application/pdf" || expenseFile.url?.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full relative">
                          <PdfThumbnail url={expenseFile.url} className="w-full h-full object-cover" fallbackIconClassName="size-10" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-foreground text-xs font-bold bg-background/90 px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                              Lihat PDF
                            </span>
                          </div>
                        </div>
                      ) : (
                        normalizeFileUrl(expenseFile.url) ? (
                          <img 
                            src={normalizeFileUrl(expenseFile.url)} 
                            alt="Bukti Kuitansi" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                            Berkas bukti tidak ditemukan atau kosong
                          </div>
                        )
                      )}
                    </button>
                    {renderOcrStatusAndValidation(expenseFile)}
                  </div>
                )}
              </div>
            </div>

            {/* Documentation Section */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" /> Dokumentasi Kegiatan
              </p>
              <div className="p-4 border rounded-xl space-y-3 bg-muted/20 flex flex-col justify-between min-h-30">
                {documentationFile ? (
                  <div className="space-y-1.5 w-full">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Foto Dokumentasi</span>
                    <button 
                      type="button"
                      onClick={() => onPreviewFile(documentationFile, "Foto Dokumentasi Kegiatan")}
                      className="block relative w-full h-40 rounded-lg overflow-hidden border border-muted hover:opacity-90 transition-opacity shadow-sm cursor-zoom-in text-left"
                    >
                      {documentationFile.mimeType === "application/pdf" || documentationFile.url?.toLowerCase().endsWith(".pdf") ? (
                        <div className="w-full h-full relative">
                          <PdfThumbnail url={documentationFile.url} className="w-full h-full object-cover" fallbackIconClassName="size-10" />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-foreground text-xs font-bold bg-background/90 px-3 py-1.5 rounded-lg shadow-sm border border-border/50">
                              Lihat PDF
                            </span>
                          </div>
                        </div>
                      ) : (
                        normalizeFileUrl(documentationFile.url) ? (
                          <img 
                            src={normalizeFileUrl(documentationFile.url)} 
                            alt="Foto Dokumentasi" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-xs">
                            Berkas dokumentasi tidak ditemukan atau kosong
                          </div>
                        )
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Tidak ada foto dokumentasi yang diunggah.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
