"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon, FileText, Eye } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import Image from "next/image";
import { ImageCropper } from "./image-cropper";
import { apiClient } from "@/lib/api-client";
import { Badge } from "./badge";
import { OcrFilePreviewSheet } from "@/components/ocr-file-preview-sheet";
import { PdfThumbnail } from "./pdf-thumbnail";

import { normalizeFileUrl } from "@/lib/normalize-file-url";

interface FileUploadSingleProps {
  value?: string | null;
  mimeType?: string | null;
  file?: any;
  onChange: (url: string | null, mimeType: string | null) => void;
  onRemove?: () => void;
  maxSize?: number; // in MB
  label?: string;
  category?: string;
  onOcrProcess?: (url: string) => Promise<void>;
}

export function FileUploadSingle({
  value,
  mimeType,
  file,
  onChange,
  onRemove,
  maxSize = 10,
  label = "Unggah Berkas",
  category,
  onOcrProcess,
}: FileUploadSingleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPdf = mimeType === "application/pdf" || (value && value.split("?")[0].toLowerCase().endsWith(".pdf"));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > maxSize * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSize}MB`);
      return;
    }

    if (selectedFile.type === "application/pdf") {
      uploadFileDirect(selectedFile);
    } else if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      toast.error("Format file tidak didukung. Silakan unggah Gambar atau PDF.");
    }
  };

  const uploadFileDirect = async (pdfFile: File) => {
    setIsUploading(true);
    try {
      const prefix = category ? category.toLowerCase().replace(/_/g, "-") : "document";
      const fileName = `${prefix}-${Date.now()}.pdf`;
      const fileType = "application/pdf";

      // 1. Get pre-signed URL
      const { data } = await apiClient.get(
        `/upload-url?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}${category ? `&category=${encodeURIComponent(category)}` : ""}`
      );
      const { uploadUrl, publicUrl } = data;

      // 2. Upload to storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: pdfFile,
        headers: {
          "Content-Type": fileType,
        },
      });

      if (!uploadRes.ok) throw new Error("Gagal mengunggah file PDF");

      // 3. Success
      onChange(publicUrl, fileType);
      toast.success("File PDF berhasil diunggah");

      // 4. Trigger OCR Process if provided
      if (onOcrProcess) {
        setIsOcrProcessing(true);
        try {
          await onOcrProcess(publicUrl);
        } catch (ocrError: any) {
          console.error("OCR Error:", ocrError);
          toast.error("Gagal memproses OCR pada PDF");
        } finally {
          setIsOcrProcessing(false);
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Terjadi kesalahan saat mengunggah PDF");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onCropComplete = async (croppedBlob: Blob) => {
    setTempImage(null);
    setIsUploading(true);

    try {
      const prefix = category ? category.toLowerCase().replace(/_/g, "-") : "image";
      const fileName = `${prefix}-${Date.now()}.jpg`;
      const fileType = "image/jpeg";

      // 1. Get pre-signed URL
      const { data } = await apiClient.get(
        `/upload-url?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}${category ? `&category=${encodeURIComponent(category)}` : ""}`
      );
      const { uploadUrl, publicUrl } = data;

      // 2. Upload to storage
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: croppedBlob,
        headers: {
          "Content-Type": fileType,
        },
      });

      if (!uploadRes.ok) throw new Error("Gagal mengunggah gambar");

      // 3. Success
      onChange(publicUrl, fileType);
      toast.success("Gambar berhasil diunggah");

      // 4. Trigger OCR Process if provided
      if (onOcrProcess) {
        setIsOcrProcessing(true);
        try {
          await onOcrProcess(publicUrl);
        } catch (ocrError: any) {
          console.error("OCR Error:", ocrError);
          toast.error("Gagal memproses OCR pada gambar");
        } finally {
          setIsOcrProcessing(false);
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Terjadi kesalahan saat mengunggah gambar");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRemove?.();
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewOpen(true);
  };

  return (
    <div className="space-y-4">
      {value ? (
        isPdf ? (
          // PDF Preview UI (Full width box style)
          <div className="relative group rounded-xl overflow-hidden border border-muted ring-offset-background transition-all h-[150px] w-full bg-muted/10">
            <div className="w-full h-full relative">
              <PdfThumbnail url={value} className="w-full h-full object-cover" fallbackIconClassName="size-8" />
              <div className="absolute top-2 left-2 z-10">
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-rose-50/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 font-bold">
                  PDF
                </Badge>
              </div>
            </div>
            {isOcrProcessing ? (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 animate-in fade-in duration-300">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Memindai...</span>
              </div>
            ) : (
              <Button
                size="icon"
                variant="destructive"
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg z-10 cursor-pointer"
                title="Hapus Berkas"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ) : (
          // Image Preview UI (Full width style)
          <div
            className="relative group rounded-xl overflow-hidden border border-muted ring-offset-background transition-all h-[150px] w-full"
          >
            <Image
              src={normalizeFileUrl(value)}
              alt="Upload preview"
              fill
              className="object-cover"
              unoptimized
            />
            {isOcrProcessing ? (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Memindai...</span>
              </div>
            ) : (
              <Button
                size="icon"
                variant="destructive"
                type="button"
                onClick={removeFile}
                className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg z-10 cursor-pointer"
                title="Hapus Berkas"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )
      ) : (
        // Empty State Upload Target (Full width style)
        <div
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/30 transition-all hover:border-primary/50 group bg-muted/10 h-[150px] w-full"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <>
              <div className="p-3 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center px-2">
                {label}
              </p>
            </>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,application/pdf"
        onChange={handleFileChange}
      />

      {tempImage && (
        <ImageCropper
          image={tempImage}
          onCropComplete={onCropComplete}
          onCancel={() => {
            setTempImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          aspect={undefined}
        />
      )}

      {value && isPreviewOpen && (
        <OcrFilePreviewSheet
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          file={file || { url: value, mimeType: mimeType || (isPdf ? "application/pdf" : "image/jpeg") }}
          title={label}
        />
      )}
    </div>
  );
}
