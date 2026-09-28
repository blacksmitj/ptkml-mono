import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn, formatPercentage } from "@/lib/utils";

export interface V2BarListItem {
  label: string;
  value: number;
  color?: string;
}

export interface V2BarListProps {
  items: V2BarListItem[];
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxDisplay?: number;
  badgeLabel?: string;
  className?: string;
}

const DEFAULT_COLORS = [
  "var(--brand-seq-1)",
  "var(--brand-seq-2)",
  "var(--brand-seq-3)",
  "var(--brand-seq-4)",
  "var(--brand-seq-5)",
];

export function V2BarList({
  items = [],
  title,
  description,
  icon,
  maxDisplay = 5,
  badgeLabel,
  className,
}: V2BarListProps) {
  const displayItems = items.slice(0, maxDisplay);
  const total = React.useMemo(
    () => items.reduce((sum, item) => sum + item.value, 0),
    [items]
  );
  const maxValue = displayItems[0]?.value || 1;

  return (
    <Card className={cn("border-border/60 shadow-2xs", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {badgeLabel && (
          <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
            {badgeLabel}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pt-2">
        {displayItems.length > 0 ? (
          displayItems.map((item, idx) => {
            const color = item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
            const pct = total > 0 ? (item.value / total) * 100 : 0;
            const barWidth = Math.min(100, Math.round((item.value / maxValue) * 100));

            return (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="truncate max-w-56 capitalize text-foreground">
                    {item.label.toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {item.value}{" "}
                    <span className="text-[10px] text-muted-foreground font-normal">
                      ({formatPercentage(pct)})
                    </span>
                  </span>
                </div>
                <Progress
                  value={barWidth}
                  className="h-1.5 bg-muted"
                  indicatorStyle={{ backgroundColor: color }}
                />
              </div>
            );
          })
        ) : (
          <div className="text-xs text-muted-foreground italic text-center py-6">
            Belum ada data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
