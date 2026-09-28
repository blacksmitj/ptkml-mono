"use client";

import React, { useState } from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  useFileMaintenanceDryRun,
  usePruneFiles,
} from "@/hooks/use-file-maintenance";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleGuard } from "@/components/role-guard";
import { Input } from "@/components/ui/input";
import {
  ShieldAlert,
  Database,
  HardDrive,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileCode,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { useMe } from "@/hooks/use-me";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function FileMaintenancePage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingMe } = useMe();
  const currentRole = useAppStore((state) => state.currentRole);
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN" || currentRole === "SUPER_ADMIN";
  const [days, setDays] = useState(7);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const [hasScanned, setHasScanned] = useState(false);

  const { data, isLoading, isFetching, refetch } = useFileMaintenanceDryRun(
    days,
    {
      enabled: false,
    },
  );

  const handleStartScan = async () => {
    setHasScanned(true);
    await refetch();
  };

  const pruneMutation = usePruneFiles();

  const handlePrune = async () => {
    if (confirmText !== "HAPUS PERMANEN") return;

    await pruneMutation.mutateAsync(days);
    setIsConfirmOpen(false);
    setConfirmText("");
  };

  const stats = data?.statistics;
  const safeFiles = data?.safeToDelete || [];
  const deferredFiles = data?.deferred || [];

  if (isLoadingMe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Akses Ditolak (403 Forbidden)</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Hanya Super Admin yang memiliki izin untuk mengakses fitur pemeliharaan file.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => router.push("/workspaces")} variant="default">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Pilih Workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl w-full px-4 md:px-8 py-8">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9 border-border/80 shrink-0"
            onClick={() => router.push("/workspaces")}
            title="Kembali ke Pilih Workspace"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-linear-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Perawatan File
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
              Analisis dan bersihkan penyimpanan dari file yatim piatu yang tidak terhubung dengan database.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Umur Minimal:
            </span>
            <Select
              value={days.toString()}
              onValueChange={(val) => setDays(parseInt(val, 10))}
            >
              <SelectTrigger className="w-32 bg-card border-muted/50 rounded-xl">
                <SelectValue placeholder="Pilih umur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Hari</SelectItem>
                <SelectItem value="3">3 Hari</SelectItem>
                <SelectItem value="7">7 Hari</SelectItem>
                <SelectItem value="14">14 Hari</SelectItem>
                <SelectItem value="30">30 Hari</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={hasScanned ? "outline" : "default"}
            onClick={handleStartScan}
            disabled={isLoading || isFetching}
            className={`rounded-xl flex items-center gap-2 ${!hasScanned ? "bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20" : ""}`}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span>{isFetching ? "Memindai..." : hasScanned ? "Pindai Ulang" : "Mulai Pindai"}</span>
          </Button>

          <Button
            variant="destructive"
            onClick={() => setIsConfirmOpen(true)}
            disabled={!hasScanned || isLoading || isFetching || !safeFiles.length}
            className="rounded-xl flex items-center gap-2 shadow-lg shadow-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            <span>Bersihkan ({hasScanned ? safeFiles.length : 0})</span>
          </Button>
        </div>
      </div>

      {/* Info Warning Alert */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-2xl text-xs flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold block">
            PENTING: Kebijakan Keamanan Penyimpanan
          </span>
          <p>
            Proses pembersihan hanya akan menghapus objek file yatim piatu di
            MinIO/S3 yang berumur lebih dari <strong>{days} hari</strong>. File
            yang diunggah kurang dari {days} hari akan ditangguhkan untuk
            menghindari race-condition (unggah file sedang berlangsung namun
            record database belum tercatat).
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orphaned */}
        <Card className="rounded-2xl border-muted/40 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Yatim Piatu
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
          </CardHeader>
          <CardContent>
            {isLoading || isFetching ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded-md" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {hasScanned ? stats?.totalOrphanedCount || 0 : "-"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {hasScanned ? "File tidak terdaftar di DB" : "Belum dipindai"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Size */}
        <Card className="rounded-2xl border-muted/40 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Kapasitas
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
          </CardHeader>
          <CardContent>
            {isLoading || isFetching ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {hasScanned ? formatBytes(stats?.totalOrphanedSize || 0) : "-"}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {hasScanned ? "Ukuran seluruh file orphaned" : "Belum dipindai"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Safe to Delete */}
        <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Aman Dihapus
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
          </CardHeader>
          <CardContent>
            {isLoading || isFetching ? (
              <div className="h-8 w-16 bg-emerald-500/10 animate-pulse rounded-md" />
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {hasScanned ? stats?.safeCount || 0 : "-"}
                </div>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                  {hasScanned ? `Berumur >= ${days} hari (${formatBytes(stats?.safeSize || 0)})` : "Belum dipindai"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Deferred */}
        <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm relative overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Ditangguhkan
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          </CardHeader>
          <CardContent>
            {isLoading || isFetching ? (
              <div className="h-8 w-16 bg-amber-500/10 animate-pulse rounded-md" />
            ) : (
              <>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {hasScanned ? stats?.deferredCount || 0 : "-"}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                  {hasScanned ? `Baru diupload < ${days} hari (${formatBytes(stats?.deferredSize || 0)})` : "Belum dipindai"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs Detail Tables */}
      <Card className="rounded-2xl border-muted/40 shadow-sm">
        <CardContent className="p-6">
          {!hasScanned ? (
            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-muted/10 text-center space-y-4">
              <div className="p-4 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500">
                <HardDrive className="h-10 w-10" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Pemindaian Belum Dijalankan
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Untuk menghemat beban server, pemindaian file tidak dilakukan secara otomatis.
                  Silakan klik tombol di bawah untuk memeriksa file yatim piatu di MinIO/S3.
                </p>
              </div>
              <Button
                onClick={handleStartScan}
                disabled={isLoading || isFetching}
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/20 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                <span>{isFetching ? "Sedang Memindai..." : "Mulai Pemindaian File"}</span>
              </Button>
            </div>
          ) : isLoading || isFetching ? (
            <div className="space-y-4 py-8">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-sm font-medium text-muted-foreground">
                  Sedang menganalisis file di MinIO dan database...
                </p>
              </div>
              <div className="h-10 w-[300px] bg-muted animate-pulse rounded-lg mx-auto" />
              <div className="h-[200px] bg-muted animate-pulse rounded-xl" />
            </div>
          ) : (
            <Tabs defaultValue="safe" className="space-y-4">
              <TabsList className="rounded-xl bg-muted p-1">
                <TabsTrigger
                  value="safe"
                  className="rounded-lg flex items-center gap-2"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>Aman Dihapus ({safeFiles.length})</span>
                </TabsTrigger>
                <TabsTrigger
                  value="deferred"
                  className="rounded-lg flex items-center gap-2"
                >
                  <Clock className="h-3.5 w-3.5" />
                  <span>Ditangguhkan ({deferredFiles.length})</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab Safe To Delete */}
              <TabsContent value="safe" className="outline-none">
                {safeFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-muted/20">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Bersih!
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tidak ditemukan file yatim piatu yang aman untuk dihapus.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Object Key</TableHead>
                          <TableHead className="w-36">Ukuran</TableHead>
                          <TableHead className="w-48">
                            Terakhir Dimodifikasi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {safeFiles.map((file, idx) => (
                          <TableRow key={file.key}>
                            <TableCell className="font-medium">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs break-all max-w-[400px]">
                              {file.key}
                            </TableCell>
                            <TableCell>{formatBytes(file.size)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {file.lastModified
                                ? format(
                                    new Date(file.lastModified),
                                    "d MMM yyyy, HH:mm",
                                    { locale: id },
                                  )
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              {/* Tab Deferred */}
              <TabsContent value="deferred" className="outline-none">
                {deferredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-2xl bg-muted/20">
                    <Clock className="h-12 w-12 text-amber-500 mb-3" />
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Tidak Ada File Baru
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tidak ada file yatim piatu baru yang ditangguhkan.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-12">No</TableHead>
                          <TableHead>Object Key</TableHead>
                          <TableHead className="w-36">Ukuran</TableHead>
                          <TableHead className="w-48">
                            Terakhir Dimodifikasi
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deferredFiles.map((file, idx) => (
                          <TableRow key={file.key}>
                            <TableCell className="font-medium">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs break-all max-w-[400px]">
                              {file.key}
                            </TableCell>
                            <TableCell>{formatBytes(file.size)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {file.lastModified
                                ? format(
                                    new Date(file.lastModified),
                                    "d MMM yyyy, HH:mm",
                                    { locale: id },
                                  )
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <span>Konfirmasi Pembersihan File</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini akan **menghapus secara permanen** sebanyak **
              {safeFiles.length} file** ({formatBytes(stats?.safeSize || 0)})
              dari bucket penyimpanan MinIO/S3. File yang telah dihapus tidak
              dapat dipulihkan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Untuk mengonfirmasi, silakan ketik{" "}
              <span className="font-mono text-rose-600 bg-rose-500/10 px-1.5 py-0.5 rounded font-bold">
                HAPUS PERMANEN
              </span>{" "}
              di bawah ini:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Tulis HAPUS PERMANEN di sini"
              className="rounded-xl border-rose-500/30 focus-visible:ring-rose-500"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmOpen(false);
                setConfirmText("");
              }}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handlePrune}
              disabled={
                confirmText !== "HAPUS PERMANEN" || pruneMutation.isPending
              }
              className="rounded-xl flex items-center gap-1 shadow-lg shadow-rose-500/15"
            >
              {pruneMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <span>Saya mengerti, Hapus Sekarang</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </main>
);
}
