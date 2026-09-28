"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { VerificationStatus } from "@/types";
import * as React from "react";
import { useOutputReport, useUpdateOutputReport, useVerifyOutputReport, useOutputReports } from "@/hooks/use-output-reports";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";
import { MediaPreview } from "@/components/media-preview";
import { cn } from "@/lib/utils";
import { VerificationCard } from "@/components/output-reports/verification-card";
import { BusinessPerformanceCard } from "@/components/output-reports/business-performance-card";
import { ReportFilesCard } from "@/components/output-reports/report-files-card";
import { EmployeeBpjsCard } from "@/components/output-reports/employee-bpjs-card";
import { getPendingVerificationRefetchInterval } from "@/lib/query-polling";



export default function OutputReportDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const currentRole = useAppStore((state) => state.currentRole);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { mutate: updateReport } = useUpdateOutputReport();
  const { mutate: verifyReport, isPending: isVerifying } = useVerifyOutputReport();

  // Local state for OCR File Preview Sheet
  const [previewOcrFile, setPreviewOcrFile] = React.useState<any | null>(null);
  const [previewOcrTitle, setPreviewOcrTitle] = React.useState<string>("");

  const [previewWidth, setPreviewWidth] = React.useState(450);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeRef = React.useRef({ startX: 0, startWidth: 450 });

  const startResizing = React.useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: mouseDownEvent.clientX,
      startWidth: previewWidth,
    };
  }, [previewWidth]);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback((mouseMoveEvent: MouseEvent) => {
    if (isResizing) {
      const deltaX = mouseMoveEvent.clientX - resizeRef.current.startX;
      const newWidth = resizeRef.current.startWidth - deltaX;
      if (newWidth > 320 && newWidth < 900) {
        setPreviewWidth(newWidth);
      }
    }
  }, [isResizing]);

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const { data: report, isLoading, isError, refetch } = useOutputReport(id, {
    refetchInterval: (query: any) => getPendingVerificationRefetchInterval(query.state.data),
  });

  const { data: allReportsResponse } = useOutputReports(
    report?.workspaceId || undefined,
    report?.applicantId || undefined
  );

  const previousReports = React.useMemo(() => {
    if (!report || !allReportsResponse) return [];
    const rawList = Array.isArray(allReportsResponse)
      ? allReportsResponse
      : (allReportsResponse?.data && Array.isArray(allReportsResponse.data))
        ? allReportsResponse.data
        : [];
    return rawList
      .filter((r: any) => r.id !== report.id && r.monthReport < report.monthReport)
      .sort((a: any, b: any) => b.monthReport - a.monthReport);
  }, [report, allReportsResponse]);

  // Poll for OCR status updates if any job is pending or processing
  const hasPendingOcr = React.useMemo(() => {
    const mainFilesPending = (report?.files || []).some((file: any) =>
      file.ocrResult && (file.ocrResult.status === "PENDING" || file.ocrResult.status === "PROCESSING")
    );

    const employeeFilesPending = (report?.employees || []).some((emp: any) =>
      (emp.files || []).some((file: any) =>
        file.ocrResult && (file.ocrResult.status === "PENDING" || file.ocrResult.status === "PROCESSING")
      )
    );

    return mainFilesPending || employeeFilesPending;
  }, [report]);

  React.useEffect(() => {
    if (!hasPendingOcr) return;

    const interval = setInterval(() => {
      refetch();
    }, 3000);

    return () => clearInterval(interval);
  }, [hasPendingOcr, refetch]);
  
  const [rebuttalText, setRebuttalText] = React.useState("");

  React.useEffect(() => {
    if (report?.rebuttalNote) {
      setRebuttalText(report.rebuttalNote);
    }
  }, [report]);

  const handleVerify = (status: VerificationStatus, note?: string) => {
    if (!currentWorkspaceId) return;

    verifyReport({
      id,
      verificationStatus: status,
      verificationNote: note,
      verifierUserId: currentUserId,
    }, {
      onSuccess: () => {
        toast.success(`Laporan berhasil di-${status === VerificationStatus.APPROVED ? "setujui" : "tolak"}`);
      },
      onError: (err: any) => {
        toast.error(err.message || "Gagal melakukan verifikasi");
      }
    });
  };

  const handleRebuttal = () => {
    if (!currentWorkspaceId) return;
    if (!rebuttalText.trim()) {
      toast.error("Pesan sanggahan wajib diisi");
      return;
    }

    updateReport({
      id,
      rebuttalNote: rebuttalText,
      workspaceId: currentWorkspaceId,
    }, {
      onSuccess: () => {
        toast.success("Sanggahan dan revisi berhasil diajukan kembali");
      },
      onError: (err: any) => {
        toast.error(err.message || "Gagal mengajukan sanggahan");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Laporan tidak ditemukan</h1>
        <p className="text-muted-foreground">ID: {id}</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const profile = report.applicant?.profile;
  const verifierProfile = (report as any).verifiedBy?.user?.profile;

  return (
    <div 
      className={cn(
        "flex w-full gap-6 transition-all duration-300", 
        previewOcrFile ? "flex-row lg:h-[calc(100vh-var(--header-height)-3rem)] overflow-hidden items-stretch" : "flex-col items-start"
      )}
    >
      <div 
        className={cn(
          "flex flex-col gap-6 flex-1 min-w-0 w-full",
          previewOcrFile && "lg:overflow-y-auto lg:h-full lg:pr-2"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Detail Laporan Output</h1>
        </div>
        {currentRole === "MENTOR" && (
          report.verificationStatus === VerificationStatus.DRAFT ||
          report.verificationStatus === VerificationStatus.PENDING ||
          report.verificationStatus === VerificationStatus.REJECTED
        ) && (
          <Button onClick={() => router.push(`/output-reports/${id}/edit`)} className="rounded-full">
            {report.verificationStatus === VerificationStatus.DRAFT ? "Lengkapi Laporan" : "Edit Laporan"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: Stakeholder Profiles & Verification Actions */}
        <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-4 h-fit space-y-4">
          <VerificationCard
            report={report}
            currentRole={currentRole}
            currentUserId={currentUserId}
            currentWorkspaceId={currentWorkspaceId}
            isVerifying={isVerifying}
            onVerify={handleVerify}
          />
        </div>

        {/* Right Column: Output Business Performance, Files, and Employees */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6 min-w-0">
          <BusinessPerformanceCard report={report} previousReports={previousReports} />

          <ReportFilesCard
            report={report}
            onPreviewFile={(file, title) => {
              setPreviewOcrFile(file);
              setPreviewOcrTitle(title);
            }}
          />

          <EmployeeBpjsCard
            report={report}
            onPreviewFile={(file, title) => {
              setPreviewOcrFile(file);
              setPreviewOcrTitle(title);
            }}
          />
        </div>
      </div>
    </div>

      {previewOcrFile && (
        <div 
          className="w-full lg:h-full lg:min-w-[320px] lg:max-w-[900px] shrink-0 relative flex"
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${previewWidth}px` : '100%' }}
        >
          {isResizing && (
            <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
          )}
          <div 
            className="hidden lg:block absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/40 active:bg-primary transition-colors z-50 -ml-1"
            onMouseDown={startResizing}
          />
          <div className="flex-1 min-w-0 h-full">
            <MediaPreview
              file={previewOcrFile}
              title={previewOcrTitle}
              onClose={() => setPreviewOcrFile(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
