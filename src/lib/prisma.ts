import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

export const prisma = prismaClient.$extends({
  result: {
    file: {
      url: {
        needs: { id: true, objectKey: true, bucket: true },
        compute(file) {
          const minioEndpoint = process.env.MINIO_ENDPOINT || "localhost";
          const minioPort = process.env.MINIO_PORT || "9002";
          const useSSL = process.env.MINIO_USE_SSL === "true";

          const extEndpoint = process.env.MINIO_EXTERNAL_ENDPOINT || minioEndpoint;
          const extPort = process.env.MINIO_EXTERNAL_PORT || minioPort;
          const extUseSSL = process.env.MINIO_EXTERNAL_USE_SSL ? process.env.MINIO_EXTERNAL_USE_SSL === "true" : useSSL;

          if (!file.objectKey) return null;

          const bucket = file.bucket || process.env.MINIO_BUCKET || "pendampingan";
          const portStr = extPort && extPort !== "80" && extPort !== "443" ? `:${extPort}` : "";

          return `${extUseSSL ? "https" : "http"}://${extEndpoint}${portStr}/${bucket}/${file.objectKey}`;
        },
      },
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prismaClient;

export default prisma;
