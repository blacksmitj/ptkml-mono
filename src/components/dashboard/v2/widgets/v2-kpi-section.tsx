import * as React from "react";
import { cn } from "@/lib/utils";

export interface V2KpiSectionProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function V2KpiSection({
  children,
  cols = 4,
  className,
}: V2KpiSectionProps) {
  const gridClasses = {
    1: "grid grid-cols-1 gap-4",
    2: "grid grid-cols-1 sm:grid-cols-2 gap-4",
    3: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    4: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
  };

  return (
    <div className={cn(gridClasses[cols], className)}>
      {children}
    </div>
  );
}
