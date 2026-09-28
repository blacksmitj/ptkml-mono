import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import {
  useDashboardStats,
  useDashboardActivities,
  DashboardStats,
  DashboardActivity,
} from "@/hooks/use-dashboard";
import { useMembers, useMember } from "@/hooks/use-members";
import { useApplicants } from "@/hooks/use-applicants";
import { useLogbooks } from "@/hooks/use-logbooks";
import { useOutputReports } from "@/hooks/use-output-reports";
import { useFollowUpRecommendationStats } from "@/hooks/use-follow-up-recommendations";
import { computeGreeting, computeDemographics } from "@/lib/dashboard-utils";
import { WorkspaceRole } from "@/types";

export interface DashboardV2Data {
  me: any;
  currentRole: string | null;
  currentWorkspaceId: string | null;
  greeting: {
    text: string;
    description: string;
    iconName: string;
  };

  // Admin / Supervisor data
  stats?: DashboardStats;
  activities?: DashboardActivity[];
  isLoadingStats: boolean;
  isLoadingActivities: boolean;

  // Mentor / University local data
  applicants: any[];
  logbooks: any[];
  outputReports: any[];
  members: any[];
  mentorMember?: any;
  isLoadingMemberData: boolean;

  // Computed data
  demographics: {
    topEducations: { name: string; count: number }[];
    ageGroups: { name: string; count: number }[];
    topSectors: { name: string; count: number }[];
    topProvinces: { name: string; count: number }[];
    genderGroups: { name: string; count: number }[];
  };

  // Follow-up recommendation stats
  followUpStats?: {
    eligible: number;
    approved: number;
    total: number;
  };
  isLoadingFollowUp: boolean;

  // Refetch helpers
  refetchAll: () => void;
}

