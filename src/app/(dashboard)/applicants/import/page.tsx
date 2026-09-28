"use client";

import { useState } from "react";
import { ImportZone } from "@/components/applicants/import-zone";
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
  History,
  Loader2,
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

export default function ImportApplicantsPage() {
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

  if (currentRole !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Hanya Super Admin yang diizinkan untuk mengimpor atau menambah peserta.
        </p>
      </div>
    );
  }

  const handleDownloadTemplate = async () => {
    try {
      setIsGeneratingTemplate(true);

      const sampleRow: any = {
        id_tkm: "TKM-2026-0001",
        nama_pendaftar: "Budi Santoso",
        nik_pendaftar: "3217011212850003",
        email: "budi.santoso@example.com",
        jenis_kelamin: "LAKI-LAKI",
        pendidikan_terakhir: "SMA/SMK",
        whatsapp: "081234567890",
        upload_foto_diri: "https://example.com/foto-budi.jpg",
        tempat_lahir: "Bandung Barat",
        tanggal_lahir: "1985-12-12",
        apakah_penyandang_disabilitas: "TIDAK",
        jenis_disabilitas: "-",
        alamat_ktp: "Jl. Raya Padalarang No. 45",
        provinsi_ktp: "JAWA BARAT",
        kabupaten_ktp: "BANDUNG BARAT",
        kecamatan_ktp: "Padalarang",
        kelurahan_ktp: "Kertajaya",
        kode_pos_ktp: "40553",
        alamat_domisili: "Jl. Raya Padalarang No. 45",
        provinsi_domisili: "JAWA BARAT",
        kabupaten_domisili: "BANDUNG BARAT",
        kecamatan_domisili: "Padalarang",
        kelurahan_domisili: "Kertajaya",
        kode_pos_domisili: "40553",
        alamat_usaha: "Kios Pasar Tagog Padalarang No. A3",
        provinsi_usaha: "JAWA BARAT",
        kabupaten_usaha: "BANDUNG BARAT",
        kecamatan_usaha: "Padalarang",
        kelurahan_usaha: "Kertamulya",
        kode_pos_usaha: "40553",
        nama_usaha: "Kripik Singkong Barokah",
        sektor_usaha: "Kuliner",
        jenis_usaha: "Mikro",
        deskripsi_usaha:
          "Usaha pembuatan dan penjualan keripik singkong aneka rasa",
        produk_utama: "Keripik Singkong Balado",
        omset_per_periode: 5000000,
        jumlah_produk_per_periode: 100,
        satuan_jumlah_produk_per_periode: "Pcs",
        wilayah_pemasaran: "kecamatan",
      };

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Template Impor Peserta");
      const headers = Object.keys(sampleRow);

      ws.columns = headers.map((header) => ({
        header: header,
        key: header,
        width: 25,
      }));

      ws.addRow(sampleRow);

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template-import-peserta.xlsx";
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
    "id_tkm",
    "nama_pendaftar",
    "nik_pendaftar",
    "email",
    "jenis_kelamin",
    "pendidikan_terakhir",
    "whatsapp",
    "upload_foto_diri",
    "tempat_lahir",
    "tanggal_lahir",
    "apakah_penyandang_disabilitas",
    "jenis_disabilitas",
    "alamat_ktp",
    "provinsi_ktp",
    "kabupaten_ktp",
    "kecamatan_ktp",
    "kelurahan_ktp",
    "kode_pos_ktp",
    "alamat_domisili",
    "provinsi_domisili",
    "kabupaten_domisili",
    "kecamatan_domisili",
    "kelurahan_domisili",
    "kode_pos_domisili",
    "alamat_usaha",
    "provinsi_usaha",
    "kabupaten_usaha",
    "kecamatan_usaha",
    "kelurahan_usaha",
    "kode_pos_usaha",
    "nama_usaha",
    "sektor_usaha",
    "jenis_usaha",
    "deskripsi_usaha",
    "produk_utama",
    "omset_per_periode",
    "jumlah_produk_per_periode",
    "satuan_jumlah_produk_per_periode",
    "wilayah_pemasaran",
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

      // Map of canonical required keys to acceptable aliases
      const HEADER_ALIASES: Record<string, string[]> = {
        upload_foto_diri: ["upload_foto_diri", "foto", "foto_diri", "foto_peserta"],
        kabupaten_ktp: ["kabupaten_ktp", "kota_ktp", "kabupaten_kota_ktp"],
        kabupaten_domisili: [
          "kabupaten_domisili",
          "kota_domisili",
          "kabupaten_kota_domisili",
        ],
        kabupaten_usaha: [
          "kabupaten_usaha",
          "kota_usaha",
          "kabupaten_kota_usaha",
        ],
        apakah_penyandang_disabilitas: [
          "apakah_penyandang_disabilitas",
          "disabilitas",
          "penyandang_disabilitas",
        ],
      };

      // Check all 33 required headers allowing aliases
      const keys = Object.keys(rows[0]);
      const normalizedKeys = keys.map((k) =>
        k.trim().toLowerCase().replace(/\s+/g, "_"),
      );

      const missingHeaders = REQUIRED_HEADERS.filter((req) => {
        const aliases = HEADER_ALIASES[req] || [req];
        return !aliases.some((alias) => normalizedKeys.includes(alias));
      });

      if (missingHeaders.length > 0) {
        const errorMsg = `Format file salah. Kolom berikut wajib ada (${missingHeaders.length} kolom belum ada): ${missingHeaders.join(", ")}`;
        setValidationError(errorMsg);
        toast.error("Format kolom Excel tidak lengkap", {
          description: `Kurang kolom: ${missingHeaders.slice(0, 3).join(", ")}${missingHeaders.length > 3 ? "..." : ""}`,
        });
        return;
      }

      // Map row keys to canonical keys so backend and UI always have standard access
      const rowsWithIndex = rows.map((r, idx) => {
        const normalizedRow: any = {
          ...r,
          __rownumber: idx + 2,
        };

        // Populate canonical keys from aliases if standard key is not present
        if (!normalizedRow.kabupaten_ktp && (normalizedRow.kota_ktp || normalizedRow.kabupaten_kota_ktp)) {
          normalizedRow.kabupaten_ktp = normalizedRow.kota_ktp || normalizedRow.kabupaten_kota_ktp;
        }
        if (!normalizedRow.kabupaten_domisili && (normalizedRow.kota_domisili || normalizedRow.kabupaten_kota_domisili)) {
          normalizedRow.kabupaten_domisili = normalizedRow.kota_domisili || normalizedRow.kabupaten_kota_domisili;
        }
        if (!normalizedRow.kabupaten_usaha && (normalizedRow.kota_usaha || normalizedRow.kabupaten_kota_usaha)) {
          normalizedRow.kabupaten_usaha = normalizedRow.kota_usaha || normalizedRow.kabupaten_kota_usaha;
        }
        if (
          (normalizedRow.apakah_penyandang_disabilitas === undefined ||
            normalizedRow.apakah_penyandang_disabilitas === null ||
            String(normalizedRow.apakah_penyandang_disabilitas).trim() === "") &&
          (normalizedRow.disabilitas !== undefined || normalizedRow.penyandang_disabilitas !== undefined)
        ) {
          normalizedRow.apakah_penyandang_disabilitas =
            normalizedRow.disabilitas ?? normalizedRow.penyandang_disabilitas;
        }

        return normalizedRow;
      });
      setParsedRows(rowsWithIndex);
      setTotalCount(rowsWithIndex.length);
      toast.success("File berhasil dibaca", {
        description: `Ditemukan ${rowsWithIndex.length} data peserta.`,
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

    const chunkSize = 50;
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
          "/applicants/import",
          payload,
        );

        completeAccumulator += chunkResult.complete || 0;
        duplicatesAccumulator += chunkResult.duplicates || 0;
        failedAccumulator += chunkResult.failed || 0;
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
          description: `${completeAccumulator} data peserta berhasil ditambahkan ke sistem.`,
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
              status === "BERHASIL" || status === "SUKSES"
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
              <Link href="/applicants">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground font-medium">
              Kembali ke Daftar Peserta
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Impor Peserta</h1>
          <p className="text-muted-foreground mt-1">
            Tambahkan peserta dalam jumlah banyak sekaligus menggunakan file
            Excel.
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
          <Button variant="outline" className="gap-2 rounded-xl">
            <History className="h-4 w-4" /> Riwayat Impor
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
              <ImportZone
                onFileSelect={handleFileSelect}
                isProcessing={isProcessing || isSaving}
                progress={progress}
                statusText={
                  isSaving
                    ? totalCount > 0
                      ? `Menyimpan ${processedCount} dari ${totalCount} peserta...`
                      : "Menyimpan data..."
                    : totalCount > 0
                      ? `Memeriksa ${processedCount} dari ${totalCount} peserta...`
                      : "Membaca file..."
                }
              />

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
                          <th className="p-2.5 font-bold">Nama Pendaftar</th>
                          <th className="p-2.5 font-bold">NIK Pendaftar</th>
                          <th className="p-2.5 font-bold">Jenis Kelamin</th>
                          <th className="p-2.5 font-bold">Pendidikan</th>
                          <th className="p-2.5 font-bold">WhatsApp</th>
                          <th className="p-2.5 font-bold">Nama Usaha</th>
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
                            return foundKey ? String(r[foundKey]) : "-";
                          };

                          return (
                            <tr key={i} className="hover:bg-white/5">
                              <td className="p-2.5 font-mono text-muted-foreground">
                                {r.__rownumber}
                              </td>
                              <td className="p-2.5 font-medium">
                                {getVal(["id_tkm"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["nama_pendaftar"])}
                              </td>
                              <td className="p-2.5 font-mono">
                                {getVal(["nik_pendaftar"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["jenis_kelamin"])}
                              </td>
                              <td className="p-2.5">
                                {getVal(["pendidikan_terakhir"])}
                              </td>
                              <td className="p-2.5">{getVal(["whatsapp"])}</td>
                              <td className="p-2.5">
                                {getVal(["nama_usaha"])}
                              </td>
                            </tr>
                          );
                        })}
                        {parsedRows.length > 10 && (
                          <tr>
                            <td
                              colSpan={8}
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
                    <Play className="h-4 w-4 fill-current" /> Periksa Data
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
                        title: "Impor Data Peserta?",
                        description: `Apakah Anda yakin ingin mengimpor ${importResult?.complete} data peserta ke database?`,
                        confirmText: "Ya, Impor",
                        cancelText: "Batal",
                        variant: "default",
                      });
                      if (isConfirmed) {
                        startImport(false);
                      }
                    }}
                  >
                    <CheckCircle2 className="h-4 w-4" /> Simpan Data Peserta
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
                    {isDryRun
                      ? "Pratinjau Hasil Pemeriksaan"
                      : "Pratinjau Hasil Impor"}
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
                        ? `Ditemukan ${importResult.complete} data valid yang siap dimasukkan ke database. Silakan klik tombol "Simpan Data Peserta" untuk menyelesaikan impor.`
                        : `${importResult.complete} data peserta baru telah berhasil ditambahkan ke dalam database workspace ini.`}
                    </p>
                    {!isDryRun && (
                      <Button
                        variant="link"
                        className="text-emerald-700 dark:text-emerald-400 p-0 h-auto mt-2 font-bold"
                        asChild
                      >
                        <Link href="/applicants">Lihat Daftar Peserta</Link>
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
                      memastikan seluruh 38 kolom telah tersedia.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      2
                    </span>
                    <p>
                      <strong>Semua 38 kolom wajib diisi</strong> dan tidak
                      boleh ada baris sel yang kosong. Masukkan URL/link foto pada kolom <code>upload_foto_diri</code>. Jika tidak memiliki
                      disabilitas, isi kolom <code>jenis_disabilitas</code>{" "}
                      dengan tanda <code>-</code>.
                    </p>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      3
                    </span>
                    <p>
                      Pastikan kolom <strong>ID TKM</strong> dan{" "}
                      <strong>NIK</strong> unik serta tidak pernah didaftarkan
                      sebelumnya.
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
                  <li className="flex gap-3">
                    <span className="flex-none flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      5
                    </span>
                    <p>
                      Kolom <strong>Data Awal (Bulan 0)</strong>: Masukkan{" "}
                      <code>omset_per_periode</code>,{" "}
                      <code>jumlah_produk_per_periode</code> (boleh angka 0 jika baru merintis),{" "}
                      <code>satuan_jumlah_produk_per_periode</code> (contoh: <code>Pcs</code>, <code>Kg</code>, <code>Box</code>), dan{" "}
                      <code>wilayah_pemasaran</code> (contoh: <code>desa</code>, <code>kecamatan</code>, <code>kabupaten</code>, <code>provinsi</code>, <code>internasional</code>).
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
