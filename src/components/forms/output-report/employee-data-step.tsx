import { useState } from "react"
import { useFormContext, useFieldArray, useWatch } from "react-hook-form"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Gender, BpjsStatus, BpjsType } from "@/types"
import { UserPlus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import { ImageUploadSingle } from "@/components/ui/image-upload-single"
import { toast } from "sonner"
import { apiClient } from "@/lib/api-client"
import { useAppStore } from "@/store/use-app-store"

// Sub-component per item agar useWatch bisa di-scope ke index masing-masing
function EmployeeItem({
  index,
  onRemove,
  isReadOnly,
  isEdit,
  workspaceId,
}: {
  index: number;
  onRemove: () => void;
  isReadOnly: boolean;
  isEdit: boolean;
  workspaceId: string | null;
}) {
  const { register, control, setValue, watch, formState, clearErrors, setError } = useFormContext()
  const errors = formState.errors

  const monthReport = watch("monthReport")
  const isMonth0 = monthReport === 0 || monthReport === "0"

  const employeeId = watch(`employees.${index}.id`)
  const nik = watch(`employees.${index}.nik`) || ""
  const nikVerified = watch(`employees.${index}.nikVerified`) ?? false

  const [checkingNik, setCheckingNik] = useState(false)
  const [checkFeedback, setCheckFeedback] = useState<{
    valid: boolean;
    message: string;
  } | null>(() => {
    if (isMonth0 && nik) {
      return { valid: true, message: "NIK dari Data Awal telah terverifikasi" }
    }
    // Jika data sudah ada (edit mode atau baseline) dan sudah nikVerified, inisialisasi status valid
    if (nikVerified && nik) {
      return { valid: true, message: "NIK sudah terverifikasi" }
    }
    return null
  })

  const gender = useWatch({ control, name: `employees.${index}.gender` }) ?? Gender.MALE
  const employmentStatus = useWatch({ control, name: `employees.${index}.employmentStatus` }) ?? "permanen"
  const bpjsStatus = useWatch({ control, name: `employees.${index}.bpjsStatus` }) ?? BpjsStatus.NOT_REGISTERED
  const bpjsType = useWatch({ control, name: `employees.${index}.bpjsType` }) ?? ""
  const hasDisability = useWatch({ control, name: `employees.${index}.hasDisability` }) ?? false
  const disabilityType = useWatch({ control, name: `employees.${index}.disabilityType` }) ?? ""
  const employeeFiles = useWatch({ control, name: `employees.${index}.files` }) || []

  const ktpFile = employeeFiles.find((f: any) => f.category === "EMPLOYEE_KTP")
  const bpjsFile = employeeFiles.find((f: any) => f.category === "EMPLOYEE_BPJS_CARD")
  const salaryFile = employeeFiles.find((f: any) => f.category === "EMPLOYEE_SALARY_SLIP")

  const handleCheckNik = async () => {
    const trimmedNik = (nik || "").trim()
    if (!trimmedNik) {
      setError(`employees.${index}.nik`, {
        type: "manual",
        message: "Masukkan 16 digit NIK terlebih dahulu",
      })
      toast.error("Masukkan 16 digit NIK terlebih dahulu")
      return
    }

    if (!/^\d{16}$/.test(trimmedNik)) {
      setError(`employees.${index}.nik`, {
        type: "manual",
        message: "NIK harus tepat 16 digit angka",
      })
      toast.error("NIK harus tepat 16 digit angka")
      return
    }

    if (!workspaceId) {
      toast.error("Workspace ID tidak ditemukan")
      return
    }

    // Periksa duplikasi dengan baris karyawan lain di form yang sama
    const allEmployees = watch("employees") || []
    const isDuplicateInForm = allEmployees.some(
      (emp: any, idx: number) => idx !== index && (emp?.nik || "").trim() === trimmedNik
    )
    if (isDuplicateInForm) {
      setError(`employees.${index}.nik`, {
        type: "manual",
        message: "NIK ini sudah Anda masukkan pada karyawan lain di form ini",
      })
      setCheckFeedback({
        valid: false,
        message: "NIK duplikat di formulir ini",
      })
      setValue(`employees.${index}.nikVerified`, false, { shouldValidate: true })
      toast.error("NIK tidak boleh sama dengan karyawan lain di form ini")
      return
    }

    setCheckingNik(true)
    setCheckFeedback(null)

    try {
      const params = new URLSearchParams({
        nik: trimmedNik,
        workspaceId,
      })
      if (employeeId) {
        params.set("excludeEmployeeId", employeeId)
      }

      const res = await apiClient.get<any>(`/employees/check-nik?${params.toString()}`)
      const data = res.data

      if (data.valid) {
        setValue(`employees.${index}.nikVerified`, true, { shouldValidate: true, shouldDirty: true })
        clearErrors(`employees.${index}.nik`)
        clearErrors(`employees.${index}.nikVerified`)
        setCheckFeedback({
          valid: true,
          message: data.message || "NIK valid dan tersedia",
        })
        toast.success("NIK valid! Silakan lengkapi data karyawan.")
      } else {
        setValue(`employees.${index}.nikVerified`, false, { shouldValidate: true })
        setError(`employees.${index}.nik`, {
          type: "manual",
          message: data.message || "NIK tidak valid",
        })
        setCheckFeedback({
          valid: false,
          message: data.message || "NIK tidak valid",
        })
        toast.error(data.message || "NIK tidak valid")
      }
    } catch (err: any) {
      const errMsg = err?.response?.data?.error || err.message || "Gagal memeriksa NIK"
      setValue(`employees.${index}.nikVerified`, false, { shouldValidate: true })
      setCheckFeedback({
        valid: false,
        message: errMsg,
      })
      toast.error(errMsg)
    } finally {
      setCheckingNik(false)
    }
  }

  const isFormLocked = !nikVerified || isReadOnly

  return (
    <div className="relative p-6 border rounded-xl space-y-6 bg-muted/5">
      {!isReadOnly && !isMonth0 && (
        <div className="absolute right-4 top-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Bagian Validasi NIK */}
      <div className="p-4 rounded-lg bg-background border border-border/70 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1">
            <Field>
              <FieldLabel className="flex items-center gap-2">
                <span>NIK Karyawan</span>
                <span className="text-xs font-normal text-muted-foreground">(Wajib periksa sebelum mengisi data lain)</span>
              </FieldLabel>
              <Input
                {...register(`employees.${index}.nik`, {
                  onChange: () => {
                    setValue(`employees.${index}.nikVerified`, false, { shouldValidate: true })
                    setCheckFeedback(null)
                  },
                })}
                placeholder="16 digit NIK karyawan..."
                maxLength={16}
                readOnly={isMonth0 || isReadOnly}
              />
              <FieldError errors={[(errors.employees as any)?.[index]?.nik]} />
              <FieldError errors={[(errors.employees as any)?.[index]?.nikVerified]} />
            </Field>
          </div>
          {isMonth0 ? (
            <div className="sm:self-end h-10 flex items-center px-4 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium gap-1.5 whitespace-nowrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Terverifikasi (Data Awal)</span>
            </div>
          ) : !isReadOnly && (
            <Button
              type="button"
              variant={nikVerified ? "outline" : "default"}
              disabled={checkingNik}
              onClick={handleCheckNik}
              className="sm:self-end h-10 px-5"
            >
              {checkingNik ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memeriksa...
                </>
              ) : nikVerified ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  Cek Ulang NIK
                </>
              ) : (
                "Cek NIK"
              )}
            </Button>
          )}
        </div>

        {checkFeedback && (
          <div
            className={`flex items-start gap-2 p-2.5 rounded-md text-xs font-medium ${
              checkFeedback.valid
                ? "bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {checkFeedback.valid ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <span>{checkFeedback.message}</span>
          </div>
        )}

        {!nikVerified && !isReadOnly && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            * Kolom input nama, peran, gender, dan dokumen di bawah terkunci hingga NIK berhasil dicek dan valid.
          </p>
        )}
      </div>

      {/* Bagian Input Karyawan Lainnya (Terkunci sebelum NIK valid) */}
      <div className={`space-y-6 transition-opacity duration-200 ${isFormLocked ? "opacity-45 pointer-events-none select-none" : "opacity-100"}`}>
        <div className="grid md:grid-cols-3 gap-6">
          <Field>
            <FieldLabel>Nama Karyawan</FieldLabel>
            <Input {...register(`employees.${index}.name`)} placeholder="Nama lengkap..." disabled={isFormLocked} />
            <FieldError errors={[(errors.employees as any)?.[index]?.name]} />
          </Field>
          <Field>
            <FieldLabel>Jabatan/Peran</FieldLabel>
            <Input {...register(`employees.${index}.role`)} placeholder="Contoh: Produksi, Sales..." disabled={isFormLocked} />
            <FieldError errors={[(errors.employees as any)?.[index]?.role]} />
          </Field>
          <Field>
            <FieldLabel>Gender</FieldLabel>
            <Select
              value={gender}
              disabled={isFormLocked}
              onValueChange={(v) => setValue(`employees.${index}.gender`, v as Gender, { shouldValidate: true, shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Gender.MALE}>Laki-laki</SelectItem>
                <SelectItem value={Gender.FEMALE}>Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel>Status Kepegawaian</FieldLabel>
            <Select
              value={employmentStatus || "permanen"}
              disabled={isFormLocked}
              onValueChange={(v) => setValue(`employees.${index}.employmentStatus`, v, { shouldValidate: true, shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="permanen">Tenaga Kerja Tetap (Permanen)</SelectItem>
                <SelectItem value="kontrak">Tenaga Kerja Lepas/Kontrak</SelectItem>
                <SelectItem value="paruh_waktu">Tenaga Kerja Paruh Waktu/Musiman</SelectItem>
              </SelectContent>
            </Select>
            <FieldError errors={[(errors.employees as any)?.[index]?.employmentStatus]} />
          </Field>
          <Field>
            <FieldLabel>Status BPJS</FieldLabel>
            <Select
              value={bpjsStatus}
              disabled={isFormLocked}
              onValueChange={(v) => setValue(`employees.${index}.bpjsStatus`, v as BpjsStatus, { shouldValidate: true, shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BpjsStatus.REGISTERED}>Terdaftar</SelectItem>
                <SelectItem value={BpjsStatus.NOT_REGISTERED}>Belum Terdaftar</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        {bpjsStatus === BpjsStatus.REGISTERED && (
          <div className="grid md:grid-cols-2 gap-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
            <Field>
              <FieldLabel>Jenis BPJS</FieldLabel>
              <Select
                value={bpjsType || ""}
                disabled={isFormLocked}
                onValueChange={(v) => setValue(`employees.${index}.bpjsType`, v as BpjsType, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BpjsType.WAGE_EARNER}>Penerima Upah (PU)</SelectItem>
                  <SelectItem value={BpjsType.NON_WAGE_EARNER}>Bukan Penerima Upah (BPU)</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[(errors.employees as any)?.[index]?.bpjsType]} />
            </Field>
            <Field>
              <FieldLabel>Nomor Kartu BPJS</FieldLabel>
              <Input {...register(`employees.${index}.bpjsNumber`)} placeholder="Nomor kartu..." disabled={isFormLocked} />
              <FieldError errors={[(errors.employees as any)?.[index]?.bpjsNumber]} />
            </Field>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
          <div className="flex items-center space-x-2">
            <Switch
              id={`disability-${index}`}
              checked={hasDisability}
              disabled={isFormLocked}
              onCheckedChange={(v) => {
                setValue(`employees.${index}.hasDisability`, v, { shouldValidate: true, shouldDirty: true })
                if (!v) {
                  setValue(`employees.${index}.disabilityType`, "", { shouldValidate: true, shouldDirty: true })
                }
              }}
            />
            <Label htmlFor={`disability-${index}`} className="text-sm font-medium">Karyawan Disabilitas</Label>
          </div>

          {hasDisability && (
            <div className="flex-1">
              <Select
                value={disabilityType || ""}
                disabled={isFormLocked}
                onValueChange={(v) => setValue(`employees.${index}.disabilityType`, v, { shouldValidate: true, shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="disabilitas_daksa">Disabilitas Fisik (Daksa)</SelectItem>
                  <SelectItem value="disabilitas_netra">Disabilitas Sensorik (Netra)</SelectItem>
                  <SelectItem value="disabilitas_rungu">Disabilitas Sensorik (Rungu)</SelectItem>
                  <SelectItem value="disabilitas_wicara">Disabilitas Sensorik (Wicara)</SelectItem>
                  <SelectItem value="disabilitas_intelektual">Disabilitas Intelektual</SelectItem>
                  <SelectItem value="disabilitas_mental">Disabilitas Mental</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={[(errors.employees as any)?.[index]?.disabilityType]} />
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4 border-t border-muted/50">
          <div className="grid md:grid-cols-3 gap-6">
            <Field>
              <FieldLabel>Dokumen KTP</FieldLabel>
              <ImageUploadSingle
                value={ktpFile?.url || null}
                disabled={isFormLocked}
                onChange={(url) => {
                  if (url) {
                    const newFile = {
                      key: url.split("/").pop() || "image.jpg",
                      url,
                      name: "employee_ktp.jpg",
                      size: 0,
                      type: "image/jpeg",
                      category: "EMPLOYEE_KTP"
                    };
                    setValue(`employees.${index}.files`, [...employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_KTP"), newFile], { shouldValidate: true, shouldDirty: true });
                  } else {
                    setValue(`employees.${index}.files`, employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_KTP"), { shouldValidate: true, shouldDirty: true });
                  }
                }}
                label="Unggah KTP"
                aspect={1.586}
                category="EMPLOYEE_KTP"
              />
            </Field>

            <Field>
              <FieldLabel>Slip Gaji</FieldLabel>
              <ImageUploadSingle
                value={salaryFile?.url || null}
                disabled={isFormLocked}
                onChange={(url) => {
                  if (url) {
                    const newFile = {
                      key: url.split("/").pop() || "image.jpg",
                      url,
                      name: "employee_salary_slip.jpg",
                      size: 0,
                      type: "image/jpeg",
                      category: "EMPLOYEE_SALARY_SLIP"
                    };
                    setValue(`employees.${index}.files`, [...employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_SALARY_SLIP"), newFile], { shouldValidate: true, shouldDirty: true });
                  } else {
                    setValue(`employees.${index}.files`, employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_SALARY_SLIP"), { shouldValidate: true, shouldDirty: true });
                  }
                }}
                label="Unggah Slip Gaji"
                aspect={null}
                category="EMPLOYEE_SALARY_SLIP"
              />
            </Field>

            {bpjsStatus === BpjsStatus.REGISTERED && (
              <Field>
                <FieldLabel>Kartu BPJS</FieldLabel>
                <ImageUploadSingle
                  value={bpjsFile?.url || null}
                  disabled={isFormLocked}
                  onChange={(url) => {
                    if (url) {
                      const newFile = {
                        key: url.split("/").pop() || "image.jpg",
                        url,
                        name: "employee_bpjs_card.jpg",
                        size: 0,
                        type: "image/jpeg",
                        category: "EMPLOYEE_BPJS_CARD"
                      };
                      setValue(`employees.${index}.files`, [...employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_BPJS_CARD"), newFile], { shouldValidate: true, shouldDirty: true });
                    } else {
                      setValue(`employees.${index}.files`, employeeFiles.filter((f: any) => f.category !== "EMPLOYEE_BPJS_CARD"), { shouldValidate: true, shouldDirty: true });
                    }
                  }}
                  label="Unggah BPJS"
                  aspect={1.586}
                  category="EMPLOYEE_BPJS_CARD"
                />
              </Field>
            )}
          </div>
          <FieldError errors={[(errors.employees as any)?.[index]?.files]} />
        </div>
      </div>
    </div>
  )
}

export function EmployeeDataStep({ isEdit = false }: { isEdit?: boolean }) {
  const { control, watch } = useFormContext()
  const monthReport = watch("monthReport")
  const isMonth0 = monthReport === 0 || monthReport === "0"
  const isReadOnly = false
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId)

  const { fields, append, remove } = useFieldArray({
    control,
    name: "employees",
  })

  const defaultEmployee = {
    name: "",
    role: "",
    gender: Gender.MALE,
    hasDisability: false,
    disabilityType: "",
    employmentStatus: "permanen",
    nik: "",
    nikVerified: false,
    bpjsStatus: BpjsStatus.NOT_REGISTERED,
    files: [],
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div>
          <CardTitle>Data Karyawan</CardTitle>
          <CardDescription>Laporkan data karyawan yang bekerja saat ini.</CardDescription>
        </div>
        {!isReadOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultEmployee)}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Tambah Karyawan
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-xl bg-muted/30">
            <p className="text-sm text-muted-foreground">Belum ada data karyawan.</p>
            {!isReadOnly && (
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => append(defaultEmployee)}
              >
                Klik di sini untuk menambah
              </Button>
            )}
          </div>
        )}

        {fields.map((field, index) => (
          <EmployeeItem
            key={field.id}
            index={index}
            isReadOnly={isReadOnly}
            isEdit={isEdit}
            workspaceId={currentWorkspaceId}
            onRemove={() => remove(index)}
          />
        ))}
      </CardContent>
    </Card>
  )
}
