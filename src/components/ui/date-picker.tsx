"use client"

import * as React from "react"
import { format } from "date-fns"
import { id } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date | string
  maxDate?: Date | string
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pilih tanggal",
  disabled,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    const parsed = new Date(value)
    return isNaN(parsed.getTime()) ? undefined : parsed
  }, [value])

  const parsedMin = React.useMemo(() => {
    if (!minDate) return undefined
    const d = typeof minDate === "string" ? new Date(minDate) : minDate
    return isNaN(d.getTime()) ? undefined : d
  }, [minDate])

  const parsedMax = React.useMemo(() => {
    if (!maxDate) return undefined
    const d = typeof maxDate === "string" ? new Date(maxDate) : maxDate
    return isNaN(d.getTime()) ? undefined : d
  }, [maxDate])

  const disabledMatcher = React.useMemo(() => {
    const matchers: any[] = []
    if (parsedMin) {
      // Set to start of day for accurate comparison
      const startOfMin = new Date(parsedMin)
      startOfMin.setHours(0, 0, 0, 0)
      matchers.push({ before: startOfMin })
    }
    if (parsedMax) {
      // Set to end of day for accurate comparison
      const endOfMax = new Date(parsedMax)
      endOfMax.setHours(23, 59, 59, 999)
      matchers.push({ after: endOfMax })
    }
    return matchers.length > 0 ? matchers : undefined
  }, [parsedMin, parsedMax])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-11 px-3 relative cursor-pointer",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          {dateValue ? (
            format(dateValue, "dd MMMM yyyy", { locale: id })
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            if (date) {
              const year = date.getFullYear()
              const month = String(date.getMonth() + 1).padStart(2, "0")
              const day = String(date.getDate()).padStart(2, "0")
              onChange?.(`${year}-${month}-${day}`)
            } else {
              onChange?.("")
            }
            setOpen(false)
          }}
          disabled={disabledMatcher || disabled}
        />
      </PopoverContent>
    </Popover>
  )
}
