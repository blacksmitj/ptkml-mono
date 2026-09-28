import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, formatPercentage } from "@/lib/utils";

export interface V2StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  accentColor?: string;
  trend?: {
    label: string;
    value: number;
    description?: string;
  };
  className?: string;
}

export function V2StatCard({
  label,
  value,
  subValue,
  icon,
  accentColor = "var(--brand-seq-1)",
  trend,
  className,
}: V2StatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/60 shadow-2xs transition-all duration-300 hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
        className
      )}
    >
      {/* Top Accent Strip (Thin & Hover only) */}
      <div
        className="absolute top-0 left-0 w-full h-0.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ backgroundColor: accentColor }}
      />

      <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground line-clamp-1">
              {label}
            </span>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {value}
              </span>
              {subValue && (
                <span className="text-xs font-medium text-muted-foreground">
                  {subValue}
                </span>
              )}
            </div>
          </div>

          <div
            className="p-2.5 rounded-xl border border-border/50 shrink-0 shadow-2xs transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        </div>

        {trend && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{trend.label}</span>
              <span className="font-semibold font-mono" style={{ color: accentColor }}>
                {formatPercentage(trend.value)}
              </span>
            </div>
            <Progress
              value={trend.value}
              className="h-1.5 bg-muted"
              indicatorStyle={{ backgroundColor: accentColor }}
            />
            {trend.description && (
              <p className="text-[10px] text-muted-foreground">{trend.description}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
