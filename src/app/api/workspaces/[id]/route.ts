import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";

const updateWorkspaceSchema = z.object({
  name: z.string().optional(),
  year: z.number().int().optional(),
  code: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isInputFrozen: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/workspaces/[id]
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireAuth(request);
    if (response) return response;

    const { id } = await params;
    const workspace = await prisma.workspace.findUnique({
      where: { id },
    });

    if (!workspace) {
      return errorResponse("Workspace not found", 404);
    }

    return jsonResponse(workspace);
  } catch (error) {
    console.error("GET /api/workspaces/[id] error:", error);
    return errorResponse("Failed to fetch workspace details", 500);
  }
}

// PATCH /api/workspaces/[id]
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { id } = await params;
    const { data: body, error } = await parseBody(request, updateWorkspaceSchema);
    if (error || !body) {
      return errorResponse(error || "Invalid payload", 400);
    }

    const data: Record<string, any> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.year !== undefined) data.year = body.year;
    if (body.code !== undefined) data.code = body.code;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.isInputFrozen !== undefined) data.isInputFrozen = body.isInputFrozen;

    const workspace = await prisma.workspace.update({
      where: { id },
      data,
    });

    return jsonResponse(workspace);
  } catch (error) {
    console.error("PATCH /api/workspaces/[id] error:", error);
    return errorResponse("Failed to update workspace", 500);
  }
}

// DELETE /api/workspaces/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response) return response;

    const { id } = await params;
    await prisma.workspace.delete({
      where: { id },
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    return errorResponse("Failed to delete workspace", 500);
  }
}
