"use client";

import React, { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface PdfThumbnailProps {
  url: string;
  className?: string;
  fallbackIconClassName?: string;
}

// Global script loader helper
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

    // Check if script already exists in document
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

export function PdfThumbnail({
  url,
  className = "",
  fallbackIconClassName = "",
}: PdfThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    if (!url) {
      setLoading(false);
      setError(true);
      return;
    }

    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);
        const pdfjs = await loadPdfJS();

        if (!active) return;

        // Strip local MinIO endpoint domain to use same-origin proxy rewrite and avoid CORS issues
        const finalUrl = normalizeFileUrl(url);

        // Load document
        const loadingTask = pdfjs.getDocument(finalUrl);
        const pdf = await loadingTask.promise;

        if (!active) return;

        // Get first page
        const page = await pdf.getPage(1);

        if (!active) return;

        // Render to canvas
        const scale = 0.4; // Render with low scale for fast thumbnail rendering
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not create 2d context");
        }

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        if (!active) return;

        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setThumbnailUrl(dataUrl);
        setLoading(false);
      } catch (err) {
        console.error("Error generating PDF thumbnail:", err);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    };

    generateThumbnail();

    return () => {
      active = false;
    };
  }, [url]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-muted/40 text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className={`flex items-center justify-center bg-rose-500/10 text-rose-500 ${className}`}>
        <FileText className={fallbackIconClassName || "h-6 w-6"} />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt="PDF Thumbnail"
      className={`object-cover ${className}`}
    />
  );
}

// Global declaration for window object
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}
