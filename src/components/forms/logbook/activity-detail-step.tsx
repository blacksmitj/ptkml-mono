import { useFormContext, useWatch } from "react-hook-form"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ImageUploadSingle } from "@/components/ui/image-upload-single"

import { ObstacleExamplesPopover } from "@/components/forms/obstacle-examples-popover"

export function ActivityDetailStep() {
  const { register, setValue, control, formState } = useFormContext()
  const errors = formState.errors
  const files = useWatch({ control, name: "files" }) || []
  const documentationFile = files.find((f: any) => f.category === "LOGBOOK_DOCUMENTATION")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Detail Kegiatan</CardTitle>
        <CardDescription>Jelaskan materi dan ringkasan aktivitas yang dilakukan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <Field>
          <FieldLabel>Materi Pendampingan</FieldLabel>
          <Input {...register("mentoringMaterial")} placeholder="Contoh: Pembukuan Keuangan, Digital Marketing..." className="h-11" />
          <FieldError errors={[errors.mentoringMaterial]} />
        </Field>

        <Field>
          <FieldLabel>Ringkasan Aktivitas</FieldLabel>
          <Textarea 
            {...register("activitySummary")} 
            placeholder="Ceritakan jalannya kegiatan secara detail..."
            className="min-h-[150px] text-base leading-relaxed"
          />
          <FieldError errors={[errors.activitySummary]} />
        </Field>

        <Field>
          <FieldLabel>Foto Dokumentasi Kegiatan</FieldLabel>
          <ImageUploadSingle
            value={documentationFile?.url || null}
            onChange={(url) => {
              if (url) {
                const newFile = {
                  key: url.split("/").pop() || "image.jpg",
                  url,
                  name: "logbook_documentation.jpg",
                  size: 0,
                  type: "image/jpeg",
                  category: "LOGBOOK_DOCUMENTATION"
                };
                setValue("files", [...files.filter((f: any) => f.category !== "LOGBOOK_DOCUMENTATION"), newFile], { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              } else {
                setValue("files", files.filter((f: any) => f.category !== "LOGBOOK_DOCUMENTATION"), { shouldValidate: true, shouldDirty: true, shouldTouch: true });
              }
            }}
            label="Unggah Dokumentasi"
            aspect={null} // free crop
            category="LOGBOOK_DOCUMENTATION"
          />
          <FieldDescription>Unggah foto dokumentasi kegiatan pendampingan (Maks. 2MB).</FieldDescription>
          <FieldError errors={errors.files && typeof errors.files.message === "string" && errors.files.message.includes("dokumentasi") ? [errors.files] : []} />
        </Field>

        <FieldGroup className="grid md:grid-cols-2 gap-6">
          <Field>
            <div className="flex items-center justify-between gap-2">
              <FieldLabel>Kendala (Opsional)</FieldLabel>
              <ObstacleExamplesPopover
                type="logbook"
                onSelect={(obstacle, solution) => {
                  setValue("obstacle", obstacle, { shouldValidate: true, shouldDirty: true });
                  if (solution) {
                    setValue("solutions", solution, { shouldValidate: true, shouldDirty: true });
                  }
                }}
              />
            </div>
            <Textarea
              {...register("obstacle")}
              placeholder="Contoh: Peserta sulit mencocokkan waktu pertemuan karena sibuk melayani pelanggan di jam operasional toko..."
              className="min-h-[100px]"
            />
            <FieldError errors={[errors.obstacle]} />
          </Field>
          <Field>
            <FieldLabel>Solusi (Wajib jika ada kendala)</FieldLabel>
            <Textarea
              {...register("solutions")}
              placeholder="Contoh: Menyepakati jadwal sesi pendampingan di luar jam sibuk toko (pagi hari sebelum buka) dan koordinasi via WhatsApp..."
              className="min-h-[100px]"
            />
            <FieldError errors={[errors.solutions]} />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
