import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn, formatPercentage } from "@/lib/utils";

export interface V2RadarChartItem {
  name: string;
  count: number;
}

export interface V2RadarChartProps {
  data: V2RadarChartItem[];
  title: string;
  description?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  className?: string;
}

export function V2RadarChart({
  data = [],
  title,
  description,
  icon,
  accentColor = "var(--brand-seq-1)",
  className,
}: V2RadarChartProps) {
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const chartConfig = React.useMemo<ChartConfig>(
    () => ({
      count: {
        label: "Jumlah",
        color: accentColor,
      },
    }),
    [accentColor]
  );

  return (
    <Card className={cn("border-border/60 shadow-2xs flex flex-col justify-between", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="flex items-center justify-center pt-2 pb-4">
        {data.length > 0 && total > 0 ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
            <ChartContainer config={chartConfig} className="w-full sm:w-1/2 max-h-44">
              <RadarChart data={data}>
                <PolarGrid strokeOpacity={0.4} />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar
                  dataKey="count"
                  fill={accentColor}
                  fillOpacity={0.35}
                  stroke={accentColor}
                  strokeWidth={1.5}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>

            <div className="space-y-1.5 flex-1 w-full sm:w-1/2">
              {data.map((item, idx) => {
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-32">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: `var(--brand-seq-${(idx % 5) + 1})`,
                        }}
                      />
                      <span className="text-muted-foreground truncate capitalize">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-semibold font-mono text-xs shrink-0">
                      {item.count}{" "}
                      <span className="text-[10px] text-muted-foreground font-normal">
                        ({formatPercentage(pct)})
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-8">
            Belum ada data radar
          </div>
        )}
      </CardContent>
    </Card>
  );
}
