import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

export interface V2AreaChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface V2AreaChartProps {
  data: Record<string, any>[];
  series: V2AreaChartSeries[];
  xKey: string;
  title?: string;
  description?: string;
  badgeLabel?: string;
  xFormatter?: (val: any) => string;
  heightClass?: string;
  className?: string;
}

export function V2AreaChart({
  data,
  series,
  xKey,
  title = "Tren Aktivitas",
  description = "Aktivitas berkala sistem",
  badgeLabel,
  xFormatter = (val) => String(val),
  heightClass = "h-72",
  className,
}: V2AreaChartProps) {
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    series.forEach((s) => {
      config[s.key] = {
        label: s.label,
        color: s.color,
      };
    });
    return config;
  }, [series]);

  return (
    <Card className={cn("border-border/60 shadow-2xs", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {badgeLabel && (
          <Badge variant="outline" className="text-xs font-medium">
            {badgeLabel}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground italic">
            Belum ada data grafik aktivitas
          </div>
        ) : (
          <ChartContainer config={chartConfig} className={cn("aspect-auto w-full", heightClass)}>
            <AreaChart data={data} margin={{ left: -15, right: 10, top: 10 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient
                    key={s.key}
                    id={`v2Gradient-${s.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                opacity={0.35}
              />
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={xFormatter}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={10} />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#v2Gradient-${s.key})`}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
