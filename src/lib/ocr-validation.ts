import prisma from "./prisma";

interface ParsedData {
  nik?: string;
  name?: string;
  bpjsNumber?: string;
  totalSalary?: number;
  period?: string;
}

/**
 * Validates document type / suitability based on keywords and updates OCR confidence score
 */
export async function validateOcrDocumentType(
  fileId: string,
  category: string,
  rawText: string,
  client: any = prisma
): Promise<number> {
  const ocrResult = await client.ocrResult.findUnique({
    where: { fileId },
  });

  if (!ocrResult) return 0;

  // Clean up existing generic kesesuaian_dokumen validation
  await client.ocrValidation.deleteMany({
    where: {
      ocrResultId: ocrResult.id,
      fieldName: "kesesuaian_dokumen",
    },
  });

  let fieldName = "kesesuaian_dokumen";
  let manualValue = "";
  let extractedValue = "";
  let isMatch = false;
  let confidence = 0.0;
  const lowerText = rawText || "";

  if (category === "EMPLOYEE_KTP") {
    manualValue = "Kartu Tanda Penduduk (KTP)";
    const hasKisKeywords = /kartu indonesia sehat|sehat/i.test(lowerText);
    if (hasKisKeywords) {
      confidence = 0.0;
      isMatch = false;
      extractedValue = "Terdeteksi BPJS (Kartu Indonesia Sehat)";
    } else {
      const keywords = [
        "nik",
        "provinsi",
        "kabupaten",
        "kota",
        "kecamatan",
        "kelurahan",
        "lahir",
        "darah",
        "agama",
        "perkawinan",
        "pekerjaan",
        "kewarganegaraan",
        "nama",
      ];
      const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
      confidence = Math.min(foundKeywords.length / 4, 1.0);
      isMatch = confidence >= 0.5;
      extractedValue = isMatch ? "Sesuai Ciri KTP" : "Tidak Sesuai Ciri KTP";
    }
  } else if (category === "EMPLOYEE_BPJS_CARD") {
    manualValue = "Kartu BPJS";
    const keywords = [
      "bpjs",
      "kesehatan",
      "jkn",
      "kartu indonesia sehat",
      "kis",
      "ketenagakerjaan",
      "badan penyelenggara",
    ];
    const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
    confidence = Math.min(foundKeywords.length / 2, 1.0);
    isMatch = confidence >= 0.5;
    extractedValue = isMatch ? "Sesuai Ciri BPJS" : "Tidak Sesuai Ciri BPJS";
  } else if (category === "EMPLOYEE_SALARY_SLIP") {
    manualValue = "Slip Gaji";
    const keywords = ["gaji", "slip", "payroll", "pendapatan", "tunjangan", "potongan", "upah", "lembur", "salary", "pokok"];
    const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
    confidence = Math.min(foundKeywords.length / 3, 1.0);
    isMatch = confidence >= 0.66;
    extractedValue = isMatch ? "Sesuai Ciri Slip Gaji" : "Tidak Sesuai Ciri Slip Gaji";
  } else if (category === "EXPENSE_PROOF") {
    manualValue = "Bukti Pengeluaran";
    const keywords = ["kwitansi", "receipt", "nota", "bukti", "total", "harga", "qty", "bayar", "kembali", "pembelian", "jumlah", "item", "ongkir", "invoice", "pembayaran", "rp"];
    const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
    confidence = Math.min(foundKeywords.length / 3, 1.0);
    isMatch = confidence >= 0.66;
    extractedValue = isMatch ? "Sesuai Ciri Bukti Pengeluaran" : "Tidak Sesuai Ciri Bukti Pengeluaran";
  } else if (category === "OUTPUT_INCOME_PROOF") {
    manualValue = "Laporan Laba Rugi / Omset";
    const keywords = ["laba", "rugi", "omset", "pendapatan", "penjualan", "biaya", "profit", "loss", "income", "revenue", "pembukuan", "laporan"];
    const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
    confidence = Math.min(foundKeywords.length / 3, 1.0);
    isMatch = confidence >= 0.66;
    extractedValue = isMatch ? "Sesuai Ciri Laba Rugi" : "Tidak Sesuai Ciri Laba Rugi";
  } else if (category === "OUTPUT_CASHFLOW_PROOF") {
    manualValue = "Laporan Arus Kas";
    const keywords = ["arus kas", "cash flow", "cashflow", "saldo", "debit", "kredit", "mutasi", "penerimaan", "pengeluaran", "masuk", "keluar", "buku kas", "kas masuk", "kas keluar"];
    const foundKeywords = keywords.filter((k) => new RegExp(k, "i").test(lowerText));
    confidence = Math.min(foundKeywords.length / 3, 1.0);
    isMatch = confidence >= 0.66;
    extractedValue = isMatch ? "Sesuai Ciri Buku Kas / Cash Flow" : "Tidak Sesuai Ciri Buku Kas / Cash Flow";
  }

  if (manualValue) {
    await client.ocrValidation.create({
      data: {
        ocrResultId: ocrResult.id,
        fieldName,
        manualValue,
        extractedValue,
        isMatch,
        confidence,
      },
    });

    await client.ocrResult.update({
      where: { id: ocrResult.id },
      data: { confidence },
    });
  }

  return confidence;
}

