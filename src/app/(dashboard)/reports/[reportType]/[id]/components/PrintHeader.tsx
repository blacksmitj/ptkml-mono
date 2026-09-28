"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Printer, ChevronLeft } from "lucide-react";

interface PrintHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onPrint?: () => void;
  children?: React.ReactNode; // Optional extra action/filter items
}

export function PrintHeader({
  title,
  subtitle,
  badge,
  onPrint,
  children,
}: PrintHeaderProps) {
  const router = useRouter();

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur-md border-b shadow-xs print:hidden mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 space-y-3">
        {/* Tier 1: Header Title, Subtitle, Badge & Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => router.back()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  {title}
                </h1>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button onClick={handlePrint} className="h-9 gap-2 shadow-xs">
              <Printer className="h-4 w-4" />
              Cetak / PDF
            </Button>
          </div>
        </div>

        {/* Tier 2: Additional Filters / Children if provided */}
        {children && (
          <div className="pt-2 border-t border-border/60">{children}</div>
        )}
      </div>
    </div>
  );
}
