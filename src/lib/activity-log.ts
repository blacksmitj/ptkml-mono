import prisma from "./prisma";

export interface CreateActivityLogParams {
  workspaceId: string;
  userId?: string;
  type: string;
  title: string;
  description: string;
  status: "emerald" | "blue" | "amber" | "indigo" | "destructive";
  metadata?: any;
}

export async function createActivity(params: CreateActivityLogParams) {
  try {
    return await prisma.activityLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        description: params.description,
        status: params.status,
        metadata: params.metadata || {},
      },
    });
  } catch (error) {
    console.error("Failed to create activity log:", error);
  }
}
