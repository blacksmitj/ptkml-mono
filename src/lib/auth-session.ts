import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

export interface JwtPayload {
  userId: string;
  role: string;
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tkml_super_secret_jwt_key_2026_secure_random_sign"
);

/**
 * Extracts and verifies the user ID from Better Auth session or JWT cookie / Bearer token.
 */
export async function getSessionUserId(
  request: NextRequest | Request
): Promise<string | null> {
  try {
    // 1. Check cookies for token
    let token: string | undefined;

    if ("cookies" in request && typeof request.cookies?.get === "function") {
      token = request.cookies.get("token")?.value;
    } else {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    // 2. Check Authorization Bearer header fallback
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return (payload as unknown as JwtPayload).userId || null;
  } catch (error) {
    return null;
  }
}
