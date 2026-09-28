"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImportZoneProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  progress: number;
  statusText?: string;
}

export function ImportZone({ onFileSelect, isProcessing, progress, statusText }: ImportZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const validateAndSelectFile = (file: File) => {
    const isExcel = file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                    file.name.endsWith(".xlsx") || 
                    file.name.endsWith(".xls");
    
    if (isExcel) {
      setSelectedFile(file);
      onFileSelect(file);
    } else {
      alert("Hanya file Excel (.xlsx, .xls) yang diperbolehkan.");
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 overflow-hidden",
        isDragging ? "border-primary bg-primary/5 scale-[0.99]" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
        isProcessing && "pointer-events-none opacity-80"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept=".xlsx,.xls" 
        onChange={handleFileChange}
      />

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-500 rounded-full blur-3xl animate-pulse" />
      </div>

      {!selectedFile ? (
        <>
          <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300 ring-4 ring-primary/5">
            <Upload className="h-8 w-8" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">Unggah File Excel Peserta</p>
            <p className="text-sm text-muted-foreground">Tarik dan lepas file ke sini, atau klik untuk memilih</p>
          </div>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              <FileSpreadsheet className="h-3 w-3" /> .xlsx
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
              <FileSpreadsheet className="h-3 w-3" /> .xls
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
          <div className="relative p-6 rounded-2xl bg-primary/5 ring-1 ring-primary/20 flex flex-col items-center gap-2 w-full animate-in fade-in zoom-in duration-300">
            <FileSpreadsheet className="h-12 w-12 text-primary" />
            <div className="text-center">
              <p className="font-medium truncate max-w-[200px]">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
            </div>
            {!isProcessing && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive"
                onClick={clearFile}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {isProcessing ? (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {statusText || "Memproses Data..."}
                </div>
                <span className="text-primary font-bold">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_10px_rgba(var(--primary),0.5)]" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground animate-pulse">
                Mohon jangan tutup halaman ini selama proses berlangsung
              </p>
            </div>
          ) : progress === 100 ? (
            <div className="flex items-center gap-2 text-emerald-500 font-semibold animate-in slide-in-from-bottom-2 duration-300">
              <Check className="h-5 w-5" /> Selesai Diproses
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Klik tombol di bawah untuk mulai mengimpor</p>
          )}
        </div>
      )}
    </div>
  );
}
