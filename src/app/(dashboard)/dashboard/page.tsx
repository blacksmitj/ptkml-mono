import { Metadata } from "next";
import { UnifiedDashboardView } from "@/components/dashboard/v2/unified-dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard | Pendampingan",
  description: "Unified role-aware modern dashboard",
};

export default function DashboardPage() {
  return <UnifiedDashboardView />;
}
