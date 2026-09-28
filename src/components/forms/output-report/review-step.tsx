import { useFormContext, Controller } from "react-hook-form"
import { AlertCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export function ReviewStep({ 
  initialData 
}: { 
  applicants?: { id: string, name: string }[],
  initialData?: any 
}) {
  const { control, formState } = useFormContext()
  const errors = formState.errors
  
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <Controller
          control={control}
          name="hasRemindLpj"
          render={({ field }) => (
            <div
              className={`flex items-center space-x-3 p-4 border rounded-xl bg-background shadow-sm transition-all ${
                errors.hasRemindLpj ? "border-destructive/50 bg-destructive/5" : "border-muted hover:border-primary/20"
              }`}
            >
              <Switch
                id="hasRemindLpj"
                checked={Boolean(field.value)}
                onCheckedChange={field.onChange}
              />
              <div className="space-y-0.5 select-none flex-1">
                <Label htmlFor="hasRemindLpj" className="text-sm font-semibold cursor-pointer flex items-center gap-1.5">
                  Sudah Mengingatkan LPJ <span className="text-destructive font-bold">*</span>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Konfirmasi wajib: apakah pendamping/petugas sudah mengingatkan pihak penerima bantuan (TKML) mengenai kewajiban Laporan Pertanggungjawaban (LPJ).
                </p>
              </div>
            </div>
          )}
        />
        {errors.hasRemindLpj && (
          <p className="text-[11px] text-destructive mt-1.5 font-semibold flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {(errors.hasRemindLpj as any).message}
          </p>
        )}
      </div>
    </div>
  )
}
