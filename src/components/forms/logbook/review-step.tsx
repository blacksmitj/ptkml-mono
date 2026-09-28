import { useFormContext } from "react-hook-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Info,
  DollarSign,
  BookOpen,
  AlertCircle,
} from "lucide-react";
import { RupiahDisplay } from "@/components/ui/rupiah-display";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { DeliveryMethod, MeetingType, VisitType } from "@/types";
import { RevisionHistoryTimeline } from "@/components/common/revision-history-timeline";

export function ReviewStep({
  applicants,
  initialData,
}: {
  applicants: { id: string; name: string }[];
  initialData?: any;
}) {
  const { getValues, register, formState } = useFormContext();
  const errors = formState.errors;
  const values = getValues();
  const files = values.files || [];
  const isRejected = initialData?.verificationStatus === "REJECTED";

  const selectedApplicants = applicants
    .filter((a) => values.applicants?.includes(a.id))
    .map((a) => a.name);

  const docFile = files.find(
    (f: any) => f.category === "LOGBOOK_DOCUMENTATION",
  );
  const expenseFile = files.find((f: any) => f.category === "EXPENSE_PROOF");

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      {isRejected && (
        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden shadow-md space-y-4">
          <CardHeader className="bg-destructive/10 px-6 py-4 border-b border-destructive/10">
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" /> Sanggahan / Catatan Revisi
            </CardTitle>
            <CardDescription className="text-destructive/80 font-medium">
              Logbook ini memerlukan perbaikan. Silakan tinjau riwayat catatan penolakan dan tuliskan sanggahan atau penjelasan revisi Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {(initialData?.verificationHistory?.length || initialData?.verificationNote) && (
              <div className="p-3 bg-background/80 rounded-xl border border-border/60">
                <RevisionHistoryTimeline
                  history={initialData?.verificationHistory}
                  currentVerificationNote={initialData?.verificationNote}
                  currentRebuttalNote={initialData?.rebuttalNote}
                />
              </div>
            )}
            <textarea
              {...register("rebuttalNote")}
              className="w-full min-h-25 p-3 text-sm rounded-lg border bg-background border-destructive/20 focus:border-destructive focus:ring-1 focus:ring-destructive outline-none"
              placeholder="Tulis sanggahan atau penjelasan revisi di sini..."
            />
            {errors.rebuttalNote && (
              <p className="text-xs text-destructive mt-1 font-semibold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{" "}
                {(errors.rebuttalNote as any).message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/20 overflow-hidden shadow-md">
        <div className="bg-primary/5 px-6 py-4 border-b border-primary/10 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-primary">
              Review Input Logbook
            </h3>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Pastikan data yang diinput sudah benar
            </p>
          </div>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 px-3 py-1"
          >
            Langkah Akhir
          </Badge>
        </div>

        <CardContent className="p-0">
          {/* Section 1: Basic Info */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tight">
              <Info className="h-4 w-4 text-primary" />
              Informasi Dasar & Waktu
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                  Tanggal Kegiatan
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-bold text-base">
                    {values.logbookDate || "-"}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                  Durasi Waktu
                </span>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-muted rounded-lg">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-bold text-base">
                    {values.startTime} — {values.endTime}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                  Metode & Kunjungan
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-none px-2.5"
                  >
                    {values.deliveryMethod === DeliveryMethod.OFFLINE
                      ? "Luring (Offline)"
                      : "Daring (Online)"}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-none px-2.5"
                  >
                    {values.meetingType === MeetingType.INDIVIDUAL
                      ? "Individu"
                      : "Kelompok"}
                  </Badge>
                  {values.deliveryMethod === DeliveryMethod.OFFLINE &&
                    values.meetingType === MeetingType.INDIVIDUAL &&
                    values.visitType &&
                    values.visitType !== VisitType.NONE && (
                      <Badge
                        variant="secondary"
                        className="bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border-none px-2.5"
                      >
                        {values.visitType === VisitType.LOCAL
                          ? "Lokal"
                          : "Luar Kota"}
                      </Badge>
                    )}
                  {values.meetingType === MeetingType.GROUP &&
                    values.jpl > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none px-2.5"
                      >
                        {values.jpl} JPL
                      </Badge>
                    )}
                </div>
              </div>
            </div>
          </div>

          <Separator className="bg-muted/50" />

          {/* Section 2: Participants */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tight">
              <Users className="h-4 w-4 text-primary" />
              Peserta Terpilih ({selectedApplicants.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedApplicants.length > 0 ? (
                selectedApplicants.map((name, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="bg-muted/50 text-foreground border-muted px-3 py-1"
                  >
                    {name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-destructive font-medium italic">
                  Belum ada peserta terpilih
                </p>
              )}
            </div>
          </div>

          <Separator className="bg-muted/50" />

          {/* Section 3: Content */}
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tight">
              <BookOpen className="h-4 w-4 text-primary" />
              Materi & Aktivitas
            </div>
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                  Materi Pendampingan
                </span>
                <p className="text-xl font-bold text-foreground leading-snug">
                  {values.mentoringMaterial || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                  Ringkasan Aktivitas
                </span>
                <p className="text-sm text-muted-foreground leading-relaxed p-4 bg-muted/30 rounded-xl border border-muted/50 whitespace-pre-wrap min-h-25">
                  {values.activitySummary || "-"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Kendala
                  </span>
                  <p className="text-sm text-foreground">
                    {values.obstacle || "-"}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Solusi
                  </span>
                  <p className="text-sm text-foreground">
                    {values.solutions || "-"}
                  </p>
                </div>
              </div>

              {docFile && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Foto Dokumentasi Kegiatan
                  </span>
                  <div className="relative w-50 h-30 rounded-lg overflow-hidden border border-muted mt-1 shadow-sm">
                    <img
                      src={normalizeFileUrl(docFile.url)}
                      alt="Dokumentasi Kegiatan"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-muted/50" />

          {/* Section 4: Expense */}
          <div className="p-6 bg-primary/2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground uppercase tracking-tight">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Biaya Operasional
                </div>
                <RupiahDisplay
                  value={values.totalExpense}
                  className="text-3xl font-black text-primary tracking-tighter"
                />
              </div>

              {expenseFile && values.totalExpense > 0 && (
                <div className="space-y-1.5 md:justify-self-end">
                  <span className="text-[10px] uppercase font-black text-muted-foreground/60 tracking-widest">
                    Bukti Kuitansi/Biaya
                  </span>
                  <div className="relative w-50 h-30 rounded-lg overflow-hidden border border-muted mt-1 shadow-sm">
                    <img
                      src={normalizeFileUrl(expenseFile.url)}
                      alt="Bukti Kuitansi"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {(!values.totalExpense || values.totalExpense === 0) && (
                <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                      Alasan Tanpa Biaya
                    </span>
                    <p className="text-sm text-amber-800 font-medium">
                      {values.reasonNoExpense || "-"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
        <div className="p-2 bg-primary/10 rounded-full">
          <Info className="h-5 w-5 text-primary" />
        </div>
        <p className="text-sm text-primary/80 font-medium">
          Klik tombol <strong>Simpan Logbook</strong> untuk mengirim laporan ini
          ke sistem.
        </p>
      </div>
    </div>
  );
}
