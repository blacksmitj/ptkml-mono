import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { MarketingArea, BookkeepingType, Gender, BpjsStatus, BpjsType } from "@/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/use-app-store"
import { useCreateOutputReport, useUpdateOutputReport, useOutputReports } from "@/hooks/use-output-reports"
import { useApplicant } from "@/hooks/use-applicants"
import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Modular Step Components
import { useFormDraft } from "@/hooks/use-form-draft"
import { PeriodStep } from "./output-report/period-step"
import { BusinessAchievementStep } from "./output-report/business-achievement-step"
import { ConditionBookkeepingStep } from "./output-report/condition-bookkeeping-step"
import { EmployeeDataStep } from "./output-report/employee-data-step"
import { ReviewStep } from "./output-report/review-step"
import { RevisionHistoryTimeline } from "@/components/common/revision-history-timeline"

function normalizeEmploymentStatus(val?: string | null): string {
  if (!val) return "permanen";
  const s = String(val).toLowerCase().trim();
  if (s.includes("lepas") || s.includes("harian") || s.includes("mingguan") || s.includes("kontrak")) {
    return "kontrak";
  }
  if (s.includes("paruh") || s.includes("musiman")) {
    return "paruh_waktu";
  }
  if (s.includes("tidak dibayar") || s.includes("keluarga") || s.includes("tidak_dibayar")) {
    return "tidak_dibayar";
  }
  return "permanen";
}

function normalizeDisabilityType(val?: string | null): string {
  if (!val) return "";
  const s = String(val).toLowerCase().trim();
  if (s.includes("daksa") || s.includes("fisik")) return "disabilitas_daksa";
  if (s.includes("netra") || s.includes("penglihatan") || s.includes("mata")) return "disabilitas_netra";
  if (s.includes("rungu") || s.includes("pendengaran") || s.includes("telinga")) return "disabilitas_rungu";
  if (s.includes("wicara") || s.includes("bicara")) return "disabilitas_wicara";
  if (s.includes("intelektual") || s.includes("grahita")) return "disabilitas_intelektual";
  if (s.includes("mental") || s.includes("psikososial") || s.includes("jiwa")) return "disabilitas_mental";
  return val;
}

const employeeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama wajib diisi"),
  role: z.string().min(1, "Peran wajib diisi"),
  gender: z.nativeEnum(Gender),
  hasDisability: z.boolean(),
  disabilityType: z.string().optional(),
  employmentStatus: z.string().min(1, "Status kepegawaian wajib diisi"),
  nik: z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka"),
  nikVerified: z.boolean().refine(val => val === true, { message: "NIK harus dicek dan diverifikasi terlebih dahulu" }),
  bpjsStatus: z.nativeEnum(BpjsStatus),
  bpjsType: z.nativeEnum(BpjsType).optional().nullable(),
  bpjsNumber: z.string().optional().nullable(),
  files: z.array(z.object({
    id: z.string().optional(),
    key: z.string(),
    url: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    category: z.string(),
  })).optional(),
}).superRefine((data, ctx) => {
  // 1. KTP is required
  const hasKtp = data.files?.some(f => f.category === "EMPLOYEE_KTP");
  if (!hasKtp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Dokumen KTP wajib diunggah",
      path: ["files"],
    });
  }

  // 2. Salary slip is required
  const hasSalary = data.files?.some(f => f.category === "EMPLOYEE_SALARY_SLIP");
  if (!hasSalary) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Slip Gaji wajib diunggah",
      path: ["files"],
    });
  }

  // 3. BPJS Card is required if bpjsStatus is REGISTERED
  if (data.bpjsStatus === BpjsStatus.REGISTERED) {
    const hasBpjsCard = data.files?.some(f => f.category === "EMPLOYEE_BPJS_CARD");
    if (!hasBpjsCard) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kartu BPJS wajib diunggah jika terdaftar",
        path: ["files"],
      });
    }

    if (!data.bpjsType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Jenis BPJS wajib dipilih jika terdaftar",
        path: ["bpjsType"],
      });
    }

    if (!data.bpjsNumber || !/^\d{11}$/.test(data.bpjsNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nomor kartu BPJS wajib diisi dan harus tepat 11 digit angka",
        path: ["bpjsNumber"],
      });
    }
  }

  // 4. Disability type is required if hasDisability is true
  if (data.hasDisability && (!data.disabilityType || data.disabilityType.trim().length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Jenis disabilitas wajib diisi jika karyawan disabilitas",
      path: ["disabilityType"],
    });
  }
})

