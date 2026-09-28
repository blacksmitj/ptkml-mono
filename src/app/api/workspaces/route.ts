import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Nama workspace wajib diisi"),
  year: z.number().int().min(2000),
  code: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET /api/workspaces
export async function GET(request: NextRequest) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const workspaces = await prisma.workspace.findMany({
      orderBy: { year: "desc" },
    });
    return jsonResponse(workspaces);
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    return errorResponse("Failed to fetch workspaces", 500);
  }
}

// POST /api/workspaces
export async function POST(request: NextRequest) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { data: body, error } = await parseBody(request, createWorkspaceSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid request body", 400);
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        year: body.year,
        code: body.code,
        isActive: body.isActive ?? true,
      },
    });

    return jsonResponse(workspace, 201);
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    return errorResponse("Failed to create workspace", 500);
  }
}
