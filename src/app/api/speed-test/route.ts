import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { s3Client, bucketName } from "@/lib/s3";
import {
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import dns from "dns";
import { promisify } from "util";
import { performance } from "perf_hooks";

const dnsLookup = promisify(dns.lookup);

interface StepMetric {
  name: string;
  durationMs: number;
  status: "success" | "warning" | "failed";
  error?: string;
}

interface ServiceDiagnostic {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  dnsResolutionMs?: number;
  dnsResolvedIp?: string;
  throughputMbSec?: number;
  steps: StepMetric[];
  errorSummary?: string;
  troubleshooting?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sizeParam = searchParams.get("size");
  const s3SizeKb = Math.min(Math.max(Number(sizeParam) || 250, 10), 5000);

  const results = {
    timestamp: new Date().toISOString(),
    database: {} as ServiceDiagnostic,
    storage: {} as ServiceDiagnostic,
    systemInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || "development",
    },
  };

  // 1. DATABASE
  const dbSteps: StepMetric[] = [];
  let dbDnsMs = 0;
  let dbResolvedIp = "";
  let dbHealthy: "healthy" | "degraded" | "unreachable" = "healthy";
  let dbError = "";
  let dbTrouble = "";

  try {
    const dbUrlStr = process.env.DATABASE_URL || "";
    let dbHost = "localhost";

    try {
      if (dbUrlStr) {
        const parsedUrl = new URL(dbUrlStr);
        dbHost = parsedUrl.hostname;
      }
    } catch {
      const match = dbUrlStr.match(/@([^:/]+)(?::(\d+))?/);
      if (match) {
        dbHost = match[1];
      }
    }

    const dnsStart = performance.now();
    if (dbHost !== "localhost" && dbHost !== "127.0.0.1" && dbHost !== "::1") {
      try {
        const lookupRes = await dnsLookup(dbHost);
        dbDnsMs = Math.round(performance.now() - dnsStart);
        dbResolvedIp = lookupRes.address;
        dbSteps.push({
          name: "dns_lookup",
          durationMs: dbDnsMs,
          status: dbDnsMs > 150 ? "warning" : "success",
        });
      } catch (err: any) {
        dbDnsMs = Math.round(performance.now() - dnsStart);
        dbHealthy = "unreachable";
        throw new Error(`DNS Lookup failed for host "${dbHost}": ${err.message}`);
      }
    } else {
      dbSteps.push({
        name: "dns_lookup",
        durationMs: 0,
        status: "success",
        error: "Localhost bypasses DNS lookup",
      });
    }

    const pingStart = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const pingMs = Math.round(performance.now() - pingStart);
      dbSteps.push({
        name: "connection_ping",
        durationMs: pingMs,
        status: pingMs > 100 ? "warning" : "success",
      });
    } catch (err: any) {
      dbHealthy = "unreachable";
      throw new Error(`Database connection failed: ${err.message}`);
    }

    // Temp table operations
    const tCreateStart = performance.now();
    await prisma.$executeRawUnsafe(`
      CREATE TEMP TABLE speed_test_diagnostics (
        id SERIAL PRIMARY KEY,
        val VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    const tCreateMs = Math.round(performance.now() - tCreateStart);
    dbSteps.push({ name: "table_creation", durationMs: tCreateMs, status: "success" });

    const tWriteStart = performance.now();
    const insertRes: any[] = await prisma.$queryRawUnsafe(`
      INSERT INTO speed_test_diagnostics (val) 
      VALUES ('diagnostic-payload-dummy-data-string') 
      RETURNING id
    `);
    const tWriteMs = Math.round(performance.now() - tWriteStart);
    const rowId = insertRes[0]?.id;
    dbSteps.push({ name: "row_insert", durationMs: tWriteMs, status: "success" });

    if (!rowId) {
      throw new Error("Row insert failed to return an ID on temporary table");
    }

    const tReadStart = performance.now();
    await prisma.$queryRawUnsafe(`
      SELECT * FROM speed_test_diagnostics WHERE id = ${rowId}
    `);
    const tReadMs = Math.round(performance.now() - tReadStart);
    dbSteps.push({ name: "row_select", durationMs: tReadMs, status: "success" });

    const tUpdateStart = performance.now();
    await prisma.$executeRawUnsafe(`
      UPDATE speed_test_diagnostics 
      SET val = 'diagnostic-payload-dummy-data-string-updated' 
      WHERE id = ${rowId}
    `);
    const tUpdateMs = Math.round(performance.now() - tUpdateStart);
    dbSteps.push({ name: "row_update", durationMs: tUpdateMs, status: "success" });

    const tDeleteStart = performance.now();
    await prisma.$executeRawUnsafe(`
      DELETE FROM speed_test_diagnostics WHERE id = ${rowId}
    `);
    const tDeleteMs = Math.round(performance.now() - tDeleteStart);
    dbSteps.push({ name: "row_delete", durationMs: tDeleteMs, status: "success" });

    const tDropStart = performance.now();
    await prisma.$executeRawUnsafe(`DROP TABLE speed_test_diagnostics`);
    const tDropMs = Math.round(performance.now() - tDropStart);
    dbSteps.push({ name: "table_cleanup", durationMs: tDropMs, status: "success" });

    const totalLatency = dbSteps.reduce((acc, step) => acc + step.durationMs, 0);
    if (totalLatency > 600) {
      dbHealthy = "degraded";
      dbTrouble = "Rata-rata latensi database cukup tinggi.";
    } else {
      dbHealthy = "healthy";
    }

    results.database = {
      status: dbHealthy,
      latencyMs: totalLatency,
      dnsResolutionMs: dbDnsMs,
      dnsResolvedIp: dbResolvedIp,
      steps: dbSteps,
      troubleshooting: dbTrouble || "Koneksi database dalam keadaan prima!",
    };
  } catch (err: any) {
    dbHealthy = "unreachable";
    dbError = err.message || "Unknown database error";

    results.database = {
      status: "unreachable",
      steps: dbSteps,
      errorSummary: dbError,
      troubleshooting: `Terjadi error: ${dbError}`,
    };
  }

  // 2. STORAGE
  const s3Steps: StepMetric[] = [];
  let s3DnsMs = 0;
  let s3ResolvedIp = "";
  let s3Healthy: "healthy" | "degraded" | "unreachable" = "healthy";
  let s3Error = "";
  let s3Trouble = "";
  let s3Throughput = 0;

  try {
    const s3Endpoint = process.env.MINIO_ENDPOINT || "localhost";

    const dnsStart = performance.now();
    if (s3Endpoint !== "localhost" && s3Endpoint !== "127.0.0.1" && s3Endpoint !== "::1") {
      try {
        const lookupRes = await dnsLookup(s3Endpoint);
        s3DnsMs = Math.round(performance.now() - dnsStart);
        s3ResolvedIp = lookupRes.address;
        s3Steps.push({
          name: "dns_lookup",
          durationMs: s3DnsMs,
          status: s3DnsMs > 150 ? "warning" : "success",
        });
      } catch (err: any) {
        s3DnsMs = Math.round(performance.now() - dnsStart);
        s3Healthy = "unreachable";
        throw new Error(`DNS Lookup failed for MinIO: ${err.message}`);
      }
    } else {
      s3Steps.push({
        name: "dns_lookup",
        durationMs: 0,
        status: "success",
        error: "Localhost bypasses DNS lookup",
      });
    }

    if (!bucketName) {
      s3Healthy = "unreachable";
      throw new Error("MINIO_BUCKET is empty");
    }

    const bucketPingStart = performance.now();
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
      const pingMs = Math.round(performance.now() - bucketPingStart);
      s3Steps.push({
        name: "bucket_ping",
        durationMs: pingMs,
        status: pingMs > 150 ? "warning" : "success",
      });
    } catch (err: any) {
      const pingMs = Math.round(performance.now() - bucketPingStart);
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        s3Healthy = "unreachable";
        throw new Error(`Bucket "${bucketName}" tidak ditemukan.`);
      } else {
        s3Steps.push({
          name: "bucket_ping",
          durationMs: pingMs,
          status: "warning",
          error: err.message,
        });
      }
    }

    const dummyData = "a".repeat(s3SizeKb * 1024);
    const testKey = `speedtest-temp-${Date.now()}.txt`;

    const uploadStart = performance.now();
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: testKey,
        Body: dummyData,
        ContentType: "text/plain",
      })
    );
    const uploadMs = Math.round(performance.now() - uploadStart);
    s3Steps.push({
      name: "file_upload_write",
      durationMs: uploadMs,
      status: uploadMs > 800 ? "warning" : "success",
    });

    const downloadStart = performance.now();
    const getRes = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: testKey,
      })
    );
    if (getRes.Body) {
      await getRes.Body.transformToByteArray();
    }
    const downloadMs = Math.round(performance.now() - downloadStart);
    s3Steps.push({
      name: "file_download_read",
      durationMs: downloadMs,
      status: downloadMs > 600 ? "warning" : "success",
    });

    const deleteStart = performance.now();
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: testKey,
      })
    );
    const deleteMs = Math.round(performance.now() - deleteStart);
    s3Steps.push({ name: "file_cleanup_delete", durationMs: deleteMs, status: "success" });

    const uploadSecs = uploadMs / 1000;
    const downloadSecs = downloadMs / 1000;
    const sizeMb = s3SizeKb / 1024;
    const writeThroughput = uploadSecs > 0 ? Number((sizeMb / uploadSecs).toFixed(2)) : 0;
    const readThroughput = downloadSecs > 0 ? Number((sizeMb / downloadSecs).toFixed(2)) : 0;
    s3Throughput = Number(((writeThroughput + readThroughput) / 2).toFixed(2));

    const totalLatency = s3Steps.reduce((acc, step) => acc + step.durationMs, 0);
    s3Healthy = totalLatency > 1800 ? "degraded" : "healthy";

    results.storage = {
      status: s3Healthy,
      latencyMs: totalLatency,
      dnsResolutionMs: s3DnsMs,
      dnsResolvedIp: s3ResolvedIp,
      throughputMbSec: s3Throughput,
      steps: s3Steps,
      troubleshooting: s3Trouble || "Penyimpanan MinIO OK!",
    };
  } catch (err: any) {
    s3Healthy = "unreachable";
    s3Error = err.message || "Unknown storage error";

    results.storage = {
      status: "unreachable",
      steps: s3Steps,
      errorSummary: s3Error,
      troubleshooting: `Terjadi error: ${s3Error}`,
    };
  }

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
