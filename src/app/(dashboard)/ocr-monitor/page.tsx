"use client";

import React, { useState, useEffect } from "react";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { 
  useOcrResults, 
  useReprocessOcr, 
  useUpdateOcrData 
} from "@/hooks/use-ocr";
import { OcrStatus, OcrDocumentType, OcrResult } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoleGuard } from "@/components/role-guard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Search, 
  Eye, 
  FileText, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Cpu, 
  Save, 
  FileDown, 
  ExternalLink 
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useDebounce } from "@/hooks/use-debounce";
import { useAppStore } from "@/store/use-app-store";
import { useWorkspaces, useWorkspace } from "@/hooks/use-workspaces";

export default function OcrMonitorPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  
  // Selection for Detail Drawer
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [fallbackSelectedResult, setFallbackSelectedResult] = useState<OcrResult | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Edited parsedData for manual override
  const [editedParsedData, setEditedParsedData] = useState<Record<string, any>>({});

  // Query OCR list
  const queryParams = {
    page,
    limit,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    ...(typeFilter !== "all" ? { documentType: typeFilter } : {}),
  };

  // Poll active jobs every 3 seconds if there are PENDING or PROCESSING jobs in the current list
  const { data, isLoading, refetch, isFetching } = useOcrResults(queryParams, {
    refetchInterval: (query: any) => {
      const queryData = query?.state?.data || query;
      const hasActiveJobs = queryData?.data?.some(
        (job: OcrResult) => job.status === "PENDING" || job.status === "PROCESSING"
      );
      return hasActiveJobs ? 3000 : false;
    }
  });

  // Derive selectedResult dynamically from the polled list data or fallback to initial snapshot
  const selectedResult = data?.data?.find(item => item.fileId === selectedFileId) || fallbackSelectedResult;

  // Sync fallbackSelectedResult with fresh data from list when it changes
  useEffect(() => {
    if (selectedFileId && data?.data) {
      const fresh = data.data.find(item => item.fileId === selectedFileId);
      if (fresh) {
        setFallbackSelectedResult(fresh);
      }
    }
  }, [data, selectedFileId]);

  // Sync parsed fields when the selected result's ID or status changes
  useEffect(() => {
    if (selectedResult) {
      setEditedParsedData(selectedResult.parsedData || {});
    } else {
      setEditedParsedData({});
    }
  }, [selectedResult?.fileId, selectedResult?.status]);

  const reprocessMutation = useReprocessOcr();
  const updateDataMutation = useUpdateOcrData();

  const handleOpenDrawer = (result: OcrResult) => {
    setSelectedFileId(result.fileId);
    setFallbackSelectedResult(result);
    setIsDrawerOpen(true);
  };

  const handleReprocess = async (fileId: string) => {
    await reprocessMutation.mutateAsync(fileId);
    refetch();
    // Do NOT close drawer so user can see progress in real time
  };

  const handleSaveOverride = async () => {
    if (!selectedResult) return;
    await updateDataMutation.mutateAsync({
      fileId: selectedResult.fileId,
      parsedData: editedParsedData
    });
    // Update local fallback to match updated data immediately
    setFallbackSelectedResult(prev => prev ? { ...prev, parsedData: editedParsedData } : null);
    refetch();
  };

  const handleOverrideFieldChange = (key: string, value: any) => {
    setEditedParsedData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Metrics summary
  const summary = React.useMemo(() => {
    if (!data?.data) return { total: 0, pending: 0, processing: 0, completed: 0, failed: 0, mismatches: 0 };
    
    // Note: Local calculations represent the current view, but let's make it look dynamic
    let total = data.pagination.total || 0;
    let pending = 0;
    let processing = 0;
    let completed = 0;
    let failed = 0;
    let mismatches = 0;

    data.data.forEach(item => {
      if (item.status === "PENDING") pending++;
      else if (item.status === "PROCESSING") processing++;
      else if (item.status === "COMPLETED") completed++;
      else if (item.status === "FAILED") failed++;
      
      const hasMismatch = item.validations?.some(v => !v.isMatch);
      if (hasMismatch) mismatches++;
    });

    return { total, pending, processing, completed, failed, mismatches };
  }, [data]);

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="flex flex-col gap-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitor OCR</h1>
          <p className="text-muted-foreground mt-1">
            Pantau dan verifikasi proses ekstraksi dokumen otomatis (OCR).
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? "Menyegarkan..." : "Segarkan"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-background/50 backdrop-blur-sm border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dokumen</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Terdaftar di database</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dalam Antrean</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.pending + summary.processing}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.processing} Sedang diproses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-500/5 dark:bg-green-500/10 border-green-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Berhasil</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {summary.completed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ekstraksi selesai</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/5 dark:bg-red-500/10 border-red-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gagal</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {summary.failed}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Butuh proses ulang</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konflik / Mismatch</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {summary.mismatches}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nilai manual & OCR beda</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kata kunci raw text / nama file..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-background"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Status Select */}
          <Select 
            value={statusFilter} 
            onValueChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value={OcrStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={OcrStatus.PROCESSING}>Processing</SelectItem>
              <SelectItem value={OcrStatus.COMPLETED}>Completed</SelectItem>
              <SelectItem value={OcrStatus.FAILED}>Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Doc Type Select */}
          <Select 
            value={typeFilter} 
            onValueChange={(val) => {
              setTypeFilter(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[160px] bg-background">
              <SelectValue placeholder="Tipe Dokumen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value={OcrDocumentType.KTP}>KTP</SelectItem>
              <SelectItem value={OcrDocumentType.BPJS}>BPJS</SelectItem>
              <SelectItem value={OcrDocumentType.SALARY_SLIP}>Salary Slip</SelectItem>
              <SelectItem value={OcrDocumentType.REPORT}>Report</SelectItem>
              <SelectItem value={OcrDocumentType.RECEIPT}>Receipt</SelectItem>
              <SelectItem value={OcrDocumentType.CASHFLOW}>Cashflow</SelectItem>
              <SelectItem value={OcrDocumentType.OTHER}>Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <div className="rounded-md border bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Nama Objek / File</TableHead>
                <TableHead className="w-[120px]">Kategori File</TableHead>
                <TableHead className="w-[100px]">Tipe OCR</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[100px] text-right">Confidence</TableHead>
                <TableHead className="w-[160px]">Tanggal Ditambahkan</TableHead>
                <TableHead className="w-[100px] text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data && data.data.length > 0 ? (
                data.data.map((item) => {
                  const statusColors: Record<OcrStatus, string> = {
                    PENDING: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
                    PROCESSING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 animate-pulse border border-amber-200/55",
                    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400",
                    FAILED: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400 border border-red-200/40",
                  };

                  const hasMismatch = item.validations?.some(v => !v.isMatch);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        <span title={item.file?.objectKey || "Unknown Object"}>
                          {item.file?.objectKey || "No Key"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {item.file?.category || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-semibold text-primary">{item.documentType}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[item.status]}`}>
                            {item.status}
                          </span>
                          {item.status === "COMPLETED" && hasMismatch && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400" title="Ada nilai field yang berbeda dengan data input manual">
                              <AlertTriangle className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {item.confidence !== null && item.confidence !== undefined
                          ? `${(item.confidence * 100).toFixed(1)}%`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {item.createdAt 
                          ? format(new Date(item.createdAt), "dd MMM yyyy, HH:mm", { locale: id }) 
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenDrawer(item)}
                          className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Detail
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Tidak ada log transaksi OCR ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <span className="text-xs text-muted-foreground">
                Menampilkan halaman {page} dari {data.pagination.totalPages} ({data.pagination.total} total item)
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 text-xs"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                  className="h-8 text-xs"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interactive Verification & Override Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full! sm:w-3/4! max-w-none! flex flex-col h-full p-6 border-l shadow-2xl bg-background/95 backdrop-blur-md">
          <SheetHeader className="pb-3 border-b">
            <div className="flex justify-between items-start">
              <div>
                <SheetTitle className="text-xl flex items-center gap-2">
                  Verifikasi Hasil OCR 
                  <Badge variant="secondary" className="font-mono text-xs">{selectedResult?.documentType}</Badge>
                </SheetTitle>
                <SheetDescription className="text-xs truncate max-w-[45vw] mt-0.5" title={selectedResult?.file?.objectKey}>
                  Object Key: {selectedResult?.file?.objectKey}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Grid Layout: Left Document, Right verification tabs */}
          {selectedResult && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 py-4">
              
              {/* Left Column: Doc Preview */}
              <div className="flex flex-col border rounded-lg bg-muted/20 p-2 overflow-hidden h-full">
                <div className="flex items-center justify-between border-b pb-2 mb-2 px-1">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    Preview Dokumen Asli
                  </span>
                  {selectedResult.file?.url && (
                    <a 
                      href={normalizeFileUrl(selectedResult.file.url)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      Buka di Tab Baru
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 flex items-center justify-center bg-zinc-950 rounded border overflow-auto p-4 relative">
                  {selectedResult.file?.url ? (
                    normalizeFileUrl(selectedResult.file.url).toLowerCase().includes(".pdf") || selectedResult.file.url.toLowerCase().includes("pdf") ? (
                      <iframe 
                        src={normalizeFileUrl(selectedResult.file.url)} 
                        className="w-full h-full min-h-[400px] border-0" 
                        title="Document Preview"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={normalizeFileUrl(selectedResult.file.url)} 
                        alt="Document Preview" 
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    )
                  ) : (
                    <span className="text-muted-foreground text-xs">Preview tidak tersedia (URL kosong)</span>
                  )}
                </div>
              </div>

              {/* Right Column: Information tabs and corrections */}
              <div className="flex flex-col h-full overflow-hidden">
                <Tabs defaultValue="fields" className="flex flex-col flex-1 h-full">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="fields" className="text-xs gap-1.5">
                      <Database className="h-3.5 w-3.5" />
                      Bidang & Override
                    </TabsTrigger>
                    <TabsTrigger value="raw" className="text-xs gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Teks Kasar
                    </TabsTrigger>
                    <TabsTrigger value="sys" className="text-xs gap-1.5">
                      <Cpu className="h-3.5 w-3.5" />
                      Log Sistem
                    </TabsTrigger>
                  </TabsList>

                  {/* TAB 1: Fields validation and manual override input grid */}
                  <TabsContent value="fields" className="flex-1 flex flex-col min-h-0 pt-3">
                    <div className="flex-1 overflow-y-auto pr-1">
                      
                      {/* Validation discrepancies alert */}
                      {selectedResult.validations && selectedResult.validations.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Validasi Integritas Data</h4>
                          <div className="space-y-1.5">
                            {selectedResult.validations.map((v) => (
                              <div 
                                key={v.id} 
                                className={`flex items-center justify-between text-xs p-2 rounded border ${
                                  v.isMatch 
                                    ? 'bg-green-500/5 border-green-500/20 text-green-800 dark:text-green-300' 
                                    : 'bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-300'
                                }`}
                              >
                                <span className="font-semibold uppercase tracking-wider text-[10px] bg-background/85 px-1.5 py-0.5 rounded border flex items-center gap-1">
                                  {v.fieldName === "bpjsNumber"
                                    ? "No. BPJS"
                                    : v.fieldName === "name"
                                    ? "Nama"
                                    : v.fieldName === "nik"
                                    ? "NIK"
                                    : v.fieldName}
                                  {v.confidence !== null && v.confidence !== undefined && (
                                    <span className="text-[9px] text-muted-foreground font-mono font-normal">
                                      ({(v.confidence * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground block leading-none">Manual input:</span>
                                    <span className="font-medium">{v.manualValue || "-"}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[10px] text-muted-foreground block leading-none">OCR extracted:</span>
                                    <span className="font-medium">{v.extractedValue || "-"}</span>
                                  </div>
                                  <div>
                                    {v.isMatch ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-rose-500" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Manual Override Form */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground">Koreksi Data Hasil Ekstraksi (Override)</h4>
                          <span className="text-[10px] text-primary italic font-medium">Ubah nilai di bawah jika salah</span>
                        </div>
                        <Card className="bg-background">
                          <CardContent className="p-3 space-y-3">
                            {Object.keys(editedParsedData).length > 0 ? (
                              Object.entries(editedParsedData).map(([key, val]) => (
                                <div key={key} className="space-y-1">
                                  <label className="text-[11px] font-mono uppercase text-muted-foreground block">
                                    {key}
                                  </label>
                                  <Input
                                    value={val === null || val === undefined ? "" : typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                    onChange={(e) => handleOverrideFieldChange(key, e.target.value)}
                                    className="h-8 text-xs font-mono"
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-4 text-xs text-muted-foreground italic">
                                Tidak ada data terstruktur hasil parser.
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>

                    </div>

                    <div className="border-t pt-3 mt-auto flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="default"
                        disabled={updateDataMutation.isPending}
                        onClick={handleSaveOverride}
                        className="gap-1.5 h-8 text-xs bg-primary"
                      >
                        <Save className="h-3.5 w-3.5" />
                        {updateDataMutation.isPending ? "Menyimpan..." : "Simpan Koreksi"}
                      </Button>
                    </div>
                  </TabsContent>

                  {/* TAB 2: Raw Text extracted by OCR */}
                  <TabsContent value="raw" className="flex-1 flex flex-col min-h-0 pt-3">
                    <ScrollArea className="flex-1 border rounded bg-zinc-950 p-3 font-mono text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {selectedResult.rawText || "Tidak ada hasil teks mentah/kasar."}
                    </ScrollArea>
                  </TabsContent>

                  {/* TAB 3: Technical Logs (Engine, time, error) */}
                  <TabsContent value="sys" className="flex-1 pt-3">
                    <Card className="border bg-muted/10">
                      <CardContent className="p-4 space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">OCR Engine</span>
                            <span className="font-semibold text-primary">{selectedResult.engine || "Google Vision"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Waktu Pemrosesan</span>
                            <span className="font-semibold">
                              {selectedResult.processingTime 
                                ? `${(selectedResult.processingTime / 1000).toFixed(2)} detik` 
                                : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Skor Keyakinan (Confidence)</span>
                            <span className="font-semibold font-mono">
                              {selectedResult.confidence !== null && selectedResult.confidence !== undefined 
                                ? `${(selectedResult.confidence * 100).toFixed(2)}%` 
                                : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px] uppercase">Waktu Selesai</span>
                            <span className="font-semibold text-muted-foreground">
                              {selectedResult.processedAt 
                                ? format(new Date(selectedResult.processedAt), "dd MMM yyyy, HH:mm", { locale: id }) 
                                : "-"}
                            </span>
                          </div>
                        </div>

                        {selectedResult.errorMessage && (
                          <div className="border border-red-200/50 bg-red-500/5 rounded p-3 text-red-600 dark:text-red-400">
                            <span className="font-semibold block mb-1 text-[10px] uppercase">Pesan Error / Kegagalan:</span>
                            <p className="font-mono text-[11px] whitespace-pre-wrap">{selectedResult.errorMessage}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

            </div>
          )}

          <SheetFooter className="border-t pt-3 mt-auto flex-row justify-between items-center sm:justify-between w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(false)}
              className="h-8 text-xs"
            >
              Tutup
            </Button>
            {selectedResult && (
              <Button
                variant="destructive"
                size="sm"
                disabled={reprocessMutation.isPending}
                onClick={() => handleReprocess(selectedResult.fileId)}
                className="h-8 text-xs gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${reprocessMutation.isPending ? 'animate-spin' : ''}`} />
                Proses Ulang Dokumen (Reprocess)
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  </RoleGuard>
);
}
