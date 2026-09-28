import { useFormContext, useWatch } from "react-hook-form"
import { Download } from "lucide-react"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { BookkeepingType } from "@/types"
import { FileUploadSingle } from "@/components/ui/file-upload-single"

import { ObstacleExamplesPopover } from "@/components/forms/obstacle-examples-popover"

export function ConditionBookkeepingStep() {
  const { control, register, setValue, formState } = useFormContext()
  const errors = formState.errors
  const files = useWatch({ control, name: "files" }) || []
  const bookkeepingCashflow = useWatch({ control, name: "bookkeepingCashflow" })
  const bookkeepingIncomeStatement = useWatch({ control, name: "bookkeepingIncomeStatement" })
  
  const incomeProofFile = files.find((f: any) => f.category === "OUTPUT_INCOME_PROOF")
  const cashflowProofFile = files.find((f: any) => f.category === "OUTPUT_CASHFLOW_PROOF")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pembukuan Usaha</CardTitle>
        <CardDescription>Pencatatan keuangan dan kendala operasional bulan ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FieldGroup className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <Field>
              <FieldLabel>Buku Kas Harian</FieldLabel>
              <Select 
                value={bookkeepingCashflow}
                onValueChange={(v) => {
                  setValue("bookkeepingCashflow", v as BookkeepingType, { shouldValidate: true, shouldDirty: true })
                  if (v === BookkeepingType.NONE) {
                    setValue("files", files.filter((f: any) => f.category !== "OUTPUT_CASHFLOW_PROOF"), { shouldValidate: true, shouldDirty: true })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BookkeepingType.NONE}>Tidak Menerapkan</SelectItem>
                  <SelectItem value={BookkeepingType.MANUAL}>Manual (Buku)</SelectItem>
                  <SelectItem value={BookkeepingType.EXCEL}>Excel/Spreadsheet</SelectItem>
                  <SelectItem value={BookkeepingType.APPLICATION}>Aplikasi Digital</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-1.5">
                <a
                  href="https://docs.google.com/document/d/10hxqh51sog2mJymqoB3qHlcAwq9rIbtg/export?format=docx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-colors"
                >
                  <span>Unduh Template Buku Kas</span>
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </Field>

            {bookkeepingCashflow !== BookkeepingType.NONE && (
              <Field className="animate-in fade-in slide-in-from-top-2 duration-200">
                <FieldLabel>Bukti Buku Kas Harian</FieldLabel>
                <FileUploadSingle
                  value={cashflowProofFile?.url || null}
                  mimeType={cashflowProofFile?.type || cashflowProofFile?.mimeType || null}
                  file={cashflowProofFile}
                  onChange={(url, mimeType) => {
                    if (url) {
                      const isPdf = mimeType === "application/pdf";
                      const newFile = {
                        key: url.split("/").pop() || "file",
                        url,
                        name: isPdf ? "output_cashflow_proof.pdf" : "output_cashflow_proof.jpg",
                        size: 0,
                        type: mimeType || "image/jpeg",
                        category: "OUTPUT_CASHFLOW_PROOF"
                      };
                      setValue("files", [...files.filter((f: any) => f.category !== "OUTPUT_CASHFLOW_PROOF"), newFile], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    } else {
                      setValue("files", files.filter((f: any) => f.category !== "OUTPUT_CASHFLOW_PROOF"), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    }
                  }}
                  label="Unggah Bukti Kas"
                  category="OUTPUT_CASHFLOW_PROOF"
                />
                <FieldDescription>Foto atau PDF pembukuan/arus kas terbaru (Maks. 10MB).</FieldDescription>
                <FieldError errors={[errors.cashflowProof]} />
              </Field>
            )}
          </div>

          <div className="space-y-4">
            <Field>
              <FieldLabel>Catatan Laba Rugi Bulanan</FieldLabel>
              <Select 
                value={bookkeepingIncomeStatement}
                onValueChange={(v) => {
                  setValue("bookkeepingIncomeStatement", v as BookkeepingType, { shouldValidate: true, shouldDirty: true })
                  if (v === BookkeepingType.NONE) {
                    setValue("files", files.filter((f: any) => f.category !== "OUTPUT_INCOME_PROOF"), { shouldValidate: true, shouldDirty: true })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BookkeepingType.NONE}>Tidak Menerapkan</SelectItem>
                  <SelectItem value={BookkeepingType.MANUAL}>Manual (Buku)</SelectItem>
                  <SelectItem value={BookkeepingType.EXCEL}>Excel/Spreadsheet</SelectItem>
                  <SelectItem value={BookkeepingType.APPLICATION}>Aplikasi Digital</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-1.5">
                <a
                  href="https://docs.google.com/document/d/1vhmH7R68GE5_2d76W3HtcxCPE6zDdyJj/export?format=docx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-colors"
                >
                  <span>Unduh Template Laba Rugi</span>
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
            </Field>

            {bookkeepingIncomeStatement !== BookkeepingType.NONE && (
              <Field className="animate-in fade-in slide-in-from-top-2 duration-200">
                <FieldLabel>Bukti Catatan Laba Rugi Bulanan</FieldLabel>
                <FileUploadSingle
                  value={incomeProofFile?.url || null}
                  mimeType={incomeProofFile?.type || incomeProofFile?.mimeType || null}
                  file={incomeProofFile}
                  onChange={(url, mimeType) => {
                    if (url) {
                      const isPdf = mimeType === "application/pdf";
                      const newFile = {
                        key: url.split("/").pop() || "file",
                        url,
                        name: isPdf ? "output_income_proof.pdf" : "output_income_proof.jpg",
                        size: 0,
                        type: mimeType || "image/jpeg",
                        category: "OUTPUT_INCOME_PROOF"
                      };
                      setValue("files", [...files.filter((f: any) => f.category !== "OUTPUT_INCOME_PROOF"), newFile], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    } else {
                      setValue("files", files.filter((f: any) => f.category !== "OUTPUT_INCOME_PROOF"), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    }
                  }}
                  label="Unggah Bukti Catatan Laba Rugi Bulanan"
                  category="OUTPUT_INCOME_PROOF"
                />
                <FieldDescription>Foto atau PDF bukti catatan laba rugi bulanan (Maks. 10MB).</FieldDescription>
                <FieldError errors={[errors.incomeProof]} />
              </Field>
            )}
          </div>
        </FieldGroup>

        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel>Kendala Utama</FieldLabel>
            <ObstacleExamplesPopover
              type="output-report"
              onSelect={(obstacle) => {
                setValue("obstacle", obstacle, { shouldValidate: true, shouldDirty: true });
              }}
            />
          </div>
          <Textarea
            {...register("obstacle")}
            placeholder="Contoh: Kenaikan harga bahan baku utama sebesar 20% dan cuaca hujan menghambat proses pengeringan..."
            className="min-h-[100px]"
          />
        </Field>

        <FieldError errors={[errors.files]} />
      </CardContent>
    </Card>
  )
}
