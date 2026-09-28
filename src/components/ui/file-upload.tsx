"use client";

import * as React from "react";
import { Upload, X, FileIcon, Loader2 } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

interface FileUploadProps {
  onUploadSuccess: (fileData: { key: string; url: string; name: string; size: number; type: string }) => void;
  onRemove?: () => void;
  accept?: string;
  maxSize?: number; // in MB
  category?: string;
}

export function FileUpload({ onUploadSuccess, onRemove, accept, maxSize = 10, category }: FileUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (maxSize && selectedFile.size > maxSize * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSize}MB`);
      return;
    }

    setFile(selectedFile);
    await uploadFile(selectedFile);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Get pre-signed URL
      const { data } = await apiClient.get(`/upload-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}${category ? `&category=${encodeURIComponent(category)}` : ""}`);
      const { uploadUrl, key, publicUrl } = data;

      // 2. Upload to MinIO
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadRes.ok) throw new Error("Gagal mengunggah file ke storage");

      // 3. Success
      onUploadSuccess({
        key,
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      });
      toast.success("File berhasil diunggah");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Terjadi kesalahan saat mengunggah");
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRemove?.();
  };

  return (
    <div className="space-y-4">
      {!file ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/30 transition-all hover:border-primary/50 group"
        >
          <div className="p-4 bg-primary/5 rounded-full group-hover:bg-primary/10 transition-colors">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold">Klik untuk unggah bukti</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Maks. {maxSize}MB)</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={accept} 
            onChange={handleFileChange} 
          />
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {isUploading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <FileIcon className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <p className="text-sm font-bold truncate max-w-[200px]">{file.name}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold">
                {isUploading ? "Sedang mengunggah..." : `${(file.size / 1024 / 1024).toFixed(2)} MB`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={removeFile} disabled={isUploading} className="rounded-full h-8 w-8 text-destructive hover:bg-destructive/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
