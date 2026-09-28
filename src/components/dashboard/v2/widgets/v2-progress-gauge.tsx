import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn, formatPercentage } from "@/lib/utils";

export interface V2ProgressGaugeProps {
  title: string;
  description?: string;
  percentage: number;
  accentColor?: string;
  badgeLabel?: string;
  icon?: React.ReactNode;
  stats?: Array<{
    label: string;
    value: string | number;
    colorClass?: string;
  }>;
  compact?: boolean;
  className?: string;
}

export function V2ProgressGauge({
  title,
  description,
  percentage,
  accentColor = "var(--brand-seq-1)",
  badgeLabel = "Selesai",
  icon,
  stats = [],
  compact = false,
  className,
}: V2ProgressGaugeProps) {
  const clampedPct = Math.min(100, Math.max(0, percentage));
  const radius = compact ? 36 : 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedPct / 100);
  const size = compact ? 96 : 124;
  const strokeWidth = compact ? 7 : 9;

  return (
    <Card
      className={cn(
        "border-border/60 shadow-2xs flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-primary/30",
        compact ? "p-0 rounded-2xl" : "",
        className
      )}
    >
      <CardHeader className={compact ? "p-3.5 pb-1" : "pb-2"}>
        <div className="flex items-start gap-2.5">
          {icon && (
            <div
              className={cn(
                "rounded-xl border border-border/50 flex items-center justify-center shrink-0 shadow-2xs",
                compact ? "size-7.5 text-xs" : "size-9 text-sm"
              )}
              style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                color: accentColor,
              }}
            >
              {icon}
            </div>
          )}
          <div className="space-y-0.5 min-w-0 flex-1">
            <CardTitle
              className={cn(
                compact ? "text-xs font-bold leading-tight" : "text-sm font-bold",
                "truncate text-foreground"
              )}
            >
              {title}
            </CardTitle>
            {description && (
              <CardDescription
                className={cn(
                  compact ? "text-[11px] line-clamp-1" : "text-xs line-clamp-2"
                )}
              >
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent
        className={cn(
          compact ? "pt-1 px-3.5 pb-2" : "py-4",
          "flex flex-col items-center justify-center"
        )}
      >
        {/* SVG Circular Progress */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          <svg className="size-full transform -rotate-90">
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="stroke-muted/80"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Progress Arc */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="transition-all duration-700 ease-out"
              stroke={accentColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>

          <div className="text-center absolute inset-0 z-10 flex flex-col items-center justify-center">
            <span
              className={cn(
                compact ? "text-lg font-bold" : "text-2xl font-extrabold",
                "text-foreground font-mono leading-none tracking-tight"
              )}
            >
              {formatPercentage(percentage)}
            </span>
            {badgeLabel && (
              <span
                className={cn(
                  compact ? "text-[9px]" : "text-[10px]",
                  "text-muted-foreground block font-semibold uppercase tracking-wider mt-1"
                )}
              >
                {badgeLabel}
              </span>
            )}
          </div>
        </div>

        {/* Stats Footer Details */}
        {stats.length > 0 && (
          <div
            className={cn(
              "w-full grid grid-flow-col divide-x divide-border/50 border-t border-border/50 text-xs",
              compact ? "mt-2 pt-2 text-[11px]" : "mt-4 pt-3"
            )}
          >
            {stats.map((st, idx) => (
              <div key={idx} className="text-center px-1">
                <span className="text-muted-foreground font-medium block text-[10px] truncate">
                  {st.label}
                </span>
                <span
                  className={cn(
                    "font-bold font-mono",
                    compact ? "text-xs" : "text-sm",
                    st.colorClass || "text-foreground"
                  )}
                >
                  {st.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
