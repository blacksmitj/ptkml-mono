import { Redis } from "ioredis";

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | undefined;
};

export const redisClient =
  globalForRedis.redisClient ??
  new Redis({
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redisClient = redisClient;
}

redisClient.on("error", (err) => {
  console.error("Redis connection error:", err);
});

redisClient.on("connect", () => {
  console.log("Connected to Redis successfully.");
});

/**
 * Get item from cache
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const data = await redisClient.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading from Redis cache for key "${key}":`, error);
    return null;
  }
}

/**
 * Set item in cache
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 86400
): Promise<void> {
  try {
    const data = JSON.stringify(value);
    await redisClient.set(key, data, "EX", ttlSeconds);
  } catch (error) {
    console.error(`Error writing to Redis cache for key "${key}":`, error);
  }
}

/**
 * Delete item from cache
 */
export async function delCache(key: string): Promise<void> {
  try {
    const data = await redisClient.del(key);
  } catch (error) {
    console.error(`Error deleting Redis cache key "${key}":`, error);
  }
}

/**
 * Delete keys matching a pattern
 */
export async function delCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (error) {
    console.error(`Error deleting Redis cache pattern "${pattern}":`, error);
  }
}
