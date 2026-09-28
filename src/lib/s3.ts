import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.MINIO_ENDPOINT || "localhost";
const port = process.env.MINIO_PORT || "9002";
const useSSL = process.env.MINIO_USE_SSL === "true";

export const s3Client = new S3Client({
  endpoint: `${useSSL ? "https" : "http"}://${endpoint}:${port}`,
  region: "us-east-1", // MinIO default region
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
  forcePathStyle: true, // Required for MinIO
});

// S3 Client configured for public/external access (used specifically for generating presigned URLs)
const extEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT || endpoint;
const extPort = process.env.MINIO_EXTERNAL_PORT || port;
const extUseSSL = process.env.MINIO_EXTERNAL_USE_SSL ? process.env.MINIO_EXTERNAL_USE_SSL === "true" : useSSL;
const portStr = extPort && extPort !== "80" && extPort !== "443" ? `:${extPort}` : "";

export const s3PublicClient = new S3Client({
  endpoint: `${extUseSSL ? "https" : "http"}://${extEndpoint}${portStr}`,
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

export const bucketName = process.env.MINIO_BUCKET || "";
