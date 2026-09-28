"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  CommunicationStatus,
  Willingness,
  PresenceStatus,
  FundDisbursement,
  ApplicantStatus,
  Applicant,
} from "@/types"
import { useUpdateApplicantProgressStatus } from "@/hooks/use-applicants"
import {
  MessageSquare,
  HandHeart,
  MapPin,
  CircleDollarSign,
  Pencil,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  PauseCircle,
  Ban,
} from "lucide-react"

const statusFormSchema = z.object({
  status: z.nativeEnum(ApplicantStatus).optional(),
  reasonDropped: z.string().optional().nullable(),
  communicationStatus: z.nativeEnum(CommunicationStatus).optional(),
  willingness: z.nativeEnum(Willingness).optional(),
  presenceStatus: z.nativeEnum(PresenceStatus).optional(),
  fundDisbursement: z.nativeEnum(FundDisbursement).optional(),
  reasonNotWilling: z.string().optional().nullable(),
})

type StatusFormValues = z.infer<typeof statusFormSchema>

interface ApplicantStatusModalProps {
  open: boolean
  onClose: () => void
  applicant: Applicant | any | null
  currentRole?: string
}

export function ApplicantStatusModal({
  open,
  onClose,
  applicant,
  currentRole,
}: ApplicantStatusModalProps) {
  const router = useRouter()
  const isSuperAdmin = currentRole === "SUPER_ADMIN"
  const isMentor = currentRole === "MENTOR"
  const { mutate: updateApplicant, isPending } = useUpdateApplicantProgressStatus()

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      status: ApplicantStatus.ACTIVE,
      reasonDropped: "",
      communicationStatus: CommunicationStatus.RESPONDED,
      willingness: Willingness.WILLING,
      presenceStatus: PresenceStatus.FOUND,
      fundDisbursement: FundDisbursement.NOT_DISBURSED,
      reasonNotWilling: "",
    },
  })

  // Reset form with selected applicant values whenever applicant changes or modal opens
  React.useEffect(() => {
    if (applicant && open) {
      form.reset({
        status: applicant.status || ApplicantStatus.ACTIVE,
        reasonDropped: applicant.reasonDropped || "",
        communicationStatus:
          applicant.communicationStatus || CommunicationStatus.RESPONDED,
        willingness: applicant.willingness || Willingness.WILLING,
        presenceStatus: applicant.presenceStatus || PresenceStatus.FOUND,
        fundDisbursement:
          applicant.fundDisbursement || FundDisbursement.NOT_DISBURSED,
        reasonNotWilling: applicant.reasonNotWilling || "",
      })
    }
  }, [applicant, open, form])

  const watchWillingness = form.watch("willingness")
  const watchStatus = form.watch("status")

  const onSubmit = (data: StatusFormValues) => {
    if (!applicant?.id) {
      toast.error("ID Peserta tidak valid")
      return
    }

    const payload: any = {
      id: applicant.id,
    }

    if (isSuperAdmin) {
      if (!data.status) {
        toast.error("Pilih status kepesertaan")
        return
      }
      payload.status = data.status
      payload.reasonDropped =
        data.status === ApplicantStatus.DROPPED ? data.reasonDropped : null
    } else if (isMentor) {
      payload.communicationStatus = data.communicationStatus
      payload.willingness = data.willingness
      payload.presenceStatus = data.presenceStatus
      payload.fundDisbursement = data.fundDisbursement
      payload.reasonNotWilling =
        data.willingness === Willingness.NOT_WILLING
          ? data.reasonNotWilling
          : null
    } else {
      toast.error("Anda tidak memiliki izin untuk memperbarui status peserta ini")
      return
    }

    updateApplicant(payload, {
      onSuccess: () => {
        toast.success(
          isSuperAdmin
            ? "Status kepesertaan berhasil diperbarui"
            : "Status pendampingan berhasil diperbarui"
        )
        onClose()
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || error?.message || "Gagal memperbarui status")
      },
    })
  }

  const handleEditProfilePage = () => {
    if (applicant?.id) {
      onClose()
      router.push(`/applicants/${applicant.id}/edit`)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className={`w-[95vw] max-h-[90vh] overflow-y-auto ${
          isSuperAdmin ? "!max-w-xl sm:!max-w-xl" : "!max-w-3xl sm:!max-w-3xl"
        }`}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <span>
              {isSuperAdmin
                ? "Update Status Kepesertaan"
                : "Update Status Pendampingan"}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            {isSuperAdmin
              ? "Perbarui status kepesertaan untuk "
              : "Perbarui status pendampingan untuk "}
            <span className="font-semibold text-foreground">
              {applicant?.profile?.name || applicant?.name || "Peserta"}
            </span>{" "}
            ({applicant?.idTkm || "ID TKM -"})
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
          {/* Section Khusus Super Admin: Status Kepesertaan */}
          {isSuperAdmin && (
            <div className="space-y-2.5 p-3.5 rounded-lg border border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Status Kepesertaan</Label>
                </div>
                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                  Super Admin
                </span>
              </div>
              <RadioGroup
                value={form.watch("status")}
                onValueChange={(val) => form.setValue("status", val as ApplicantStatus)}
                className="grid grid-cols-3 gap-2.5 pt-1"
              >
                <Label
                  htmlFor="status-active"
                  className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                    form.watch("status") === ApplicantStatus.ACTIVE
                      ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={ApplicantStatus.ACTIVE} id="status-active" />
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>Aktif</span>
                </Label>
                <Label
                  htmlFor="status-pending"
                  className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                    form.watch("status") === ApplicantStatus.PENDING
                      ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold shadow-xs"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={ApplicantStatus.PENDING} id="status-pending" />
                  <PauseCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>Hold (Pending)</span>
                </Label>
                <Label
                  htmlFor="status-dropped"
                  className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                    form.watch("status") === ApplicantStatus.DROPPED
                      ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-semibold shadow-xs"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={ApplicantStatus.DROPPED} id="status-dropped" />
                  <Ban className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Drop</span>
                </Label>
              </RadioGroup>

              {watchStatus === ApplicantStatus.DROPPED && (
                <div className="mt-3 pt-2 border-t border-rose-200 dark:border-rose-900/50 space-y-1.5 animate-in fade-in duration-200">
                  <Label htmlFor="reasonDropped" className="text-xs text-muted-foreground">
                    Alasan Drop Peserta (Opsional)
                  </Label>
                  <Textarea
                    id="reasonDropped"
                    placeholder="Tuliskan alasan peserta di-drop..."
                    className="text-sm resize-none h-18"
                    {...form.register("reasonDropped")}
                  />
                </div>
              )}
            </div>
          )}

          {/* Section Khusus Mentor: 4 Status Pendampingan */}
          {isMentor && (
            <>
              {/* 1. Status Komunikasi */}
              <div className="space-y-2 p-3.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Status Komunikasi</Label>
                </div>
                <RadioGroup
                  value={form.watch("communicationStatus")}
                  onValueChange={(val) =>
                    form.setValue("communicationStatus", val as CommunicationStatus)
                  }
                  className="grid grid-cols-2 gap-2.5 pt-1"
                >
                  <Label
                    htmlFor="comm-responded"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("communicationStatus") === CommunicationStatus.RESPONDED
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={CommunicationStatus.RESPONDED} id="comm-responded" />
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Merespon</span>
                  </Label>
                  <Label
                    htmlFor="comm-no-response"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("communicationStatus") === CommunicationStatus.NO_RESPONSE
                        ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={CommunicationStatus.NO_RESPONSE} id="comm-no-response" />
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Tidak Merespon</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* 2. Kesediaan */}
              <div className="space-y-2 p-3.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <HandHeart className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Kesediaan Pendampingan</Label>
                </div>
                <RadioGroup
                  value={form.watch("willingness")}
                  onValueChange={(val) =>
                    form.setValue("willingness", val as Willingness)
                  }
                  className="grid grid-cols-2 gap-2.5 pt-1"
                >
                  <Label
                    htmlFor="willing-yes"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("willingness") === Willingness.WILLING
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={Willingness.WILLING} id="willing-yes" />
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Bersedia</span>
                  </Label>
                  <Label
                    htmlFor="willing-no"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("willingness") === Willingness.NOT_WILLING
                        ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={Willingness.NOT_WILLING} id="willing-no" />
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Tidak Bersedia</span>
                  </Label>
                </RadioGroup>

                {/* Conditional reason when not willing */}
                {watchWillingness === Willingness.NOT_WILLING && (
                  <div className="mt-3 pt-2 border-t space-y-1.5 animate-in fade-in duration-200">
                    <Label htmlFor="reasonNotWilling" className="text-xs text-muted-foreground">
                      Alasan Tidak Bersedia (Opsional)
                    </Label>
                    <Textarea
                      id="reasonNotWilling"
                      placeholder="Tuliskan alasan peserta menolak pendampingan..."
                      className="text-sm resize-none h-20"
                      {...form.register("reasonNotWilling")}
                    />
                  </div>
                )}
              </div>

              {/* 3. Status Keberadaan */}
              <div className="space-y-2 p-3.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Status Keberadaan (Lokasi)</Label>
                </div>
                <RadioGroup
                  value={form.watch("presenceStatus")}
                  onValueChange={(val) =>
                    form.setValue("presenceStatus", val as PresenceStatus)
                  }
                  className="grid grid-cols-2 gap-2.5 pt-1"
                >
                  <Label
                    htmlFor="presence-found"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("presenceStatus") === PresenceStatus.FOUND
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={PresenceStatus.FOUND} id="presence-found" />
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Ditemukan</span>
                  </Label>
                  <Label
                    htmlFor="presence-not-found"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("presenceStatus") === PresenceStatus.NOT_FOUND
                        ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={PresenceStatus.NOT_FOUND} id="presence-not-found" />
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span>Tidak Ditemukan</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* 4. Penyaluran Dana */}
              <div className="space-y-2 p-3.5 rounded-lg border bg-muted/20">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-4 w-4 text-primary" />
                  <Label className="font-semibold text-sm">Penyaluran Bantuan Dana</Label>
                </div>
                <RadioGroup
                  value={form.watch("fundDisbursement")}
                  onValueChange={(val) =>
                    form.setValue("fundDisbursement", val as FundDisbursement)
                  }
                  className="grid grid-cols-2 gap-2.5 pt-1"
                >
                  <Label
                    htmlFor="fund-disbursed"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("fundDisbursement") === FundDisbursement.DISBURSED
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={FundDisbursement.DISBURSED} id="fund-disbursed" />
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Sudah Disalurkan</span>
                  </Label>
                  <Label
                    htmlFor="fund-not-disbursed"
                    className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-all text-xs sm:text-sm font-medium ${
                      form.watch("fundDisbursement") === FundDisbursement.NOT_DISBURSED
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 font-semibold"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value={FundDisbursement.NOT_DISBURSED} id="fund-not-disbursed" />
                    <HelpCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Belum Disalurkan</span>
                  </Label>
                </RadioGroup>
              </div>
            </>
          )}

          {!isSuperAdmin && !isMentor && (
            <div className="p-4 rounded-lg bg-muted text-center text-sm text-muted-foreground">
              Anda tidak memiliki hak akses untuk memperbarui status peserta ini.
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t">
            {/* Tombol Edit Profil Lengkap - hanya untuk Pendamping (MENTOR) */}
            {isMentor && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditProfilePage}
                className="gap-1.5 text-muted-foreground hover:text-foreground justify-center order-last sm:order-first"
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Profil Lengkap</span>
              </Button>
            )}

            <div className="flex items-center gap-2 justify-end ml-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isPending}
              >
                Batal
              </Button>
              {(isSuperAdmin || isMentor) && (
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending
                    ? "Menyimpan..."
                    : isSuperAdmin
                      ? "Simpan Status Kepesertaan"
                      : "Simpan Status Pendampingan"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
