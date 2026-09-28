"use client";

import React, { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { Button } from "./button";
import { toast } from "sonner";
import Image from "next/image";
import { ImageCropper } from "./image-cropper";
import { apiClient } from "@/lib/api-client";

interface ImageUploadSingleProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onRemove?: () => void;
  maxSize?: number; // in MB
  label?: string;
  aspect?: number | null; // null means free crop, undefined/omitted defaults to 1
  category?: string;
  onOcrProcess?: (url: string) => Promise<void>;
  disabled?: boolean;
}

export function ImageUploadSingle({ 
  value, 
  onChange, 
  onRemove, 
  maxSize = 10,
  label = "Unggah Gambar",
  aspect = null,
  category,
  onOcrProcess,
  disabled = false
}: ImageUploadSingleProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cropperAspect = aspect === null ? undefined : aspect;
  
  // Calculate container dimensions (full width, standard height is 150px)
  const containerStyle = {
    height: "150px",
    width: "100%",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSize}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = async (croppedBlob: Blob) => {
    setTempImage(null);
    setIsUploading(true);
    
    try {
      // 1. Get pre-signed URL
      const prefix = category ? category.toLowerCase().replace(/_/g, "-") : "image";
      const fileName = `${prefix}-${Date.now()}.jpg`;
      const fileType = "image/jpeg";
      
      const { data } = await apiClient.get(`/upload-url?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}${category ? `&category=${encodeURIComponent(category)}` : ""}`);
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
      onChange(publicUrl);
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
      toast.error(error.message || "Terjadi kesalahan saat mengunggah");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeImage = () => {
    onChange(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRemove?.();
  };

  return (
    <div className="space-y-4">
      {value ? (
        <div 
          style={containerStyle}
          className={`relative group rounded-xl overflow-hidden border border-muted ring-offset-background transition-all ${
            !disabled ? "hover:ring-2 hover:ring-primary hover:ring-offset-2" : ""
          }`}
        >
          <Image
            src={value}
            alt="Upload preview"
            fill
            className="object-cover"
            unoptimized
          />
          {isOcrProcessing ? (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-1.5 animate-in fade-in duration-300">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
              <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Memindai OCR...</span>
            </div>
          ) : (
              !disabled && (
                <Button
                  onClick={removeImage}
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-lg z-10 cursor-pointer"
                  title="Hapus Berkas"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          style={containerStyle}
          className={`border-2 border-dashed border-muted-foreground/20 rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/10 ${
            !disabled ? "cursor-pointer hover:bg-muted/30 transition-all hover:border-primary/50 group" : "opacity-60 cursor-not-allowed"
          }`}
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : (
            <>
              <div className={`p-3 bg-primary/5 rounded-full ${!disabled ? "group-hover:bg-primary/10 transition-colors" : ""}`}>
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{disabled ? "Tidak Ada Berkas" : label}</p>
            </>
          )}
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
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
          aspect={cropperAspect}
        />
      )}
    </div>
  );
}
