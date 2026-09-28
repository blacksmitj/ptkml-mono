import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { s3Client, bucketName } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { errorResponse } from "@/lib/api-utils";
import { Readable } from "node:stream";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/files/[id]/view - Proxy route to stream files from MinIO/S3
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const file = await prisma.file.findUnique({
      where: { id },
    });

    if (!file) {
      return errorResponse("File not found", 404);
    }

    const bucket = file.bucket || bucketName;
    const key = file.objectKey;

    if (!key) {
      return errorResponse("File has no objectKey", 400);
    }

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const s3Response = await s3Client.send(command);

    const headers = new Headers();
    if (s3Response.ContentType) {
      headers.set("Content-Type", s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      headers.set("Content-Length", s3Response.ContentLength.toString());
    }

    // Convert AWS SDK Stream to Web ReadableStream
    let webStream: ReadableStream;
    if (s3Response.Body instanceof Readable) {
      webStream = Readable.toWeb(s3Response.Body) as ReadableStream;
    } else if (s3Response.Body && typeof (s3Response.Body as any).transformToWebStream === "function") {
      webStream = (s3Response.Body as any).transformToWebStream();
    } else {
      const byteArray = await s3Response.Body?.transformToByteArray();
      return new Response(byteArray as any, { headers });
    }

    return new Response(webStream, { headers });
  } catch (error) {
    console.error("GET /api/files/[id]/view error:", error);
    return errorResponse("Failed to stream file", 500);
  }
}
