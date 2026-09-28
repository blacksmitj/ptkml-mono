import { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import {
  MOCK_USER,
  MOCK_USERS_BY_ROLE,
  MOCK_WORKSPACES,
  MOCK_UNIVERSITIES,
  MOCK_MEMBERS,
  MOCK_APPLICANTS,
  MOCK_LOGBOOKS,
  MOCK_OUTPUT_REPORTS,
  MOCK_DASHBOARD_STATS,
  MOCK_DASHBOARD_ACTIVITIES,
} from "./mock-data";

export function setupMockApi(client: AxiosInstance) {
  if (typeof window !== "undefined") {
    console.info("%c[Mock API] Standalone Dev Mock Mode ACTIVE", "background: #2563eb; color: #fff; padding: 2px 8px; border-radius: 4px; font-weight: bold;");
  }

  // Intercept requests and return mocked responses
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    // We short-circuit by providing an adapter for mock mode
    return config;
  });

  // Use custom adapter to hijack Axios dispatch
  const originalAdapter = client.defaults.adapter;

  client.defaults.adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();
    const params = config.params || {};

    // Simulate mild network latency (80ms) for realistic feel
    await new Promise((res) => setTimeout(res, 80));

    const makeResponse = (data: any, status = 200): AxiosResponse => ({
      data,
      status,
      statusText: "OK",
      headers: {},
      config,
    });

    const getActiveDevUser = () => {
      if (typeof window !== "undefined") {
        const storedRole = localStorage.getItem("tkml_dev_active_role") as any;
        if (storedRole && (MOCK_USERS_BY_ROLE as any)[storedRole]) {
          return (MOCK_USERS_BY_ROLE as any)[storedRole];
        }
      }
      return MOCK_USERS_BY_ROLE.SUPER_ADMIN;
    };

    const activeUser = getActiveDevUser();

    // 1. Current User / Auth
    if (url.match(/\/me$/)) {
      return makeResponse(activeUser);
    }
    if (url.includes("/auth/login") || url.includes("/login")) {
      return makeResponse({
        success: true,
        user: {
          id: activeUser.id,
          name: activeUser.profile?.name || "User",
          username: activeUser.username || "admin",
          role: activeUser.globalRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : activeUser.workspaceMemberships?.[0]?.role || "MENTOR",
        },
        token: "mock-jwt-token",
      });
    }

    // 2. Notification Badges
    if (url.includes("/notifications/badge-counts")) {
      const isMentorUser = activeUser.globalRole === "USER" && activeUser.workspaceMemberships?.[0]?.role === "MENTOR";
      return makeResponse({
        roleType: isMentorUser ? "MENTOR" : "ADMIN",
        scope: isMentorUser ? "PERSONAL" : activeUser.globalRole === "SUPER_ADMIN" ? "ALL" : "UNIVERSITY",
        pending: { logbook: 2, outputReport: 1, rtl: 0, total: 3 },
        needsAction: { logbook: 1, outputReport: 1, rtl: 0, total: 2 },
        applicantIssues: { noResponse: 1, notFound: 1, notWilling: 1, notDisbursed: 1, total: 4 },
        counts: { logbook: 2, outputReport: 1, rtl: 0, total: 3 },
      });
    }

    // 3. Workspaces
    if (url.match(/\/workspaces\/[^/]+$/)) {
      const id = url.split("/").pop();
      const ws = MOCK_WORKSPACES.find((w) => w.id === id) || MOCK_WORKSPACES[0];
      return makeResponse(ws);
    }
    if (url.includes("/workspaces")) {
      return makeResponse(MOCK_WORKSPACES);
    }

    // 4. Universities
    if (url.match(/\/universities\/[^/]+$/)) {
      const id = url.split("/").pop();
      const univ = MOCK_UNIVERSITIES.find((u) => u.id === id) || MOCK_UNIVERSITIES[0];
      return makeResponse(univ);
    }
    if (url.includes("/universities")) {
      return makeResponse(MOCK_UNIVERSITIES);
    }

    // 5. Members
    if (url.match(/\/members\/[^/]+$/)) {
      const id = url.split("/").pop();
      const member = MOCK_MEMBERS.find((m) => m.id === id) || MOCK_MEMBERS[0];
      return makeResponse({
        ...member,
        applicants: MOCK_APPLICANTS,
      });
    }
    if (url.includes("/members")) {
      return makeResponse({
        data: MOCK_MEMBERS,
        pagination: { total: MOCK_MEMBERS.length, page: 1, limit: 10, totalPages: 1 },
      });
    }

    // 6. Applicants (with pagination & search)
    if (url.match(/\/applicants\/[^/]+$/)) {
      const id = url.split("/").pop();
      const applicant = MOCK_APPLICANTS.find((a) => a.id === id) || MOCK_APPLICANTS[0];

      // Enrich applicant with corresponding outputReports and logbooks
      const applicantReports = MOCK_OUTPUT_REPORTS.filter((r) => r.applicantId === applicant.id);
      const applicantLogbooks = MOCK_LOGBOOKS
        .filter((lb) => lb.applicants?.some((item) => item.applicantId === applicant.id))
        .map((lb) => ({
          logbookId: lb.id,
          applicantId: applicant.id,
          logbook: lb,
        }));

      return makeResponse({
        ...applicant,
        outputReports: applicantReports,
        logbooks: applicantLogbooks,
      });
    }
    if (url.includes("/applicants")) {
      let filtered = [...MOCK_APPLICANTS];
      if (params.search) {
        const q = String(params.search).toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.profile?.name.toLowerCase().includes(q) ||
            a.businessProfile?.businessName.toLowerCase().includes(q)
        );
      }
      if (params.status && params.status !== "ALL") {
        filtered = filtered.filter((a) => a.status === params.status);
      }
      if (params.communicationStatus && params.communicationStatus !== "ALL") {
        filtered = filtered.filter((a) => a.communicationStatus === params.communicationStatus);
      }
      if (params.willingness && params.willingness !== "ALL") {
        filtered = filtered.filter((a) => a.willingness === params.willingness);
      }
      if (params.presenceStatus && params.presenceStatus !== "ALL") {
        filtered = filtered.filter((a) => a.presenceStatus === params.presenceStatus);
      }
      if (params.fundDisbursement && params.fundDisbursement !== "ALL") {
        filtered = filtered.filter((a) => a.fundDisbursement === params.fundDisbursement);
      }
      if (params.universityId && params.universityId !== "ALL") {
        filtered = filtered.filter((a) => a.universityId === params.universityId);
      }
      if (params.mentorStatus && params.mentorStatus !== "ALL") {
        if (params.mentorStatus === "ASSIGNED") {
          filtered = filtered.filter((a) => !!a.mentorId);
        } else if (params.mentorStatus === "UNASSIGNED") {
          filtered = filtered.filter((a) => !a.mentorId);
        }
      }
      return makeResponse({
        data: filtered,
        pagination: {
          total: filtered.length,
          page: Number(params.page) || 1,
          limit: Number(params.limit) || 10,
          totalPages: 1,
        },
      });
    }

    // 7. Logbooks
    if (url.match(/\/logbooks\/[^/]+$/)) {
      const id = url.split("/").pop();
      const logbook = MOCK_LOGBOOKS.find((l) => l.id === id) || MOCK_LOGBOOKS[0];
      return makeResponse(logbook);
    }
    if (url.includes("/logbooks")) {
      return makeResponse({
        data: MOCK_LOGBOOKS,
        pagination: { total: MOCK_LOGBOOKS.length, page: 1, limit: 10, totalPages: 1 },
      });
    }

    // 8. Output Reports
    if (url.match(/\/output-reports\/[^/]+$/)) {
      const id = url.split("/").pop();
      const report = MOCK_OUTPUT_REPORTS.find((r) => r.id === id) || MOCK_OUTPUT_REPORTS[0];
      return makeResponse(report);
    }
    if (url.includes("/output-reports")) {
      return makeResponse({
        data: MOCK_OUTPUT_REPORTS,
        pagination: { total: MOCK_OUTPUT_REPORTS.length, page: 1, limit: 10, totalPages: 1 },
      });
    }

    // 9. Dashboard Analytics & Activities
    if (url.includes("/dashboard/stats")) {
      return makeResponse(MOCK_DASHBOARD_STATS);
    }
    if (url.includes("/dashboard/activities")) {
      return makeResponse(MOCK_DASHBOARD_ACTIVITIES);
    }

    // 10. Follow up recommendations
    if (url.match(/\/follow-up-recommendations\/check-eligibility\/[^/]+$/)) {
      const applicantId = url.split("/").pop();
      const applicant = MOCK_APPLICANTS.find((a) => a.id === applicantId) || MOCK_APPLICANTS[0];
      return makeResponse({
        isEligible: applicant.isEligibleForFollowUp ?? true,
        hasExistingRecommendation: !!applicant.followUpRecommendation,
        status: applicant.followUpRecommendation?.status || null,
      });
    }
    if (url.match(/\/follow-up-recommendations\/[^/]+$/)) {
      const applicantId = url.split("/").pop();
      const applicant = MOCK_APPLICANTS.find((a) => a.id === applicantId) || MOCK_APPLICANTS[0];
      const reports = MOCK_OUTPUT_REPORTS.filter((r) => r.applicantId === applicant.id);

      return makeResponse({
        applicant: {
          ...applicant,
          outputReports: reports,
        },
        isEligible: applicant.isEligibleForFollowUp ?? true,
        recommendation: applicant.followUpRecommendation || null,
      });
    }
    if (url.includes("/follow-up-recommendations/stats")) {
      return makeResponse({
        total: 15,
        draft: 4,
        submitted: 3,
        approved: 7,
        rejected: 1,
        eligible: 12,
        pendingCreation: 3,
      });
    }
    if (url.includes("/follow-up-recommendations")) {
      const recommendations = MOCK_APPLICANTS
        .filter((a) => !!a.followUpRecommendation)
        .map((a) => ({
          ...a.followUpRecommendation,
          applicant: a,
        }));
      return makeResponse(recommendations);
    }

    // 11. Regional Data (Provinces, Cities, Districts, Subdistricts)
    if (url.includes("/provinces")) {
      return makeResponse([
        { id: "p-32", name: "Jawa Barat" },
        { id: "p-31", name: "DKI Jakarta" },
        { id: "p-33", name: "Jawa Tengah" },
        { id: "p-35", name: "Jawa Timur" },
        { id: "p-36", name: "Banten" },
      ]);
    }
    if (url.includes("/cities")) {
      return makeResponse([
        { id: "c-3273", name: "Kota Bandung", provinceId: "p-32" },
        { id: "c-3204", name: "Kabupaten Bandung", provinceId: "p-32" },
        { id: "c-3277", name: "Kota Cimahi", provinceId: "p-32" },
        { id: "c-3205", name: "Kabupaten Garut", provinceId: "p-32" },
      ]);
    }
    if (url.includes("/districts")) {
      return makeResponse([
        { id: "d-1", name: "Bandung Wetan", cityId: "c-3273" },
        { id: "d-2", name: "Coblong", cityId: "c-3273" },
        { id: "d-3", name: "Bojongloa Kidul", cityId: "c-3273" },
      ]);
    }
    if (url.includes("/subdistricts")) {
      return makeResponse([
        { id: "sd-1", name: "Citarum", districtId: "d-1" },
        { id: "sd-2", name: "Tamansari", districtId: "d-1" },
      ]);
    }

    // Fallback for POST/PATCH/DELETE (simulate successful mutate)
    if (["post", "patch", "put", "delete"].includes(method)) {
      return makeResponse({ success: true, message: "Mock mutation success", id: "mock-id-new" });
    }

    // Default fallback: return empty array if collection-like or object
    return makeResponse([]);
  };
}
