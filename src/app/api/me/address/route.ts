import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth-session";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const addressSchema = z.object({
  label: z.string().optional(),
  address: z.string().min(1, "Alamat wajib diisi"),
  provinceId: z.string().min(1, "Provinsi wajib diisi"),
  cityId: z.string().min(1, "Kota/Kabupaten wajib diisi"),
  districtId: z.string().min(1, "Kecamatan wajib diisi"),
  subdistrictId: z.string().min(1, "Kelurahan/Desa wajib diisi"),
  postalCode: z.string().min(1, "Kode pos wajib diisi"),
});

export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getSessionUserId(request);
    if (!currentUserId) {
      return errorResponse("Unauthorized", 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { profileId: true },
    });

    if (!user || !user.profileId) {
      return errorResponse("Profile not found", 404);
    }

    const { data: body, error } = await parseBody(request, addressSchema);
    if (error || !body) {
      return errorResponse(error || "Semua kolom alamat wajib diisi", 400);
    }

    // Fetch names from master region tables
    const [province, city, district, subdistrict] = await Promise.all([
      prisma.province.findUnique({ where: { id: body.provinceId } }),
      prisma.city.findUnique({ where: { id: body.cityId } }),
      prisma.district.findUnique({ where: { id: body.districtId } }),
      prisma.subdistrict.findUnique({ where: { id: body.subdistrictId } }),
    ]);

    const provinceName = province?.name || "";
    const cityName = city?.name || "";
    const districtName = district?.name || "";
    const subdistrictName = subdistrict?.name || "";

    // Check if user already has an address
    const existingAddress = await prisma.address.findFirst({
      where: { profileId: user.profileId },
    });

    let savedAddress;
    if (existingAddress) {
      savedAddress = await prisma.address.update({
        where: { id: existingAddress.id },
        data: {
          label: body.label || "Domisili",
          address: body.address,
          provinceId: body.provinceId,
          provinceName,
          cityId: body.cityId,
          cityName,
          districtId: body.districtId,
          districtName,
          subdistrictId: body.subdistrictId,
          subdistrictName,
          postalCode: body.postalCode,
        },
      });
    } else {
      savedAddress = await prisma.address.create({
        data: {
          label: body.label || "Domisili",
          address: body.address,
          provinceId: body.provinceId,
          provinceName,
          cityId: body.cityId,
          cityName,
          districtId: body.districtId,
          districtName,
          subdistrictId: body.subdistrictId,
          subdistrictName,
          postalCode: body.postalCode,
          profileId: user.profileId,
        },
      });
    }

    return jsonResponse({
      success: true,
      message: "Alamat berhasil disimpan",
      data: savedAddress,
    });
  } catch (err) {
    console.error("PUT /api/me/address error:", err);
    return errorResponse("Gagal menyimpan alamat", 500);
  }
}
