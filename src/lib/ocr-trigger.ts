import prisma from "./prisma";
import { ocrQueue } from "./ocr-queue";

function getOcrDocumentType(category: string): "KTP" | "BPJS" | "SALARY_SLIP" | "CASHFLOW" | "REPORT" | "RECEIPT" | "OTHER" {
  if (category === "EMPLOYEE_KTP") return "KTP";
  if (category === "EMPLOYEE_BPJS_CARD") return "BPJS";
  if (category === "EMPLOYEE_SALARY_SLIP") return "SALARY_SLIP";
  if (category === "OUTPUT_CASHFLOW_PROOF") return "CASHFLOW";
  if (category === "OUTPUT_INCOME_PROOF") return "REPORT";
  if (category === "EXPENSE_PROOF") return "RECEIPT";
  return "OTHER";
}

function getFileStorageDetails(file: { url: string | null; bucket: string | null; objectKey: string }) {
  const bucket = file.bucket || "pendampingan";
  let objectKey = file.objectKey;

  if (!objectKey && file.url) {
    try {
      const urlObj = new URL(file.url);
      const pathname = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
      const parts = pathname.split("/");
      if (parts.length >= 2) {
        objectKey = parts.slice(1).join("/");
      } else {
        objectKey = parts[parts.length - 1] || "";
      }
    } catch {
      const urlParts = file.url.split("/");
      objectKey = urlParts[urlParts.length - 1] || "";
    }
  }

  return { bucket, objectKey };
}

export async function triggerOcrForEmployeeFiles(employeeId: string) {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        files: {
          include: {
            ocrResult: true,
          },
        },
      },
    }) as any;

    if (!employee) return;

    for (const file of employee.files) {
      const validCategories = ["EMPLOYEE_KTP", "EMPLOYEE_BPJS_CARD", "EMPLOYEE_SALARY_SLIP"];
      if (!validCategories.includes(file.category)) {
        continue;
      }

      const existingJob = await prisma.ocrJob.findUnique({
        where: { fileId: file.id },
      });

      if (file.ocrResult || existingJob) {
        continue;
      }

      const docType = getOcrDocumentType(file.category);
      const { bucket, objectKey } = getFileStorageDetails(file);

      await prisma.ocrResult.create({
        data: {
          fileId: file.id,
          status: "PENDING",
          documentType: docType,
        },
      });

      await prisma.ocrJob.create({
        data: {
          fileId: file.id,
          status: "PENDING",
        },
      });

      const job = await ocrQueue.add("process-ocr", { 
        fileId: file.id,
        url: file.url,
        category: file.category,
        objectKey,
        bucket,
        mimeType: file.mimeType || null,
      });

      console.log(`[OCR-Trigger] Enqueued OCR job ${job.id} for file ${file.id} under employee ${employeeId}`);
    }
  } catch (error) {
    console.error(`[OCR-Trigger] Error triggering OCR for employee ${employeeId}:`, error);
  }
}

export async function triggerOcrForOutputFiles(outputId: string) {
  try {
    const report = await prisma.outputReport.findUnique({
      where: { id: outputId },
      include: {
        files: {
          include: {
            ocrResult: true,
          },
        },
      },
    }) as any;

    if (!report) return;

    for (const file of report.files) {
      const validCategories = ["OUTPUT_INCOME_PROOF", "OUTPUT_CASHFLOW_PROOF"];
      if (!validCategories.includes(file.category)) {
        continue;
      }

      const existingJob = await prisma.ocrJob.findUnique({
        where: { fileId: file.id },
      });

      if (file.ocrResult || existingJob) {
        continue;
      }

      const docType = getOcrDocumentType(file.category);
      const { bucket, objectKey } = getFileStorageDetails(file);

      await prisma.ocrResult.create({
        data: {
          fileId: file.id,
          status: "PENDING",
          documentType: docType,
        },
      });

      await prisma.ocrJob.create({
        data: {
          fileId: file.id,
          status: "PENDING",
        },
      });

      const job = await ocrQueue.add("process-ocr", { 
        fileId: file.id,
        url: file.url,
        category: file.category,
        objectKey,
        bucket,
        mimeType: file.mimeType || null,
      });

      console.log(`[OCR-Trigger] Enqueued OCR job ${job.id} for file ${file.id} under output report ${outputId}`);
    }
  } catch (error) {
    console.error(`[OCR-Trigger] Error triggering OCR for output report ${outputId}:`, error);
  }
}

export async function triggerOcrForLogbookFiles(logbookId: string) {
  try {
    const logbook = await prisma.logbook.findUnique({
      where: { id: logbookId },
      include: {
        files: {
          include: {
            ocrResult: true,
          },
        },
      },
    }) as any;

    if (!logbook) return;

    for (const file of logbook.files) {
      const validCategories = ["EXPENSE_PROOF"];
      if (!validCategories.includes(file.category)) {
        continue;
      }

      const existingJob = await prisma.ocrJob.findUnique({
        where: { fileId: file.id },
      });

      if (file.ocrResult || existingJob) {
        continue;
      }

      const docType = getOcrDocumentType(file.category);
      const { bucket, objectKey } = getFileStorageDetails(file);

      await prisma.ocrResult.create({
        data: {
          fileId: file.id,
          status: "PENDING",
          documentType: docType,
        },
      });

      await prisma.ocrJob.create({
        data: {
          fileId: file.id,
          status: "PENDING",
        },
      });

      const job = await ocrQueue.add("process-ocr", { 
        fileId: file.id,
        url: file.url,
        category: file.category,
        objectKey,
        bucket,
        mimeType: file.mimeType || null,
      });

      console.log(`[OCR-Trigger] Enqueued OCR job ${job.id} for file ${file.id} under logbook ${logbookId}`);
    }
  } catch (error) {
    console.error(`[OCR-Trigger] Error triggering OCR for logbook ${logbookId}:`, error);
  }
}
