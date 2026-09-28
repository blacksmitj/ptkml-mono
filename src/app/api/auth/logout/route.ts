import { jsonResponse } from "@/lib/api-utils";

export async function POST() {
  const response = jsonResponse({ success: true });
  response.cookies.delete("token");
  response.cookies.delete("auth_user_id");
  response.cookies.delete("better-auth.session_token");
  return response;
}
