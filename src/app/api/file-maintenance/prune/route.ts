import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { s3Client, bucketName } from "@/lib/s3";
import { ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const pruneSchema = z.object({
  days: z.number().int().min(0).optional().default(7),
});

// POST /api/file-maintenance/prune
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { data: body } = await parseBody(request, pruneSchema);
    const days = body?.days ?? 7;

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Fetch active keys
    const dbFiles = await prisma.file.findMany({
      select: { objectKey: true },
    });
    const activeKeys = new Set(dbFiles.map((f) => f.objectKey).filter(Boolean));

    // 2. Scan MinIO
    const minioObjects: { key: string; lastModified?: Date }[] = [];
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
              lastModified: obj.LastModified ? new Date(obj.LastModified) : undefined,
            });
          }
        }
      }

      isTruncated = listResponse.IsTruncated || false;
      continuationToken = listResponse.NextContinuationToken;
    }

    // 3. Filter keys to delete (not in DB and older than cutoff)
    const keysToDelete = minioObjects
      .filter((obj) => !activeKeys.has(obj.key))
      .filter((obj) => (obj.lastModified || new Date()) < cutoffDate)
      .map((obj) => obj.key);

    if (keysToDelete.length === 0) {
      return jsonResponse({
        message: "Tidak ada file yatim piatu yang aman untuk dihapus.",
        deletedCount: 0,
      });
    }

    // 4. Delete in chunks of 1000
    const chunkSize = 1000;
    let deletedCount = 0;

    for (let i = 0; i < keysToDelete.length; i += chunkSize) {
      const chunk = keysToDelete.slice(i, i + chunkSize);
      const objectsToDelete = chunk.map((key) => ({ Key: key }));

      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objectsToDelete,
            Quiet: true,
          },
        })
      );

      deletedCount += chunk.length;
    }

    return jsonResponse({
      message: `Berhasil menghapus ${deletedCount} file yatim piatu.`,
      deletedCount,
    });
  } catch (error) {
    console.error("POST /api/file-maintenance/prune error:", error);
    return errorResponse("Gagal menghapus file yatim piatu.", 500);
  }
}
