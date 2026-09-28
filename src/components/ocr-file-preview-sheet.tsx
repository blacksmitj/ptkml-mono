"use client";

import React from "react";
import { OcrResult, File } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ZoomIn,
  ZoomOut,
  X,
  RefreshCw,
} from "lucide-react";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface OcrFilePreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  file: File & { ocrResult?: OcrResult | null };
  title?: string;
}

export function OcrFilePreviewSheet({
  isOpen,
  onClose,
  file,
  title = "Pratinjau Berkas",
}: OcrFilePreviewSheetProps) {
  const [scale, setScale] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [startY, setStartY] = React.useState(0);
  const [scrollLeft, setScrollLeft] = React.useState(0);
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleZoomReset = () => setScale(1);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1 || !containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1 || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  React.useEffect(() => {
    setScale(1);
    setIsDragging(false);
  }, [file?.url, isOpen]);

  const ocrResult = file?.ocrResult;
  const isPdf = React.useMemo(() => {
    if (file?.mimeType === "application/pdf") return true;
    if (!file?.url) return false;
    const cleanUrl = file.url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".pdf") || file.url.includes("pdf");
  }, [file?.url, file?.mimeType]);

  const isImage = React.useMemo(() => {
    if (!file?.url) return false;
    const cleanUrl = file.url.split("?")[0].toLowerCase();
    return (
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".gif") ||
      cleanUrl.endsWith(".webp") ||
      file.url.includes("image")
    );
  }, [file?.url]);

  // Determine verification status
  const statusInfo = React.useMemo(() => {
    if (!ocrResult) {
      return {
        status: "UNCHECKED",
        title: "Belum Diperiksa",
        description: "Berkas ini belum diproses oleh sistem verifikasi berkas otomatis.",
        colorClass: "bg-muted/40 border-muted-foreground/20 text-muted-foreground",
        icon: <Clock className="h-5 w-5 text-muted-foreground" />,
      };
    }

    if (ocrResult.status === "PENDING" || ocrResult.status === "PROCESSING") {
      return {
        status: "PROCESSING",
        title: "Sedang Diperiksa",
        description: "Sistem sedang menganalisis berkas Anda secara otomatis. Mohon tunggu beberapa saat.",
        colorClass: "bg-amber-500/5 border-amber-500/20 text-amber-800 dark:text-amber-300",
        icon: <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />,
      };
    }

    if (ocrResult.status === "FAILED") {
      return {
        status: "FAILED",
        title: "Gagal Dibaca",
        description: ocrResult.errorMessage || "Sistem gagal mendeteksi atau membaca teks dalam dokumen ini.",
        colorClass: "bg-red-500/5 border-red-500/20 text-red-800 dark:text-red-300",
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
      };
    }

    // Check validations for compliance
    const isDocMatch = ocrResult.validations?.every(v => v.isMatch) ?? true;
    if (!isDocMatch) {
      return {
        status: "MISMATCH",
        title: "Perlu Periksa",
        description: "Jenis atau konten berkas yang Anda unggah terdeteksi tidak sesuai dengan tipe berkas yang dipilih.",
        colorClass: "bg-orange-500/5 border-orange-500/20 text-orange-800 dark:text-orange-300",
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      };
    }

    return {
      status: "SUCCESS",
      title: "Sesuai",
      description: "Pemeriksaan selesai. Berkas Anda terverifikasi sesuai dengan tipe dokumen yang dipilih.",
      colorClass: "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    };
  }, [ocrResult]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose} modal={false}>
      <SheetContent
        side="right"
        className="w-full! sm:w-[450px]! md:w-[500px]! lg:w-[600px]! flex flex-col h-full p-0 border-l shadow-2xl bg-background/95 backdrop-blur-md transition-all duration-300 pointer-events-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="min-w-0 flex-1 pr-3 flex items-center gap-2">
            <FileText className="size-4 text-primary shrink-0" />
            <SheetTitle className="text-sm font-semibold text-foreground truncate">
              {title}
            </SheetTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {file?.url && (
              <a
                href={normalizeFileUrl(file.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer mr-2"
              >
                Buka di Tab Baru
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg cursor-pointer hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {file && (
          <div className="flex-1 flex flex-col min-h-0 p-4 gap-4 overflow-y-auto">
            {/* Document Preview */}
            <div className="flex-1 flex flex-col border rounded-lg bg-muted/5 overflow-hidden min-h-[350px] relative">
              <div className="flex-1 flex items-center justify-center overflow-auto p-2 relative min-h-0">
                {file.url ? (
                  isPdf ? (
                    <iframe
                      src={normalizeFileUrl(file.url)}
                      className="w-full h-full min-h-[300px] border-0"
                      title="Document Preview"
                    />
                  ) : (
                    <div
                      ref={containerRef}
                      onMouseDown={handleMouseDown}
                      onMouseLeave={handleMouseLeave}
                      onMouseUp={handleMouseUp}
                      onMouseMove={handleMouseMove}
                      className={`w-full h-full flex items-center justify-center overflow-auto ${
                        scale > 1 ? "select-none" : ""
                      }`}
                    >
                      <img
                        src={normalizeFileUrl(file.url)}
                        alt="Document Preview"
                        draggable="false"
                        onDragStart={(e) => e.preventDefault()}
                        className="max-w-full max-h-full object-contain rounded"
                        style={{
                          transform: `scale(${scale})`,
                          transformOrigin: "center center",
                          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
                        }}
                      />
                    </div>
                  )
                ) : (
                  <span className="text-muted-foreground text-xs">
                    Pratinjau tidak tersedia
                  </span>
                )}
                {file.url && isImage && (
                  <div className="absolute bottom-4 right-4 flex gap-1 z-10 bg-background/90 p-1 rounded-lg border shadow-sm">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-muted"
                      onClick={handleZoomOut}
                      title="Perkecil"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-7 px-1.5 font-mono text-[10px] hover:bg-muted"
                      onClick={handleZoomReset}
                      title="Reset"
                    >
                      {Math.round(scale * 100)}%
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-muted"
                      onClick={handleZoomIn}
                      title="Perbesar"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
