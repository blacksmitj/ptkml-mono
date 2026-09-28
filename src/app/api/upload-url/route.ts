import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { s3PublicClient, bucketName } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { jsonResponse, errorResponse } from "@/lib/api-utils";

// GET /api/upload-url?fileName=...&fileType=...&category=...
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const searchParams = request.nextUrl.searchParams;
    const fileName = searchParams.get("fileName");
    const fileType = searchParams.get("fileType");
    const category = searchParams.get("category");

    if (!fileName || !fileType) {
      return errorResponse("fileName and fileType are required", 400);
    }

    let key = `${uuidv4()}-${fileName}`;
    if (category) {
      const folder = category.toLowerCase();
      key = `${folder}/${key}`;
    }

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: fileType,
    });

    // URL valid for 5 minutes, signed directly for the public/external endpoint
    const uploadUrl = await getSignedUrl(s3PublicClient, command, { expiresIn: 300 });

    const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
    const minioPort = process.env.MINIO_PORT || "9002";
    const useSSL = process.env.MINIO_USE_SSL === "true";

    const extEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT || minioEndpoint;
    const extPort = process.env.MINIO_EXTERNAL_PORT || minioPort;
    const extUseSSL = process.env.MINIO_EXTERNAL_USE_SSL ? process.env.MINIO_EXTERNAL_USE_SSL === "true" : useSSL;

    const portStr = extPort && extPort !== "80" && extPort !== "443" ? `:${extPort}` : "";
    const publicUrl = `${extUseSSL ? "https" : "http"}://${extEndpoint}${portStr}/${bucketName || "pendampingan"}/${key}`;

    return jsonResponse({
      uploadUrl,
      key,
      publicUrl,
    });
  } catch (error) {
    console.error("GET /api/upload-url error:", error);
    return errorResponse("Failed to generate upload URL", 500);
  }
}
