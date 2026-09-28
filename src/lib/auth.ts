import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { genericOAuth, username } from "better-auth/plugins";
import prisma from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET || "tkml_super_secret_better_auth_key_2026_secure_random",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  plugins: [
    username(),
    genericOAuth({
      config: [
        {
          providerId: "kemnaker",
          clientId: process.env.KEMNAKER_CLIENT_ID || "",
          clientSecret: process.env.KEMNAKER_CLIENT_SECRET || "",
          authorizationUrl: "https://account.kemnaker.go.id/auth",
          tokenUrl: "https://account.kemnaker.go.id/api/v1/tokens",
          userInfoUrl: "https://account.kemnaker.go.id/api/v1/users/me",
          scopes: ["basic", "email", "profile"],
          redirectURI: process.env.KEMNAKER_REDIRECT_URI || "http://localhost:3000/api/auth/callback/kemnaker",
          getUserInfo: async (tokens) => {
            const response = await fetch("https://account.kemnaker.go.id/api/v1/users/me", {
              headers: {
                Authorization: `Bearer ${tokens.accessToken}`,
                Accept: "application/json",
              },
            });

            if (!response.ok) {
              return null;
            }

            const json = await response.json();
            const kemnakerUser = json.data;
            if (!kemnakerUser) return null;

            const profileInfo = kemnakerUser.profile || {};
            const email = kemnakerUser.email || profileInfo.user?.email || "";
            const nik = profileInfo.identity_number || kemnakerUser.username || "";
            const name = kemnakerUser.name || profileInfo.user?.name || "SSO User";

            return {
              id: nik || kemnakerUser.id || email,
              name,
              email: email || `${nik}@kemnaker.go.id`,
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ],
});
