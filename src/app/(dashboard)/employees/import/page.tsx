"use client";

import { useState } from "react";
import { ImportStatusCards } from "@/components/applicants/import-status-cards";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChevronLeft,
  Download,
  Play,
  Table as TableIcon,
  CheckCircle2,
  Loader2,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAppStore } from "@/store/use-app-store";
import { apiClient } from "@/lib/api-client";
import ExcelJS from "exceljs";
import { useConfirm } from "@/components/providers/confirm-provider";

export default function ImportEmployeesPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const [file, setFile] = useState<File | null>(null);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [isDryRun, setIsDryRun] = useState(true);
  const [progress, setProgress] = useState(0);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    total: number;
    complete: number;
    failed: number;
    duplicates: number;
    data: any[];
  } | null>(null);
  const confirm = useConfirm();

  const handleDownloadTemplate = async () => {
    try {
      setIsGeneratingTemplate(true);

      const sampleRows: any[] = [
        {
          idktml: "TKM-2026-0001",
          nama_lengkap: "Siti Aminah",
          nik: "3217015504950001",
          jenis_kelamin: "PEREMPUAN",
          status_tenaga_kerja: "Tetap",
          jabatan_posisi: "Staff Produksi",
          status_bpjs: "BELUM TERDAFTAR",
          nomor_bpjs: "",
          jenis_bpjs: "",
          disabilitas: "TIDAK",
          jenis_disabilitas: "",
        },
        {
          idktml: "TKM-2026-0001",
          nama_lengkap: "Ahmad Fauzi",
          nik: "3217011208920002",
          jenis_kelamin: "LAKI-LAKI",
          status_tenaga_kerja: "Paruh Waktu",
          jabatan_posisi: "Pemasaran & Kurir",
          status_bpjs: "TERDAFTAR",
          nomor_bpjs: "00012345678",
          jenis_bpjs: "PENERIMA_UPAH",
          disabilitas: "YA",
          jenis_disabilitas: "Fisik",
        },
      ];

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Template Impor Karyawan");
      const headers = Object.keys(sampleRows[0]);

      ws.columns = headers.map((header) => ({
        header: header,
        key: header,
        width: 25,
      }));

      sampleRows.forEach((row) => ws.addRow(row));

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-import-karyawan.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate template:", error);
      toast.error("Gagal membuat template Excel.");
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const REQUIRED_HEADERS = [
    { key: "idktml", aliases: ["idktml", "id_tkm", "idtkm"] },
    { key: "nama_lengkap", aliases: ["nama_lengkap", "nama_anggota", "nama"] },
    { key: "nik", aliases: ["nik", "nik_anggota"] },
    { key: "jenis_kelamin", aliases: ["jenis_kelamin", "gender"] },
  ];

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    setProgress(0);
    setProcessedCount(0);
    setTotalCount(0);
    setIsValidated(false);
    setValidationError(null);
    setParsedRows([]);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        setValidationError("File Excel kosong atau tidak memiliki sheet.");
        toast.error("File Excel kosong");
        return;
      }

      const rows: any[] = [];
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
          rows.push(rowData);
        }
      });

      if (rows.length === 0) {
        setValidationError("File Excel kosong atau tidak memiliki baris data.");
        toast.error("File Excel kosong");
        return;
      }

      // Check all 4 required headers
      const keys = Object.keys(rows[0]);
      const normalizedKeys = keys.map((k) =>
        k.trim().toLowerCase().replace(/\s+/g, "_"),
      );
      const missing = REQUIRED_HEADERS.filter(
        (req) => !req.aliases.some((alias) => normalizedKeys.includes(alias)),
      ).map((req) => req.key);

      if (missing.length > 0) {
        const errorMsg = `Format file salah. Kolom berikut wajib ada (${missing.length} kolom belum ada): ${missing.join(", ")}`;
        setValidationError(errorMsg);
        toast.error("Format kolom Excel tidak lengkap", {
          description: `Kurang kolom: ${missing.join(", ")}`,
        });
        return;
      }

      const rowsWithIndex = rows.map((r, idx) => ({
        ...r,
        __rownumber: idx + 2,
      }));
      setParsedRows(rowsWithIndex);
      setTotalCount(rowsWithIndex.length);
      toast.success("File berhasil dibaca", {
        description: `Ditemukan ${rowsWithIndex.length} data karyawan.`,
      });
    } catch (err: any) {
      console.error("Failed to parse Excel:", err);
      setValidationError(
        "Gagal membaca file Excel. Pastikan format file benar.",
      );
      toast.error("Gagal membaca file");
    }
  };

  const startImport = async (dry = true) => {
    if (parsedRows.length === 0 || !currentWorkspaceId) return;

    if (dry) {
      setIsProcessing(true);
      setIsDryRun(true);
      setIsValidated(false);
    } else {
      setIsSaving(true);
      setIsDryRun(false);
    }
    setProgress(0);
    setProcessedCount(0);
    setImportResult(null);

    const chunkSize = 100;
    const totalRows = parsedRows.length;
    let completeAccumulator = 0;
    let duplicatesAccumulator = 0;
    let failedAccumulator = 0;
    let logsAccumulator: any[] = [];

    try {
      for (let i = 0; i < totalRows; i += chunkSize) {
        const chunk = parsedRows.slice(i, i + chunkSize);

        const payload = {
          workspaceId: currentWorkspaceId,
          dryRun: dry,
          rows: chunk,
        };

        const { data: chunkResult } = await apiClient.post(
          "/output-reports/import-employees",
          payload,
        );

        completeAccumulator += chunkResult.summary.success || 0;
        duplicatesAccumulator += chunkResult.summary.duplicates || 0;
        failedAccumulator += chunkResult.summary.failed || 0;
        if (chunkResult.data) {
          logsAccumulator = [...logsAccumulator, ...chunkResult.data];
        }

        const currentProcessed = Math.min(i + chunkSize, totalRows);
        setProcessedCount(currentProcessed);
        setProgress(Math.round((currentProcessed / totalRows) * 100));
      }

      setImportResult({
        total: totalRows,
        complete: completeAccumulator,
        failed: failedAccumulator,
        duplicates: duplicatesAccumulator,
        data: logsAccumulator,
      });

      if (dry) {
        setIsValidated(true);
        toast.success("Verifikasi selesai", {
          description: `Ditemukan ${completeAccumulator} data valid siap diimpor.`,
        });
      } else {
        setIsValidated(false);
        setFile(null);
        setParsedRows([]);
        toast.success("Impor selesai diproses", {
          description: `${completeAccumulator} data karyawan berhasil ditambahkan ke database.`,
        });
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast.error("Gagal memproses file", {
        description: error.message || "Terjadi kesalahan pada server.",
      });
      setProgress(0);
    } finally {
      setIsProcessing(false);
      setIsSaving(false);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "row",
      header: "Baris",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.getValue("row")}</span>
      ),
    },
    {
      accessorKey: "tkmId",
      header: "ID TKM",
    },
    {
      accessorKey: "nik",
      header: "NIK",
    },
    {
      accessorKey: "name",
      header: "Nama Karyawan",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge
            variant={
              status === "VALID"
                ? "default"
                : status === "DUPLIKASI"
                  ? "secondary"
                  : "destructive"
            }
          >
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "message",
      header: "Keterangan",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.getValue("message")}
        </span>
      ),
    },
  ];

  if (currentRole !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Anda tidak diizinkan untuk mengimpor karyawan. Fitur ini hanya untuk
          Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 rounded-full"
            >
              <Link href="/employees">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              Kembali ke Manajemen Karyawan
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Impor Karyawan</h1>
          <p className="text-muted-foreground mt-1">
            Impor data awal tenaga kerja capaian output untuk TKM Lanjutan Anda
            menggunakan file Excel.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={handleDownloadTemplate}
            disabled={isGeneratingTemplate}
          >
            {isGeneratingTemplate ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isGeneratingTemplate ? "Membuat Template..." : "Unduh Template"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none bg-background/40 backdrop-blur-md shadow-xl ring-1 ring-white/10 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <TableIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Konfigurasi Unggah</CardTitle>
                  <CardDescription>
                    Pilih file Excel yang sesuai dengan format template
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Inline Dropzone to say Karyawan instead of Peserta */}
              <div
                className="relative group cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 overflow-hidden border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = ".xlsx,.xls";
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileSelect(e.target.files[0]);
                    }
                  };
                  input.click();
                }}
              >
                {!file ? (
                  <>
                    <div className="p-4 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300 ring-4 ring-primary/5">
                      <Upload className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        Unggah File Excel Karyawan
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Klik untuk memilih file Excel (.xlsx / .xls)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform duration-300 ring-4 ring-emerald-500/5">
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-emerald-500">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Progress indicator when validating or importing */}
              {(isProcessing || isSaving) && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>
                      {isSaving ? "Menyimpan data..." : "Memverifikasi data..."}
                    </span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Basic Validation Error */}
              {validationError && (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                  {validationError}
                </div>
              )}

              {/* Data Preview */}
              {parsedRows.length > 0 && !importResult && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">
                    Pratinjau Data Excel ({parsedRows.length} baris)
                  </h3>
                  <div className="max-h-75 overflow-auto rounded-xl border border-white/10 bg-background/20">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-muted/50 sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="p-2.5 font-bold">Baris</th>
                          <th className="p-2.5 font-bold">ID TKM</th>
                          <th className="p-2.5 font-bold">Nama Karyawan</th>
                          <th className="p-2.5 font-bold">NIK Karyawan</th>
                          <th className="p-2.5 font-bold">Jenis Kelamin</th>
                          <th className="p-2.5 font-bold">Status Kerja</th>
                          <th className="p-2.5 font-bold">Jabatan</th>
                          <th className="p-2.5 font-bold">Status BPJS</th>
                          <th className="p-2.5 font-bold">No. BPJS</th>
                          <th className="p-2.5 font-bold">Jenis BPJS</th>
                          <th className="p-2.5 font-bold">Disabilitas</th>
                          <th className="p-2.5 font-bold">Jenis Disabilitas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {parsedRows.slice(0, 10).map((r, i) => {
                          const getVal = (possibleKeys: string[]) => {
                            const foundKey = Object.keys(r).find((k) =>
                              possibleKeys.includes(
                                k.trim().toLowerCase().replace(/\s+/g, "_"),
                              ),
                            );
                            return foundKey ? String(r[foundKey] ?? "") || "-" : "-";
                          };

                          return (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-2.5 font-mono text-muted-foreground">
                                {r.__rownumber}
                              </td>
                              <td className="p-2.5 font-medium">
                                {getVal(["idktml", "id_tkm", "idtkm"])}
                              </td>
                              <td className="p-2.5">
                                {getVal([
                                  "nama_lengkap",
                                  "nama_anggota",
                                  "nama",
                                ])}
                              </td>
                              <td className="p-2.5 font-mono">
                                {getVal(["nik", "nik_anggota"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["jenis_kelamin", "gender"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["status_tenaga_kerja", "status_kerja", "employment_status"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["jabatan_posisi", "jabatan", "posisi", "role"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["status_bpjs", "bpjs_status", "bpjs"])}
                              </td>
                              <td className="p-2.5 font-mono">
                                {getVal(["nomor_bpjs", "bpjs_number", "no_bpjs", "bpjs_no"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["jenis_bpjs", "bpjs_type", "tipe_bpjs"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["disabilitas", "has_disability", "apakah_disabilitas"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["jenis_disabilitas", "disability_type", "ragam_disabilitas"])}
                              </td>
                            </tr>
                          );
                        })}
                        {parsedRows.length > 10 && (
                          <tr>
                            <td
                              colSpan={12}
                              className="p-2.5 text-center text-muted-foreground italic bg-muted/20"
                            >
                              ... dan {parsedRows.length - 10} baris data
                              lainnya
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button
                  variant="ghost"
                  disabled={!file || isProcessing || isSaving}
                  onClick={() => {
                    setFile(null);
                    setImportResult(null);
                    setProgress(0);
                    setIsValidated(false);
                    setValidationError(null);
                    setParsedRows([]);
                  }}
                >
                  Batal
                </Button>
                {!isValidated ? (
                  <Button
                    disabled={parsedRows.length === 0 || isProcessing}
                    className="gap-2 px-8 rounded-xl shadow-lg shadow-primary/20"
                    onClick={() => startImport(true)}
                  >
                    <Play className="h-4 w-4 fill-current" /> Periksa Data (Dry
                    Run)
                  </Button>
                ) : (
                  <Button
                    disabled={
                      parsedRows.length === 0 ||
                      isSaving ||
                      importResult?.complete === 0
                    }
                    className="gap-2 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-950/20"
                    onClick={async () => {
                      const isConfirmed = await confirm({
                        title: "Simpan Data Karyawan",
                        description: `Apakah Anda yakin ingin menyimpan ${importResult?.complete || 0} data karyawan ke dalam database?`,
                        confirmText: "Ya, Simpan",
                        cancelText: "Batal",
                      });
                      if (isConfirmed) {
                        startImport(false);
                      }
                    }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Menyimpan Data...
                      </>
                    ) : (
                      "Simpan Data Karyawan"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results Table */}
          {importResult && (
            <Card className="border-none bg-background/40 backdrop-blur-md shadow-xl ring-1 ring-white/10 animate-in fade-in slide-in-from-top-4 duration-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">
                    {isDryRun ? "Pratinjau Hasil Pemeriksaan" : "Hasil Impor"}
                  </CardTitle>
                  <CardDescription>
                    {isDryRun
                      ? "Menampilkan log pemeriksaan data sebelum disimpan"
                      : "Menampilkan log hasil dari proses impor"}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={columns}
                  data={importResult.data}
                  searchKey="name"
                  searchPlaceholder="Cari di hasil impor..."
                  emptyMessage="Tidak ada hasil yang cocok dengan pencarian Anda."
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Instructions & Status */}
        <div className="space-y-6">
          {importResult ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <h3 className="text-xl font-bold tracking-tight">
                {isDryRun ? "Ringkasan Pemeriksaan" : "Ringkasan Impor"}
              </h3>
              <ImportStatusCards
                total={importResult.total}
                complete={importResult.complete}
                failed={importResult.failed}
                duplicates={importResult.duplicates}
              />

              <Card
                className={`border-none ring-1 ${
                  isDryRun
                    ? "bg-amber-500/10 ring-amber-500/20 text-amber-900"
                    : "bg-emerald-500/10 ring-emerald-500/20 text-emerald-900"
                }`}
              >
                <CardContent className="pt-6 flex gap-4">
                  <div
                    className={`p-2 rounded-full h-fit ${
                      isDryRun
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-emerald-500/20 text-emerald-600"
                    }`}
                  >
                    {isDryRun ? (
                      <Play className="h-5 w-5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={`font-bold ${
                        isDryRun
                          ? "text-amber-900 dark:text-amber-100"
                          : "text-emerald-900 dark:text-emerald-100"
                      }`}
                    >
                      {isDryRun ? "Verifikasi Selesai" : "Proses Berhasil"}
                    </h4>
                    <p
                      className={`text-sm leading-relaxed mt-1 ${
                        isDryRun
                          ? "text-amber-800/80 dark:text-amber-200/80"
                          : "text-emerald-700/80 dark:text-emerald-200/80"
                      }`}
                    >
                      {isDryRun
                        ? `Ditemukan ${importResult.complete} data valid yang siap dimasukkan ke database. Silakan klik tombol "Simpan Data Karyawan" untuk menyelesaikan impor.`
                        : `${importResult.complete} data karyawan baru telah berhasil ditambahkan ke database.`}
                    </p>
                    {!isDryRun && (
                      <Button
                        variant="link"
                        className="text-emerald-700 dark:text-emerald-400 p-0 h-auto mt-2 font-bold"
                        asChild
                      >
                        <Link href="/employees">Lihat Daftar Karyawan</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-none bg-background/40 backdrop-blur-md shadow-xl ring-1 ring-white/10">
              <CardHeader>
                <CardTitle className="text-lg">Petunjuk Impor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      1
                    </span>
                    <p>
                      Unduh <strong>template Excel</strong> terbaru untuk
                      memastikan struktur 11 kolom lengkap telah tersedia.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      2
                    </span>
                    <p>
                      <strong>4 Kolom Utama Wajib Diisi</strong> (
                      <code>idktml</code>, <code>nama_lengkap</code>,{" "}
                      <code>nik</code>, <code>jenis_kelamin</code>). Kolom status kerja, jabatan, BPJS (status, nomor & jenis), serta disabilitas (status & ragam) bersifat opsional.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      3
                    </span>
                    <p>
                      Pastikan <strong>ID TKM</strong> terdaftar di workspace
                      aktif dan <strong>NIK</strong> karyawan unik (tidak boleh
                      sama dengan NIK Peserta/TKM).
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      4
                    </span>
                    <p>
                      Isi <strong>jenis_kelamin</strong> secara eksplisit (
                      <code>LAKI-LAKI</code> / <code>PEREMPUAN</code>). Sistem{" "}
                      <em>tidak mengonversi jenis kelamin dari NIK</em>.
                    </p>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