/**
 * Validates manual employee input fields against OCR extracted values.
 * Records the matching results in the OcrValidation model.
 */
export async function validateEmployeeOcr(employeeId: string, client: any = prisma) {
  try {
    const employee = await client.employee.findUnique({
      where: { id: employeeId },
      include: {
        files: {
          include: {
            ocrResult: true,
          },
        },
      },
    });

    if (!employee) return;

    for (const file of employee.files) {
      if (file.ocrResult && file.ocrResult.status === "COMPLETED") {
        const parsedData = file.ocrResult.parsedData as any;
        if (!parsedData) continue;

        // Clean up existing field-specific validations (preserve kesesuaian_dokumen if present)
        await client.ocrValidation.deleteMany({
          where: {
            ocrResultId: file.ocrResult.id,
            fieldName: { not: "kesesuaian_dokumen" },
          },
        });

        // 1. Perform validation for KTP
        if (file.category === "EMPLOYEE_KTP") {
          // Validate NIK
          if (employee.nik && parsedData.nik) {
            const manualValue = employee.nik.trim();
            const extractedValue = parsedData.nik.trim();
            const isMatch = manualValue === extractedValue;

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "nik",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }

          // Validate Name
          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim().toLowerCase();
            const extractedValue = parsedData.name.trim().toLowerCase();

            const isMatch =
              manualValue === extractedValue ||
              manualValue.includes(extractedValue) ||
              extractedValue.includes(manualValue);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue: employee.name,
                extractedValue: parsedData.name,
                isMatch,
              },
            });
          }
        }

        // 2. Perform validation for BPJS Card
        if (file.category === "EMPLOYEE_BPJS_CARD") {
          if (employee.bpjsNumber && parsedData.bpjsNumber) {
            const manualValue = employee.bpjsNumber.trim();
            const extractedValue = parsedData.bpjsNumber.trim();
            const isMatch = manualValue === extractedValue;

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "bpjsNumber",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }

          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim();
            const extractedValue = parsedData.name.trim();
            const manualNameLower = manualValue.toLowerCase();
            const extractedNameLower = extractedValue.toLowerCase();
            const isMatch =
              manualNameLower === extractedNameLower ||
              manualNameLower.includes(extractedNameLower) ||
              extractedNameLower.includes(manualNameLower);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }
        }

        // 3. Perform validation for Salary Slip
        if (file.category === "EMPLOYEE_SALARY_SLIP") {
          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim();
            const extractedValue = parsedData.name.trim();
            const manualNameLower = manualValue.toLowerCase();
            const extractedNameLower = extractedValue.toLowerCase();
            const isMatch =
              manualNameLower === extractedNameLower ||
              manualNameLower.includes(extractedNameLower) ||
              extractedNameLower.includes(manualNameLower);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error validating OCR for employee ${employeeId}:`, error);
  }
}
