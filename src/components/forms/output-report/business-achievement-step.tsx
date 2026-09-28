import { useFormContext, useWatch, Controller } from "react-hook-form"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputRupiah } from "@/components/ui/input-rupiah"
import { InputNumber } from "@/components/ui/input-number"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { MarketingArea } from "@/types"
import { Info, AlertTriangle } from "lucide-react"
import { formatNumber } from "@/lib/utils"

export function BusinessAchievementStep() {
  const { register, watch, setValue, control, formState } = useFormContext()
  const errors = formState.errors
  const businessCondition = useWatch({ control, name: "businessCondition" })
  const productionCapacity = useWatch({ control, name: "productionCapacity" }) || 0
  const salesVolume = useWatch({ control, name: "salesVolume" }) || 0

  const isSalesHigher = Number(salesVolume) > Number(productionCapacity)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Produksi & Penjualan</CardTitle>
        <CardDescription>Masukkan data kapasitas produksi dan volume penjualan bulan ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FieldGroup className="grid md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel>Kapasitas Produksi</FieldLabel>
            <div className="flex gap-2">
              <Controller
                name="productionCapacity"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onChange={field.onChange}
                    onFocus={(e) => e.target.select()}
                    className="flex-1"
                  />
                )}
              />
              <div className="relative group">
                <Input {...register("productionCapacityUnit")} disabled className="w-24 bg-muted cursor-not-allowed opacity-100" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded border shadow-sm whitespace-nowrap z-10">
                  Diatur di Tahap 1
                </div>
              </div>
            </div>
            <FieldError errors={[errors.productionCapacity, errors.productionCapacityUnit]} />
          </Field>
          <Field>
            <FieldLabel>Volume Penjualan</FieldLabel>
            <div className="flex gap-2">
              <Controller
                name="salesVolume"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    value={field.value}
                    onChange={field.onChange}
                    onFocus={(e) => e.target.select()}
                    className="flex-1"
                  />
                )}
              />
              <div className="relative group">
                <Input {...register("salesVolumeUnit")} disabled className="w-24 bg-muted cursor-not-allowed opacity-100" />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded border shadow-sm whitespace-nowrap z-10">
                  Diatur di Tahap 1
                </div>
              </div>
            </div>
            <FieldError errors={[errors.salesVolume, errors.salesVolumeUnit]} />
          </Field>
        </FieldGroup>

        {isSalesHigher && (
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-1 duration-200">
            <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Peringatan: Volume Penjualan Melebihi Kapasitas Produksi
              </p>
              <p className="text-xs text-amber-700/90 dark:text-amber-300/80 leading-relaxed">
                Volume penjualan ({formatNumber(salesVolume)} {watch("salesVolumeUnit") || "unit"}) tercatat lebih tinggi dari kapasitas produksi ({formatNumber(productionCapacity)} {watch("productionCapacityUnit") || "unit"}). Pastikan data yang dimasukkan sudah benar.
              </p>
            </div>
          </div>
        )}

        <FieldGroup className="grid md:grid-cols-2 gap-6">
          <Field>
            <FieldLabel>Wilayah Pemasaran Terluas</FieldLabel>
            <Controller
              name="marketingArea"
              control={control}
              render={({ field }) => (
                <Select 
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih wilayah pemasaran" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MarketingArea.VILLAGE}>Desa/Kelurahan</SelectItem>
                    <SelectItem value={MarketingArea.DISTRICT}>Kecamatan</SelectItem>
                    <SelectItem value={MarketingArea.CITY}>Kabupaten/Kota</SelectItem>
                    <SelectItem value={MarketingArea.PROVINCE}>Provinsi</SelectItem>
                    <SelectItem value={MarketingArea.INTERNATIONAL}>Internasional</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.marketingArea]} />
          </Field>
          <Field>
            <FieldLabel>Total Omzet (IDR)</FieldLabel>
            <Controller
              name="revenue"
              control={control}
              render={({ field }) => (
                <InputRupiah
                  value={field.value}
                  onChange={field.onChange}
                  onFocus={(e) => e.target.select()}
                />
              )}
            />
            <FieldError errors={[errors.revenue]} />
          </Field>
        </FieldGroup>

        <div className="flex items-center gap-4 p-4 rounded-xl border bg-muted/10">
          <div>
            <p className="text-sm font-bold text-foreground">Status Omzet (Otomatis)</p>
            <p className="text-xs text-muted-foreground mt-0.5">Dihitung otomatis berdasarkan perbandingan omset dengan bulan sebelumnya.</p>
          </div>
          <div className="ml-auto">
            {businessCondition === "meningkat" && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                ▲ Meningkat
              </span>
            )}
            {(businessCondition === "stabil" || businessCondition === "tetap") && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 border border-slate-500/20">
                ■ Tetap
              </span>
            )}
            {businessCondition === "turun" && (
              <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20">
                ▼ Turun
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs text-muted-foreground italic">
          <Info className="h-4 w-4 text-primary" />
          Satuan unit ({watch("productionCapacityUnit")}) dikunci karena telah diatur pada tahap Peserta & Periode.
        </div>
      </CardContent>
    </Card>
  )
}
