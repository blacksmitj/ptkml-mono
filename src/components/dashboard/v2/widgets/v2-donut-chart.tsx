import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Pie, PieChart, Cell, Label } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn, formatPercentage } from "@/lib/utils";

export interface V2DonutChartItem {
  name: string;
  count: number;
  color?: string;
}

export interface V2DonutChartProps {
  data: V2DonutChartItem[];
  title: string;
  description?: string;
  icon?: React.ReactNode;
  centerLabel?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  "var(--brand-seq-1)",
  "var(--brand-seq-2)",
  "var(--brand-seq-3)",
  "var(--brand-seq-4)",
  "var(--brand-seq-5)",
];

export function V2DonutChart({
  data = [],
  title,
  description,
  icon,
  centerLabel = "Total",
  className,
}: V2DonutChartProps) {
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.count, 0),
    [data]
  );

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, idx) => {
      config[item.name] = {
        label: item.name,
        color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      };
    });
    return config;
  }, [data]);

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
            <ChartContainer config={chartConfig} className="size-36 shrink-0">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={46}
                  outerRadius={64}
                  strokeWidth={2}
                >
                  {data.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={entry.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                    />
                  ))}
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
                              className="fill-foreground text-xl font-bold font-mono"
                            >
                              {total}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 14}
                              className="fill-muted-foreground text-[9px] font-semibold uppercase"
                            >
                              {centerLabel}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="space-y-2 flex-1 w-full">
              {data.map((item, idx) => {
                const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.name} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate max-w-36">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-muted-foreground font-medium truncate capitalize">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-semibold font-mono text-xs">
                        {item.count}{" "}
                        <span className="text-[10px] text-muted-foreground font-normal">
                          ({formatPercentage(pct)})
                        </span>
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className="h-1 bg-muted"
                      indicatorStyle={{ backgroundColor: color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic py-8">
            Belum ada data distribusi
          </div>
        )}
      </CardContent>
    </Card>
  );
}
