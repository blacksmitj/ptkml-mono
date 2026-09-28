import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required").max(100, "Username too long"),
  password: z.string().min(1, "Password is required").max(200, "Password too long"),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tkml_super_secret_jwt_key_2026_secure_random_sign"
);

export async function POST(request: NextRequest) {
  try {
    if (process.env.ALLOW_LOCAL_LOGIN !== "true") {
      return errorResponse("Local login is disabled. Please use SSO.", 403);
    }

    const body = await parseBody(request, loginSchema);
    const { username, password } = body;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
      },
    });

    if (!user || !user.password) {
      return errorResponse("Invalid username or password", 401);
    }

    // Check if account is currently locked
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil).getTime() - Date.now()) / (60 * 1000)
      );
      return errorResponse(
        `Akun terkunci sementara karena terlalu banyak percobaan gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`,
        423
      );
    }

    // Verify bcrypt password
    let isPasswordCorrect = false;
    if (user.password.startsWith("$2a$") || user.password.startsWith("$2b$")) {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordCorrect) {
      const newFailedCount = (user.loginFailedCount || 0) + 1;
      const shouldLock = newFailedCount >= MAX_FAILED_ATTEMPTS;
      const lockTime = shouldLock
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;

      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            loginFailedCount: newFailedCount,
            lockedUntil: lockTime,
          },
        })
        .catch((err) => console.error("Failed to update login failure count", err));

      if (shouldLock) {
        return errorResponse(
          `Terlalu banyak percobaan login gagal. Akun dikunci selama ${LOCKOUT_MINUTES} menit.`,
          423
        );
      }

      return errorResponse("Invalid username or password", 401);
    }

    // Reset failure counter on successful login
    if (user.loginFailedCount > 0 || user.lockedUntil) {
      await prisma.user
        .update({
          where: { id: user.id },
          data: {
            loginFailedCount: 0,
            lockedUntil: null,
          },
        })
        .catch((err) => console.error("Failed to reset login failure count", err));
    }

    // Generate Signed JWT Token
    const token = await new SignJWT({
      userId: user.id,
      role: user.globalRole,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const response = jsonResponse({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.globalRole,
        name: user.profile?.name,
      },
    });

    // Set secure JWT cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    response.cookies.delete("auth_user_id");

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return errorResponse("Internal server error", 500);
  }
}
