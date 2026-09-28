import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { s3Client, bucketName } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/file-maintenance/dry-run?days=7
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const daysParam = request.nextUrl.searchParams.get("days") || "7";
    const days = parseInt(daysParam, 10);
    if (isNaN(days) || days < 0) {
      return errorResponse("Parameter days tidak valid.", 400);
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Fetch all active object keys from PostgreSQL File table
    const dbFiles = await prisma.file.findMany({
      select: { objectKey: true },
    });
    const activeKeys = new Set(dbFiles.map((f) => f.objectKey).filter(Boolean));

    // 2. Scan all objects in MinIO bucket
    const minioObjects: { key: string; size: number; lastModified?: Date }[] = [];
    let continuationToken: string | undefined = undefined;
    let isTruncated = true;

    while (isTruncated) {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      });

      const listResponse: any = await s3Client.send(listCommand);
      if (listResponse.Contents) {
        for (const obj of listResponse.Contents) {
          if (obj.Key) {
            minioObjects.push({
              key: obj.Key,
              size: obj.Size || 0,
              lastModified: obj.LastModified ? new Date(obj.LastModified) : undefined,
            });
          }
        }
      }

      isTruncated = listResponse.IsTruncated || false;
      continuationToken = listResponse.NextContinuationToken;
    }

    // 3. Find orphaned files (exist in MinIO but not in DB)
    const orphanedObjects = minioObjects.filter((obj) => !activeKeys.has(obj.key));

    const safeToDelete: typeof orphanedObjects = [];
    const deferred: typeof orphanedObjects = [];

    for (const obj of orphanedObjects) {
      const lastModified = obj.lastModified || new Date();
      if (lastModified < cutoffDate) {
        safeToDelete.push(obj);
      } else {
        deferred.push(obj);
      }
    }

    const totalOrphanedSize = orphanedObjects.reduce((sum, obj) => sum + obj.size, 0);
    const safeSize = safeToDelete.reduce((sum, obj) => sum + obj.size, 0);
    const deferredSize = deferred.reduce((sum, obj) => sum + obj.size, 0);

    return jsonResponse({
      statistics: {
        totalOrphanedCount: orphanedObjects.length,
        totalOrphanedSize,
        safeCount: safeToDelete.length,
        safeSize,
        deferredCount: deferred.length,
        deferredSize,
        cutoffDate: cutoffDate.toISOString(),
      },
      safeToDelete,
      deferred,
    });
  } catch (error) {
    console.error("GET /api/file-maintenance/dry-run error:", error);
    return errorResponse("Gagal menjalankan dry-run perawatan file.", 500);
  }
}
