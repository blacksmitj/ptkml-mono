"use client"

import { RegionalDistribution } from "@/components/analytics/regional-distribution"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAppStore } from "@/store/use-app-store"
import { useDashboardStats } from "@/hooks/use-dashboard"
import dynamic from "next/dynamic"
import { Loader2, MapPin } from "lucide-react"

// RegionalMap has been removed

export default function AnalyticsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: stats } = useDashboardStats(currentWorkspaceId || undefined);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analitik & Laporan</h1>
          <p className="text-muted-foreground mt-2">
            Ringkasan performa pendampingan dan distribusi peserta secara nasional.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <RegionalDistribution />
        
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Universitas (TKM Lanjutan Terbanyak)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.topUniversities && stats.topUniversities.length > 0 ? (
                stats.topUniversities.slice(0, 5).map((univ, idx) => {
                  const colors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"];
                  return (
                    <div key={univ.name} className="flex items-center gap-4">
                      <div className={`size-3 rounded-full ${colors[idx % colors.length]}`} />
                      <div className="flex-1 text-sm">{univ.name}</div>
                      <div className="font-bold text-sm">{univ.count} Peserta</div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground italic text-center py-4">Belum ada data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>



      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Capaian Output Per Bulan</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center min-h-[200px] text-muted-foreground text-sm italic">
            Visualisasi tambahan (Heatmap / Scatter) akan diimplementasikan pada Fase 6 (Integrasi Akhir).
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
