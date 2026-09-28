"use client"

import { Button } from "@/components/ui/button"
import { Download, FileDown, Table as TableIcon } from "lucide-react"
import { toast } from "sonner"

interface ExportButtonProps {
  filename: string
  label?: string
  variant?: "outline" | "default" | "secondary"
}

export function ExportButton({ filename, label = "Export Data", variant = "outline" }: ExportButtonProps) {
  const handleExport = (type: "excel" | "pdf") => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Mengekspor ${filename} sebagai ${type.toUpperCase()}...`,
        success: `${filename}.${type === "excel" ? "xlsx" : "pdf"} berhasil diunduh.`,
        error: "Gagal mengekspor data.",
      }
    )
  }

  return (
    <div className="flex gap-2">
      <Button variant={variant} size="sm" onClick={() => handleExport("excel")}>
        <TableIcon className="mr-2 h-4 w-4" />
        Excel
      </Button>
      <Button variant={variant} size="sm" onClick={() => handleExport("pdf")}>
        <FileDown className="mr-2 h-4 w-4" />
        PDF
      </Button>
    </div>
  )
}
