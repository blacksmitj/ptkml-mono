import { delCachePattern } from "./redis";

export async function clearApplicantsCache(workspaceId: string) {
  try {
    await delCachePattern(`dashboard:stats:${workspaceId}`);
  } catch (err) {
    console.error("Failed to clear dashboard cache:", err);
  }
}
