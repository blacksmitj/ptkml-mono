import fs from "fs";
import path from "path";
import os from "os";
import { Worker, Job } from "bullmq";
import sharp from "sharp";
import { execa } from "execa";
import prisma from "@/lib/prisma";
import { redisClient } from "@/lib/redis";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { validateEmployeeOcr, validateOcrDocumentType } from "@/lib/ocr-validation";
import { extractNik, extractBpjsNumber, extractName, extractSalarySlip } from "./ocr-parsers";
import { extractTextFromPdf } from "./ocr-pdf";

export interface OcrJobData {
  fileId: string;
  url?: string;
  category: string;
  objectKey?: string;
  bucket?: string;
  mimeType?: string | null;
}

// Detect Tesseract executable path
function getTesseractPath(): string {
  if (process.env.TESSERACT_PATH) {
    return process.env.TESSERACT_PATH;
  }
  if (process.platform === "win32") {
    const defaultWinPath = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
    if (fs.existsSync(defaultWinPath)) {
      return defaultWinPath;
    }
  }
  return "tesseract";
}

/**
 * Process single OCR job with Tesseract and PDF extractor
 */
export async function processOcrJob(job: Job<OcrJobData>) {
  const { fileId, category, objectKey, bucket, mimeType } = job.data;
  const startTime = Date.now();

  console.log(`[Worker] Started processing OCR job ${job.id} for file ${fileId} (${category})`);

  const uniqueId = `${job.id || "job"}-${Date.now()}`;
  const tempDir = os.tmpdir();
  const isPdf =
    mimeType === "application/pdf" ||
    Boolean(objectKey && objectKey.toLowerCase().endsWith(".pdf"));
  const fileExt = isPdf ? "pdf" : "jpg";
  const originalPath = path.join(tempDir, `ocr_orig_${uniqueId}.${fileExt}`);
  const processedPath = path.join(tempDir, `ocr_proc_${uniqueId}.jpg`);
  const tesseractOutputBase = path.join(tempDir, `ocr_out_${uniqueId}`);
  const tesseractTxtPath = `${tesseractOutputBase}.txt`;

  try {
    // 1. Mark OcrJob and OcrResult as PROCESSING
    await Promise.all([
      prisma.ocrJob.updateMany({
        where: { fileId },
        data: { status: "PROCESSING", startedAt: new Date() },
      }),
      prisma.ocrResult.updateMany({
        where: { fileId },
        data: { status: "PROCESSING" },
      }),
    ]);

    const targetBucket = bucket || process.env.MINIO_BUCKET || "pendampingan";
    const targetKey = objectKey;

    if (!targetKey) {
      throw new Error(`Object key missing for fileId ${fileId}`);
    }

    // 2. Fetch file from MinIO / S3 and write to temp file
    const s3Response = await s3Client.send(
      new GetObjectCommand({
        Bucket: targetBucket,
        Key: targetKey,
      })
    );

    if (!s3Response.Body) {
      throw new Error(`Empty file body received from S3 bucket ${targetBucket}, key: ${targetKey}`);
    }

    const stream = s3Response.Body as any;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const fileBuffer = Buffer.concat(chunks);
    fs.writeFileSync(originalPath, fileBuffer);

    let rawText = "";

    // 3. Extract text via PDF parser or Tesseract OCR
    if (isPdf) {
      console.log(`[Worker] Processing PDF file with pdf-parse...`);
      rawText = await extractTextFromPdf(originalPath);
    } else {
      console.log(`[Worker] Preprocessing image with sharp...`);
      await sharp(originalPath)
        .resize({ width: 1500, withoutEnlargement: true })
        .greyscale()
        .threshold(115)
        .toFile(processedPath);

      const tesseractPath = getTesseractPath();
      console.log(`[Worker] Executing Tesseract CLI: ${tesseractPath}`);

      const tesseractArgs = [processedPath, tesseractOutputBase];
      try {
        await execa(tesseractPath, [...tesseractArgs, "-l", "ind", "--psm", "4"]);
      } catch (tessErr) {
        console.warn(`[Worker] Failed with '-l ind', retrying with default language...`, tessErr);
        await execa(tesseractPath, [...tesseractArgs, "--psm", "4"]);
      }

      if (!fs.existsSync(tesseractTxtPath)) {
        throw new Error("Tesseract did not produce a text output file.");
      }

      rawText = fs.readFileSync(tesseractTxtPath, "utf-8");
    }

    console.log(`[Worker] Extracted text length: ${rawText.length} characters`);

    // 4. Parse fields based on category
    let parsedData: any = {};
    if (category === "EMPLOYEE_KTP") {
      const nik = extractNik(rawText);
      const name = extractName(rawText);
      parsedData = { nik, name };
      console.log(`[Worker] Parsed KTP Result: NIK=${nik}, Name=${name}`);
    } else if (category === "EMPLOYEE_BPJS_CARD") {
      const bpjsNumber = extractBpjsNumber(rawText);
      const name = extractName(rawText);
      parsedData = { bpjsNumber, name };
      console.log(`[Worker] Parsed BPJS Result: BPJS=${bpjsNumber}, Name=${name}`);
    } else if (category === "EMPLOYEE_SALARY_SLIP") {
      const slipData = extractSalarySlip(rawText);
      const fallbackName = extractName(rawText);
      parsedData = {
        name: slipData.name || fallbackName,
        totalSalary: slipData.totalSalary,
        period: slipData.period,
      };
      console.log(`[Worker] Parsed Salary Slip Result:`, parsedData);
    } else {
      parsedData = { processed: true };
    }

    const processingTime = Date.now() - startTime;

    // 5. Update OcrResult & OcrJob to COMPLETED
    const ocrResult = await prisma.ocrResult.update({
      where: { fileId },
      data: {
        status: "COMPLETED",
        rawText,
        parsedData: parsedData as any,
        confidence: 0.95,
        processingTime,
        engine: isPdf ? "pdf-parse" : "Tesseract",
        processedAt: new Date(),
        errorMessage: null,
      },
    });

    await prisma.ocrJob.updateMany({
      where: { fileId },
      data: {
        status: "COMPLETED",
        finishedAt: new Date(),
      },
    });

    // 6. Run Document suitability scoring
    await validateOcrDocumentType(fileId, category, rawText);

    // 7. If this file belongs to an Employee, trigger field validation
    const file = await prisma.file.findUnique({
      where: { id: fileId },
      select: { employeeId: true },
    });

    if (file?.employeeId) {
      await validateEmployeeOcr(file.employeeId);
      console.log(`[Worker] Employee validation completed for employee ${file.employeeId}`);
    }

    console.log(`[Worker] Successfully finished OCR job ${job.id} for file ${fileId} in ${processingTime}ms`);
    return ocrResult;
  } catch (error: any) {
    console.error(`[Worker] Error processing OCR job ${job.id}:`, error);

    await Promise.all([
      prisma.ocrResult.updateMany({
        where: { fileId },
        data: {
          status: "FAILED",
          errorMessage: error.message || "Unknown OCR processing error",
        },
      }),
      prisma.ocrJob.updateMany({
        where: { fileId },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
        },
      }),
    ]);

    throw error;
  } finally {
    // 8. Cleanup temporary files
    [originalPath, processedPath, tesseractTxtPath].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error(`[Worker] Failed to delete temporary file ${filePath}:`, e);
        }
      }
    });
  }
}

/**
 * Instantiate and start BullMQ Worker
 */
export function startOcrWorker(concurrency: number = 5) {
  const worker = new Worker<OcrJobData>(
    "ocr-queue",
    async (job: Job<OcrJobData>) => {
      return await processOcrJob(job);
    },
    {
      connection: redisClient,
      concurrency,
    }
  );

  worker.on("ready", () => {
    console.log(`[Worker] OCR Worker is running with concurrency ${concurrency}...`);
  });

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}

// Auto-run if executed directly via tsx (e.g., `npm run worker:ocr` or `npm run worker:dev`)
if (require.main === module || process.argv[1]?.includes("ocr-worker")) {
  console.log("[Worker] Starting standalone OCR Worker process...");
  const worker = startOcrWorker();

  const shutdown = async (signal: string) => {
    console.log(`[Worker] Received ${signal}, closing worker gracefully...`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
