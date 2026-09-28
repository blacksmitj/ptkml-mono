import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { requireWorkspaceWriteAccess } from "@/lib/rbac";
import { Gender, BpjsStatus, BpjsType, NikStatus } from "@prisma/client";
import { z } from "zod";

const importEmployeesSchema = z.object({
  workspaceId: z.string().min(1, "workspaceId is required"),
  dryRun: z.boolean().optional().default(false),
  rows: z.array(z.record(z.string(), z.any())).min(1, "rows array is required"),
});

function helperMapStatusTenagaKerja(statusStr: string): string {
  const s = String(statusStr || "").toLowerCase();
  if (s.includes("lepas") || s.includes("harian") || s.includes("mingguan") || s.includes("kontrak")) {
    return "kontrak";
  }
  if (s.includes("tetap") || s.includes("permanen")) {
    return "permanen";
  }
  if (s.includes("paruh") || s.includes("musiman")) {
    return "paruh_waktu";
  }
  if (s.includes("tidak dibayar") || s.includes("keluarga") || s.includes("tidak_dibayar")) {
    return "tidak_dibayar";
  }
  return "permanen";
}

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request, importEmployeesSchema);
    const { workspaceId, dryRun, rows } = body;

    const access = await requireWorkspaceWriteAccess(request, workspaceId);
    if (!access.ok) return access.response;

    const { user } = access.data;
    if (user.globalRole !== "SUPER_ADMIN") {
      return errorResponse("Forbidden: Only Super Admin can import employees", 403);
    }

    const applicants = await prisma.applicant.findMany({
      where: { workspaceId },
      select: { id: true, idTkm: true },
    });
    const applicantMap = new Map<string, string>();
    for (const app of applicants) {
      applicantMap.set(String(app.idTkm).trim(), app.id);
    }

    const existingEmployees = await prisma.employee.findMany({
      where: {
        output: {
          workspaceId,
        },
      },
      select: {
        nik: true,
      },
    });
    const dbEmployeeNiks = new Set(existingEmployees.map((e) => e.nik));

    const allApplicants = await prisma.applicant.findMany({
      where: { workspaceId },
      select: {
        profile: {
          select: { nik: true },
        },
      },
    });
    const dbApplicantNiks = new Set(allApplicants.map((a) => a.profile?.nik).filter(Boolean));

    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    const logs: any[] = [];
    const validRowsToSave: any[] = [];
    const sheetNiks = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const normalizedRow: any = {};
      for (const key of Object.keys(row)) {
        const normKey = key.trim().toLowerCase().replace(/\s+/g, "_");
        normalizedRow[normKey] = row[key];
      }

      const rowNum = normalizedRow.__rownumber || i + 2;
      const idTkm = String(
        normalizedRow.idktml || normalizedRow.id_tkm || normalizedRow.idtkm || ""
      ).trim();
      const name = String(
        normalizedRow.nama_lengkap || normalizedRow.nama_anggota || normalizedRow.nama || ""
      ).trim();
      const nik = String(normalizedRow.nik || normalizedRow.nik_anggota || "").trim();
      const rawGender = String(
        normalizedRow.jenis_kelamin || normalizedRow.gender || ""
      )
        .trim()
        .toUpperCase();

      const missingCols: string[] = [];
      if (!idTkm) missingCols.push("IDKTML");
      if (!name) missingCols.push("Nama Lengkap");
      if (!nik) missingCols.push("NIK");
      if (!rawGender) missingCols.push("Jenis Kelamin");

      if (missingCols.length > 0) {
        failedCount++;
        logs.push({
          row: rowNum,
          name: name || "-",
          tkmId: idTkm || "-",
          nik: nik || "-",
          status: "GAGAL",
          message: `Kolom wajib tidak boleh kosong: ${missingCols.join(", ")}`,
        });
        continue;
      }

      let gender: Gender | null = null;
      if (["LAKI-LAKI", "LAKI LAKI", "L", "LK", "PRIA", "MALE", "M"].includes(rawGender)) {
        gender = Gender.MALE;
      } else if (["PEREMPUAN", "P", "PR", "WANITA", "FEMALE", "F"].includes(rawGender)) {
        gender = Gender.FEMALE;
      }

      if (!gender) {
        failedCount++;
        logs.push({
          row: rowNum,
          name,
          tkmId: idTkm,
          nik,
          status: "GAGAL",
          message: `Format jenis_kelamin tidak valid: '${rawGender}'. Gunakan 'LAKI-LAKI' atau 'PEREMPUAN'.`,
        });
        continue;
      }

      const applicantId = applicantMap.get(idTkm);
      if (!applicantId) {
        failedCount++;
        logs.push({
          row: rowNum,
          name,
          tkmId: idTkm,
          nik,
          status: "GAGAL",
          message: `TKM dengan ID ${idTkm} tidak ditemukan di workspace ini`,
        });
        continue;
      }

      if (dbApplicantNiks.has(nik)) {
        failedCount++;
        logs.push({
          row: rowNum,
          name,
          tkmId: idTkm,
          nik,
          status: "GAGAL",
          message: "NIK karyawan tidak boleh sama dengan NIK Peserta/TKM",
        });
        continue;
      }

      if (dbEmployeeNiks.has(nik) || sheetNiks.has(nik)) {
        duplicateCount++;
        logs.push({
          row: rowNum,
          name,
          tkmId: idTkm,
          nik,
          status: "DUPLIKASI",
          message: dbEmployeeNiks.has(nik)
            ? "NIK karyawan sudah terdaftar di database"
            : "NIK karyawan terduplikasi di file Excel",
        });
        continue;
      }

      sheetNiks.add(nik);
      successCount++;

      const rawStatusKerja =
        normalizedRow.status_tenaga_kerja ||
        normalizedRow.status_kerja ||
        normalizedRow.employment_status;
      const employmentStatus = rawStatusKerja
        ? helperMapStatusTenagaKerja(rawStatusKerja)
        : "permanen";

      const rawJabatan =
        normalizedRow.jabatan_posisi ||
        normalizedRow.jabatan ||
        normalizedRow.posisi ||
        normalizedRow.role;
      const role = rawJabatan ? String(rawJabatan).trim() : "anggota";

      const rawBpjs = String(
        normalizedRow.status_bpjs || normalizedRow.bpjs_status || normalizedRow.bpjs || ""
      )
        .trim()
        .toUpperCase();
      const bpjsStatus =
        rawBpjs.includes("TERDAFTAR") || rawBpjs === "YA" || rawBpjs === "REGISTERED"
          ? "REGISTERED"
          : "NOT_REGISTERED";

      const rawBpjsNumber =
        normalizedRow.nomor_bpjs ||
        normalizedRow.bpjs_number ||
        normalizedRow.no_bpjs ||
        normalizedRow.bpjs_no;
      const bpjsNumber = rawBpjsNumber ? String(rawBpjsNumber).trim() : null;

      const rawBpjsType = String(
        normalizedRow.jenis_bpjs ||
          normalizedRow.bpjs_type ||
          normalizedRow.tipe_bpjs ||
          ""
      )
        .trim()
        .toUpperCase();
      let bpjsType: BpjsType | null = null;
      if (bpjsStatus === "REGISTERED") {
        if (
          rawBpjsType.includes("BUKAN") ||
          rawBpjsType.includes("BPU") ||
          rawBpjsType.includes("NON_WAGE")
        ) {
          bpjsType = BpjsType.NON_WAGE_EARNER;
        } else {
          bpjsType = BpjsType.WAGE_EARNER;
        }
      }

      const rawDisabilitas = String(
        normalizedRow.disabilitas ||
          normalizedRow.has_disability ||
          normalizedRow.apakah_disabilitas ||
          ""
      )
        .trim()
        .toUpperCase();
      const hasDisability = rawDisabilitas === "YA" || rawDisabilitas === "TRUE";

      const rawDisabilityType =
        normalizedRow.jenis_disabilitas ||
        normalizedRow.disability_type ||
        normalizedRow.ragam_disabilitas;
      const disabilityType = hasDisability
        ? rawDisabilityType
          ? String(rawDisabilityType).trim()
          : "Lainnya"
        : null;

      logs.push({
        row: rowNum,
        name,
        tkmId: idTkm,
        nik,
        status: "VALID",
        message: "Baris data valid",
      });

      validRowsToSave.push({
        applicantId,
        name,
        nik,
        gender,
        employmentStatus,
        role,
        bpjsStatus,
        bpjsType,
        bpjsNumber,
        hasDisability,
        disabilityType,
      });
    }

    if (dryRun === false && validRowsToSave.length > 0) {
      const groupedByApplicant = new Map<string, any[]>();
      for (const item of validRowsToSave) {
        if (!groupedByApplicant.has(item.applicantId)) {
          groupedByApplicant.set(item.applicantId, []);
        }
        groupedByApplicant.get(item.applicantId)!.push(item);
      }

      for (const [applicantId, empRows] of groupedByApplicant.entries()) {
        let outputReport = await prisma.outputReport.findFirst({
          where: {
            applicantId,
            monthReport: 0,
          },
        });

        if (!outputReport) {
          outputReport = await prisma.outputReport.create({
            data: {
              workspaceId,
              applicantId,
              monthReport: 0,
              verificationStatus: "DRAFT",
              productionCapacity: 0,
              productionCapacityUnit: "Pcs",
              salesVolume: 0,
              salesVolumeUnit: "Pcs",
              revenue: 0,
              marketingArea: "DISTRICT",
              bookkeepingCashflow: "MANUAL",
              bookkeepingIncomeStatement: "MANUAL",
              businessCondition: "stabil",
            },
          });
        }

        for (const emp of empRows) {
          await prisma.employee.create({
            data: {
              outputId: outputReport.id,
              name: emp.name,
              nik: emp.nik,
              role: emp.role || "anggota",
              gender: emp.gender as Gender,
              employmentStatus: emp.employmentStatus || "permanen",
              bpjsStatus: (emp.bpjsStatus || "NOT_REGISTERED") as BpjsStatus,
              bpjsType: emp.bpjsType as BpjsType | null,
              bpjsNumber: emp.bpjsNumber || null,
              hasDisability: emp.hasDisability || false,
              disabilityType: emp.disabilityType || null,
              nikStatus: NikStatus.VALID,
            },
          });
        }
      }
    }

    return jsonResponse({
      success: true,
      summary: {
        total: rows.length,
        success: successCount,
        failed: failedCount,
        duplicates: duplicateCount,
      },
      data: logs,
    });
  } catch (error: any) {
    console.error("[POST /api/output-reports/import-employees error]:", error);
    return errorResponse("Failed to import employees: " + error.message, 500);
  }
}
