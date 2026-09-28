import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputNumberProps extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  value?: number;
  onChange?: (value: number) => void;
}

export const InputNumber = React.forwardRef<HTMLInputElement, InputNumberProps>(
  ({ className, value, onChange, ...props }, ref) => {
    // Format number to Indonesian format (with dot separators)
    const formatNumber = (num: number | undefined) => {
      if (num === undefined || num === null || isNaN(num)) return ""
      if (num === 0) return "0"
      return new Intl.NumberFormat("id-ID").format(num)
    }

    const [displayValue, setDisplayValue] = React.useState(() => formatNumber(value))

    React.useEffect(() => {
      setDisplayValue(formatNumber(value))
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/\D/g, "")
      const numericValue = rawValue === "" ? 0 : parseInt(rawValue, 10)
      
      setDisplayValue(formatNumber(numericValue))
      if (onChange) {
        onChange(numericValue)
      }
    }

    return (
      <input
        type="text"
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        className={cn(
          "h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 font-mono tabular-nums",
          className
        )}
        {...props}
      />
    )
  }
)
InputNumber.displayName = "InputNumber"
