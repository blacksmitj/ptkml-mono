"use client"

import { ApplicantForm } from "@/components/forms/applicant-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import * as React from "react";
import { useApplicant } from "@/hooks/use-applicants";
import { useAppStore } from "@/store/use-app-store";

export default function EditApplicantPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const currentRole = useAppStore((state) => state.currentRole);

  const { data: applicant, isLoading } = useApplicant(id);

  if (currentRole === "WORKSPACE_SUPERVISOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Pengawas Workspace tidak diizinkan mengubah data (Read-Only).</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const initialData = React.useMemo(() => {
    if (!applicant) return null;
    const profile = applicant.profile;
    
    let formattedBirthDate = "";
    if (profile?.birthDate) {
      try {
        formattedBirthDate = new Date(profile.birthDate).toISOString().split("T")[0];
      } catch (e) {
        console.error("Failed to parse birth date:", e);
      }
    }

    const businessAddress = profile?.addresses?.find((a: any) => a.label === "BUSINESS") || null;

    return {
      name: profile?.name || "",
      nik: profile?.nik || "",
      birthPlace: profile?.birthPlace || "",
      birthDate: formattedBirthDate,
      gender: profile?.gender || "MALE",
      email: profile?.email || "",
      whatsapp: profile?.whatsapp || "",
      photo: profile?.photo || null,
      hasDisability: Boolean(profile?.hasDisability),
      disabilityType: profile?.disabilityType || "",
      communicationStatus: applicant.communicationStatus,
      willingness: applicant.willingness,
      presenceStatus: applicant.presenceStatus,
      fundDisbursement: applicant.fundDisbursement,
      businessProfile: {
        businessName: applicant.businessProfile?.businessName || "",
        businessSector: applicant.businessProfile?.businessSector || "",
        businessType: applicant.businessProfile?.businessType || "",
        description: applicant.businessProfile?.description || "",
        mainProduct: applicant.businessProfile?.mainProduct || "",
      },
      businessAddress: businessAddress ? {
        address: businessAddress.address || "",
        provinceId: businessAddress.provinceId || "",
        provinceName: businessAddress.provinceName || "",
        cityId: businessAddress.cityId || "",
        cityName: businessAddress.cityName || "",
        districtId: businessAddress.districtId || "",
        districtName: businessAddress.districtName || "",
        subdistrictId: businessAddress.subdistrictId || "",
        subdistrictName: businessAddress.subdistrictName || "",
        postalCode: businessAddress.postalCode || "",
      } : {
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
    };
  }, [applicant]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-48">Memuat data peserta...</div>;
  }

  if (!applicant || !initialData) {
    return <div>Data tidak ditemukan.</div>
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Profil Peserta</h1>
          <p className="text-muted-foreground">Perbarui informasi detail peserta {applicant.profile?.name}.</p>
        </div>
      </div>

      <ApplicantForm initialData={initialData} />
    </div>
  )
}
