import { useFormContext, useWatch } from "react-hook-form"
import {
  FieldError,
} from "@/components/ui/field"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users } from "lucide-react"
import { ApplicantTransferList } from "../applicant-transfer-list"

export function ParticipantsStep({ applicants }: { applicants: { id: string, name: string }[] }) {
  const { control, setValue, formState } = useFormContext()
  const errors = formState.errors
  const selectedApplicants = useWatch({ control, name: "applicants" }) ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          Peserta Pendampingan
        </CardTitle>
        <CardDescription>Pilih satu atau lebih peserta yang hadir dalam kegiatan ini.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <ApplicantTransferList 
            available={applicants}
            selected={selectedApplicants}
            onChange={(selected) => setValue("applicants", selected, { shouldValidate: true })}
          />
          <FieldError errors={[errors.applicants as any]} />
        </div>
      </CardContent>
    </Card>
  )
}
