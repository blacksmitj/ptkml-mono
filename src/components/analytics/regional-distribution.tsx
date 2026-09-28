"use client"

import { useAppStore } from "@/store/use-app-store"
import { useDashboardStats } from "@/hooks/use-dashboard"
import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

const chartConfig = {
  applicants: {
    label: "Peserta",
  },
} as ChartConfig

export function RegionalDistribution() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: stats } = useDashboardStats(currentWorkspaceId || undefined);

  const chartData = React.useMemo(() => {
    if (!stats?.topProvinces) return [];
    return stats.topProvinces.map((prov, idx) => ({
      area: prov.name,
      applicants: prov.count,
      fill: `var(--chart-${(idx % 5) + 1})`,
    }));
  }, [stats?.topProvinces]);

  const totalApplicants = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.applicants, 0)
  }, [chartData])

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Sebaran Wilayah Peserta</CardTitle>
        <CardDescription>Distribusi geografis peserta TKML Nasional.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="applicants"
              nameKey="area"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalApplicants.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Total Peserta
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
