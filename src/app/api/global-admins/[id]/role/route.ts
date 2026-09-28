import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireGlobalRole } from "@/lib/rbac";
import { jsonResponse, errorResponse, parseBody } from "@/lib/api-utils";
import { z } from "zod";
import type { GlobalRole } from "@prisma/client";

const updateRoleSchema = z.object({
  globalRole: z.enum(["SUPER_ADMIN", "WORKSPACE_SUPERVISOR", "USER"]),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/global-admins/[id]/role
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { user: currentUser, response } = await requireGlobalRole(request, ["SUPER_ADMIN"]);
    if (response || !currentUser) return response;

    const { id } = await params;
    const { data: body, error } = await parseBody(request, updateRoleSchema);
    if (error || !body) {
      return errorResponse(error || "Peran global tidak valid.", 400);
    }

    // Prevent self-modification to avoid accidental lockout
    if (id === currentUser.id) {
      return errorResponse("Anda tidak dapat mengubah peran Anda sendiri.", 400);
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetUser) {
      return errorResponse("User tidak ditemukan.", 404);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        globalRole: body.globalRole as GlobalRole,
      },
      include: {
        profile: true,
      },
    });

    return jsonResponse(updatedUser);
  } catch (error) {
    console.error("PATCH /api/global-admins/[id]/role error:", error);
    return errorResponse("Gagal memperbarui peran user", 500);
  }
}
