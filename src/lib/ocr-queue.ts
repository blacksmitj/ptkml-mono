import { Queue, QueueEvents } from "bullmq";

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD || undefined,
};

declare global {
  var globalOcrQueue: Queue | undefined;
  var globalOcrQueueEvents: QueueEvents | undefined;
}

export const ocrQueue =
  globalThis.globalOcrQueue ??
  new Queue("ocr-queue", {
    connection: redisConnection,
  });

export const ocrQueueEvents =
  globalThis.globalOcrQueueEvents ??
  new QueueEvents("ocr-queue", {
    connection: redisConnection,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.globalOcrQueue = ocrQueue;
  globalThis.globalOcrQueueEvents = ocrQueueEvents;
}
