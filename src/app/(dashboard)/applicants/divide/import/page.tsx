"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ImportZone } from "@/components/applicants/import-zone";
import { DownloadTemplateButton } from "@/components/applicants/download-template-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChevronLeft, Table as TableIcon, CheckCircle2, Users, AlertCircle, Database, XCircle, Play } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useApplicants } from "@/hooks/use-applicants";
import { useAppStore } from "@/store/use-app-store";
import ExcelJS from "exceljs";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface ParsedRow {
  rowNum: number;
  idTkm: string;
  iduniversitas: string;
  name: string;
  status: "VALID" | "TIDAK_DITEMUKAN" | "UNIV_INVALID" | "SUDAH_TERDAFTAR" | "KOLOM_KOSONG";
  note: string;
}

export default function DivideApplicantsImportPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  if (currentRole === "WORKSPACE_SUPERVISOR") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Pengawas Workspace tidak diizinkan membagi peserta (Read-Only).</p>
      </div>
    );
  }
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processingDone, setProcessingDone] = useState(false);
  const [divideResult, setDivideResult] = useState<{
    total: number;
    valid: number;
    invalid: number;
    alreadyAssigned: number;
    data: ParsedRow[];
  } | null>(null);

  const fileRef = useRef<File | null>(null);
  
  // Keep fileRef in sync
  useEffect(() => {
    fileRef.current = file;
  }, [file]);

  const { data: applicants } = useApplicants(currentWorkspaceId || undefined);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setDivideResult(null);
    setProgress(0);
    setProcessingDone(false);
  };

  const finishProcessing = useCallback(async () => {
    setIsProcessing(false);
    
    const currentFile = fileRef.current;
    if (!currentFile) {
      toast.error("File tidak ditemukan", { description: "Silakan unggah ulang file." });
      return;
    }

    try {
      // Read and parse the actual Excel file
      const arrayBuffer = await currentFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        toast.error("File kosong", { description: "File Excel tidak memiliki data." });
        return;
      }

      const jsonData: any[] = [];
      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell((cell) => {
        headers.push(cell.text.trim());
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowData: any = {};
          headers.forEach((header, index) => {
            const cell = row.getCell(index + 1);
            let val = cell.value;
            if (val && typeof val === "object" && !(val instanceof Date)) {
              if ((val as any).result !== undefined) {
                val = (val as any).result;
              } else if ((val as any).text !== undefined) {
                val = (val as any).text;
              }
            }
            rowData[header] = val;
          });
          jsonData.push(rowData);
        }
      });

      if (jsonData.length === 0) {
        toast.error("File kosong", { description: "File Excel tidak memiliki data." });
        return;
      }

      // Normalize column names (lowercase, trim)
      const normalizedData = jsonData.map((row, index) => {
        const normalized: Record<string, any> = {};
        for (const key of Object.keys(row)) {
          normalized[key.toLowerCase().trim()] = String(row[key]).trim();
        }
        normalized._rowNum = index + 2; // +2 because row 1 is header
        return normalized;
      });

      // Process each row
      const processedData: ParsedRow[] = normalizedData.map((row) => {
        const idTkm = row["idtkm"] || row["id_tkm"] || row["id tkm"] || "";
        const iduniversitas = row["iduniversitas"] || row["id_universitas"] || row["id universitas"] || "";

        // Check for empty required columns
        if (!idTkm || !iduniversitas) {
          return {
            rowNum: row._rowNum,
            idTkm: idTkm || "-",
            iduniversitas: iduniversitas || "-",
            name: "-",
            status: "KOLOM_KOSONG" as const,
            note: `Kolom ${!idTkm ? "idtkm" : "iduniversitas"} kosong`,
          };
        }

        // Cross-reference with applicants data if available
        const applicantList = applicants?.data || (Array.isArray(applicants) ? applicants : []);
        if (applicantList && applicantList.length > 0) {
          const applicant = applicantList.find(
            (a: any) => a.idTkm?.toLowerCase() === idTkm.toLowerCase()
          );

          if (!applicant) {
            return {
              rowNum: row._rowNum,
              idTkm,
              iduniversitas,
              name: "-",
              status: "TIDAK_DITEMUKAN" as const,
              note: "ID TKM tidak terdaftar di sistem pusat",
            };
          }

          const profileName = applicant.profile?.name || "N/A";

          if (applicant.universityId && applicant.universityId === iduniversitas) {
            return {
              rowNum: row._rowNum,
              idTkm,
              iduniversitas,
              name: profileName,
              status: "SUDAH_TERDAFTAR" as const,
              note: "Peserta sudah dialokasikan ke universitas ini",
            };
          }

          return {
            rowNum: row._rowNum,
            idTkm,
            iduniversitas,
            name: profileName,
            status: "VALID" as const,
            note: "Data cocok, siap dialokasikan",
          };
        }

        // If no applicants data, mark as VALID (will be verified server-side on save)
        return {
          rowNum: row._rowNum,
          idTkm,
          iduniversitas,
          name: "-",
          status: "VALID" as const,
          note: "Siap dialokasikan (verifikasi saat simpan)",
        };
      });

      const validCount = processedData.filter((d) => d.status === "VALID").length;
      const alreadyAssignedCount = processedData.filter((d) => d.status === "SUDAH_TERDAFTAR").length;
      const invalidCount = processedData.length - validCount - alreadyAssignedCount;

      setDivideResult({
        total: processedData.length,
        valid: validCount,
        invalid: invalidCount,
        alreadyAssigned: alreadyAssignedCount,
        data: processedData,
      });

      toast.info("Pengecekan selesai", {
        description: `Ditemukan ${validCount} data valid dari ${processedData.length} baris yang diproses.`,
      });
    } catch (error) {
      console.error("Error parsing Excel file:", error);
      toast.error("Gagal membaca file", {
        description: "Pastikan file berformat Excel (.xlsx/.xls) yang valid.",
      });
    }
  }, [applicants]);

  // Trigger finishProcessing when progress animation completes
  useEffect(() => {
    if (processingDone) {
      finishProcessing();
      setProcessingDone(false);
    }
  }, [processingDone, finishProcessing]);

  const startProcessing = () => {
    if (!file) return;

    setIsProcessing(true);
    setProgress(0);
    setDivideResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.floor(Math.random() * 15) + 10;
        if (next >= 100) {
          clearInterval(interval);
          setProcessingDone(true);
          return 100;
        }
        return next;
      });
    }, 150);
  };

  const handleSave = async () => {
    if (!divideResult || divideResult.valid === 0) return;

    setIsSaving(true);
    
    try {
      const validAllocations = divideResult.data
        .filter((row) => row.status === "VALID")
        .map((row) => ({
          idTkm: row.idTkm,
          universityId: row.iduniversitas,
        }));

      await apiClient.post("/applicants/divide", {
        allocations: validAllocations,
      });

      queryClient.invalidateQueries({ queryKey: ["applicants"] });
      queryClient.invalidateQueries({ queryKey: ["divide-applicants"] });

      setIsSaving(false);
      setIsSuccess(true);
      toast.success("Pembagian Berhasil", {
        description: `${divideResult.valid} peserta telah berhasil dialokasikan.`,
      });
    } catch (error: any) {
      setIsSaving(false);
      console.error("Gagal menyimpan alokasi:", error);
      toast.error("Gagal Menyimpan", {
        description: error.response?.data?.error || "Terjadi kesalahan saat menyimpan alokasi peserta.",
      });
    }
  };

  const columns: ColumnDef<ParsedRow>[] = [
    {
      accessorKey: "rowNum",
      header: "Baris",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-mono">{row.getValue("rowNum")}</span>
      ),
    },
    {
      accessorKey: "idTkm",
      header: "ID TKM",
    },
    {
      accessorKey: "iduniversitas",
      header: "ID Universitas",
    },
    {
      accessorKey: "name",
      header: "Nama",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge 
            variant={
              status === "VALID" ? "default" : 
              status === "SUDAH_TERDAFTAR" ? "secondary" : "destructive"
            }
          >
            {status.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      accessorKey: "note",
      header: "Keterangan",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{row.getValue("note")}</span>
      )
    },
  ];

  if (isSuccess && divideResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 pb-20 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pembagian Berhasil!</h1>
          <p className="text-muted-foreground text-lg">
            Sebanyak <span className="font-bold text-emerald-600">{divideResult.valid}</span> peserta telah berhasil dialokasikan.
          </p>
        </div>

        <Card className="w-full max-w-lg border bg-card">
          <CardHeader>
            <CardTitle className="text-center">Ringkasan Pembagian</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Total Diproses</span>
              <span className="font-bold text-foreground">{divideResult.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Berhasil Dialokasikan</span>
              <span className="font-bold text-emerald-600">{divideResult.valid}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Sudah Terdaftar</span>
              <span className="font-bold text-amber-600">{divideResult.alreadyAssigned}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Gagal / Invalid</span>
              <span className="font-bold text-rose-600">{divideResult.invalid}</span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full max-w-lg">
          <Button variant="outline" onClick={() => {
            setIsSuccess(false);
            setFile(null);
            setDivideResult(null);
            setProgress(0);
          }} className="flex-1">
            Bagi Peserta Lagi
          </Button>
          <Button asChild className="flex-1">
            <Link href="/applicants/divide">
              Kembali ke Alokasi Manual
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8 rounded-md">
              <Link href="/applicants/divide">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground font-medium">Kembali ke Alokasi Manual</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Import Alokasi via Excel</h1>
          <p className="text-muted-foreground mt-1">
            Alokasikan peserta TKML ke universitas secara massal menggunakan template excel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DownloadTemplateButton />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Upload Area & Results */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden bg-card border">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-muted text-muted-foreground rounded-lg">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">Unggah File Alokasi</CardTitle>
                  <CardDescription>Lampirkan file Excel yang berisi daftar peserta yang akan dibagi</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <ImportZone 
                onFileSelect={handleFileSelect} 
                isProcessing={isProcessing}
                progress={progress}
              />
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="ghost" 
                  disabled={!file || isProcessing}
                  onClick={() => {
                    setFile(null);
                    setDivideResult(null);
                    setProgress(0);
                  }}
                >
                  Batal
                </Button>
                <Button 
                  disabled={!file || isProcessing || progress === 100} 
                  className="gap-2 px-6"
                  onClick={startProcessing}
                >
                  <Play className="h-4 w-4 fill-current" /> Mulai Cek Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {divideResult && (
            <Card className="border bg-card animate-in fade-in duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Pratinjau Hasil Alokasi</CardTitle>
                  <CardDescription>Data hasil pengecekan sistem sebelum disimpan</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15">
                     {divideResult.valid} Siap Alokasi
                   </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={columns} 
                  data={divideResult.data} 
                  searchKey="name" 
                  searchPlaceholder="Cari hasil pengecekan..."
                  emptyMessage="Tidak ada data untuk ditampilkan."
                />
                
                <div className="mt-8 flex justify-center">
                  <Button 
                    onClick={handleSave}
                    disabled={divideResult.valid === 0 || isSaving}
                    size="lg"
                    className="gap-2 px-8"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                        Menyimpan Alokasi...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> 
                        Simpan Pembagian Peserta
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Instructions & Summary */}
        <div className="space-y-6">
          {divideResult ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground ml-1">Ringkasan Validasi</h3>
              
              <div className="grid gap-4">
                {/* Total Data Card */}
                <Card className="bg-muted/30 border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                        <Database className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">Total Data</span>
                        <span className="text-xs text-muted-foreground">Jumlah baris diproses</span>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-foreground">{divideResult.total}</span>
                  </CardContent>
                </Card>

                {/* Valid Card */}
                <Card className="bg-emerald-500/5 border border-emerald-500/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Valid</span>
                        <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Siap dialokasikan</span>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{divideResult.valid}</span>
                  </CardContent>
                </Card>

                {/* Already Assigned Card */}
                {divideResult.alreadyAssigned > 0 && (
                  <Card className="bg-amber-500/5 border border-amber-500/10">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-amber-800 dark:text-amber-300">Sudah Terdaftar</span>
                          <span className="text-xs text-amber-600/70 dark:text-amber-400/70">Universitas sudah cocok</span>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">{divideResult.alreadyAssigned}</span>
                    </CardContent>
                  </Card>
                )}

                {/* Gagal / Invalid Card */}
                <Card className="bg-rose-500/5 border border-rose-500/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-rose-800 dark:text-rose-300">Gagal / Invalid</span>
                        <span className="text-xs text-rose-600/70 dark:text-rose-400/70">Format/ID TKM tidak valid</span>
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">{divideResult.invalid}</span>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-amber-500/5 border border-amber-500/15">
                <CardContent className="pt-6 flex gap-4">
                  <div className="p-2 rounded-full bg-amber-500/10 text-amber-600 h-fit">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 dark:text-amber-100">Penting</h4>
                    <p className="text-xs text-amber-800/80 dark:text-amber-200/80 leading-relaxed mt-1">
                      Hanya data dengan status **VALID** yang akan disimpan ke universitas. Pastikan data sudah benar sebelum menekan tombol simpan.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card border">
              <CardHeader>
                <CardTitle className="text-lg">Petunjuk Pembagian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">1</span>
                    <p>Gunakan file Excel dengan kolom <strong>idtkm</strong> dan <strong>iduniversitas</strong>.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">2</span>
                    <p>Sistem akan memverifikasi apakah <strong>ID TKM</strong> dan <strong>ID Universitas</strong> terdaftar di sistem pusat.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">3</span>
                    <p>Peserta yang sudah dialokasikan ke universitas tersebut akan ditandai sebagai duplikat.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">4</span>
                    <p>Klik <strong>Simpan Pembagian</strong> untuk mengonfirmasi alokasi peserta ke masing-masing universitas.</p>
                  </li>
                </ol>

                <div className="pt-4 border-t">
                  <div className="bg-muted/50 p-4 rounded-lg border flex gap-3 text-xs text-muted-foreground">
                    <TableIcon className="h-4 w-4 shrink-0" />
                    <p>Maksimal 1000 baris per file untuk performa optimal.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
