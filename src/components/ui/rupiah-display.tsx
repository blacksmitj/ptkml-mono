import * as React from "react"
import { formatRupiah } from "@/lib/utils"
import { cn } from "@/lib/utils"

export interface RupiahDisplayProps extends React.ComponentProps<"span"> {
  value: number | null | undefined;
}

export function RupiahDisplay({ value, className, ...props }: RupiahDisplayProps) {
  return (
    <span className={cn("font-medium font-mono", className)} {...props}>
      {formatRupiah(value)}
    </span>
  )
}
