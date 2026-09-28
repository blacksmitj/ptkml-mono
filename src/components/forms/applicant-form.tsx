"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Gender, CommunicationStatus, Willingness, PresenceStatus, FundDisbursement } from "@/types"
import { toast } from "sonner"
import { useRouter, useParams } from "next/navigation"
import { useUpdateApplicant } from "@/hooks/use-applicants"
import { ImageUploadSingle } from "@/components/ui/image-upload-single"
import { apiClient } from "@/lib/api-client"
import { User, Activity, MapPin, Loader2, Save, X, Briefcase } from "lucide-react"

export const BUSINESS_SECTORS = [
  "Industri Boga",
  "Industri Kreatif",
  "Perdagangan Barang dan Jasa",
  "Perikanan dan Kelautan",
  "Pertanian dan Peternakan",
] as const

const applicantSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter"),
  nik: z.string().length(16, "NIK harus 16 digit"),
  birthPlace: z.string().min(1, "Tempat lahir wajib diisi"),
  birthDate: z.string().min(1, "Tanggal lahir wajib diisi"),
  gender: z.nativeEnum(Gender),
  hasDisability: z.boolean(),
  disabilityType: z.string().optional().nullable(),
  email: z.string().email("Email tidak valid"),
  whatsapp: z.string().min(10, "Nomor WA minimal 10 digit"),
  photo: z.string().nullable().optional(),
  communicationStatus: z.nativeEnum(CommunicationStatus),
  willingness: z.nativeEnum(Willingness),
  reasonNotWilling: z.string().optional().nullable(),
  presenceStatus: z.nativeEnum(PresenceStatus),
  fundDisbursement: z.nativeEnum(FundDisbursement),
  businessProfile: z.object({
    businessName: z.string().min(1, "Nama usaha wajib diisi"),
    businessSector: z.string().min(1, "Sektor usaha wajib dipilih"),
    businessType: z.string().min(1, "Jenis usaha wajib diisi"),
    description: z.string().optional().nullable(),
    mainProduct: z.string().optional().nullable(),
  }),
  businessAddress: z.object({
    address: z.string().min(1, "Alamat usaha wajib diisi"),
    provinceId: z.string().min(1, "Provinsi wajib dipilih"),
    provinceName: z.string().min(1, "Nama Provinsi wajib diisi"),
    cityId: z.string().min(1, "Kabupaten/Kota wajib dipilih"),
    cityName: z.string().min(1, "Nama Kabupaten/Kota wajib diisi"),
    districtId: z.string().min(1, "Kecamatan wajib dipilih"),
    districtName: z.string().min(1, "Nama Kecamatan wajib diisi"),
    subdistrictId: z.string().min(1, "Kelurahan/Desa wajib dipilih"),
    subdistrictName: z.string().min(1, "Nama Kelurahan/Desa wajib diisi"),
    postalCode: z.string().min(1, "Kode Pos wajib diisi"),
  })
})

type ApplicantFormValues = z.infer<typeof applicantSchema>

