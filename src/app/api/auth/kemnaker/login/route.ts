import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.KEMNAKER_CLIENT_ID;
  const redirectUri = process.env.KEMNAKER_REDIRECT_URI;
  const scope = "basic email profile";
  const authorizationUrl = `https://account.kemnaker.go.id/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri || ""
  )}&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(authorizationUrl);
}
