import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { WorkspaceRole } from "@/types";

interface AppState {
  currentRole: WorkspaceRole | "SUPER_ADMIN" | "WORKSPACE_SUPERVISOR";
  currentWorkspaceId: string | null;
  currentUserId: string | null;
  universityId: string | null;
  isAffiliationApproved: boolean;
  hasHydrated: boolean;

  setRole: (role: WorkspaceRole | "SUPER_ADMIN" | "WORKSPACE_SUPERVISOR") => void;
  setWorkspaceId: (id: string | null) => void;
  setUserId: (id: string | null) => void;
  setUniversityId: (id: string | null) => void;
  setIsAffiliationApproved: (approved: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentRole: "SUPER_ADMIN",
      currentWorkspaceId: process.env.NEXT_PUBLIC_MOCK_API === "true" ? "ws-demo-2025" : null,
      currentUserId: process.env.NEXT_PUBLIC_MOCK_API === "true" ? "user-super-admin-1" : null,
      universityId: process.env.NEXT_PUBLIC_MOCK_API === "true" ? "univ-1" : null,
      isAffiliationApproved: true,
      hasHydrated: false,

      setRole: (role) => set({ currentRole: role }),
      setWorkspaceId: (id) => set({ currentWorkspaceId: id }),
      setUniversityId: (id) => {
        set({
          universityId: id,
          isAffiliationApproved: false, // Reset approval on change
        });
      },
      setUserId: (id) => {
        if (id) {
          set({ currentUserId: id });
        } else {
          // Clear all session/user related data
          set({
            currentUserId: null,
            currentWorkspaceId: null,
            currentRole: WorkspaceRole.MENTOR,
            universityId: null,
            isAffiliationApproved: false,
          });
        }
      },
      setIsAffiliationApproved: (approved) => set({ isAffiliationApproved: approved }),
      setHasHydrated: (state) => set({ hasHydrated: state }),
    }),
    {
      name: "tkml-app-storage",
      storage: createJSONStorage(() => localStorage),
      // Only persist workspace ID and user ID
      partialize: (state) => ({
        currentWorkspaceId: state.currentWorkspaceId,
        currentUserId: state.currentUserId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Check and migrate legacy localStorage keys if they exist
          if (typeof window !== "undefined") {
            const legacyWorkspaceId = localStorage.getItem("tkml_workspace_id");
            const legacyUserId = localStorage.getItem("tkml_user_id");

            if (legacyWorkspaceId || legacyUserId) {
              state.setWorkspaceId(legacyWorkspaceId);
              state.setUserId(legacyUserId);

              // Clean up legacy keys
              localStorage.removeItem("tkml_workspace_id");
              localStorage.removeItem("tkml_user_id");
            }
          }
          state.setHasHydrated(true);
        }
      },
    }
  )
);
