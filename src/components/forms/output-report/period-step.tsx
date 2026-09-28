import { useMemo, useState } from "react"
import { useFormContext, useWatch } from "react-hook-form"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, Circle, Info, Edit3, Check, Scale, Lock, Search, User, UserCheck, ArrowRight, RotateCcw, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAppStore } from "@/store/use-app-store"
import { useOutputReports } from "@/hooks/use-output-reports"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"

export function PeriodStep({ 
  applicants = [], 
  isEdit = false,
  initialData
}: { 
  applicants?: { id: string, name: string }[], 
  isEdit?: boolean,
  initialData?: any
}) {
  const { control, setValue, formState } = useFormContext()
  const errors = formState.errors
  
  const watchApplicantId = useWatch({ control, name: "applicantId" }) ?? ""
  const watchMonthReport = useWatch({ control, name: "monthReport" }) ?? 0
  const watchProductionUnit = useWatch({ control, name: "productionCapacityUnit" }) ?? "Pcs"
  const [isUnitLocked, setIsUnitLocked] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const handleUnitChange = (val: string) => {
    setValue("productionCapacityUnit", val)
    setValue("salesVolumeUnit", val)
  }

  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: reports } = useOutputReports(currentWorkspaceId || undefined);

  const months = [
    { value: 0, label: "Data Awal" },
    { value: 1, label: "Bulan 1" },
    { value: 2, label: "Bulan 2" },
    { value: 3, label: "Bulan 3" },
  ];

  // Helper to compute month status for any applicant
  const getApplicantMonthStatus = (applicantId: string) => {
    const applicantReports = reports ? reports.filter((r: any) => r.applicantId === applicantId) : [];
    
    return months.map(m => {
      // Is this month currently being edited?
      const isCurrentlyEditing = isEdit && initialData?.monthReport === m.value && watchApplicantId === applicantId;
      
      // Has a report already been submitted for this month (excluding the one being edited)?
      const existingReport = applicantReports.find(
        (r: any) => r.monthReport === m.value && r.id !== initialData?.id
      );

      // Is it locked? (m > 0 and previous month is not submitted/completed or still DRAFT)
      const prevReport = applicantReports.find(
        (r: any) => r.monthReport === m.value - 1 || (isEdit && initialData?.monthReport === m.value - 1 && watchApplicantId === applicantId)
      );
      // Bulan N hanya terbuka jika bulan N-1 ada DAN statusnya BUKAN DRAFT
      const previousSubmitted = m.value === 0 || (!!prevReport && prevReport.verificationStatus !== "DRAFT");
      const isLocked = !previousSubmitted && !isCurrentlyEditing && !existingReport;

      let status: "approved" | "pending" | "rejected" | "draft" | "locked" | "available" = "available";
      
      if (existingReport) {
        const verStatus = existingReport.verificationStatus;
        if (verStatus === "APPROVED") {
          status = "approved";
        } else if (verStatus === "REJECTED") {
          status = "rejected";
        } else if (verStatus === "DRAFT") {
          status = "draft";
        } else {
          status = "pending";
        }
      } else if (isLocked) {
        status = "locked";
      }

      return {
        ...m,
        status,
        existingReport,
      };
    });
  };

  const handleSelectApplicant = (applicantId: string) => {
    setValue("applicantId", applicantId, { shouldValidate: true });
    
    const statuses = getApplicantMonthStatus(applicantId);
    // Find the first month that can be filled (available or draft), but not locked and not no_employees
    const nextAvailable = statuses.find(s => s.status === "available" || s.status === "draft");
    if (nextAvailable) {
      setValue("monthReport", nextAvailable.value, { shouldValidate: true });
    } else {
      setValue("monthReport", 0, { shouldValidate: true });
    }
  };

  const selectedApplicantName = useMemo(() => {
    return applicants.find(a => a.id === watchApplicantId)?.name || "N/A";
  }, [applicants, watchApplicantId]);

  const filteredApplicants = useMemo(() => {
    if (!searchTerm) return applicants;
    return applicants.filter(app =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [applicants, searchTerm]);

  // Status for the currently selected applicant
  const activeMonthStatus = useMemo(() => {
    if (!watchApplicantId) return [];
    return getApplicantMonthStatus(watchApplicantId);
  }, [reports, watchApplicantId, isEdit, initialData]);

  return (
    <Card className="border border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-muted/10 border-b border-border/50 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl font-black tracking-tight text-foreground">Pilih Peserta & Periode</CardTitle>
            <CardDescription className="text-muted-foreground mt-1">
              {watchApplicantId 
                ? "Sesuaikan periode laporan dan satuan laporan untuk peserta terpilih." 
                : "Pilih salah satu peserta dari tabel di bawah untuk memulai pengisian capaian output."}
            </CardDescription>
          </div>
          {watchApplicantId && !isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setValue("applicantId", "");
                setValue("monthReport", 0);
              }}
              className="rounded-full gap-2 border-dashed"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Ganti Peserta
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Table Selector (shown only if no applicant is selected) */}
        {!watchApplicantId ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 max-w-md bg-background border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="Cari nama peserta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>

            <div className="border rounded-xl overflow-x-auto bg-background">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[80px] font-bold text-center">No</TableHead>
                    <TableHead className="font-bold">Nama Peserta</TableHead>
                    <TableHead className="font-bold text-center">Data Awal</TableHead>
                    <TableHead className="font-bold text-center">Bulan 1</TableHead>
                    <TableHead className="font-bold text-center">Bulan 2</TableHead>
                    <TableHead className="font-bold text-center">Bulan 3</TableHead>
                    <TableHead className="w-[120px] font-bold text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplicants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Tidak ada peserta ditemukan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApplicants.map((app, index) => {
                      const statuses = getApplicantMonthStatus(app.id);
                      return (
                        <TableRow key={app.id} className="hover:bg-muted/20 transition-colors">
                          <TableCell className="text-center font-medium text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-semibold text-foreground">{app.name}</TableCell>
                          {statuses.map((m) => {
                            const isApproved = m.status === "approved";
                            const isPending = m.status === "pending";
                            const isRejected = m.status === "rejected";
                            const isDraft = m.status === "draft";
                            const isLocked = m.status === "locked";
                            const isAvailable = m.status === "available";
                            return (
                              <TableCell key={m.value} className="text-center">
                                {isApproved && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                    <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-500" />
                                    Disetujui
                                  </span>
                                )}
                                {isPending && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20">
                                    <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                                    Pending
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20">
                                    <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                                    Ditolak
                                  </span>
                                )}
                                {isDraft && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                    <Clock className="h-3 w-3 shrink-0 text-indigo-500" />
                                    Draft Data Awal
                                  </span>
                                )}
                                {isAvailable && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full border border-blue-500/20">
                                    <Circle className="h-2 w-2 shrink-0 fill-blue-500 text-blue-500" />
                                    Tersedia
                                  </span>
                                )}
                                {isLocked && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full border opacity-60">
                                    <Lock className="h-3 w-3 shrink-0" />
                                    Terkunci
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-center">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectApplicant(app.id)}
                              className="rounded-full px-4 hover:shadow-md transition-all gap-1.5"
                              title="Pilih peserta ini"
                            >
                              Pilih
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <FieldError errors={[errors.applicantId]} />
          </div>
        ) : (
          /* Selected Applicant View */
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/10">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <UserCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Peserta Terpilih</p>
                <p className="text-lg font-black text-foreground">{selectedApplicantName}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
                <Info className="h-4 w-4" />
                Pilih Bulan Laporan
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activeMonthStatus.map((item) => {
                  const isSelected = watchMonthReport === item.value
                  const isApproved = item.status === "approved"
                  const isPending = item.status === "pending"
                  const isRejected = item.status === "rejected"
                  const isDraft = item.status === "draft"
                  const isLocked = item.status === "locked"
                  const isAvailable = item.status === "available"
                  const isSubmitted = isApproved || isPending || isRejected
                  
                  return (
                    <button
                      key={item.value}
                      type="button"
                      disabled={isEdit || isLocked || isSubmitted}
                      onClick={() => setValue("monthReport", item.value, { shouldValidate: true })}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all h-28 w-full",
                        // Selected state (Active)
                        isSelected && "border-primary bg-primary/5 ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md",
                        // Available state (Belum diisi)
                        isAvailable && !isSelected && "border-muted hover:border-primary/50 bg-background cursor-pointer hover:shadow-sm",
                        // Draft state (Data Awal siap dilengkapi)
                        isDraft && !isSelected && "bg-indigo-500/10 border-indigo-500/35 cursor-pointer text-indigo-800 dark:text-indigo-300 hover:shadow-sm",
                        // Approved state
                        isApproved && !isSelected && "bg-emerald-500/10 border-emerald-500/35 opacity-90 cursor-not-allowed text-emerald-800 dark:text-emerald-300",
                        // Pending state
                        isPending && !isSelected && "bg-amber-500/10 border-amber-500/35 opacity-90 cursor-not-allowed text-amber-800 dark:text-amber-300",
                        // Rejected state
                        isRejected && !isSelected && "bg-rose-500/10 border-rose-500/35 opacity-90 cursor-not-allowed text-rose-800 dark:text-rose-300",
                        // Locked state
                        isLocked && "opacity-40 cursor-not-allowed bg-muted/20 border-dashed border-muted-foreground/30",
                        // Disabled state when editing other months
                        isEdit && !isSelected && "opacity-50 cursor-not-allowed bg-muted/10"
                      )}
                    >
                      <span className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {item.value === 0 ? "Tahap" : "Periode"}
                      </span>
                      <span className={cn(
                        "text-lg font-black mb-1",
                        isSelected ? "text-primary" : "text-foreground",
                        isDraft && !isSelected && "text-indigo-700 dark:text-indigo-400",
                        isApproved && !isSelected && "text-emerald-700 dark:text-emerald-400",
                        isPending && !isSelected && "text-amber-700 dark:text-amber-400",
                        isRejected && !isSelected && "text-rose-700 dark:text-rose-400",
                        isLocked && "text-muted-foreground/50"
                      )}>
                        {item.label}
                      </span>

                      <div className="mt-1">
                        {isSelected && (
                          <span className="text-[9px] font-semibold bg-primary text-primary-foreground px-2 py-0.5 rounded-full animate-pulse">
                            Aktif
                          </span>
                        )}
                        {isDraft && !isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold bg-indigo-500 text-white px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> Draft
                          </span>
                        )}
                        {isApproved && !isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="h-3 w-3" /> Disetujui
                          </span>
                        )}
                        {isPending && !isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold bg-amber-500 text-white px-2 py-0.5 rounded-full">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                        {isRejected && !isSelected && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold bg-rose-500 text-white px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" /> Ditolak
                          </span>
                        )}
                        {isLocked && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border">
                            <Lock className="h-3 w-3" /> Terkunci
                          </span>
                        )}
                        {isAvailable && !isSelected && (
                          <span className="text-[9px] font-semibold bg-background text-muted-foreground px-2 py-0.5 rounded-full border">
                            Tersedia
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
              <FieldError errors={[errors.monthReport]} />
              
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" /> Aktif / Dipilih
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Disetujui
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Ditolak
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full border border-muted bg-background" /> Tersedia
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-semibold">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted border border-dashed border-muted-foreground/30" /> Terkunci
                </div>
              </div>
            </div>
          </div>
        )}

        {watchApplicantId && watchMonthReport >= 0 && (
          <div className="pt-6 border-t border-border/50 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Scale className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Satuan Laporan</p>
                    <p className="text-2xl font-black text-foreground">{watchProductionUnit}</p>
                  </div>
                </div>
                
                <Button 
                  type="button"
                  variant={isUnitLocked ? "outline" : "default"}
                  onClick={() => setIsUnitLocked(!isUnitLocked)}
                  className={cn(
                    "rounded-full px-6 transition-all duration-300",
                    !isUnitLocked && "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                  )}
                >
                  {isUnitLocked ? (
                    <><Edit3 className="mr-2 h-4 w-4" /> Ubah Satuan</>
                  ) : (
                    <><Check className="mr-2 h-4 w-4" /> Simpan Satuan</>
                  )}
                </Button>
              </div>

              {!isUnitLocked && (
                <div className="mt-6 pt-6 border-t border-border/50 animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-sm text-muted-foreground mb-4">
                    Tentukan satuan yang akan digunakan untuk Kapasitas Produksi dan Volume Penjualan.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      "Pcs", "Box", "Kg", "Liter", "Meter", "Unit",
                      "Gram", "Ton", "Kwintal", "Ml", "Galon",
                      "Cm", "m2", "m3", "Rupiah", "Buah", "Butir",
                      "Ekor", "Lusin", "Kodi", "Rim", "Pack", "Dus",
                      "Karung", "Bal", "Set", "Pasang", "Roll",
                      "Porsi", "Project"
                    ].map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => handleUnitChange(unit)}
                        className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all",
                          watchProductionUnit === unit 
                            ? "bg-primary text-primary-foreground shadow-md" 
                            : "bg-background border hover:border-primary/50"
                        )}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Input 
                      placeholder="Atau ketik satuan kustom..." 
                      value={watchProductionUnit}
                      onChange={(e) => handleUnitChange(e.target.value)}
                      className="max-w-xs rounded-xl bg-background"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-3 italic">
                    * Satuan ini akan otomatis diterapkan pada seluruh isian di tahap Capaian Bisnis.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

