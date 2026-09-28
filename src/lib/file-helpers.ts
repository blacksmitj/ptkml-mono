import { bucketName } from "./s3";

export function parseFileUrl(url: string | null | undefined): { objectKey: string; bucket: string | null } {
  let objectKey = "";
  let bucket: string | null = null;
  if (!url) return { objectKey, bucket };

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname;
    const parts = pathname.split("/");
    if (parts.length >= 2) {
      bucket = parts[0] || bucketName || "pendampingan";
      objectKey = parts.slice(1).join("/");
    } else {
      objectKey = parts[parts.length - 1] || "";
    }
  } catch {
    const urlParts = url.split("/");
    objectKey = urlParts[urlParts.length - 1] || "";
    const parsedBucket = urlParts[urlParts.length - 2] || null;
    bucket = parsedBucket || bucketName || "pendampingan";
  }

  return { objectKey, bucket };
}
