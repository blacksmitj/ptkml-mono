import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function jsonResponse<T>(data: T, status = 200, headers?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers,
  });
}

export function errorResponse(
  error: string | Record<string, unknown>,
  status = 400
) {
  const payload = typeof error === "string" ? { error } : error;
  return NextResponse.json(payload, { status });
}

export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } & T> {
  const raw = await request.json();
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid payload";
    throw new Error(message);
  }
  const data = result.data;
  // Return an object that satisfies both direct properties (body.xxx) and destructured ({ data, error })
  return Object.assign({}, data, {
    data,
    error: null as null,
  }) as { data: T; error: null } & T;
}