export function ApplicantForm({ initialData }: { initialData?: any }) {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [activeTab, setActiveTab] = React.useState("identity")

  const form = useForm<ApplicantFormValues>({
    resolver: zodResolver(applicantSchema),
    defaultValues: initialData || {
      gender: Gender.MALE,
      hasDisability: false,
      disabilityType: "",
      communicationStatus: CommunicationStatus.RESPONDED,
      willingness: Willingness.WILLING,
      reasonNotWilling: "",
      presenceStatus: PresenceStatus.FOUND,
      fundDisbursement: FundDisbursement.NOT_DISBURSED,
      photo: null,
      businessProfile: {
        businessName: "",
        businessSector: "",
        businessType: "",
        description: "",
        mainProduct: "",
      },
      businessAddress: {
        address: "",
        provinceId: "",
        provinceName: "",
        cityId: "",
        cityName: "",
        districtId: "",
        districtName: "",
        subdistrictId: "",
        subdistrictName: "",
        postalCode: "",
      }
    },
  })

  const { mutate: updateApplicant, isPending } = useUpdateApplicant()

  const [provinces, setProvinces] = React.useState<any[]>([])
  const [cities, setCities] = React.useState<any[]>([])
  const [districts, setDistricts] = React.useState<any[]>([])
  const [subdistricts, setSubdistricts] = React.useState<any[]>([])

  // Watch form fields
  const watchProvinceId = form.watch("businessAddress.provinceId")
  const watchCityId = form.watch("businessAddress.cityId")
  const watchDistrictId = form.watch("businessAddress.districtId")
  const watchHasDisability = form.watch("hasDisability")
  const watchWillingness = form.watch("willingness")

  // Load provinces on mount
  React.useEffect(() => {
    apiClient.get("/provinces")
      .then((res) => setProvinces(res.data))
      .catch((err) => console.error("Failed to load provinces", err))
  }, [])

  // Load cities when province changes
  React.useEffect(() => {
    if (!watchProvinceId) {
      setCities([])
      return
    }
    apiClient.get("/cities", { params: { provinceId: watchProvinceId } })
      .then((res) => setCities(res.data))
      .catch((err) => console.error("Failed to load cities", err))
  }, [watchProvinceId])

  // Load districts when city changes
  React.useEffect(() => {
    if (!watchCityId) {
      setDistricts([])
      return
    }
    apiClient.get("/districts", { params: { cityId: watchCityId } })
      .then((res) => setDistricts(res.data))
      .catch((err) => console.error("Failed to load districts", err))
  }, [watchCityId])

  // Load subdistricts when district changes
  React.useEffect(() => {
    if (!watchDistrictId) {
      setSubdistricts([])
      return
    }
    apiClient.get("/subdistricts", { params: { districtId: watchDistrictId } })
      .then((res) => setSubdistricts(res.data))
      .catch((err) => console.error("Failed to load subdistricts", err))
  }, [watchDistrictId])

  const onSubmit = (data: ApplicantFormValues) => {
    if (!id) {
      toast.error("ID Peserta tidak ditemukan")
      return
    }

    updateApplicant({
      id,
      ...data,
    }, {
      onSuccess: () => {
        toast.success("Profil peserta berhasil diperbarui")
        router.push(`/applicants/${id}`)
      },
      onError: (error: any) => {
        toast.error(error.message || "Gagal memperbarui profil")
      }
    })
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab Navigation Headers */}
        <TabsList className="grid grid-cols-4 w-full h-12 bg-muted/60 p-1 rounded-xl">
          <TabsTrigger
            value="identity"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Identitas & Kontak</span>
            <span className="sm:hidden">Identitas</span>
          </TabsTrigger>
          <TabsTrigger
            value="business"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Profil Usaha</span>
            <span className="sm:hidden">Usaha</span>
          </TabsTrigger>
          <TabsTrigger
            value="address"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Alamat Usaha</span>
            <span className="sm:hidden">Alamat</span>
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="flex items-center gap-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Status Pendampingan</span>
            <span className="sm:hidden">Status</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: IDENTITAS & KONTAK */}
        <TabsContent value="identity" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Identitas Pribadi</CardTitle>
              <CardDescription>
                Informasi identitas pendaftar. Jenis kelamin, status disabilitas, dan kontak dapat diperbarui.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Foto Diri */}
                <div className="md:col-span-1 flex flex-col items-center justify-center p-6 border rounded-xl bg-muted/10 gap-3">
                  <Field className="flex flex-col items-center">
                    <FieldLabel className="mb-2">Foto Diri</FieldLabel>
                    <ImageUploadSingle
                      value={form.watch("photo")}
                      onChange={(url) => form.setValue("photo", url)}
                      maxSize={2}
                      label="Unggah Foto"
                      category="APPLICANT_PHOTO"
                    />
                    <FieldError errors={[form.formState.errors.photo]} />
                  </Field>
                </div>

                {/* Data Diri Utama */}
                <div className="md:col-span-2 space-y-6">
                  <FieldGroup className="grid md:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel>Nama Lengkap</FieldLabel>
                      <Input {...form.register("name")} />
                      <FieldError errors={[form.formState.errors.name]} />
                    </Field>
                    <Field>
                      <FieldLabel>NIK (Read-only)</FieldLabel>
                      <Input {...form.register("nik")} maxLength={16} disabled className="bg-muted/50 font-mono" />
                      <FieldError errors={[form.formState.errors.nik]} />
                    </Field>
                  </FieldGroup>

                  <FieldGroup className="grid md:grid-cols-2 gap-6">
                    <Field>
                      <FieldLabel>Tempat Lahir (Read-only)</FieldLabel>
                      <Input {...form.register("birthPlace")} disabled className="bg-muted/50" />
                      <FieldError errors={[form.formState.errors.birthPlace]} />
                    </Field>
                    <Field>
                      <FieldLabel>Tanggal Lahir (Read-only)</FieldLabel>
                      <Input type="date" {...form.register("birthDate")} disabled className="bg-muted/50" />
                      <FieldError errors={[form.formState.errors.birthDate]} />
                    </Field>
                  </FieldGroup>
                </div>
              </div>

              {/* Jenis Kelamin & Disabilitas */}
              <FieldGroup className="grid md:grid-cols-3 gap-6 pt-2 border-t">
                <Field>
                  <FieldLabel>Jenis Kelamin</FieldLabel>
                  <Select
                    value={form.watch("gender")}
                    onValueChange={(v) => form.setValue("gender", v as Gender, { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Gender.MALE}>Laki-laki</SelectItem>
                      <SelectItem value={Gender.FEMALE}>Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.gender]} />
                </Field>

                <Field>
                  <FieldLabel>Penyandang Disabilitas</FieldLabel>
                  <Select
                    value={watchHasDisability ? "YA" : "TIDAK"}
                    onValueChange={(v) => {
                      const hasDis = v === "YA"
                      form.setValue("hasDisability", hasDis, { shouldValidate: true, shouldDirty: true })
                      if (!hasDis) {
                        form.setValue("disabilityType", "")
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TIDAK">Bukan Disabilitas</SelectItem>
                      <SelectItem value="YA">Penyandang Disabilitas</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.hasDisability]} />
                </Field>

                {watchHasDisability && (
                  <Field>
                    <FieldLabel>Jenis Disabilitas</FieldLabel>
                    <Input
                      {...form.register("disabilityType")}
                      placeholder="Contoh: Fisik, Sensorik Netra, dll."
                    />
                    <FieldError errors={[form.formState.errors.disabilityType]} />
                  </Field>
                )}
              </FieldGroup>

              {/* Kontak */}
              <FieldGroup className="grid md:grid-cols-2 gap-6 pt-2 border-t">
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" {...form.register("email")} placeholder="nama@email.com" />
                  <FieldError errors={[form.formState.errors.email]} />
                </Field>
                <Field>
                  <FieldLabel>WhatsApp</FieldLabel>
                  <Input {...form.register("whatsapp")} placeholder="08xxxxxxxxxx" />
                  <FieldError errors={[form.formState.errors.whatsapp]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: PROFIL USAHA */}
        <TabsContent value="business" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Profil Usaha</CardTitle>
              <CardDescription>
                Informasi detail terkait usaha binaan peserta. Sektor usaha dibatasi sesuai ketentuan program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup className="grid md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel>Nama Usaha</FieldLabel>
                  <Input
                    {...form.register("businessProfile.businessName")}
                    placeholder="Contoh: Kripik Singkong Barokah"
                  />
                  <FieldError errors={[form.formState.errors.businessProfile?.businessName]} />
                </Field>

                <Field>
                  <FieldLabel>Sektor Usaha</FieldLabel>
                  <Select
                    value={form.watch("businessProfile.businessSector") || ""}
                    onValueChange={(v) =>
                      form.setValue("businessProfile.businessSector", v, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Sektor Usaha" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_SECTORS.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.businessProfile?.businessSector]} />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel>Jenis Usaha</FieldLabel>
                  <Input
                    {...form.register("businessProfile.businessType")}
                    placeholder="Contoh: Mikro / Olahan Makanan"
                  />
                  <FieldError errors={[form.formState.errors.businessProfile?.businessType]} />
                </Field>

                <Field>
                  <FieldLabel>Produk Utama</FieldLabel>
                  <Input
                    {...form.register("businessProfile.mainProduct")}
                    placeholder="Contoh: Keripik Singkong Balado"
                  />
                  <FieldError errors={[form.formState.errors.businessProfile?.mainProduct]} />
                </Field>
              </FieldGroup>

              <Field>
                <FieldLabel>Deskripsi Usaha</FieldLabel>
                <Textarea
                  {...form.register("businessProfile.description")}
                  placeholder="Ceritakan gambaran singkat aktivitas dan proses operasional usaha..."
                  className="min-h-[100px]"
                />
                <FieldError errors={[form.formState.errors.businessProfile?.description]} />
              </Field>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: STATUS PENDAMPINGAN */}
        <TabsContent value="status" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Status Pendampingan</CardTitle>
              <CardDescription>
                Kelola status komunikasi, kesediaan, keberadaan peserta, dan penyaluran dana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <Field>
                  <FieldLabel>Status Komunikasi</FieldLabel>
                  <Select
                    value={form.watch("communicationStatus")}
                    onValueChange={(v) => form.setValue("communicationStatus", v as CommunicationStatus, { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CommunicationStatus.RESPONDED}>Merespon</SelectItem>
                      <SelectItem value={CommunicationStatus.NO_RESPONSE}>Tidak Merespon</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.communicationStatus]} />
                </Field>

                <Field>
                  <FieldLabel>Status Keberadaan</FieldLabel>
                  <Select
                    value={form.watch("presenceStatus")}
                    onValueChange={(v) => form.setValue("presenceStatus", v as PresenceStatus, { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PresenceStatus.FOUND}>Ditemukan</SelectItem>
                      <SelectItem value={PresenceStatus.NOT_FOUND}>Tidak Ditemukan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.presenceStatus]} />
                </Field>

                <Field>
                  <FieldLabel>Penyaluran Dana</FieldLabel>
                  <Select
                    value={form.watch("fundDisbursement")}
                    onValueChange={(v) => form.setValue("fundDisbursement", v as FundDisbursement, { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FundDisbursement.DISBURSED}>Sudah Disalurkan</SelectItem>
                      <SelectItem value={FundDisbursement.NOT_DISBURSED}>Belum Disalurkan</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.fundDisbursement]} />
                </Field>

                <Field>
                  <FieldLabel>Kesediaan Pendampingan</FieldLabel>
                  <Select
                    value={form.watch("willingness")}
                    onValueChange={(v) => form.setValue("willingness", v as Willingness, { shouldValidate: true, shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={Willingness.WILLING}>Bersedia</SelectItem>
                      <SelectItem value={Willingness.NOT_WILLING}>Tidak Bersedia</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.willingness]} />
                </Field>
              </FieldGroup>

              {watchWillingness === Willingness.NOT_WILLING && (
                <Field className="pt-2 border-t">
                  <FieldLabel>Alasan Tidak Bersedia</FieldLabel>
                  <Textarea
                    {...form.register("reasonNotWilling")}
                    placeholder="Tuliskan alasan peserta tidak bersedia mengikuti pendampingan..."
                    className="min-h-[100px]"
                  />
                  <FieldError errors={[form.formState.errors.reasonNotWilling]} />
                </Field>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: ALAMAT USAHA */}
        <TabsContent value="address" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Alamat Lokasi Usaha</CardTitle>
              <CardDescription>
                Sesuaikan informasi wilayah provinsi, kota/kabupaten, kecamatan, kelurahan, dan alamat jalan usaha.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FieldGroup className="grid md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel>Provinsi</FieldLabel>
                  <Select
                    value={form.watch("businessAddress.provinceId") || ""}
                    onValueChange={(v) => {
                      const name = provinces.find((p) => p.id === v)?.name || ""
                      form.setValue("businessAddress.provinceId", v, { shouldValidate: true, shouldDirty: true })
                      form.setValue("businessAddress.provinceName", name)
                      // Reset child fields
                      form.setValue("businessAddress.cityId", "")
                      form.setValue("businessAddress.cityName", "")
                      form.setValue("businessAddress.districtId", "")
                      form.setValue("businessAddress.districtName", "")
                      form.setValue("businessAddress.subdistrictId", "")
                      form.setValue("businessAddress.subdistrictName", "")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Provinsi" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((prov) => (
                        <SelectItem key={prov.id} value={prov.id}>
                          {prov.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.businessAddress?.provinceId]} />
                </Field>

                <Field>
                  <FieldLabel>Kabupaten / Kota</FieldLabel>
                  <Select
                    value={form.watch("businessAddress.cityId") || ""}
                    disabled={!watchProvinceId}
                    onValueChange={(v) => {
                      const name = cities.find((c) => c.id === v)?.name || ""
                      form.setValue("businessAddress.cityId", v, { shouldValidate: true, shouldDirty: true })
                      form.setValue("businessAddress.cityName", name)
                      // Reset child fields
                      form.setValue("businessAddress.districtId", "")
                      form.setValue("businessAddress.districtName", "")
                      form.setValue("businessAddress.subdistrictId", "")
                      form.setValue("businessAddress.subdistrictName", "")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!watchProvinceId ? "Pilih Provinsi terlebih dahulu" : "Pilih Kabupaten/Kota"} />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem key={city.id} value={city.id}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.businessAddress?.cityId]} />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid md:grid-cols-2 gap-6">
                <Field>
                  <FieldLabel>Kecamatan</FieldLabel>
                  <Select
                    value={form.watch("businessAddress.districtId") || ""}
                    disabled={!watchCityId}
                    onValueChange={(v) => {
                      const name = districts.find((d) => d.id === v)?.name || ""
                      form.setValue("businessAddress.districtId", v, { shouldValidate: true, shouldDirty: true })
                      form.setValue("businessAddress.districtName", name)
                      // Reset child fields
                      form.setValue("businessAddress.subdistrictId", "")
                      form.setValue("businessAddress.subdistrictName", "")
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!watchCityId ? "Pilih Kabupaten/Kota terlebih dahulu" : "Pilih Kecamatan"} />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.businessAddress?.districtId]} />
                </Field>

                <Field>
                  <FieldLabel>Kelurahan / Desa</FieldLabel>
                  <Select
                    value={form.watch("businessAddress.subdistrictId") || ""}
                    disabled={!watchDistrictId}
                    onValueChange={(v) => {
                      const name = subdistricts.find((s) => s.id === v)?.name || ""
                      form.setValue("businessAddress.subdistrictId", v, { shouldValidate: true, shouldDirty: true })
                      form.setValue("businessAddress.subdistrictName", name)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={!watchDistrictId ? "Pilih Kecamatan terlebih dahulu" : "Pilih Kelurahan/Desa"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subdistricts.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[form.formState.errors.businessAddress?.subdistrictId]} />
                </Field>
              </FieldGroup>

              <FieldGroup className="grid md:grid-cols-3 gap-6">
                <Field className="md:col-span-2">
                  <FieldLabel>Alamat Lengkap Usaha</FieldLabel>
                  <Input {...form.register("businessAddress.address")} placeholder="Jalan, RT/RW, Dusun, Patokan..." />
                  <FieldError errors={[form.formState.errors.businessAddress?.address]} />
                </Field>

                <Field>
                  <FieldLabel>Kode Pos</FieldLabel>
                  <Input {...form.register("businessAddress.postalCode")} placeholder="Contoh: 40551" />
                  <FieldError errors={[form.formState.errors.businessAddress?.postalCode]} />
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Persistent Global Action Bar */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t sticky bottom-0 bg-background/80 backdrop-blur-md py-4 z-10">
        <Button variant="outline" type="button" onClick={() => router.back()} disabled={isPending}>
          <X className="h-4 w-4 mr-1.5" />
          Batal
        </Button>
        <Button type="submit" disabled={isPending} className="min-w-[150px]">
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
