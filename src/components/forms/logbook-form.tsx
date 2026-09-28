import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { DeliveryMethod, MeetingType, VisitType } from "@/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/use-app-store"
import { useCreateLogbook, useUpdateLogbook } from "@/hooks/use-logbooks"
import { useMe } from "@/hooks/use-me"
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
import { BasicInfoStep } from "./logbook/basic-info-step"
import { ParticipantsStep } from "./logbook/participants-step"
import { ActivityDetailStep } from "./logbook/activity-detail-step"
import { ExpenseStep } from "./logbook/expense-step"
import { useFormDraft } from "@/hooks/use-form-draft"
import { RevisionHistoryTimeline } from "@/components/common/revision-history-timeline"
import {
  parseTimeToDate,
  formatDateForInput,
  formatTimeForInput,
  getCurrentTimeFormatted,
  getTodayDateFormatted,
} from "@/lib/date-utils"

const getLogbookSchema = (isRejected: boolean) => z.object({
  logbookDate: z.string().min(1, "Tanggal wajib diisi"),
  startTime: z.string().min(1, "Waktu mulai wajib diisi").regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format harus HH:mm (contoh: 08:00)"),
  endTime: z.string().min(1, "Waktu selesai wajib diisi").regex(/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Format harus HH:mm (contoh: 17:00)"),
  jpl: z.number().min(0, "Minimal 0 JPL"),
  deliveryMethod: z.nativeEnum(DeliveryMethod),
  meetingType: z.nativeEnum(MeetingType),
  visitType: z.nativeEnum(VisitType),
  mentoringMaterial: z.string().min(5, "Materi minimal 5 karakter"),
  activitySummary: z.string().min(10, "Ringkasan minimal 10 karakter"),
  obstacle: z.string().optional(),
  solutions: z.string().optional(),
  totalExpense: z.coerce.number().min(0).optional(),
  reasonNoExpense: z.string().optional(),
  applicants: z.array(z.string()).min(1, "Pilih minimal satu peserta"),
  files: z.array(z.object({
    key: z.string(),
    url: z.string(),
    name: z.string(),
    size: z.number(),
    type: z.string(),
    category: z.string().optional(),
  })).optional(),
  rebuttalNote: z.string().optional(),
}).superRefine((data, ctx) => {
  // 1. Time validation: endTime must be after startTime
  const start = parseTimeToDate(data.startTime);
  const end = parseTimeToDate(data.endTime);
  if (start && end && end.getTime() < start.getTime()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Waktu selesai harus setelah waktu mulai",
      path: ["endTime"],
    });
  }

  // 2. Group meeting participants validation
  if (data.meetingType === MeetingType.GROUP && data.applicants.length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pertemuan berkelompok minimal harus memilih 2 peserta",
      path: ["applicants"],
    });
  }

  // 2. Obstacle & Solutions validation
  const hasObstacle = data.obstacle && data.obstacle.trim().length > 0;
  if (hasObstacle) {
    if (!data.solutions || data.solutions.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Solusi wajib diisi minimal 5 karakter jika terdapat kendala",
        path: ["solutions"],
      });
    }
  }

  // 3. Documentation file validation
  const hasDocumentation = data.files?.some(f => f.category === "LOGBOOK_DOCUMENTATION");
  if (!hasDocumentation) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Foto dokumentasi kegiatan wajib diunggah",
      path: ["files"],
    });
  }

  // 4. Expense & Proof validation
  const expense = Number(data.totalExpense ?? 0);
  if (expense > 0) {
    const hasExpenseProof = data.files?.some(f => f.category === "EXPENSE_PROOF");
    if (!hasExpenseProof) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bukti biaya / kuitansi wajib diunggah jika ada pengeluaran",
        path: ["files"],
      });
    }
  } else {
    if (!data.reasonNoExpense || data.reasonNoExpense.trim().length < 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Alasan tanpa biaya wajib diisi minimal 5 karakter",
        path: ["reasonNoExpense"],
      });
    }
  }

  // 5. Rebuttal note validation if rejected
  if (isRejected && (!data.rebuttalNote || data.rebuttalNote.trim().length < 5)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Sanggahan wajib diisi minimal 5 karakter jika logbook ditolak",
      path: ["rebuttalNote"],
    });
  }
})