const getOutputSchema = (isRejected: boolean) => z.object({
  applicantId: z.string().min(1, "Pilih peserta"),
  monthReport: z.number().min(0).max(6),
  productionCapacity: z.number().min(0),
  productionCapacityUnit: z.string().min(1, "Satuan wajib diisi"),
  salesVolume: z.number().min(0),
  salesVolumeUnit: z.string().min(1, "Satuan wajib diisi"),
  marketingArea: z.nativeEnum(MarketingArea),
  revenue: z.number().min(0),
  bookkeepingCashflow: z.nativeEnum(BookkeepingType),
  bookkeepingIncomeStatement: z.nativeEnum(BookkeepingType),
  businessCondition: z.string().optional(),
  obstacle: z.string().optional(),
  hasRemindLpj: z.boolean().refine((val) => val === true, {
    message: "Anda wajib mencentang konfirmasi sudah mengingatkan LPJ",
  }),
  employees: z.array(employeeSchema),
  files: z.array(z.object({
    id: z.string().optional(),
    key: z.string(),
    url: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    category: z.string(),
  })).optional(),
  cashflowProof: z.any().optional(),
  incomeProof: z.any().optional(),
  rebuttalNote: z.string().optional(),
}).superRefine((data, ctx) => {
  // 1. Cashflow Proof: required if bookkeepingCashflow !== NONE
  if (data.bookkeepingCashflow !== BookkeepingType.NONE) {
    const hasCashflow = data.files?.some(f => f.category === "OUTPUT_CASHFLOW_PROOF");
    if (!hasCashflow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bukti arus kas wajib diunggah jika pembukuan kas aktif",
        path: ["cashflowProof"],
      });
    }
  }

  // 2. Income Statement Proof: required if bookkeepingIncomeStatement !== NONE
  if (data.bookkeepingIncomeStatement !== BookkeepingType.NONE) {
    const hasIncome = data.files?.some(f => f.category === "OUTPUT_INCOME_PROOF");
    if (!hasIncome) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bukti catatan laba rugi bulanan wajib diunggah jika pembukuan catatan laba rugi aktif",
        path: ["incomeProof"],
      });
    }
  }

  // 3. Rebuttal note validation if rejected
  if (isRejected && (!data.rebuttalNote || data.rebuttalNote.trim().length < 5)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sanggahan wajib diisi minimal 5 karakter jika laporan ditolak",
      path: ["rebuttalNote"],
    });
  }

  // 4. Duplicate NIK validation
  if (data.employees && data.employees.length > 0) {
    const niks = data.employees.map(e => e.nik);
    const duplicates = niks.filter((nik, index) => niks.indexOf(nik) !== index);
    if (duplicates.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NIK karyawan tidak boleh duplikat",
        path: ["employees"],
      });
    }
  }
})

type OutputFormValues = z.infer<ReturnType<typeof getOutputSchema>>

const DRAFT_KEY = "draft_output_report";

const hasFormData = (values: any) => {
  if (!values) return false;
  return (
    (values.applicantId && values.applicantId !== "") ||
    (values.obstacle && values.obstacle.trim() !== "") ||
    (values.rebuttalNote && values.rebuttalNote.trim() !== "") ||
    (values.productionCapacity && values.productionCapacity > 0) ||
    (values.salesVolume && values.salesVolume > 0) ||
    (values.revenue && values.revenue > 0) ||
    (values.employees && values.employees.length > 0) ||
    (values.files && values.files.length > 0)
  );
};

