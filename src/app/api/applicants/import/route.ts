import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { clearApplicantsCache } from "@/lib/cache-helpers";
import { resolveLocationHierarchy } from "@/lib/region-normalizer";
import { parseExcelDate } from "@/lib/applicant-helpers";
import { Gender } from "@prisma/client";
import { z } from "zod";

function mapMarketingArea(val: string): string | null {
  const map: Record<string, string> = {
    "dalam satu desa": "VILLAGE",
    "antar desa": "VILLAGE",
    "antar kecamatan": "DISTRICT",
    "antar kabupaten/kota": "CITY",
    "antar kabupaten": "CITY",
    "antar kota": "CITY",
    "antar provinsi": "PROVINCE",
    "antar negara": "INTERNATIONAL",
    "desa": "VILLAGE",
    "kelurahan": "VILLAGE",
    "kecamatan": "DISTRICT",
    "kabupaten": "CITY",
    "kota": "CITY",
    "provinsi": "PROVINCE",
    "nasional": "PROVINCE",
    "internasional": "INTERNATIONAL",
    "ekspor": "INTERNATIONAL",
    "international": "INTERNATIONAL",
  };
  const normalized = String(val || "").trim().toLowerCase();
  if (map[normalized]) return map[normalized];
  for (const [key, enumVal] of Object.entries(map)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return enumVal;
    }
  }
  return null;
}

function buildBaselineData(row: any): {
  revenue: number;
  productionQty: number;
  productionUnit: string;
  marketingArea: string;
} {
  const rawRevenue = String(row.omset_per_periode || "").replace(/[^0-9.]/g, "");
  const parsedRev = parseFloat(rawRevenue);
  const revenue = !isNaN(parsedRev) && isFinite(parsedRev) ? parsedRev : 0;

  const rawProduction = String(row.jumlah_produk_per_periode || "").replace(/[^0-9.]/g, "");
  const parsedProd = parseFloat(rawProduction);
  const productionQty = !isNaN(parsedProd) && isFinite(parsedProd) ? parsedProd : 0;

  const rawUnit = String(row.satuan_jumlah_produk_per_periode || "").trim();
  const productionUnit = rawUnit || "Pcs";

  const marketingArea = mapMarketingArea(row.wilayah_pemasaran) || "DISTRICT";

  return {
    revenue,
    productionQty,
    productionUnit,
    marketingArea,
  };
}

const importSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId diperlukan"),
  dryRun: z.boolean().optional().default(false),
  rows: z.array(z.record(z.string(), z.any())).min(1, "rows array diperlukan"),
});

