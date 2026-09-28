import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface V2RankedListItem {
  name: string;
  count: number;
  badge?: string;
}

export interface V2RankedListProps {
  items: V2RankedListItem[];
  title: string;
  description?: string;
  icon?: React.ReactNode;
  maxDisplay?: number;
  badgeSuffix?: string;
  className?: string;
}

const DEFAULT_DOT_COLORS = [
  "var(--brand-seq-1)",
  "var(--brand-seq-2)",
  "var(--brand-seq-3)",
  "var(--brand-seq-4)",
  "var(--brand-seq-5)",
];

export function V2RankedList({
  items = [],
  title,
  description,
  icon,
  maxDisplay = 5,
  badgeSuffix = "Peserta",
  className,
}: V2RankedListProps) {
  const displayItems = items.slice(0, maxDisplay);

  return (
    <Card className={cn("border-border/60 shadow-2xs", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>

      <CardContent className="space-y-3">
        {displayItems.length > 0 ? (
          displayItems.map((item, idx) => {
            const dotColor = DEFAULT_DOT_COLORS[idx % DEFAULT_DOT_COLORS.length];
            return (
              <div
                key={item.name}
                className="flex items-center justify-between text-xs border-b border-border/40 pb-2.5 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2.5 truncate max-w-64">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="font-semibold truncate text-foreground">
                    {item.name}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className="font-bold shrink-0 font-mono text-[11px]"
                >
                  {item.badge || `${item.count} ${badgeSuffix}`}
                </Badge>
              </div>
            );
          })
        ) : (
          <div className="text-xs text-muted-foreground italic text-center py-6">
            Belum ada data ranking
          </div>
        )}
      </CardContent>
    </Card>
  );
}
