"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  FileIcon,
  ExternalLink,
  Download,
  FileText,
  ImageIcon,
  Loader2,
} from "lucide-react";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface FilePreviewContextType {
  previewFile: (url: string, title?: string) => void;
}

const FilePreviewContext = React.createContext<
  FilePreviewContextType | undefined
>(undefined);

export function useFilePreview() {
  const context = React.useContext(FilePreviewContext);
  if (!context) {
    throw new Error("useFilePreview must be used within a FilePreviewProvider");
  }
  return context;
}

export function FilePreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [url, setUrl] = React.useState<string>("");
  const [title, setTitle] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(false);

  const previewFile = React.useCallback(
    (fileUrl: string, fileTitle?: string) => {
      const cleanUrl = normalizeFileUrl(fileUrl);
      setUrl(cleanUrl);
      setTitle(fileTitle || "Pratinjau Berkas");
      setIsOpen(true);
      setIsLoading(true);
    },
    [],
  );

  const isPdf = React.useMemo(() => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return cleanUrl.endsWith(".pdf") || url.includes("pdf");
  }, [url]);

  const isImage = React.useMemo(() => {
    if (!url) return false;
    const cleanUrl = url.split("?")[0].toLowerCase();
    return (
      cleanUrl.endsWith(".jpg") ||
      cleanUrl.endsWith(".jpeg") ||
      cleanUrl.endsWith(".png") ||
      cleanUrl.endsWith(".gif") ||
      cleanUrl.endsWith(".webp") ||
      url.includes("image")
    );
  }, [url]);

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = title || "unduhan";
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <FilePreviewContext.Provider value={{ previewFile }}>
      {children}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="right"
          className="w-full! sm:w-3/4! max-w-none! flex flex-col h-full p-6 border-l shadow-2xl bg-background/95 backdrop-blur-md"
        >
          <SheetHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-xl">
                {isPdf ? (
                  <FileText className="h-5 w-5" />
                ) : isImage ? (
                  <ImageIcon className="h-5 w-5" />
                ) : (
                  <FileIcon className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1 text-left">
                <SheetTitle className="text-lg font-bold line-clamp-1">
                  {title}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  Pratinjau berkas lampiran pendukung.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex items-center gap-2 py-3 border-b">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-xs rounded-full"
              onClick={() => window.open(url, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Tab Baru
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 h-9 text-xs rounded-full"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Berkas
            </Button>
          </div>

          {/* Preview Content Area */}
          <div className="flex-1 min-h-0 bg-muted/20 dark:bg-muted/5 rounded-xl border border-muted/50 overflow-hidden relative flex items-center justify-center p-2 mt-4">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50 z-10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">
                  Memuat berkas...
                </span>
              </div>
            )}

            {url && isPdf && (
              <iframe
                src={`${url}`}
                className="w-full h-full rounded-lg bg-background"
                onLoad={() => setIsLoading(false)}
                onError={() => setIsLoading(false)}
              />
            )}

            {url && isImage && (
              <div className="w-full h-full flex items-center justify-center overflow-hidden p-0">
                <img
                  src={url}
                  alt={title}
                  className="w-full h-full object-contain rounded-lg shadow-sm transition-all duration-300"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                />
              </div>
            )}

            {url && !isPdf && !isImage && (
              <div className="text-center p-8 space-y-4">
                <FileIcon className="h-16 w-16 text-muted-foreground/50 mx-auto" />
                <div className="space-y-1">
                  <p className="font-bold text-sm">
                    Pratinjau tidak didukung untuk tipe file ini
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Silakan unduh berkas atau buka di tab baru untuk melihat.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => window.open(url, "_blank")}
                  className="rounded-full"
                >
                  Buka Berkas
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </FilePreviewContext.Provider>
  );
}
