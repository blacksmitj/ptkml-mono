"use client";

import * as React from "react";
import Link from "next/link";
import { 
  GaugeIcon, 
  DatabaseIcon, 
  HardDriveIcon, 
  RefreshCwIcon, 
  AlertTriangleIcon, 
  CheckCircle2Icon, 
  NetworkIcon, 
  ArrowLeftIcon, 
  Loader2Icon, 
  ActivityIcon, 
  ZapIcon,
  HelpCircleIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/use-app-store";
import { apiClient } from "@/lib/api-client";

import { useMe } from "@/hooks/use-me";
import { useRouter } from "next/navigation";

interface StepMetric {
  name: string;
  durationMs: number;
  status: "success" | "warning" | "failed";
  error?: string;
}

interface ServiceDiagnostic {
  status: "healthy" | "degraded" | "unreachable";
  latencyMs?: number;
  dnsResolutionMs?: number;
  dnsResolvedIp?: string;
  throughputMbSec?: number;
  steps: StepMetric[];
  errorSummary?: string;
  troubleshooting?: string;
}

interface SpeedTestResult {
  timestamp: string;
  database: ServiceDiagnostic;
  storage: ServiceDiagnostic;
  systemInfo: {
    nodeVersion: string;
    platform: string;
    arch: string;
    env: string;
  };
}

export default function SpeedTestPage() {
  const router = useRouter();
  const { data: user, isLoading: isLoadingMe } = useMe();
  const currentRole = useAppStore((state) => state.currentRole);
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN" || currentRole === "SUPER_ADMIN";
  const [sizeKb, setSizeKb] = React.useState<number>(250);
  const [isRunning, setIsRunning] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<SpeedTestResult | null>(null);
  const [currentStage, setCurrentStage] = React.useState<string>("");
  const [isTestingRateLimit, setIsTestingRateLimit] = React.useState<boolean>(false);
  const [rateLimitLogs, setRateLimitLogs] = React.useState<string[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = React.useState<"idle" | "running" | "passed" | "failed">("idle");

  if (isLoadingMe) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Akses Ditolak</h1>
        <p className="text-muted-foreground">Halaman ini hanya dapat diakses oleh Super Admin.</p>
        <Button onClick={() => router.push("/workspaces")}>
          Kembali ke Pilih Workspace
        </Button>
      </div>
    );
  }

  const runSpeedTest = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setResult(null);
    setCurrentStage("Menginisiasi tes...");
    
    toast.info("Memulai pengujian performa database dan MinIO...");

    const stages = [
      "Menguji resolusi DNS database...",
      "Melakukan ping koneksi PostgreSQL...",
      "Menjalankan pengujian CRUD di temporary table...",
      "Menguji resolusi DNS MinIO...",
      "Melakukan ping bucket MinIO...",
      "Mengunggah berkas uji coba ke MinIO (Write)...",
      "Mengunduh berkas uji coba dari MinIO (Read)...",
      "Membersihkan berkas uji coba...",
      "Menyusun visualisasi analisis diagnostik..."
    ];

    // Simulate progress stage text updates to make the UI feel alive and premium
    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx < stages.length) {
        setCurrentStage(stages[stageIdx]);
        stageIdx++;
      }
    }, 600);

    try {
      const response = await apiClient.get<SpeedTestResult>(`/speed-test?size=${sizeKb}`, {
        headers: {
          "Cache-Control": "no-cache"
        }
      });
      
      clearInterval(interval);
      
      const data = response.data;
      setResult(data);
      
      // Determine overall notification based on results
      const dbStatus = data.database.status;
      const s3Status = data.storage.status;

      if (dbStatus === "healthy" && s3Status === "healthy") {
        toast.success("Pengujian selesai! Seluruh layanan dalam keadaan prima.");
      } else if (dbStatus === "unreachable" || s3Status === "unreachable") {
        toast.error("Pengujian selesai. Ditemukan kesalahan kritis pada layanan!");
      } else {
        toast.warning("Pengujian selesai dengan beberapa catatan performa (Degraded).");
      }
    } catch (error: any) {
      clearInterval(interval);
      console.error("Speed test execution error:", error);
      toast.error(`Gagal menjalankan speed test: ${error.message || "Unknown error"}`);
    } finally {
      setIsRunning(false);
      setCurrentStage("");
    }
  };

  const runRateLimitTest = async () => {
    if (isTestingRateLimit) return;
    setIsTestingRateLimit(true);
    setRateLimitStatus("running");
    setRateLimitLogs(["Memulai pengujian simulasi rate limit..."]);
    toast.info("Menguji rate limit backend...");

    let triggered429 = false;

    // Send 6 sequential requests
    for (let i = 1; i <= 6; i++) {
      setRateLimitLogs((prev) => [...prev, `Mengirim request ke-${i}...`]);
      try {
        await apiClient.get("/speed-test/rate-limit-check", {
          headers: {
            "Cache-Control": "no-cache"
          }
        });
        setRateLimitLogs((prev) => [
          ...prev, 
          `Request ke-${i}: Berhasil (Status: 200) - Sisa kuota aman.`
        ]);
        // Wait a tiny bit between requests for nice UI pacing
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error: any) {
        // If we hit 429, check either status code or the error message from the axios interceptor
        const status = error.response?.status;
        const is429 = status === 429 || error.message === "Too Many Requests" || error.message?.includes("429");
        
        if (is429) {
          triggered429 = true;
          setRateLimitLogs((prev) => [
            ...prev,
            `Request ke-${i}: Diblokir (Status: 429 Too Many Requests) - Rate limit aktif!`
          ]);
          break;
        } else {
          setRateLimitLogs((prev) => [
            ...prev,
            `Request ke-${i}: Gagal (Status: ${status || "Error"}, ${error.message || "Unknown error"})`
          ]);
          break;
        }
      }
    }

    if (triggered429) {
      setRateLimitStatus("passed");
      toast.success("Rate limiter backend berfungsi dengan baik!");
    } else {
      setRateLimitStatus("failed");
      setRateLimitLogs((prev) => [
        ...prev,
        "Kesimpulan: Gagal mendeteksi pembatasan. Seluruh 6 request berhasil lolos tanpa hambatan 429."
      ]);
      toast.error("Gagal mendeteksi pembatasan rate limit.");
    }
    setIsTestingRateLimit(false);
  };

  // Helper to format step names to human readable
  const formatStepName = (name: string) => {
    const map: Record<string, string> = {
      dns_lookup: "Resolusi DNS Host",
      connection_ping: "Ping Koneksi",
      table_creation: "Pembuatan Temp Table",
      row_insert: "Operasi Tulis (Insert)",
      row_select: "Operasi Baca (Select)",
      row_update: "Operasi Ubah (Update)",
      row_delete: "Operasi Hapus (Delete)",
      table_cleanup: "Penghapusan Temp Table",
      bucket_ping: "Ping Koneksi Bucket",
      file_upload_write: "Unggah Berkas (Write)",
      file_download_read: "Unduh Berkas (Read)",
      file_cleanup_delete: "Hapus Berkas (Cleanup)"
    };
    return map[name] || name;
  };

  const getStatusBadge = (status: "healthy" | "degraded" | "unreachable") => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none px-3 font-semibold">Optimal</Badge>;
      case "degraded":
        return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-none px-3 font-semibold">Degraded</Badge>;
      case "unreachable":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none px-3 font-semibold">Gangguan</Badge>;
      default:
        return <Badge variant="secondary">Tidak Diketahui</Badge>;
    }
  };

  const getLatencyColor = (ms: number, type: "db" | "s3") => {
    const limits = type === "db" ? { fast: 80, mod: 250 } : { fast: 300, mod: 1000 };
    if (ms <= limits.fast) return "text-emerald-500 font-semibold";
    if (ms <= limits.mod) return "text-amber-500 font-semibold";
    return "text-destructive font-bold";
  };

  return (
    <main className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="rounded-xl h-9 w-9 border-border/80 shrink-0"
            onClick={() => router.push("/workspaces")}
            title="Kembali ke Pilih Workspace"
          >
            <ArrowLeftIcon className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <GaugeIcon className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Speed Test & Diagnostik</h1>
              <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
                Uji latensi database PostgreSQL dan throughput transfer MinIO/S3 untuk mencari hambatan sistem.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Control Card */}
        <Card className="border-primary/10 shadow-sm overflow-hidden lg:col-span-2 flex flex-col justify-between">
          <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-lg font-bold">Konfigurasi Pengujian Storage</h3>
                <p className="text-sm text-muted-foreground">
                  Pilih ukuran berkas tiruan (dummy file) yang akan diunggah dan diunduh ke MinIO untuk mengukur kecepatan bandwidth disk dan jaringan.
                </p>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  {[100, 250, 500, 1000, 2500].map((kb) => (
                    <Button
                      key={kb}
                      variant={sizeKb === kb ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl px-4 font-semibold"
                      onClick={() => setSizeKb(kb)}
                      disabled={isRunning}
                    >
                      {kb >= 1000 ? `${(kb / 1000).toFixed(1)} MB` : `${kb} KB`}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="shrink-0 flex flex-col sm:flex-row gap-3">
                <Button
                  size="lg"
                  onClick={runSpeedTest}
                  disabled={isRunning}
                  className="rounded-xl px-8 font-bold gap-3 shadow-md shadow-primary/10 hover:shadow-lg transition-all"
                >
                  {isRunning ? (
                    <>
                      <Loader2Icon className="h-5 w-5 animate-spin" />
                      Menguji...
                    </>
                  ) : (
                    <>
                      <RefreshCwIcon className="h-5 w-5" />
                      Mulai Uji Performa
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Running progress view */}
            {isRunning && (
              <div className="mt-8 p-4 rounded-2xl bg-primary/5 border border-primary/10 animate-pulse flex items-center gap-4">
                <Loader2Icon className="h-5 w-5 text-primary animate-spin shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-bold text-primary">Sedang Menjalankan Diagnostik</p>
                  <p className="text-xs text-muted-foreground">{currentStage}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rate Limit Diagnostic Card */}
        <Card className="border-primary/10 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardContent className="p-6 md:p-8 flex flex-col h-full justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZapIcon className={cn(
                  "h-5 w-5",
                  rateLimitStatus === "passed" ? "text-emerald-500 animate-bounce" : "text-primary"
                )} />
                <h3 className="text-lg font-bold">Diagnostik Rate Limit</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Menguji apakah sistem pembatasan request (Rate Limiter) di server backend aktif dan memblokir request berlebih dengan status 429.
              </p>
            </div>

            {rateLimitLogs.length > 0 && (
              <div className="p-3 bg-muted rounded-xl border font-mono text-[10px] space-y-1 max-h-[120px] overflow-y-auto">
                {rateLimitLogs.map((log, idx) => (
                  <div key={idx} className={cn(
                    "leading-relaxed",
                    log.includes("Status: 429") && "text-emerald-600 font-bold",
                    log.includes("Gagal") && "text-destructive",
                    log.includes("Simulasi") && "text-muted-foreground"
                  )}>
                    {log}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <div>
                {rateLimitStatus === "passed" && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none font-semibold text-[10px] px-2 py-0.5">
                    Rate Limit Aktif
                  </Badge>
                )}
                {rateLimitStatus === "failed" && (
                  <Badge variant="destructive" className="font-semibold text-[10px] px-2 py-0.5">
                    Tidak Berfungsi
                  </Badge>
                )}
                {rateLimitStatus === "running" && (
                  <Badge variant="secondary" className="animate-pulse font-semibold text-[10px] px-2 py-0.5">
                    Memproses...
                  </Badge>
                )}
                {rateLimitStatus === "idle" && (
                  <Badge variant="outline" className="font-semibold text-[10px] px-2 py-0.5 text-muted-foreground">
                    Belum Diuji
                  </Badge>
                )}
              </div>

              <Button
                variant={rateLimitStatus === "passed" ? "outline" : "default"}
                size="sm"
                onClick={runRateLimitTest}
                disabled={isTestingRateLimit || isRunning}
                className="font-bold rounded-xl gap-2 text-xs"
              >
                {isTestingRateLimit ? (
                  <>
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    Menguji...
                  </>
                ) : (
                  <>
                    <ZapIcon className="h-3 w-3" />
                    Cek Rate Limit
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading Skeletal State */}
      {!result && !isRunning && (
        <div className="text-center py-20 border-2 border-dashed border-muted rounded-3xl space-y-4">
          <ActivityIcon className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <div className="space-y-1 max-w-sm mx-auto">
            <p className="font-bold text-lg">Belum Ada Riwayat Uji</p>
            <p className="text-sm text-muted-foreground">
              Tekan tombol &quot;Mulai Uji Performa&quot; di atas untuk menguji kesehatan dan kecepatan database serta MinIO.
            </p>
          </div>
        </div>
      )}

      {/* Diagnostic Dashboard Results */}
      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Main KPI Widgets Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* PostgreSQL DB KPI Card */}
            <Card className={cn(
              "border shadow-sm overflow-hidden",
              result.database.status === "healthy" && "border-emerald-500/20",
              result.database.status === "degraded" && "border-amber-500/20",
              result.database.status === "unreachable" && "border-destructive/20"
            )}>
              <CardHeader className="bg-muted/10 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DatabaseIcon className={cn(
                      "h-5 w-5",
                      result.database.status === "healthy" && "text-emerald-500",
                      result.database.status === "degraded" && "text-amber-500",
                      result.database.status === "unreachable" && "text-destructive animate-bounce"
                    )} />
                    <CardTitle className="text-xl">Database PostgreSQL</CardTitle>
                  </div>
                  {getStatusBadge(result.database.status)}
                </div>
                <CardDescription className="pt-1">
                  Konektivitas dan eksekusi CRUD relasional menggunakan Prisma
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Score / Timing */}
                {result.database.status !== "unreachable" ? (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/40 border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Latensi CRUD</p>
                      <p className="text-3xl font-extrabold tracking-tight mt-1">
                        <span className={getLatencyColor(result.database.latencyMs || 0, "db")}>
                          {result.database.latencyMs}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground ml-1">ms</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Dns Resolusi Host</p>
                      <p className="text-3xl font-extrabold tracking-tight mt-1">
                        <span className={getLatencyColor(result.database.dnsResolutionMs || 0, "db")}>
                          {result.database.dnsResolutionMs}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground ml-1">ms</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5 shrink-0" />
                    Layanan PostgreSQL Tidak Terjangkau!
                  </div>
                )}

                {/* DB Step Metrics */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Rincian Kecepatan Tiap Tahap</h4>
                  <div className="space-y-2">
                    {result.database.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-muted/50">
                        <span className="text-muted-foreground font-medium">{formatStepName(step.name)}</span>
                        <div className="flex items-center gap-2">
                          <span className={getLatencyColor(step.durationMs, "db")}>
                            {step.durationMs} ms
                          </span>
                          {step.status === "success" ? (
                            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* MinIO Storage KPI Card */}
            <Card className={cn(
              "border shadow-sm overflow-hidden",
              result.storage.status === "healthy" && "border-emerald-500/20",
              result.storage.status === "degraded" && "border-amber-500/20",
              result.storage.status === "unreachable" && "border-destructive/20"
            )}>
              <CardHeader className="bg-muted/10 pb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDriveIcon className={cn(
                      "h-5 w-5",
                      result.storage.status === "healthy" && "text-emerald-500",
                      result.storage.status === "degraded" && "text-amber-500",
                      result.storage.status === "unreachable" && "text-destructive animate-bounce"
                    )} />
                    <CardTitle className="text-xl">Penyimpanan MinIO S3</CardTitle>
                  </div>
                  {getStatusBadge(result.storage.status)}
                </div>
                <CardDescription className="pt-1">
                  Kecepatan bandwidth unggah/unduh berkas menggunakan AWS S3 SDK
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Score / Timing */}
                {result.storage.status !== "unreachable" ? (
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/40 border">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Avg Throughput</p>
                      <p className="text-3xl font-extrabold tracking-tight mt-1 text-primary">
                        {result.storage.throughputMbSec}
                        <span className="text-sm font-medium text-muted-foreground ml-1">MB/s</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Total Latensi File</p>
                      <p className="text-3xl font-extrabold tracking-tight mt-1">
                        <span className={getLatencyColor(result.storage.latencyMs || 0, "s3")}>
                          {result.storage.latencyMs}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground ml-1">ms</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 text-destructive text-sm font-semibold flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5 shrink-0" />
                    Layanan MinIO Storage Tidak Terjangkau!
                  </div>
                )}

                {/* Storage Step Metrics */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Rincian Kecepatan Tiap Tahap</h4>
                  <div className="space-y-2">
                    {result.storage.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-xl hover:bg-muted/30 transition-all border border-transparent hover:border-muted/50">
                        <span className="text-muted-foreground font-medium">{formatStepName(step.name)}</span>
                        <div className="flex items-center gap-2">
                          <span className={getLatencyColor(step.durationMs, "s3")}>
                            {step.durationMs} ms
                          </span>
                          {step.status === "success" ? (
                            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Diagnostic Analyzer Panel (Troubleshooting & Solution Advice) */}
          <Card className="border-primary/10 shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 pb-4 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <NetworkIcon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Panel Diagnostik & Solusi Sistem</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Database Analysis Row */}
              <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl border bg-muted/20">
                <div className="flex items-center gap-3 shrink-0 md:w-48">
                  <DatabaseIcon className={cn(
                    "h-8 w-8",
                    result.database.status === "healthy" && "text-emerald-500",
                    result.database.status === "degraded" && "text-amber-500",
                    result.database.status === "unreachable" && "text-destructive"
                  )} />
                  <div>
                    <h4 className="font-bold text-sm">PostgreSQL</h4>
                    <p className="text-xs text-muted-foreground">IP: {result.database.dnsResolvedIp || "Localhost"}</p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kesimpulan Diagnostik:</span>
                    <Badge variant={result.database.status === "healthy" ? "outline" : "destructive"} className="text-[10px] uppercase font-bold py-0 h-5">
                      {result.database.status}
                    </Badge>
                  </div>
                  
                  {result.database.errorSummary && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-xs text-destructive font-mono overflow-x-auto">
                      ERROR: {result.database.errorSummary}
                    </div>
                  )}

                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {result.database.troubleshooting}
                  </p>
                </div>
              </div>

              {/* MinIO Analysis Row */}
              <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl border bg-muted/20">
                <div className="flex items-center gap-3 shrink-0 md:w-48">
                  <HardDriveIcon className={cn(
                    "h-8 w-8",
                    result.storage.status === "healthy" && "text-emerald-500",
                    result.storage.status === "degraded" && "text-amber-500",
                    result.storage.status === "unreachable" && "text-destructive"
                  )} />
                  <div>
                    <h4 className="font-bold text-sm">MinIO S3</h4>
                    <p className="text-xs text-muted-foreground">IP: {result.storage.dnsResolvedIp || "Localhost"}</p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kesimpulan Diagnostik:</span>
                    <Badge variant={result.storage.status === "healthy" ? "outline" : "destructive"} className="text-[10px] uppercase font-bold py-0 h-5">
                      {result.storage.status}
                    </Badge>
                  </div>

                  {result.storage.errorSummary && (
                    <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/15 text-xs text-destructive font-mono overflow-x-auto">
                      ERROR: {result.storage.errorSummary}
                    </div>
                  )}

                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {result.storage.troubleshooting}
                  </p>
                </div>
              </div>

              {/* Server Environment Info */}
              <div className="pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground font-medium justify-between">
                <div>Waktu Pengujian: {new Date(result.timestamp).toLocaleString("id-ID")}</div>
                <div className="flex gap-4">
                  <span>Node: <code className="bg-muted px-1 rounded">{result.systemInfo.nodeVersion}</code></span>
                  <span>Platform: <code className="bg-muted px-1 rounded">{result.systemInfo.platform} ({result.systemInfo.arch})</code></span>
                  <span>Env: <code className="bg-muted px-1 rounded">{result.systemInfo.env}</code></span>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
