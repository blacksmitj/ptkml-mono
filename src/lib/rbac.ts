import { NextRequest, NextResponse } from "next/server";
import prisma from "./prisma";
import { getSessionUserId } from "./auth-session";
import { errorResponse } from "./api-utils";
import type { GlobalRole, WorkspaceRole } from "@prisma/client";

export async function getCurrentUser(request: NextRequest | Request) {
  try {
    const userId = await getSessionUserId(request);
    if (!userId) return null;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspaceMemberships: true,
      },
    });
    return user;
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

export type AuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response: null; data: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; user: null; response: NextResponse<Record<string, unknown>>; data: null };

export async function requireAuth(request: NextRequest | Request): Promise<AuthResult> {
  const user = await getCurrentUser(request);
  if (!user) {
    const res = errorResponse("Unauthorized", 401);
    return { ok: false, user: null, response: res, data: null };
  }
  return { ok: true, user, response: null, data: user };
}

export type GlobalRoleResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>; response: null; data: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> }
  | { ok: false; user: null; response: NextResponse<Record<string, unknown>>; data: null };

export async function requireGlobalRole(
  request: NextRequest | Request,
  allowedRoles: GlobalRole[] | string[]
): Promise<GlobalRoleResult> {
  const auth = await requireAuth(request);
  if (!auth.ok || !auth.user) return { ok: false, user: null, response: auth.response, data: null };

  if (!allowedRoles.includes(auth.user.globalRole)) {
    return { ok: false, user: null, response: errorResponse("Forbidden", 403), data: null };
  }
  return { ok: true, user: auth.user, response: null, data: auth.user };
}

export type WorkspaceAccessResult =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
      membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
      workspace: { id: string; isActive: boolean; isInputFrozen: boolean };
      response: null;
      data: {
        user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
        membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
        workspace: { id: string; isActive: boolean; isInputFrozen: boolean };
      };
    }
  | {
      ok: false;
      user: null;
      membership: null;
      workspace: null;
      response: NextResponse<Record<string, unknown>>;
      data: null;
    };

export async function requireWorkspaceAccess(
  request: NextRequest | Request,
  workspaceId: string
): Promise<WorkspaceAccessResult> {
  const auth = await requireAuth(request);
  if (!auth.ok || !auth.user) {
    return { ok: false, user: null, membership: null, workspace: null, response: auth.response, data: null };
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, isActive: true, isInputFrozen: true },
  });

  if (!workspace) {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Workspace not found", 404),
      data: null,
    };
  }

  if (auth.user.globalRole === "SUPER_ADMIN" || auth.user.globalRole === "WORKSPACE_SUPERVISOR") {
    return {
      ok: true,
      user: auth.user,
      membership: null,
      workspace,
      response: null,
      data: { user: auth.user, membership: null, workspace },
    };
  }

  if (!workspace.isActive) {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: Workspace is inactive", 403),
      data: null,
    };
  }

  const membership = auth.user.workspaceMemberships.find(
    (m) => m.workspaceId === workspaceId && m.verificationStatus === "APPROVED"
  );

  if (!membership) {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: No access to this workspace", 403),
      data: null,
    };
  }

  return {
    ok: true,
    user: auth.user,
    membership,
    workspace,
    response: null,
    data: { user: auth.user, membership, workspace },
  };
}

export type WorkspaceRoleResult =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
      membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
      response: null;
      data: {
        user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
        membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
      };
    }
  | {
      ok: false;
      user: null;
      membership: null;
      response: NextResponse<Record<string, unknown>>;
      data: null;
    };

export async function requireWorkspaceRole(
  request: NextRequest | Request,
  workspaceId: string,
  allowedRoles: WorkspaceRole[] | string[]
): Promise<WorkspaceRoleResult> {
  const access = await requireWorkspaceAccess(request, workspaceId);
  if (!access.ok || access.response) {
    return { ok: false, user: null, membership: null, response: access.response, data: null };
  }

  const { user, membership } = access;

  if (user.globalRole === "SUPER_ADMIN" || user.globalRole === "WORKSPACE_SUPERVISOR") {
    return { ok: true, user, membership: null, response: null, data: { user, membership: null } };
  }

  if (!membership || !allowedRoles.includes(membership.role)) {
    return {
      ok: false,
      user: null,
      membership: null,
      response: errorResponse("Forbidden: Insufficient role in workspace", 403),
      data: null,
    };
  }

  return { ok: true, user, membership, response: null, data: { user, membership } };
}

export type WorkspaceWriteAccessResult =
  | {
      ok: true;
      user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
      membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
      workspace: { id: string; isActive: boolean; isInputFrozen: boolean };
      response: null;
      data: {
        user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
        membership: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>["workspaceMemberships"][0] | null;
        workspace: { id: string; isActive: boolean; isInputFrozen: boolean };
      };
    }
  | {
      ok: false;
      user: null;
      membership: null;
      workspace: null;
      response: NextResponse<Record<string, unknown>>;
      data: null;
    };

export async function requireWorkspaceWriteAccess(
  request: NextRequest | Request,
  workspaceId: string
): Promise<WorkspaceWriteAccessResult> {
  const access = await requireWorkspaceAccess(request, workspaceId);
  if (!access.ok || access.response) {
    return { ok: false, user: null, membership: null, workspace: null, response: access.response, data: null };
  }

  const { user, membership, workspace } = access;

  if (!workspace?.isActive) {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: Workspace is inactive", 403),
      data: null,
    };
  }

  if (workspace?.isInputFrozen && user.globalRole !== "SUPER_ADMIN") {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: Workspace is frozen", 403),
      data: null,
    };
  }

  if (user.globalRole === "SUPER_ADMIN") {
    return { ok: true, user, membership: null, workspace, response: null, data: { user, membership: null, workspace } };
  }

  if (user.globalRole === "WORKSPACE_SUPERVISOR") {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: Read-only global role", 403),
      data: null,
    };
  }

  if (membership && membership.role === "UNIVERSITY_SUPERVISOR") {
    return {
      ok: false,
      user: null,
      membership: null,
      workspace: null,
      response: errorResponse("Forbidden: Read-only workspace role", 403),
      data: null,
    };
  }

  return { ok: true, user, membership, workspace, response: null, data: { user, membership, workspace } };
}

export async function verifyWritePermission(
  request: NextRequest | Request,
  workspaceId?: string
): Promise<boolean> {
  try {
    const currentUserId = await getSessionUserId(request);
    if (!currentUserId) return false;

    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { globalRole: true },
    });

    if (!user || user.globalRole === "WORKSPACE_SUPERVISOR") {
      return false;
    }

    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { isActive: true, isInputFrozen: true },
      });

      if (!workspace) return false;
      if (!workspace.isActive) return false;
      if (workspace.isInputFrozen && user.globalRole !== "SUPER_ADMIN") {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("verifyWritePermission error:", error);
    return false;
  }
}