export function OutputReportForm({ 
  initialData, 
  applicants = [] 
}: { 
  initialData?: any, 
  applicants?: { id: string, name: string }[] 
}) {
  const router = useRouter()
  const isRejected = initialData?.verificationStatus === "REJECTED"
  
  const methods = useForm<OutputFormValues>({
    resolver: zodResolver(getOutputSchema(isRejected)),
    defaultValues: {
      applicantId: initialData?.applicantId || "",
      monthReport: initialData?.monthReport !== undefined ? initialData.monthReport : 0,
      productionCapacity: initialData?.productionCapacity || 0,
      productionCapacityUnit: initialData?.productionCapacityUnit || "Pcs",
      salesVolume: initialData?.salesVolume || 0,
      salesVolumeUnit: initialData?.salesVolumeUnit || "Pcs",
      marketingArea: initialData?.marketingArea || MarketingArea.DISTRICT,
      revenue: initialData?.revenue || 0,
      bookkeepingCashflow: initialData?.bookkeepingCashflow || BookkeepingType.MANUAL,
      bookkeepingIncomeStatement: initialData?.bookkeepingIncomeStatement || BookkeepingType.MANUAL,
      businessCondition: initialData?.businessCondition || "",
      obstacle: initialData?.obstacle || "",
      employees: initialData?.employees?.map((emp: any) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        gender: emp.gender,
        hasDisability: !!emp.hasDisability,
        disabilityType: normalizeDisabilityType(emp.disabilityType),
        employmentStatus: normalizeEmploymentStatus(emp.employmentStatus),
        nik: emp.nik,
        nikVerified: true,
        bpjsStatus: emp.bpjsStatus,
        bpjsType: emp.bpjsType || null,
        bpjsNumber: emp.bpjsNumber || "",
        files: emp.files?.map((f: any) => ({
          id: f.id,
          key: f.id || f.key || f.url || "",
          url: f.url,
          name: f.name || (f.url ? f.url.split('/').pop() : "") || "File",
          size: f.size || 0,
          type: f.type || "image/jpeg",
          category: f.category,
        })) || [],
      })) || [],
      files: initialData?.files?.map((f: any) => ({
        id: f.id,
        key: f.id || f.key || f.url || "",
        url: f.url,
        name: f.name || (f.url ? f.url.split('/').pop() : "") || "File",
        size: f.size || 0,
        type: f.type || "image/jpeg",
        category: f.category,
      })) || [],
      hasRemindLpj: !!initialData?.hasRemindLpj,
      rebuttalNote: initialData?.rebuttalNote || "",
    },
  })

  const { mutateAsync: createOutput, isPending: isCreating } = useCreateOutputReport();
  const { mutateAsync: updateOutput, isPending: isUpdating } = useUpdateOutputReport();
  const isPending = isCreating || isUpdating;
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  const {
    showRestoreDialog,
    setShowRestoreDialog,
    disableDraftRef,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormDraft({
    key: DRAFT_KEY,
    methods,
    hasFormData,
    skip: !!initialData?.id,
    onRestore: (data) => methods.reset(data),
  });

  const watchApplicantId = methods.watch("applicantId")
  const watchMonthReport = methods.watch("monthReport")
  const watchRevenue = methods.watch("revenue") ?? 0;
  const [showBaselineInfo, setShowBaselineInfo] = useState(false);
  const { data: applicantDetail } = useApplicant(watchApplicantId);
  const { data: reports } = useOutputReports(currentWorkspaceId || undefined);

  const [targetDraftReportId, setTargetDraftReportId] = useState<string | null>(null);

  // Sync form data when editing existing report
  useEffect(() => {
    if (initialData?.id) {
      methods.reset({
        applicantId: initialData.applicantId || "",
        monthReport: initialData.monthReport !== undefined ? initialData.monthReport : 0,
        productionCapacity: initialData.productionCapacity || 0,
        productionCapacityUnit: initialData.productionCapacityUnit || "Pcs",
        salesVolume: initialData.salesVolume || 0,
        salesVolumeUnit: initialData.salesVolumeUnit || "Pcs",
        marketingArea: initialData.marketingArea || MarketingArea.DISTRICT,
        revenue: initialData.revenue || 0,
        bookkeepingCashflow: initialData.bookkeepingCashflow || BookkeepingType.MANUAL,
        bookkeepingIncomeStatement: initialData.bookkeepingIncomeStatement || BookkeepingType.MANUAL,
        businessCondition: initialData.businessCondition || "",
        obstacle: initialData.obstacle || "",
        employees: initialData.employees?.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          role: emp.role,
          gender: emp.gender,
          hasDisability: emp.hasDisability,
          disabilityType: emp.disabilityType || "",
          employmentStatus: emp.employmentStatus,
          nik: emp.nik,
          nikVerified: true,
          bpjsStatus: emp.bpjsStatus,
          bpjsType: emp.bpjsType || null,
          bpjsNumber: emp.bpjsNumber || "",
          files: emp.files?.map((f: any) => ({
            id: f.id,
            key: f.id || f.key || f.url || "",
            url: f.url,
            name: f.name || (f.url ? f.url.split('/').pop() : "") || "File",
            size: f.size || 0,
            type: f.type || "image/jpeg",
            category: f.category,
          })) || [],
        })) || [],
        files: initialData.files?.map((f: any) => ({
          id: f.id,
          key: f.id || f.key || f.url || "",
          url: f.url,
          name: f.name || (f.url ? f.url.split('/').pop() : "") || "File",
          size: f.size || 0,
          type: f.type || "image/jpeg",
          category: f.category,
        })) || [],
        hasRemindLpj: Boolean(initialData.hasRemindLpj),
        rebuttalNote: initialData.rebuttalNote || "",
      });
    }
  }, [initialData?.id]);

  // Auto-calculate businessCondition based on revenue comparison
  useEffect(() => {
    if (Number(watchMonthReport) === 0) {
      methods.setValue("businessCondition", "stabil");
      return;
    }

    if (!watchApplicantId || !reports) return;

    const prevMonth = Number(watchMonthReport) - 1;
    const prevReport = reports.find(
      (r: any) => r.applicantId === watchApplicantId && Number(r.monthReport) === prevMonth && r.id !== initialData?.id
    );

    if (prevReport) {
      const prevRevenue = prevReport.revenue ?? 0;
      if (watchRevenue > prevRevenue) {
        methods.setValue("businessCondition", "meningkat");
      } else if (watchRevenue < prevRevenue) {
        methods.setValue("businessCondition", "turun");
      } else {
        methods.setValue("businessCondition", "stabil");
      }
    } else {
      methods.setValue("businessCondition", "stabil");
    }
  }, [watchApplicantId, watchMonthReport, watchRevenue, reports, initialData, methods]);

  // Auto-fill directly from existing OutputReport Month 0 & Employee table when Month 0 is chosen
  useEffect(() => {
    if (initialData?.id) return;
    if (Number(watchMonthReport) !== 0) {
      setTargetDraftReportId(null);
      setShowBaselineInfo(false);
      return;
    }
    if (!watchApplicantId || !applicantDetail) return;

    // Cari laporan bulan 0 dari tabel OutputReport milik peserta
    const existingMonth0 = (applicantDetail as any)?.outputReports?.find(
      (r: any) => Number(r.monthReport) === 0
    );

    if (existingMonth0) {
      setTargetDraftReportId(existingMonth0.id);

      // Auto-fill metrik bisnis langsung dari tabel OutputReport
      if (existingMonth0.revenue !== undefined && existingMonth0.revenue !== null) {
        methods.setValue("revenue", existingMonth0.revenue);
      }
      if (existingMonth0.productionCapacity !== undefined && existingMonth0.productionCapacity !== null) {
        methods.setValue("productionCapacity", existingMonth0.productionCapacity);
      }
      if (existingMonth0.productionCapacityUnit) {
        methods.setValue("productionCapacityUnit", existingMonth0.productionCapacityUnit);
      }
      if (existingMonth0.salesVolume !== undefined && existingMonth0.salesVolume !== null) {
        methods.setValue("salesVolume", existingMonth0.salesVolume);
      }
      if (existingMonth0.salesVolumeUnit) {
        methods.setValue("salesVolumeUnit", existingMonth0.salesVolumeUnit);
      }
      if (existingMonth0.marketingArea) {
        methods.setValue("marketingArea", existingMonth0.marketingArea);
      }
      if (existingMonth0.bookkeepingCashflow) {
        methods.setValue("bookkeepingCashflow", existingMonth0.bookkeepingCashflow);
      }
      if (existingMonth0.bookkeepingIncomeStatement) {
        methods.setValue("bookkeepingIncomeStatement", existingMonth0.bookkeepingIncomeStatement);
      }
      if (existingMonth0.businessCondition) {
        methods.setValue("businessCondition", existingMonth0.businessCondition);
      }

      // Auto-fill karyawan langsung dari relasi Employee tabel (dengan Employee.id asli)
      const reportEmployees: any[] = existingMonth0.employees || [];
      if (reportEmployees.length > 0) {
        const mappedEmployees = reportEmployees.map((emp: any) => ({
          id: emp.id,
          name: emp.name || "",
          role: emp.role || "anggota",
          gender: emp.gender || Gender.MALE,
          hasDisability: !!emp.hasDisability,
          disabilityType: normalizeDisabilityType(emp.disabilityType),
          employmentStatus: normalizeEmploymentStatus(emp.employmentStatus),
          nik: emp.nik || "",
          nikVerified: true,
          bpjsStatus: emp.bpjsStatus || BpjsStatus.NOT_REGISTERED,
          bpjsType: emp.bpjsType || null,
          bpjsNumber: emp.bpjsNumber || "",
          files: emp.files?.map((f: any) => ({
            id: f.id,
            key: f.id || f.key || f.url || "",
            url: f.url,
            name: f.name || (f.url ? f.url.split('/').pop() : "") || "File",
            size: f.size || 0,
            type: f.type || "image/jpeg",
            category: f.category,
          })) || [],
        }));
        methods.setValue("employees", mappedEmployees, { shouldDirty: false });
      }

      setShowBaselineInfo(reportEmployees.length > 0 || !!existingMonth0.revenue);
    } else {
      setTargetDraftReportId(null);
      setShowBaselineInfo(false);
    }
  }, [watchApplicantId, watchMonthReport, applicantDetail, initialData, methods]);

  const onSubmit = async (data: OutputFormValues) => {
    if (!currentWorkspaceId) {
      toast.error("Workspace tidak ditemukan");
      return;
    }

    disableDraftRef.current = true;

    const reportIdToUpdate = initialData?.id || targetDraftReportId;

    try {
      if (reportIdToUpdate) {
        await updateOutput({
          id: reportIdToUpdate,
          ...data,
          workspaceId: currentWorkspaceId,
        });
        toast.success("Laporan output berhasil disimpan");
        clearDraft();
        router.push(`/output-reports/${reportIdToUpdate}`);
      } else {
        await createOutput({
          ...data,
          workspaceId: currentWorkspaceId,
        });
        toast.success("Laporan output berhasil disimpan");
        clearDraft();
        router.push("/output-reports");
      }
    } catch (error: any) {
      disableDraftRef.current = false;
      toast.error(error.message || (reportIdToUpdate ? "Gagal mengubah laporan" : "Gagal menyimpan laporan"));
    }
  }

  const showFormDetails = !!watchApplicantId && watchMonthReport !== undefined && watchMonthReport !== null && watchMonthReport >= 0

  // Auto-scroll to first error element on validation failure
  const { isSubmitted, submitCount, errors: formErrors } = methods.formState;
  useEffect(() => {
    if (Object.keys(formErrors).length > 0) {
      // Find all elements with name matching registered field names that have errors
      const errorKeys = Object.keys(formErrors);
      
      // Let's search for input/select/textarea elements that have name attributes or custom classes/attributes
      for (const key of errorKeys) {
        // Try selector by name (standard inputs)
        let element = document.getElementsByName(key)[0];
        
        // If not found, try nested name selectors (like for array fields or nested objects)
        if (!element) {
          element = document.querySelector(`[name^="${key}"]`) as HTMLElement;
        }

        // Fallback: search for elements with error/invalid styling classes or attributes
        if (!element) {
          element = document.querySelector('[data-slot="field-error"]') as HTMLElement;
        }

        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          // If it's a focusable input, focus it
          if (typeof element.focus === "function") {
            element.focus({ preventScroll: true });
          }
          break; // Scroll to the first error only
        }
      }
    }
  }, [formErrors, submitCount, isSubmitted]);

  return (
    <FormProvider {...methods}>
      <div className="w-full py-6 max-w-4xl mx-auto">
        <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pulihkan Draft Capaian Output?</AlertDialogTitle>
              <AlertDialogDescription>
                Kami menemukan draft pengisian laporan capaian output sebelumnya yang belum disimpan. Apakah Anda ingin memulihkannya?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={discardDraft}>
                Mulai Baru
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                restoreDraft();
                toast.success("Draft capaian output berhasil dipulihkan");
              }}>
                Pulihkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          {showBaselineInfo && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/35 text-sm text-blue-900 dark:text-blue-200">
              <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold">Informasi Data Awal (Draft)</p>
                <p className="text-muted-foreground mt-0.5">
                  Form ini telah diisi otomatis menggunakan <strong>data awal</strong> hasil import peserta dan karyawan.
                  Silakan periksa kembali dan lengkapi berkas wajib (KTP & Slip Gaji) untuk karyawan sebelum menyimpan.
                </p>
              </div>
            </div>
          )}
          {isRejected && (
            <Card className="border-destructive/20 bg-destructive/5/20 p-4 space-y-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-destructive leading-none">Sanggahan / Catatan Revisi</h4>
                  <p className="text-xs text-destructive/80 leading-normal">
                    Laporan ini memerlukan perbaikan. Silakan tinjau riwayat catatan penolakan dan tuliskan sanggahan/penjelasan revisi Anda di bawah ini.
                  </p>
                </div>
              </div>

              {/* Revision History Timeline */}
              {(initialData?.verificationHistory?.length || initialData?.verificationNote) && (
                <div className="p-3 bg-background/80 rounded-xl border border-border/60">
                  <RevisionHistoryTimeline
                    history={initialData?.verificationHistory}
                    currentVerificationNote={initialData?.verificationNote}
                    currentRebuttalNote={initialData?.rebuttalNote}
                  />
                </div>
              )}

              <div>
                <textarea
                  {...methods.register("rebuttalNote")}
                  className="w-full min-h-20 p-2.5 text-xs rounded-md border bg-background border-destructive/20 focus:border-destructive focus:ring-1 focus:ring-destructive outline-none"
                  placeholder="Tulis penjelasan atau sanggahan revisi di sini..."
                />
                {methods.formState.errors.rebuttalNote && (
                  <p className="text-[11px] text-destructive mt-1 font-semibold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {(methods.formState.errors.rebuttalNote as any).message}
                  </p>
                )}
              </div>
            </Card>
          )}

          <PeriodStep applicants={applicants} isEdit={!!initialData?.id} initialData={initialData} />

          {showFormDetails && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <BusinessAchievementStep />
              <ConditionBookkeepingStep />
              <EmployeeDataStep isEdit={!!initialData?.id} />
              <ReviewStep applicants={applicants} initialData={initialData} />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3 pt-6 border-t">
                <Button variant="outline" type="button" onClick={() => router.back()} className="w-full sm:w-auto rounded-full px-6">
                  Batal
                </Button>
                <Button 
                  type="submit"
                  disabled={isPending}
                  className="w-full sm:w-auto min-w-35 rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                >
                  {isPending ? "Menyimpan..." : initialData?.id ? "Simpan Perubahan" : "Simpan Laporan"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </FormProvider>
  )
}
