"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MaskedDataProps {
  value: string;
  className?: string;
  showToggle?: boolean;
}

export function MaskedData({ value, className, showToggle = true }: MaskedDataProps) {
  const [isVisible, setIsVisible] = useState(false);

  if (!value || value === "N/A") return <span className={className}>N/A</span>;

  const maskedValue = "•".repeat(value.length || 16);

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <span className="font-mono">
        {isVisible ? value : maskedValue}
      </span>
      {showToggle && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-muted"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(!isVisible);
          }}
          title={isVisible ? "Sembunyikan" : "Tampilkan"}
        >
          {isVisible ? (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Eye className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
      )}
    </div>
  );
}
