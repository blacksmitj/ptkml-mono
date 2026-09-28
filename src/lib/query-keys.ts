/**
 * Centralized Query Key Factory for TanStack Query v5
 * Follows official TanStack Query v5 best practices for type-safe query keys & precise cache invalidation.
 */

export const meKeys = {
  all: ["me"] as const,
  profile: () => [...meKeys.all, "profile"] as const,
};

export const applicantsKeys = {
  all: ["applicants"] as const,
  lists: () => [...applicantsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...applicantsKeys.lists(), params ?? {}] as const,
  details: () => [...applicantsKeys.all, "detail"] as const,
  detail: (id: string) => [...applicantsKeys.details(), id] as const,
};

export const divideApplicantsKeys = {
  all: ["divide-applicants"] as const,
  lists: () => [...divideApplicantsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...divideApplicantsKeys.lists(), params ?? {}] as const,
};

export const membersKeys = {
  all: ["members"] as const,
  lists: () => [...membersKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...membersKeys.lists(), params ?? {}] as const,
  details: () => [...membersKeys.all, "detail"] as const,
  detail: (id: string) => [...membersKeys.details(), id] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: (workspaceId?: string) => [...dashboardKeys.all, "stats", workspaceId ?? ""] as const,
  activities: (workspaceId?: string) => [...dashboardKeys.all, "activities", workspaceId ?? ""] as const,
};

export const universitiesKeys = {
  all: ["universities"] as const,
  lists: () => [...universitiesKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...universitiesKeys.lists(), params ?? {}] as const,
  details: () => [...universitiesKeys.all, "detail"] as const,
  detail: (id: string, workspaceId?: string) => [...universitiesKeys.details(), id, workspaceId ?? ""] as const,
};

export const workspacesKeys = {
  all: ["workspaces"] as const,
  lists: () => [...workspacesKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...workspacesKeys.lists(), params ?? {}] as const,
  details: () => [...workspacesKeys.all, "detail"] as const,
  detail: (id: string) => [...workspacesKeys.details(), id] as const,
};

export const logbooksKeys = {
  all: ["logbooks"] as const,
  lists: () => [...logbooksKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...logbooksKeys.lists(), params ?? {}] as const,
  details: () => [...logbooksKeys.all, "detail"] as const,
  detail: (id: string) => [...logbooksKeys.details(), id] as const,
};

export const outputReportsKeys = {
  all: ["output-reports"] as const,
  lists: () => [...outputReportsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...outputReportsKeys.lists(), params ?? {}] as const,
  details: () => [...outputReportsKeys.all, "detail"] as const,
  detail: (id: string) => [...outputReportsKeys.details(), id] as const,
};

export const employeesKeys = {
  all: ["employees"] as const,
  lists: () => [...employeesKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...employeesKeys.lists(), params ?? {}] as const,
  details: () => [...employeesKeys.all, "detail"] as const,
  detail: (id: string) => [...employeesKeys.details(), id] as const,
};

export const globalAdminsKeys = {
  all: ["global-admins"] as const,
  lists: () => [...globalAdminsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...globalAdminsKeys.lists(), params ?? {}] as const,
  details: () => [...globalAdminsKeys.all, "detail"] as const,
  detail: (id: string) => [...globalAdminsKeys.details(), id] as const,
};

export const fileMaintenanceKeys = {
  all: ["file-maintenance"] as const,
  lists: () => [...fileMaintenanceKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...fileMaintenanceKeys.lists(), params ?? {}] as const,
};

export const followUpRecommendationsKeys = {
  all: ["follow-up-recommendations"] as const,
  lists: () => [...followUpRecommendationsKeys.all, "list"] as const,
  list: (params?: Record<string, unknown>) => [...followUpRecommendationsKeys.lists(), params ?? {}] as const,
  details: () => [...followUpRecommendationsKeys.all, "detail"] as const,
  detail: (applicantId: string) => [...followUpRecommendationsKeys.details(), applicantId] as const,
  eligibility: (applicantId: string) => [...followUpRecommendationsKeys.all, "eligibility", applicantId] as const,
  stats: (params?: Record<string, unknown>) => [...followUpRecommendationsKeys.all, "stats", params ?? {}] as const,
};

export const notificationBadgesKeys = {
  all: ["notification-badges"] as const,
  badgeCounts: (workspaceId?: string | null) => [...notificationBadgesKeys.all, "counts", workspaceId ?? ""] as const,
};