type LogbookFormValues = z.infer<ReturnType<typeof getLogbookSchema>>



const DRAFT_KEY = "draft_logbook";

const hasFormData = (values: any) => {
  if (!values) return false;
  return (
    (values.mentoringMaterial && values.mentoringMaterial.trim() !== "") ||
    (values.activitySummary && values.activitySummary.trim() !== "") ||
    (values.obstacle && values.obstacle.trim() !== "") ||
    (values.solutions && values.solutions.trim() !== "") ||
    (values.totalExpense && values.totalExpense > 0) ||
    (values.reasonNoExpense && values.reasonNoExpense.trim() !== "") ||
    (values.rebuttalNote && values.rebuttalNote.trim() !== "") ||
    (values.applicants && values.applicants.length > 0) ||
    (values.files && values.files.length > 0)
  );
};

export function LogbookForm({ 
  initialData,
  applicants = []
}: { 
  initialData?: any,
  applicants?: { id: string, name: string }[]
  }) {
  const router = useRouter()
  const isRejected = initialData?.verificationStatus === "REJECTED"

  const methods = useForm<any>({
    resolver: zodResolver(getLogbookSchema(isRejected)) as any,
    defaultValues: {
      logbookDate: initialData?.logbookDate ? formatDateForInput(initialData.logbookDate) : getTodayDateFormatted(),
      startTime: initialData?.startTime ? formatTimeForInput(initialData.startTime) : getCurrentTimeFormatted(),
      endTime: initialData?.endTime ? formatTimeForInput(initialData.endTime) : getCurrentTimeFormatted(45),
      jpl: initialData?.jpl || 1,
      deliveryMethod: initialData?.deliveryMethod || DeliveryMethod.OFFLINE,
      meetingType: initialData?.meetingType || MeetingType.INDIVIDUAL,
      visitType: initialData?.visitType !== undefined
        ? initialData.visitType
        : (initialData?.deliveryMethod === DeliveryMethod.ONLINE || (initialData?.applicants && initialData.applicants.length > 1))
          ? VisitType.NONE
          : VisitType.LOCAL,
      mentoringMaterial: initialData?.mentoringMaterial || "",
      activitySummary: initialData?.activitySummary || "",
      obstacle: initialData?.obstacle || "",
      solutions: initialData?.solutions || "",
      totalExpense: initialData?.totalExpense || 0,
      applicants: initialData?.applicants?.map((a: any) => typeof a === 'string' ? a : a.applicantId || a.id) || [],
      reasonNoExpense: initialData?.reasonNoExpense || "",
      files: initialData?.files?.map((f: any) => ({
        key: f.id || f.key || f.url || "",
        url: f.url || "",
        name: f.name || (f.url ? f.url.split('/').pop() : "File") || "File",
        size: f.size || 0,
        type: f.type || "image/jpeg",
        category: f.category,
      })) || [],
      rebuttalNote: initialData?.rebuttalNote || "",
    },
  })

  const { mutateAsync: createLogbook, isPending: isCreating } = useCreateLogbook();
  const { mutateAsync: updateLogbook, isPending: isUpdating } = useUpdateLogbook();
  const isPending = isCreating || isUpdating;

  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setUserId = useAppStore((state) => state.setUserId);
  const { data: user } = useMe();

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
  });

  // Save to localStorage on values change
  const watchedValues = methods.watch();

  // Automatically determine and update meetingType, jpl, and visitType
  React.useEffect(() => {
    const applicantsLength = watchedValues.applicants?.length || 0;
    const currentMeetingType = watchedValues.meetingType;
    const currentDeliveryMethod = watchedValues.deliveryMethod;
    const currentVisitType = watchedValues.visitType;

    // Sync meetingType & jpl based on applicants count
    if (applicantsLength > 1) {
      if (currentMeetingType !== MeetingType.GROUP) {
        methods.setValue("meetingType", MeetingType.GROUP, { shouldValidate: true });
      }
      // Calculate JPL if not set yet or is 0
      const currentJpl = watchedValues.jpl ?? 0;
      if (currentJpl <= 0 && watchedValues.startTime && watchedValues.endTime) {
        const start = parseTimeToDate(watchedValues.startTime);
        const end = parseTimeToDate(watchedValues.endTime);
        if (start && end) {
          const diffMs = end.getTime() - start.getTime();
          const diffMinutes = diffMs / (1000 * 60);
          const calculatedJpl = diffMinutes < 0 ? 0 : Math.max(1, Math.round(diffMinutes / 45));
          methods.setValue("jpl", calculatedJpl, { shouldValidate: true });
        }
      }
    } else {
      if (currentMeetingType !== MeetingType.INDIVIDUAL) {
        methods.setValue("meetingType", MeetingType.INDIVIDUAL, { shouldValidate: true });
        methods.setValue("jpl", 0, { shouldValidate: true });
      }
    }

    // Sync visitType based on deliveryMethod & meetingType (only OFFLINE + INDIVIDUAL has visitType)
    const isOfflineIndividual = currentDeliveryMethod === DeliveryMethod.OFFLINE && applicantsLength <= 1;
    if (isOfflineIndividual) {
      if (currentVisitType === VisitType.NONE) {
        methods.setValue("visitType", VisitType.LOCAL, { shouldValidate: true });
      }
    } else {
      if (currentVisitType !== VisitType.NONE) {
        methods.setValue("visitType", VisitType.NONE, { shouldValidate: true });
      }
    }
  }, [watchedValues.applicants, watchedValues.meetingType, watchedValues.deliveryMethod, watchedValues.visitType, watchedValues.startTime, watchedValues.endTime, watchedValues.jpl, methods]);

  const onSubmit = async (data: any) => {
    const effectiveUserId = currentUserId || user?.id;
    const effectiveWorkspaceId = currentWorkspaceId || initialData?.workspaceId;

    if (!effectiveWorkspaceId || !effectiveUserId) {
      toast.error("Data workspace atau user tidak ditemukan");
      return;
    }

    if (user?.id && !currentUserId) {
      setUserId(user.id);
    }

    disableDraftRef.current = true;

    try {
      if (initialData?.id) {
        await updateLogbook({
          id: initialData.id,
          ...data,
          workspaceId: effectiveWorkspaceId,
          applicantIds: data.applicants,
        });
        toast.success("Logbook berhasil diubah");
        router.push(`/logbooks/${initialData.id}`);
      } else {
        await createLogbook({
          ...data,
          workspaceId: effectiveWorkspaceId,
          userId: effectiveUserId,
          applicantIds: data.applicants,
        });
        toast.success("Logbook berhasil disimpan");
        clearDraft();
        router.push("/logbooks");
      }
    } catch (error: any) {
      disableDraftRef.current = false;
      toast.error(error.message || (initialData?.id ? "Gagal mengubah logbook" : "Gagal menyimpan logbook"));
    }
  }

  return (
    <FormProvider {...methods}>
      <div className="w-full py-6 max-w-4xl mx-auto">
        <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Pulihkan Draft Logbook?</AlertDialogTitle>
              <AlertDialogDescription>
                Kami menemukan draft pengisian logbook sebelumnya yang belum disimpan. Apakah Anda ingin memulihkannya?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={discardDraft}>
                Mulai Baru
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                restoreDraft();
                toast.success("Draft logbook berhasil dipulihkan");
              }}>
                Pulihkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          {isRejected && (
            <Card className="border-destructive/20 bg-destructive/5/20 p-4 space-y-4">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-destructive leading-none">Sanggahan / Catatan Revisi</h4>
                  <p className="text-xs text-destructive/80 leading-normal">
                    Logbook ini memerlukan perbaikan. Silakan tinjau riwayat catatan penolakan dan tuliskan sanggahan/penjelasan revisi Anda di bawah ini.
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

          <BasicInfoStep />
          <ParticipantsStep applicants={applicants} />
          <ActivityDetailStep />
          <ExpenseStep />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:items-center gap-3 pt-6 border-t">
            <Button variant="outline" type="button" onClick={() => router.back()} className="w-full sm:w-auto rounded-full px-6">
              Batal
            </Button>
            <Button 
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto min-w-35 rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
            >
              {isPending ? "Menyimpan..." : initialData?.id ? "Simpan Perubahan" : "Simpan Logbook"}
            </Button>
          </div>
        </form>
      </div>
    </FormProvider>
  )
}