export function useDashboardV2Data(): DashboardV2Data {
  const { currentWorkspaceId, currentRole, universityId: storeUniversityId } = useAppStore();
  const workspaceId = currentWorkspaceId || undefined;
  const { data: me } = useMe();
  const userName = me?.profile?.name || me?.username;

  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const isSupervisor = currentRole === "WORKSPACE_SUPERVISOR";
  const isMentor = currentRole === WorkspaceRole.MENTOR;
  const isUniv =
    currentRole === WorkspaceRole.UNIVERSITY_ADMIN ||
    currentRole === WorkspaceRole.UNIVERSITY_SUPERVISOR;

  const greeting = React.useMemo(
    () => computeGreeting(userName),
    [userName]
  );

  // 1. BE Dashboard Stats (used by Super Admin & Workspace Supervisor)
  const statsQuery = useDashboardStats(
    isSuperAdmin || isSupervisor ? workspaceId : undefined
  );

  // 2. BE Dashboard Activities
  const activitiesQuery = useDashboardActivities(
    isSuperAdmin || isSupervisor ? workspaceId : undefined
  );

  // 3. Find active membership in current workspace (for Mentor or Univ Admin/Supervisor)
  const allMembersQuery = useMembers({
    workspaceId: isMentor || isUniv ? workspaceId : undefined,
  });

  const activeMembership = React.useMemo(() => {
    if (!isMentor && !isUniv) return undefined;
    if (me?.workspaceMemberships && workspaceId) {
      const found = me.workspaceMemberships.find(
        (m: any) => m.workspaceId === workspaceId
      );
      if (found) return found;
    }
    const list =
      allMembersQuery.data?.data ||
      (Array.isArray(allMembersQuery.data) ? allMembersQuery.data : []);
    if (!list.length || !me?.id) return undefined;
    return list.find((m: any) => m.userId === me?.id || m.user?.id === me?.id);
  }, [isMentor, isUniv, me, workspaceId, allMembersQuery.data]);

  const mentorMember = isMentor ? activeMembership : undefined;
  const mentorId = mentorMember?.id;
  const universityId = activeMembership?.universityId || storeUniversityId || undefined;

  // 4. Member Detail (contains applicants array for mentor, identical to legacy mentor-dashboard-view)
  const memberDetailQuery = useMember(isMentor && mentorId ? mentorId : "");

  // 5. Applicants data query (direct API)
  const applicantsQuery = useApplicants(
    workspaceId,
    isMentor ? mentorId : undefined,
    {
      universityId: isUniv ? universityId : undefined,
      limit: isMentor || isUniv ? 200 : 0,
    }
  );

  // 6. Logbooks data
  const logbooksQuery = useLogbooks(
    isMentor || isUniv ? workspaceId : undefined,
    isMentor ? mentorId : undefined,
    undefined,
    { limit: 200 }
  );

  // 7. Output reports data
  const outputReportsQuery = useOutputReports(
    isMentor || isUniv ? workspaceId : undefined,
    undefined,
    isMentor ? mentorId : undefined,
    { limit: 200 }
  );

  // 8. University members
  const univMembersQuery = useMembers({
    workspaceId: isUniv ? workspaceId : undefined,
    universityId: isUniv ? universityId : undefined,
    limit: 100,
  });

  // 9. Follow-up recommendations stats
  const followUpQuery = useFollowUpRecommendationStats(
    workspaceId,
    {
      mentorId: isMentor ? mentorId : undefined,
      universityId: isUniv ? universityId : undefined,
    }
  );

  // Resolve applicants: prioritize memberDetail.applicants (mentor) then applicantsQuery (univ/fallback)
  const applicants = React.useMemo(() => {
    if (isMentor) {
      if (memberDetailQuery.data?.applicants && memberDetailQuery.data.applicants.length > 0) {
        return memberDetailQuery.data.applicants;
      }
      if (mentorMember?.applicants && mentorMember.applicants.length > 0) {
        return mentorMember.applicants;
      }
    }
    const qData = applicantsQuery.data;
    if (Array.isArray(qData)) return qData;
    if (qData && Array.isArray((qData as any).data)) return (qData as any).data;
    return [];
  }, [isMentor, memberDetailQuery.data, mentorMember, applicantsQuery.data]);

  const logbooks = React.useMemo(() => {
    const qData = logbooksQuery.data;
    if (Array.isArray(qData)) return qData;
    if (qData && Array.isArray(qData.data)) return qData.data;
    return [];
  }, [logbooksQuery.data]);

  const outputReports = React.useMemo(() => {
    const qData = outputReportsQuery.data;
    if (Array.isArray(qData)) return qData;
    if (qData && Array.isArray(qData.data)) return qData.data;
    return [];
  }, [outputReportsQuery.data]);

  const members = React.useMemo(() => {
    const qData = univMembersQuery.data;
    if (Array.isArray(qData)) return qData;
    if (qData && Array.isArray(qData.data)) return qData.data;
    return [];
  }, [univMembersQuery.data]);

  // Demographics computed locally for mentor / univ, or adapted from BE stats
  const demographics = React.useMemo(() => {
    if (isMentor || isUniv) {
      return computeDemographics(applicants);
    }
    if (statsQuery.data) {
      return {
        topEducations: statsQuery.data.topEducations || [],
        ageGroups: statsQuery.data.ageGroups || [],
        topSectors: statsQuery.data.topSectors || [],
        topProvinces: statsQuery.data.topProvinces || [],
        genderGroups: statsQuery.data.genderGroups || [],
      };
    }
    return {
      topEducations: [],
      ageGroups: [],
      topSectors: [],
      topProvinces: [],
      genderGroups: [],
    };
  }, [isMentor, isUniv, applicants, statsQuery.data]);

  const refetchAll = React.useCallback(() => {
    statsQuery.refetch();
    activitiesQuery.refetch();
    applicantsQuery.refetch();
    memberDetailQuery.refetch();
    logbooksQuery.refetch();
    outputReportsQuery.refetch();
    followUpQuery.refetch();
  }, [
    statsQuery,
    activitiesQuery,
    applicantsQuery,
    memberDetailQuery,
    logbooksQuery,
    outputReportsQuery,
    followUpQuery,
  ]);

  return {
    me,
    currentRole: (currentRole as string) || null,
    currentWorkspaceId: workspaceId || null,
    greeting,

    stats: statsQuery.data,
    activities: activitiesQuery.data,
    isLoadingStats: statsQuery.isLoading,
    isLoadingActivities: activitiesQuery.isLoading,

    applicants,
    logbooks,
    outputReports,
    members,
    mentorMember,
    isLoadingMemberData:
      applicantsQuery.isLoading ||
      logbooksQuery.isLoading ||
      outputReportsQuery.isLoading,

    demographics,

    followUpStats: followUpQuery.data
      ? {
          eligible: followUpQuery.data.eligible || 0,
          approved: followUpQuery.data.approved || 0,
          total: followUpQuery.data.total || 0,
        }
      : undefined,
    isLoadingFollowUp: followUpQuery.isLoading,

    refetchAll,
  };
}
