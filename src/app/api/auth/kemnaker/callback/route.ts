import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Gender, GlobalRole } from "@prisma/client";
import { SignJWT } from "jose";
import { errorResponse } from "@/lib/api-utils";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "tkml_super_secret_jwt_key_2026_secure_random_sign"
);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");

  if (!code) {
    return errorResponse("Authorization code is missing", 400);
  }

  try {
    const fetchWithTimeout = async (
      url: string,
      options: RequestInit = {},
      timeoutMs = 6000
    ) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    };

    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetchWithTimeout(
      "https://account.kemnaker.go.id/api/v1/tokens",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: process.env.KEMNAKER_CLIENT_ID,
          client_secret: process.env.KEMNAKER_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: process.env.KEMNAKER_REDIRECT_URI,
        }),
      },
      8000
    );

    if (!tokenResponse.ok) {
      const errBody = await tokenResponse.text();
      console.error("Failed to exchange code for token:", errBody);
      return errorResponse("Failed token exchange", 500);
    }

    const tokenJson = (await tokenResponse.json()) as any;
    const accessToken = tokenJson.data?.access_token;
    if (!accessToken) {
      return errorResponse("No access token received from Kemnaker", 500);
    }

    // 2. Fetch user profile from Kemnaker
    let kemnakerUser: any = null;
    try {
      const userResponse = await fetchWithTimeout(
        "https://account.kemnaker.go.id/api/v1/users/me",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        6000
      );

      if (userResponse.ok) {
        const userJson = (await userResponse.json()) as any;
        kemnakerUser = userJson.data;
      } else {
        const errBody = await userResponse.text();
        console.warn("Kemnaker profile endpoint returned non-OK status:", errBody);
      }
    } catch (fetchErr: any) {
      console.warn("Kemnaker profile fetch timed out or failed:", fetchErr?.message || fetchErr);
    }

    if (!kemnakerUser) {
      return errorResponse(
        "Layanan profil Siap Kerja sedang mengalami gangguan/lambat. Silakan coba beberapa saat lagi.",
        500
      );
    }

    const profileInfo = kemnakerUser.profile || {};
    const email = kemnakerUser.email || profileInfo.user?.email || "";
    const nik = profileInfo.identity_number || kemnakerUser.username || "";
    const name = kemnakerUser.name || profileInfo.user?.name || "SSO User";
    const phone = kemnakerUser.phone_number || profileInfo.phone || "08000000000";
    const birthPlace = profileInfo.pob || "Dev City";
    const birthDate = profileInfo.bod ? new Date(profileInfo.bod) : new Date("1990-01-01");
    const gender = profileInfo.gender === 20 ? Gender.FEMALE : Gender.MALE;

    if (!nik) {
      return errorResponse("NIK (identity number) is missing from Kemnaker profile", 400);
    }

    // 3. Find or Create User in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { profile: { nik } },
          email ? { profile: { email } } : {},
        ].filter((cond) => Object.keys(cond).length > 0),
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      // Auto-Register user
      user = await prisma.$transaction(async (tx) => {
        const profile = await tx.profile.create({
          data: {
            name,
            email: email || `${nik}@kemnaker.go.id`,
            nik,
            birthPlace,
            birthDate,
            gender,
            whatsapp: phone,
          },
        });

        return await tx.user.create({
          data: {
            username: kemnakerUser.username || nik,
            globalRole: GlobalRole.USER,
            profileId: profile.id,
          },
          include: {
            profile: true,
          },
        });
      });
    } else {
      // Auto-Sync existing user's profile
      try {
        const syncData: Record<string, any> = {};

        if (kemnakerUser.name || profileInfo.user?.name) {
          syncData.name = kemnakerUser.name || profileInfo.user?.name;
        }
        if (profileInfo.pob) {
          syncData.birthPlace = profileInfo.pob;
        }
        if (profileInfo.bod) {
          syncData.birthDate = new Date(profileInfo.bod);
        }
        if (profileInfo.gender !== undefined && profileInfo.gender !== null) {
          syncData.gender = profileInfo.gender === 20 ? Gender.FEMALE : Gender.MALE;
        }
        if (phone && phone !== "08000000000") {
          syncData.whatsapp = phone;
        }
        if (email && email !== `${nik}@kemnaker.go.id`) {
          syncData.email = email;
        }

        if (Object.keys(syncData).length > 0) {
          await prisma.profile.update({
            where: { id: user.profileId },
            data: syncData,
          });
        }
      } catch (syncErr) {
        console.warn("Failed updating profile during Siap Kerja auto-sync:", syncErr);
      }
    }

    // 4. Set session token
    const token = await new SignJWT({
      userId: user.id,
      role: user.globalRole,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectResponse = NextResponse.redirect(`${frontendUrl}/workspaces`);

    redirectResponse.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    redirectResponse.cookies.delete("auth_user_id");

    return redirectResponse;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return errorResponse("Internal server error during OAuth callback", 500);
  }
}
