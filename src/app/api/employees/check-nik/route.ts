import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/employees/check-nik
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const searchParams = request.nextUrl.searchParams;
    const nik = searchParams.get("nik")?.trim();
    const workspaceId = searchParams.get("workspaceId")?.trim();
    const excludeEmployeeId = searchParams.get("excludeEmployeeId")?.trim();

    if (!nik || !workspaceId) {
      return errorResponse("nik and workspaceId are required", 400);
    }

    if (!/^\d{16}$/.test(nik)) {
      return jsonResponse({
        valid: false,
        reason: "FORMAT_INVALID",
        message: "NIK harus tepat 16 digit angka",
      });
    }

    // 1. Cek terhadap NIK Peserta/TKM (global via Profile.nik yang @unique)
    const existingProfile = await prisma.profile.findUnique({
      where: { nik },
      include: { applicant: true },
    });

    if (existingProfile?.applicant) {
      return jsonResponse({
        valid: false,
        reason: "IS_APPLICANT",
        message: `NIK sudah terdaftar atas nama Peserta/TKM: ${existingProfile.name}`,
      });
    }

    // 2. Cek terhadap Karyawan lain di workspace yang sama
    const whereEmployee: any = {
      nik,
      output: { workspaceId },
    };
    if (excludeEmployeeId) {
      whereEmployee.id = { not: excludeEmployeeId };
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: whereEmployee,
      include: {
        output: {
          include: {
            applicant: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (existingEmployee) {
      const applicantName = existingEmployee.output?.applicant?.profile?.name;
      const detail = applicantName ? ` pada kelompok usaha peserta ${applicantName}` : "";
      return jsonResponse({
        valid: false,
        reason: "DUPLICATE_IN_WORKSPACE",
        message: `NIK sudah terdaftar atas nama Karyawan: ${existingEmployee.name}${detail}`,
      });
    }

    return jsonResponse({
      valid: true,
      reason: "VALID",
      message: "NIK valid dan tersedia untuk didaftarkan",
    });
  } catch (error) {
    console.error("GET /api/employees/check-nik error:", error);
    return errorResponse("Gagal memeriksa NIK", 500);
  }
}
