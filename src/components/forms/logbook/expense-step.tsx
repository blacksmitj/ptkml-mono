import { useFormContext, Controller, useWatch } from "react-hook-form"
import { Download } from "lucide-react"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputRupiah } from "@/components/ui/input-rupiah"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ImageUploadSingle } from "@/components/ui/image-upload-single"

export function ExpenseStep() {
  const { register, watch, setValue, control, formState } = useFormContext()
  const errors = formState.errors
  const totalExpense = watch("totalExpense")
  const files = useWatch({ control, name: "files" }) || []
  const expenseFile = files.find((f: any) => f.category === "EXPENSE_PROOF")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Biaya & Operasional</CardTitle>
        <CardDescription>Informasi mengenai biaya yang dikeluarkan selama kegiatan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FieldGroup className="grid md:grid-cols-2 gap-8">
          <Field>
            <FieldLabel>Total Biaya (IDR)</FieldLabel>
            <Controller
              name="totalExpense"
              control={control}
              render={({ field }) => (
                <InputRupiah
                  value={field.value}
                  onChange={field.onChange}
                  onFocus={(e) => e.target.select()}
                  className="h-11 text-lg font-semibold"
                />
              )}
            />
            <FieldDescription>Biaya operasional jika ada (transport, konsumsi, dsb).</FieldDescription>
            <FieldError errors={[errors.totalExpense]} />
          </Field>
          
          {(totalExpense === 0 || !totalExpense) && (
            <Field className="animate-in fade-in slide-in-from-left-4 duration-300">
              <FieldLabel>Alasan Tanpa Biaya</FieldLabel>
              <Input 
                {...register("reasonNoExpense")} 
                placeholder="Contoh: Lokasi dekat, online..." 
                className="h-11" 
              />
              <FieldDescription>Wajib diisi jika biaya 0 atau kosong.</FieldDescription>
              <FieldError errors={[errors.reasonNoExpense]} />
            </Field>
          )}
        </FieldGroup>

        <Field>
          <FieldLabel>Bukti Biaya / Kuitansi</FieldLabel>
          <ImageUploadSingle 
            value={expenseFile?.url || null}
            onChange={(url) => {
              if (url) {
                const newFile = {
                  key: url.split("/").pop() || "image.jpg",
                  url,
                  name: "expense_proof.jpg",
                  size: 0,
                  type: "image/jpeg",
                  category: "EXPENSE_PROOF"
                };
                setValue("files", [...files.filter((f: any) => f.category !== "EXPENSE_PROOF"), newFile], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              } else {
                setValue("files", files.filter((f: any) => f.category !== "EXPENSE_PROOF"), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }
            }}
            label="Unggah Bukti"
            aspect={null} // free crop
            category="EXPENSE_PROOF"
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-1.5">
            <FieldDescription>Unggah kuitansi atau struk belanja bukti transaksi (Maks. 2MB).</FieldDescription>
            <a
              href="https://docs.google.com/document/d/1p5kFtIVGqu4LYs7rsit5NvnJjXe1DkZp/export?format=docx"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline transition-colors shrink-0"
            >
              <span>Unduh Template Bukti Pengeluaran</span>
              <Download className="h-3.5 w-3.5" />
            </a>
          </div>
          <FieldError errors={errors.files && typeof errors.files.message === "string" && errors.files.message.includes("Bukti biaya") ? [errors.files] : []} />
        </Field>
      </CardContent>
    </Card>
  )
}
