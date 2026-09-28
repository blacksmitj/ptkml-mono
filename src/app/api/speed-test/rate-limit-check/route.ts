import { NextRequest } from "next/server";
import { jsonResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      status: "OK",
      message: "Rate limit check endpoint called successfully.",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0, must-revalidate",
      },
    }
  );
}