const REQUIRED_FIELDS: { key: string; label: string }[] = [
  { key: "id_tkm", label: "ID TKM" },
  { key: "nama_pendaftar", label: "Nama Pendaftar" },
  { key: "nik_pendaftar", label: "NIK Pendaftar" },
  { key: "email", label: "Email" },
  { key: "jenis_kelamin", label: "Jenis Kelamin" },
  { key: "pendidikan_terakhir", label: "Pendidikan Terakhir" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "upload_foto_diri", label: "Foto Peserta (URL)" },
  { key: "tempat_lahir", label: "Tempat Lahir" },
  { key: "tanggal_lahir", label: "Tanggal Lahir" },
  { key: "apakah_penyandang_disabilitas", label: "Apakah Penyandang Disabilitas" },
  { key: "jenis_disabilitas", label: "Jenis Disabilitas" },
  { key: "alamat_ktp", label: "Alamat KTP" },
  { key: "provinsi_ktp", label: "Provinsi KTP" },
  { key: "kabupaten_ktp", label: "Kabupaten/Kota KTP" },
  { key: "kecamatan_ktp", label: "Kecamatan KTP" },
  { key: "kelurahan_ktp", label: "Kelurahan/Desa KTP" },
  { key: "kode_pos_ktp", label: "Kode Pos KTP" },
  { key: "alamat_domisili", label: "Alamat Domisili" },
  { key: "provinsi_domisili", label: "Provinsi Domisili" },
  { key: "kabupaten_domisili", label: "Kabupaten/Kota Domisili" },
  { key: "kecamatan_domisili", label: "Kecamatan Domisili" },
  { key: "kelurahan_domisili", label: "Kelurahan/Desa Domisili" },
  { key: "kode_pos_domisili", label: "Kode Pos Domisili" },
  { key: "alamat_usaha", label: "Alamat Usaha" },
  { key: "provinsi_usaha", label: "Provinsi Usaha" },
  { key: "kabupaten_usaha", label: "Kabupaten/Kota Usaha" },
  { key: "kecamatan_usaha", label: "Kecamatan Usaha" },
  { key: "kelurahan_usaha", label: "Kelurahan/Desa Usaha" },
  { key: "kode_pos_usaha", label: "Kode Pos Usaha" },
  { key: "nama_usaha", label: "Nama Usaha" },
  { key: "sektor_usaha", label: "Sektor Usaha" },
  { key: "jenis_usaha", label: "Jenis Usaha" },
  { key: "deskripsi_usaha", label: "Deskripsi Usaha" },
  { key: "produk_utama", label: "Produk Utama" },
  { key: "omset_per_periode", label: "Omset Per Periode" },
  { key: "jumlah_produk_per_periode", label: "Jumlah Produk Per Periode" },
  { key: "satuan_jumlah_produk_per_periode", label: "Satuan Jumlah Produk Per Periode" },
  { key: "wilayah_pemasaran", label: "Wilayah Pemasaran" },
];

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, importSchema);
    const { workspaceId, dryRun, rows } = body;

    const authWorkspace = await requireWorkspaceWriteAccess(request, workspaceId);
    if (!authWorkspace.ok) return authWorkspace.response;

    const { user } = authWorkspace.data;
    if (user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Akses ditolak: Hanya Super Admin yang diizinkan mengimpor peserta", 403);
    }

    const existingNiks = new Set<string>();
    const existingTkms = new Set<string>();

    const nikKeys: string[] = [];
    const tkmKeys: string[] = [];

    if (rows.length > 0) {
      for (const key of Object.keys(rows[0])) {
        const norm = key.trim().toLowerCase().replace(/\s+/g, "_");
        if (norm === "nik_pendaftar") nikKeys.push(key);
        if (norm === "id_tkm") tkmKeys.push(key);
      }
    }

    const rawNiks = Array.from(
      new Set(
        rows
          .map((r) => {
            for (const k of nikKeys) {
              if (r[k]) return String(r[k]).trim();
            }
            return "";
          })
          .filter(Boolean)
      )
    );

    const rawTkms = Array.from(
      new Set(
        rows
          .map((r) => {
            for (const k of tkmKeys) {
              if (r[k]) return String(r[k]).trim();
            }
            return "";
          })
          .filter(Boolean)
      )
    );

    const dbChunkSize = 1000;
    for (let i = 0; i < rawNiks.length; i += dbChunkSize) {
      const chunk = rawNiks.slice(i, i + dbChunkSize);
      const dbApplicants = await prisma.applicant.findMany({
        where: { profile: { nik: { in: chunk } } },
        select: { profile: { select: { nik: true } } },
      });
      for (const a of dbApplicants) {
        if (a.profile?.nik) {
          existingNiks.add(a.profile.nik);
        }
      }
    }

    for (let i = 0; i < rawTkms.length; i += dbChunkSize) {
      const chunk = rawTkms.slice(i, i + dbChunkSize);
      const dbApplicants = await prisma.applicant.findMany({
        where: { idTkm: { in: chunk } },
        select: { idTkm: true },
      });
      for (const a of dbApplicants) {
        existingTkms.add(a.idTkm);
      }
    }

    let complete = 0;
    let duplicates = 0;
    let failed = 0;
    const dataLogs: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalizedRow: any = {};
      for (const key of Object.keys(row)) {
        const normKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        normalizedRow[normKey] = row[key];
      }

      const idTkm = normalizedRow.id_tkm ? String(normalizedRow.id_tkm).trim() : "";
      const namaPendaftar = normalizedRow.nama_pendaftar ? String(normalizedRow.nama_pendaftar).trim() : "";
      const nikPendaftar = normalizedRow.nik_pendaftar ? String(normalizedRow.nik_pendaftar).trim() : "";
      const whatsapp = normalizedRow.whatsapp ? String(normalizedRow.whatsapp).trim() : "";
      const rowNum = normalizedRow.__rownumber || i + 2;

      // Normalize aliases
      if (!normalizedRow.kabupaten_ktp && normalizedRow.kota_ktp) {
        normalizedRow.kabupaten_ktp = normalizedRow.kota_ktp;
      }
      if (!normalizedRow.kabupaten_domisili && normalizedRow.kota_domisili) {
        normalizedRow.kabupaten_domisili = normalizedRow.kota_domisili;
      }
      if (!normalizedRow.kabupaten_usaha && normalizedRow.kota_usaha) {
        normalizedRow.kabupaten_usaha = normalizedRow.kota_usaha;
      }
      if (
        (normalizedRow.apakah_penyandang_disabilitas === undefined ||
          normalizedRow.apakah_penyandang_disabilitas === null ||
          String(normalizedRow.apakah_penyandang_disabilitas).trim() === "") &&
        normalizedRow.disabilitas !== undefined &&
        normalizedRow.disabilitas !== null
      ) {
        normalizedRow.apakah_penyandang_disabilitas = normalizedRow.disabilitas;
      }
      if (
        !normalizedRow.upload_foto_diri &&
        (normalizedRow.foto || normalizedRow.foto_diri || normalizedRow.foto_peserta)
      ) {
        normalizedRow.upload_foto_diri =
          normalizedRow.foto || normalizedRow.foto_diri || normalizedRow.foto_peserta;
      }

      // Check if any required field is empty
      const missingFields: string[] = [];
      for (const field of REQUIRED_FIELDS) {
        const val = normalizedRow[field.key];
        if (val === undefined || val === null || String(val).trim() === "") {
          missingFields.push(field.label);
        }
      }

      if (missingFields.length > 0) {
        failed++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar || "-",
          tkmId: idTkm || "-",
          nik: nikPendaftar || "-",
          status: "GAGAL",
          message: `Kolom wajib tidak boleh kosong: ${missingFields.join(", ")}`,
        });
        continue;
      }

      const rawGender = String(normalizedRow.jenis_kelamin || "").trim().toUpperCase();
      let gender: Gender | null = null;
      if (["LAKI-LAKI", "LAKI LAKI", "L", "LK", "PRIA", "MALE", "M"].includes(rawGender)) {
        gender = "MALE";
      } else if (["PEREMPUAN", "P", "PR", "WANITA", "FEMALE", "F"].includes(rawGender)) {
        gender = "FEMALE";
      }

      if (!gender) {
        failed++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar,
          tkmId: idTkm,
          nik: nikPendaftar,
          status: "GAGAL",
          message: `Format jenis_kelamin tidak valid: '${normalizedRow.jenis_kelamin}'. Gunakan 'LAKI-LAKI' atau 'PEREMPUAN'.`,
        });
        continue;
      }

      const hasNikDup = existingNiks.has(String(nikPendaftar));
      const hasTkmDup = existingTkms.has(String(idTkm));

      if (hasNikDup || hasTkmDup) {
        duplicates++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar,
          tkmId: idTkm,
          nik: nikPendaftar,
          status: "DUPLIKASI",
          message: hasTkmDup ? "ID TKM sudah terdaftar" : "NIK sudah pernah terdaftar sebagai peserta",
        });
        continue;
      }

      const isMentorInSameWorkspace = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: workspaceId,
          user: { profile: { nik: String(nikPendaftar) } },
        },
      });
      if (isMentorInSameWorkspace) {
        duplicates++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar,
          tkmId: idTkm,
          nik: nikPendaftar,
          status: "DITOLAK",
          message: "Orang ini sudah terdaftar sebagai Pendamping/Anggota di workspace tahun ini.",
        });
        continue;
      }

      try {
        const birthDateValue = parseExcelDate(normalizedRow.tanggal_lahir);

        const ktpLoc = await resolveLocationHierarchy(
          normalizedRow.provinsi_ktp,
          normalizedRow.kabupaten_ktp || normalizedRow.kota_ktp,
          normalizedRow.kecamatan_ktp,
          normalizedRow.kelurahan_ktp || normalizedRow.desa_ktp
        );

        const domLoc = await resolveLocationHierarchy(
          normalizedRow.provinsi_domisili,
          normalizedRow.kabupaten_domisili || normalizedRow.kota_domisili,
          normalizedRow.kecamatan_domisili,
          normalizedRow.kelurahan_domisili || normalizedRow.desa_domisili
        );

        const busLoc = await resolveLocationHierarchy(
          normalizedRow.provinsi_usaha,
          normalizedRow.kabupaten_usaha || normalizedRow.kota_usaha,
          normalizedRow.kecamatan_usaha,
          normalizedRow.kelurahan_usaha || normalizedRow.desa_usaha
        );

        const rawDisability = String(normalizedRow.apakah_penyandang_disabilitas || "").trim();
        const rawDisabilityUpper = rawDisability.toUpperCase();
        const rawJenisDisability = String(normalizedRow.jenis_disabilitas || "").trim();
        const rawJenisUpper = rawJenisDisability.toUpperCase();

        const isExplicitNo =
          ["TIDAK", "TIDAK ADA", "TIDAK ADA DISABILITAS", "BUKAN", "BUKAN DISABILITAS", "BUKAN PENYANDANG DISABILITAS", "NON DISABILITAS", "FALSE", "0", "-", ""].includes(rawDisabilityUpper) &&
          ["", "-", "TIDAK", "TIDAK ADA", "TIDAK ADA DISABILITAS", "BUKAN DISABILITAS", "BUKAN PENYANDANG DISABILITAS", "NON DISABILITAS"].includes(rawJenisUpper);

        const hasDisability = !isExplicitNo && (
          ["YA", "ADA", "TRUE", "1", "YES"].includes(rawDisabilityUpper) ||
          rawDisabilityUpper.includes("DISABILITAS") ||
          (rawJenisUpper.length > 0 && !["-", "TIDAK", "TIDAK ADA", "TIDAK ADA DISABILITAS", "BUKAN DISABILITAS", "BUKAN PENYANDANG DISABILITAS"].includes(rawJenisUpper)) ||
          (rawDisabilityUpper !== "TIDAK" &&
            rawDisabilityUpper !== "TIDAK ADA" &&
            rawDisabilityUpper !== "TIDAK ADA DISABILITAS" &&
            rawDisabilityUpper !== "FALSE" &&
            rawDisabilityUpper !== "0" &&
            rawDisabilityUpper !== "-" &&
            rawDisabilityUpper !== "")
        );

        let disabilityType: string | null = null;
        if (hasDisability) {
          if (rawJenisDisability && !["-", "TIDAK", "TIDAK ADA", "TIDAK ADA DISABILITAS", "BUKAN DISABILITAS"].includes(rawJenisUpper)) {
            disabilityType = rawJenisDisability;
          } else if (!["YA", "ADA", "1", "TRUE", "YES"].includes(rawDisabilityUpper)) {
            disabilityType = rawDisability;
          } else {
            disabilityType = "Penyandang Disabilitas";
          }
        }

        const lastEducation = String(normalizedRow.pendidikan_terakhir || "").trim();
        const baseline = buildBaselineData(normalizedRow);

        if (!dryRun) {
          const existingProfile = await prisma.profile.findUnique({
            where: { nik: String(nikPendaftar) },
            select: { id: true },
          });

          if (existingProfile) {
            await prisma.applicant.create({
              data: {
                idTkm: String(idTkm),
                workspaceId: workspaceId,
                profileId: existingProfile.id,
                communicationStatus: "NO_RESPONSE",
                fundDisbursement: "NOT_DISBURSED",
                willingness: "NOT_WILLING",
                presenceStatus: "FOUND",
                status: "ACTIVE",
                businessProfile: {
                  create: {
                    businessName: String(normalizedRow.nama_usaha).trim(),
                    businessSector: String(normalizedRow.sektor_usaha).trim(),
                    businessType: String(normalizedRow.jenis_usaha).trim(),
                    description: normalizedRow.deskripsi_usaha
                      ? String(normalizedRow.deskripsi_usaha).trim()
                      : null,
                    mainProduct: normalizedRow.produk_utama
                      ? String(normalizedRow.produk_utama).trim()
                      : null,
                  },
                },
                outputReports: {
                  create: {
                    workspaceId: workspaceId,
                    monthReport: 0,
                    verificationStatus: "DRAFT",
                    productionCapacity: baseline.productionQty,
                    productionCapacityUnit: baseline.productionUnit,
                    salesVolume: baseline.productionQty,
                    salesVolumeUnit: baseline.productionUnit,
                    revenue: baseline.revenue,
                    marketingArea: baseline.marketingArea as any,
                    bookkeepingCashflow: "MANUAL",
                    bookkeepingIncomeStatement: "MANUAL",
                    businessCondition: "stabil",
                  },
                },
              },
            });
          } else {
            const userEmail = normalizedRow.email
              ? String(normalizedRow.email).trim()
              : `${nikPendaftar}@tkml.id`;

            await prisma.profile.create({
              data: {
                name: String(namaPendaftar),
                nik: String(nikPendaftar),
                birthPlace: String(normalizedRow.tempat_lahir).trim(),
                birthDate: birthDateValue,
                gender: gender,
                email: userEmail,
                whatsapp: String(whatsapp),
                lastEducation: lastEducation,
                photo: normalizedRow.upload_foto_diri ? String(normalizedRow.upload_foto_diri) : null,
                hasDisability: hasDisability,
                disabilityType: disabilityType,
                addresses: {
                  create: [
                    {
                      label: "KTP",
                      address: String(normalizedRow.alamat_ktp).trim(),
                      provinceId: ktpLoc.provinceId,
                      provinceName: String(normalizedRow.provinsi_ktp).trim().toUpperCase(),
                      cityId: ktpLoc.cityId,
                      cityName: String(
                        normalizedRow.kabupaten_ktp || normalizedRow.kota_ktp
                      ).trim().toUpperCase(),
                      districtId: ktpLoc.districtId,
                      districtName: String(normalizedRow.kecamatan_ktp).trim(),
                      subdistrictId: ktpLoc.subdistrictId,
                      subdistrictName: String(
                        normalizedRow.kelurahan_ktp || normalizedRow.desa_ktp
                      ).trim(),
                      postalCode: String(normalizedRow.kode_pos_ktp).trim(),
                    },
                    {
                      label: "DOMICILE",
                      address: String(normalizedRow.alamat_domisili).trim(),
                      provinceId: domLoc.provinceId,
                      provinceName: String(normalizedRow.provinsi_domisili).trim().toUpperCase(),
                      cityId: domLoc.cityId,
                      cityName: String(
                        normalizedRow.kabupaten_domisili || normalizedRow.kota_domisili
                      ).trim().toUpperCase(),
                      districtId: domLoc.districtId,
                      districtName: String(normalizedRow.kecamatan_domisili).trim(),
                      subdistrictId: domLoc.subdistrictId,
                      subdistrictName: String(
                        normalizedRow.kelurahan_domisili || normalizedRow.desa_domisili
                      ).trim(),
                      postalCode: String(normalizedRow.kode_pos_domisili).trim(),
                    },
                    {
                      label: "BUSINESS",
                      address: String(normalizedRow.alamat_usaha).trim(),
                      provinceId: busLoc.provinceId,
                      provinceName: String(normalizedRow.provinsi_usaha).trim().toUpperCase(),
                      cityId: busLoc.cityId,
                      cityName: String(
                        normalizedRow.kabupaten_usaha || normalizedRow.kota_usaha
                      ).trim().toUpperCase(),
                      districtId: busLoc.districtId,
                      districtName: String(normalizedRow.kecamatan_usaha).trim(),
                      subdistrictId: busLoc.subdistrictId,
                      subdistrictName: String(
                        normalizedRow.kelurahan_usaha || normalizedRow.desa_usaha
                      ).trim(),
                      postalCode: String(normalizedRow.kode_pos_usaha).trim(),
                    },
                  ],
                },
                applicant: {
                  create: {
                    idTkm: String(idTkm),
                    workspaceId: workspaceId,
                    communicationStatus: "NO_RESPONSE",
                    fundDisbursement: "NOT_DISBURSED",
                    willingness: "NOT_WILLING",
                    presenceStatus: "FOUND",
                    status: "ACTIVE",
                    businessProfile: {
                      create: {
                        businessName: String(normalizedRow.nama_usaha).trim(),
                        businessSector: String(normalizedRow.sektor_usaha).trim(),
                        businessType: String(normalizedRow.jenis_usaha).trim(),
                        description: normalizedRow.deskripsi_usaha
                          ? String(normalizedRow.deskripsi_usaha).trim()
                          : null,
                        mainProduct: normalizedRow.produk_utama
                          ? String(normalizedRow.produk_utama).trim()
                          : null,
                      },
                    },
                    outputReports: {
                      create: {
                        workspaceId: workspaceId,
                        monthReport: 0,
                        verificationStatus: "DRAFT",
                        productionCapacity: baseline.productionQty,
                        productionCapacityUnit: baseline.productionUnit,
                        salesVolume: baseline.productionQty,
                        salesVolumeUnit: baseline.productionUnit,
                        revenue: baseline.revenue,
                        marketingArea: baseline.marketingArea as any,
                        bookkeepingCashflow: "MANUAL",
                        bookkeepingIncomeStatement: "MANUAL",
                        businessCondition: "stabil",
                      },
                    },
                  },
                },
              },
            });
          }
        }

        existingNiks.add(String(nikPendaftar));
        existingTkms.add(String(idTkm));

        complete++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar,
          tkmId: idTkm,
          nik: nikPendaftar,
          status: "SUKSES",
          message: dryRun ? "Data valid, siap diimpor" : "Data peserta berhasil diimpor",
        });
      } catch (err: any) {
        failed++;
        dataLogs.push({
          row: rowNum,
          name: namaPendaftar,
          tkmId: idTkm,
          nik: nikPendaftar,
          status: "GAGAL",
          message: err.message || "Gagal menyimpan ke database",
        });
      }
    }

    if (!dryRun && complete > 0) {
      await clearApplicantsCache(workspaceId);
    }

    return jsonResponse({
      total: rows.length,
      complete,
      failed,
      duplicates,
      data: dataLogs,
    });
  } catch (error: any) {
    console.error("[POST /api/applicants/import error]:", error);
    return errorResponse(error.message || "Gagal memproses file impor", 500);
  }
}
