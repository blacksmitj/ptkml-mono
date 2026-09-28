"use client";

import React from "react";
import { OcrResult, File } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  TransformWrapper,
  TransformComponent,
  ReactZoomPanPinchRef,
} from "react-zoom-pan-pinch";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface MediaPreviewProps {
  onClose: () => void;
  file: File & { ocrResult?: OcrResult | null };
  title?: string;
}

// Global script loader helper for PDF.js
const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is undefined"));
      return;
    }
    if (window.pdfjsLib) {
      resolve(window.pdfjsLib);
      return;
    }

    const existingScript = document.getElementById("pdfjs-lib-script");
    if (existingScript) {
      const handleLoad = () => resolve(window.pdfjsLib);
      const handleError = (e: any) => reject(e);
      existingScript.addEventListener("load", handleLoad);
      existingScript.addEventListener("error", handleError);
      return;
    }

    const script = document.createElement("script");
    script.id = "pdfjs-lib-script";
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.async = true;
    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      } else {
        reject(new Error("pdfjsLib failed to load on window"));
      }
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });
};

export function MediaPreview({
  onClose,
  file,
  title = "Pratinjau Media",
}: MediaPreviewProps) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);
  const transformRef = React.useRef<ReactZoomPanPinchRef>(null);

  // PDF.js states
  const [pdfPage, setPdfPage] = React.useState(1);
  const [pdfTotalPages, setPdfTotalPages] = React.useState(1);
  const [pdfDocument, setPdfDocument] = React.useState<any>(null);
  const [pdfLoading, setPdfLoading] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const handleZoomIn = () => {
    transformRef.current?.zoomIn();
  };
  const handleZoomOut = () => {
    transformRef.current?.zoomOut();
  };
  const handleZoomReset = () => {
    transformRef.current?.resetTransform();
    setScale(1);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  React.useEffect(() => {
    setScale(1);
    setRotation(0);
    setPdfPage(1);
    setPdfTotalPages(1);
    setPdfDocument(null);
    transformRef.current?.resetTransform();
  }, [file?.url]);

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

  // Load PDF Document
  React.useEffect(() => {
    if (!file?.url || !isPdf) return;

    let active = true;
    const loadPdf = async () => {
      try {
        setPdfLoading(true);
        const pdfjs = await loadPdfJS();
        if (!active) return;

        // Use same-origin relative path for PDF.js document fetching to avoid CORS
        const finalUrl = normalizeFileUrl(file.url);
        const loadingTask = pdfjs.getDocument(finalUrl);
        const pdf = await loadingTask.promise;
        if (!active) return;

        setPdfDocument(pdf);
        setPdfTotalPages(pdf.numPages);
        setPdfPage(1);
        setPdfLoading(false);
      } catch (err) {
        console.error("Error loading PDF:", err);
        if (active) {
          setPdfLoading(false);
        }
      }
    };

    loadPdf();
    return () => {
      active = false;
    };
  }, [file?.url, isPdf]);

  // Render PDF Page to Canvas
  React.useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return;

    let active = true;
    const renderPage = async () => {
      try {
        const page = await pdfDocument.getPage(pdfPage);
        if (!active) return;

        const scaleValue = 1.5; // High resolution rendering scale
        const viewport = page.getViewport({ scale: scaleValue });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      }
    };

    renderPage();
    return () => {
      active = false;
    };
  }, [pdfDocument, pdfPage]);

  // Reset transform wrapper on page switch
  const handlePageChange = (newPage: number) => {
    setPdfPage(newPage);
    transformRef.current?.resetTransform();
    setScale(1);
  };

  // Determine verification status
  const statusInfo = React.useMemo(() => {
    if (!ocrResult) {
      return {
        status: "UNCHECKED",
        title: "Belum Diperiksa",
        badgeVariant: "secondary" as const,
        description:
          "Berkas ini belum diproses oleh verifikasi berkas otomatis.",
        colorClass:
          "bg-muted/30 border-muted-foreground/10 text-muted-foreground",
        icon: <Clock className="size-4 text-muted-foreground" />,
      };
    }

    if (ocrResult.status === "PENDING" || ocrResult.status === "PROCESSING") {
      return {
        status: "PROCESSING",
        title: "Sedang Diperiksa",
        badgeVariant: "outline" as const,
        description: "Sistem sedang menganalisis berkas secara otomatis.",
        colorClass:
          "bg-amber-500/5 border-amber-500/25 text-amber-800 dark:text-amber-300",
        icon: <RotateCw className="size-4 text-amber-500 animate-spin" />,
      };
    }

    if (ocrResult.status === "FAILED") {
      return {
        status: "FAILED",
        title: "Gagal Dibaca",
        badgeVariant: "destructive" as const,
        description:
          ocrResult.errorMessage ||
          "Gagal mendeteksi atau membaca teks dokumen ini.",
        colorClass: "bg-destructive/5 border-destructive/20 text-destructive",
        icon: <AlertTriangle className="size-4 text-destructive" />,
      };
    }

    const isDocMatch = ocrResult.validations?.every((v) => v.isMatch) ?? true;
    if (!isDocMatch) {
      return {
        status: "MISMATCH",
        title: "Perlu Periksa",
        badgeVariant: "outline" as const,
        description:
          "Jenis atau konten berkas terdeteksi tidak sesuai dengan tipe berkas.",
        colorClass:
          "bg-orange-500/5 border-orange-500/25 text-orange-800 dark:text-orange-300",
        icon: <AlertTriangle className="size-4 text-orange-500" />,
      };
    }

    return {
      status: "SUCCESS",
      title: "Telah Sesuai",
      badgeVariant: "default" as const,
      description:
        "Pemeriksaan selesai. Berkas terverifikasi sesuai tipe dokumen.",
      colorClass:
        "bg-emerald-500/5 border-emerald-500/25 text-emerald-800 dark:text-emerald-300",
      icon: <CheckCircle2 className="size-4 text-emerald-500" />,
    };
  }, [ocrResult]);

  return (
    <div className="w-full flex flex-col h-full bg-background/95 backdrop-blur-md border rounded-xl shadow-lg overflow-hidden transition-all duration-300 animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="min-w-0 flex-1 pr-3 flex items-center gap-2">
          <FileText className="size-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {file?.url && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg cursor-pointer hover:bg-muted"
                asChild
              >
                <a
                  href={normalizeFileUrl(file.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Buka di Tab Baru"
                >
                  <ExternalLink className="size-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg cursor-pointer hover:bg-muted"
                asChild
              >
                <a href={normalizeFileUrl(file.url)} download title="Unduh Berkas">
                  <Download className="size-4" />
                </a>
              </Button>
            </>
          )}
          <Separator orientation="vertical" className="mx-1 h-5" />
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

      {/* Main Viewport Container */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-950/5 dark:bg-zinc-950/20 overflow-hidden min-h-0">
        {file?.url ? (
          isPdf ? (
            <div className="w-full h-full p-2 bg-background">
              <iframe
                src={normalizeFileUrl(file.url)}
                className="w-full h-full border-0 rounded-lg"
                title={title || "PDF Preview"}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing">
              <TransformWrapper
                ref={transformRef}
                initialScale={1}
                minScale={0.5}
                maxScale={8}
                centerOnInit={true}
                onTransform={(ref: any) => setScale(ref.state.scale)}
              >
                <TransformComponent
                  wrapperStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  contentStyle={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <img
                    src={normalizeFileUrl(file.url)}
                    alt="Document Preview"
                    draggable="false"
                    onDragStart={(e) => e.preventDefault()}
                    className="rounded shadow-sm max-w-full max-h-full object-contain transition-transform duration-200 ease-out"
                    style={{
                      transform: `rotate(${rotation}deg)`,
                    }}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground p-8">
            <FileText className="size-8 stroke-[1.5] text-muted-foreground/60" />
            <span className="text-xs">Pratinjau tidak tersedia</span>
          </div>
        )}

        {/* Floating Controls for Image */}
        {file?.url && isImage && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background/90 dark:bg-zinc-900/90 backdrop-blur-md p-1 rounded-full border shadow-xl hover:shadow-2xl transition-all duration-300">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted text-foreground"
              onClick={handleZoomOut}
              title="Perkecil"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              variant="ghost"
              className="h-8 px-2.5 rounded-full font-mono text-xs hover:bg-muted text-foreground font-semibold"
              onClick={handleZoomReset}
              title="Reset Zoom"
            >
              {Math.round(scale * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted text-foreground"
              onClick={handleZoomIn}
              title="Perbesar"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Separator orientation="vertical" className="h-5 mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full hover:bg-muted text-foreground"
              onClick={handleRotate}
              title="Putar Dokumen (90°)"
            >
              <RotateCw className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
// Global declaration for window object
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}
