"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { VerificationStatus } from "@/types";
import * as React from "react";
import { useLogbook, useUpdateLogbook, useVerifyLogbook } from "@/hooks/use-logbooks";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";
import { MediaPreview } from "@/components/media-preview";
import { cn } from "@/lib/utils";
import { LogbookVerificationCard } from "@/components/logbooks/logbook-verification-card";
import { LogbookDetailCard } from "@/components/logbooks/logbook-detail-card";
import { LogbookParticipantsCard } from "@/components/logbooks/logbook-participants-card";
import { getPendingVerificationRefetchInterval } from "@/lib/query-polling";

export default function LogbookDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const currentRole = useAppStore((state) => state.currentRole);
  const currentUserId = useAppStore((state) => state.currentUserId);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { mutate: updateLogbook } = useUpdateLogbook();
  const { mutate: verifyLogbook, isPending: isVerifying } = useVerifyLogbook();
  
  const [previewFileObj, setPreviewFileObj] = React.useState<any | null>(null);
  const [previewTitle, setPreviewTitle] = React.useState<string>("");

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

  const { data: logbook, isLoading, isError } = useLogbook(id, {
    refetchInterval: (query: any) => getPendingVerificationRefetchInterval(query.state.data),
  });
  
  const [rebuttalText, setRebuttalText] = React.useState("");

  React.useEffect(() => {
    if (logbook?.rebuttalNote) {
      setRebuttalText(logbook.rebuttalNote);
    }
  }, [logbook]);

  const handleVerify = (status: VerificationStatus, note?: string) => {
    if (!currentWorkspaceId) return;

    verifyLogbook({
      id,
      verificationStatus: status,
      verificationNote: note,
      verifierUserId: currentUserId,
    }, {
      onSuccess: () => {
        toast.success(`Logbook berhasil di-${status === VerificationStatus.APPROVED ? "setujui" : "tolak"}`);
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

    updateLogbook({
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
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !logbook) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h1 className="text-2xl font-bold text-destructive">Logbook tidak ditemukan</h1>
        <p className="text-muted-foreground">ID: {id}</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  const mentorProfile = (logbook as any).createdBy?.user?.profile;
  const participants = (logbook as any).applicants?.map((la: any) => ({
    id: la.applicant.id,
    idTkm: la.applicant.idTkm,
    profile: la.applicant.profile,
  })) || [];

  const verifierProfile = (logbook as any).verifiedBy?.user?.profile;

  return (
    <div 
      className={cn(
        "flex w-full gap-6 transition-all duration-300", 
        previewFileObj ? "flex-row lg:h-[calc(100vh-var(--header-height)-3rem)] overflow-hidden items-stretch" : "flex-col items-start"
      )}
    >
      <div 
        className={cn(
          "flex flex-col gap-6 flex-1 min-w-0 w-full",
          previewFileObj && "lg:overflow-y-auto lg:h-full lg:pr-2"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Detail Logbook Harian</h1>
        </div>
        {currentRole === "MENTOR" && (logbook.verificationStatus === VerificationStatus.PENDING || logbook.verificationStatus === VerificationStatus.REJECTED) && (
          <Button onClick={() => router.push(`/logbooks/${id}/edit`)} className="rounded-full">
            Edit Logbook
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
        {/* Left Column: Stakeholder Timeline & Verification Actions */}
        <div className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-4 h-fit space-y-4">
          <LogbookVerificationCard
            logbook={logbook}
            currentRole={currentRole}
            currentUserId={currentUserId}
            currentWorkspaceId={currentWorkspaceId}
            isVerifying={isVerifying}
            onVerify={handleVerify}
          />
        </div>

        {/* Right Column: Logbook Activity Details & Participants */}
        <div className="lg:col-span-8 xl:col-span-8 space-y-6 min-w-0">
          <LogbookDetailCard
            logbook={logbook}
            onPreviewFile={(file, title) => {
              setPreviewFileObj(file);
              setPreviewTitle(title);
            }}
          />
          <LogbookParticipantsCard participants={participants} />
        </div>
      </div>
    </div>

      {previewFileObj && (
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
              file={previewFileObj}
              title={previewTitle}
              onClose={() => setPreviewFileObj(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
