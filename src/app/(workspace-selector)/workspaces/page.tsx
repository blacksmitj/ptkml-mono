"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ArrowRight, LogOut, User as UserIcon, Clock, XCircle, RotateCcw, ShieldCheck, Share2, School, RefreshCw } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useWorkspaces, useDeleteWorkspace } from "@/hooks/use-workspaces";
import { useDeleteMember } from "@/hooks/use-members";
import { useMe } from "@/hooks/use-me";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkspaceDialog } from "@/components/workspaces/workspace-dialog";
import { AffiliationModal } from "@/components/affiliation-modal";
import { toast } from "sonner";

import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "@/components/providers/confirm-provider";

function WorkspaceSelectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const joinWorkspaceId = searchParams.get("join");
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUniversityId = useAppStore((state) => state.setUniversityId);
  const { data: workspaces, isLoading, isError } = useWorkspaces();
  const { data: user, isLoading: isLoadingMe, isError: isMeError } = useMe();
  const [selectedWorkspaceIdForModal, setSelectedWorkspaceIdForModal] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [handledJoinId, setHandledJoinId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["workspaces"] }),
      ]);
      toast.success("Data berhasil diperbarui");
    } catch {
      toast.error("Gagal memperbarui data");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isLoadingMe && (!user || isMeError)) {
      if (joinWorkspaceId) {
        router.push(`/login?redirect=${encodeURIComponent(`/workspaces?join=${joinWorkspaceId}`)}`);
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoadingMe, isMeError, router, joinWorkspaceId]);

  useEffect(() => {
    if (user && joinWorkspaceId && workspaces && handledJoinId !== joinWorkspaceId) {
      const foundWs = workspaces.find((w) => w.id === joinWorkspaceId);
      if (foundWs) {
        setHandledJoinId(joinWorkspaceId);
        const existingMembership = user.workspaceMemberships?.find((m) => m.workspaceId === joinWorkspaceId);
        const isBypass = user.globalRole === "SUPER_ADMIN" || user.globalRole === "WORKSPACE_SUPERVISOR";

        if (isBypass || existingMembership?.verificationStatus === "APPROVED") {
          toast.info(`Anda sudah terdaftar di workspace "${foundWs.name}".`);
          router.replace("/workspaces");
        } else if (existingMembership?.verificationStatus === "PENDING") {
          toast.info(`Pendaftaran Anda di workspace "${foundWs.name}" sedang menunggu persetujuan Admin.`);
          router.replace("/workspaces");
        } else {
          // Belum daftar atau REJECTED, buka modal pemilihan afiliasi
          setSelectedWorkspaceIdForModal(joinWorkspaceId);
        }
      }
    }
  }, [user, joinWorkspaceId, workspaces, handledJoinId, router]);

  const handleShareLink = (id: string, name: string) => {
    const shareUrl = `${window.location.origin}/workspaces?join=${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success(`Link workspace "${name}" berhasil disalin!`);
      }).catch(() => {
        toast.error("Gagal menyalin link");
      });
    } else {
      toast.error("Fitur copy tidak didukung di browser ini.");
    }
  };

  const handleSelect = (id: string) => {
    setWorkspaceId(id);
    setUniversityId(null); // Reset university selection in context memory when switching workspaces
    router.push("/dashboard");
  };

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      queryClient.clear();
      setWorkspaceId(null);
      setUserId(null);
      setUniversityId(null); // Explicitly clear universityId to prevent stickiness leak
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/";
    }
  };

  const { mutate: deleteWorkspace } = useDeleteWorkspace();
  const { mutate: deleteMember, isPending: isDeletingMember } = useDeleteMember();

  const handleReapply = async (membershipId: string) => {
    const isConfirmed = await confirm({
      title: "Ajukan Ulang Pendaftaran?",
      description: "Apakah Anda yakin ingin mengajukan ulang pendaftaran untuk workspace ini? Pilihan universitas sebelumnya akan di-reset.",
      confirmText: "Ya, Ajukan Ulang",
      cancelText: "Batal",
      variant: "destructive"
    });

    if (isConfirmed) {
      deleteMember(membershipId, {
        onSuccess: () => {
          toast.success("Silakan pilih ulang universitas Anda untuk mengajukan pendaftaran baru.");
        },
        onError: () => {
          toast.error("Gagal melakukan pengajuan ulang.");
        }
      });
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: "Hapus Workspace?",
      description: `Apakah Anda yakin ingin menghapus workspace "${name}"? Semua data di dalamnya akan ikut terhapus.`,
      confirmText: "Ya, Hapus",
      cancelText: "Batal",
      variant: "destructive"
    });

    if (isConfirmed) {
      deleteWorkspace(id, {
        onSuccess: () => {
          toast.success("Workspace berhasil dihapus");
        },
        onError: () => {
          toast.error("Gagal menghapus workspace");
        }
      });
    }
  };

  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";
  const isWorkspaceSupervisor = user?.globalRole === "WORKSPACE_SUPERVISOR";
  const isGlobalBypass = isSuperAdmin || isWorkspaceSupervisor;

  // Filter workspaces: Global roles see all, regular users see only workspaces where they have membership
  const displayedWorkspaces = workspaces?.filter((ws) => {
    if (isGlobalBypass) return true;
    return user?.workspaceMemberships?.some((m) => m.workspaceId === ws.id);
  }) ?? [];

  if (!isMounted || isLoadingMe) {
    return <div className="flex h-screen items-center justify-center">Memuat profil...</div>;
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold">Error loading workspaces</h2>
          <p className="text-muted-foreground">Silakan coba lagi nanti.</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-12">
      <div className="mx-auto max-w-5xl">

        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pilih Workspace</h1>
            <p className="text-muted-foreground mt-2">
              Pilih periode program TKML yang ingin Anda kelola.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="gap-2"
              title="Refresh status verifikasi dan data workspace"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>{isRefreshing ? "Memeriksa..." : "Refresh Status"}</span>
            </Button>
            {isSuperAdmin && (
              <WorkspaceDialog />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="flex flex-col">
                <CardHeader className="gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="flex-1">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
                <CardFooter className="flex justify-between border-t p-4">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : displayedWorkspaces.length === 0 ? (
          <Card className="border-dashed py-12 px-6 text-center">
            <CardContent className="flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <Clock className="h-8 w-8 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold tracking-tight">Belum Ada Workspace</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Akun Anda belum terdaftar sebagai anggota di workspace manapun. Silakan hubungi Koordinator atau Admin untuk mendapatkan tautan undangan (link bergabung).
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {displayedWorkspaces.map((ws) => {
              const userMembership = user?.workspaceMemberships?.find(
                (m) => m.workspaceId === ws.id
              );
              const isApproved = isGlobalBypass || userMembership?.verificationStatus === "APPROVED";
              const isPending = !isGlobalBypass && userMembership?.verificationStatus === "PENDING";
              const isRejected = !isGlobalBypass && userMembership?.verificationStatus === "REJECTED";

              // Determine role display
              let roleDisplay = "Tidak Terdaftar";
              let roleBadgeColor = "text-muted-foreground bg-muted border-muted-foreground/10";
              if (user?.globalRole === "SUPER_ADMIN") {
                roleDisplay = "Super Admin";
                roleBadgeColor = "text-red-600 bg-red-500/10 border-red-500/20";
              } else if (user?.globalRole === "WORKSPACE_SUPERVISOR") {
                roleDisplay = "Pengawas Global";
                roleBadgeColor = "text-amber-600 bg-amber-500/10 border-amber-500/20";
              } else if (userMembership) {
                if (userMembership.role === "UNIVERSITY_ADMIN") {
                  roleDisplay = "Admin Universitas";
                  roleBadgeColor = "text-blue-600 bg-blue-500/10 border-blue-500/20";
                } else if (userMembership.role === "UNIVERSITY_SUPERVISOR") {
                  roleDisplay = "Pengawas Universitas";
                  roleBadgeColor = "text-orange-600 bg-orange-500/10 border-orange-500/20";
                } else if (userMembership.role === "MENTOR") {
                  roleDisplay = "Pendamping";
                  roleBadgeColor = "text-green-600 bg-green-500/10 border-green-500/20";
                }
              }

              return (
                <Card key={ws.id} className="flex flex-col hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={ws.isActive ? "default" : "secondary"}>
                          {ws.isActive ? "Aktif" : "Non-Aktif"}
                        </Badge>
                        {isPending && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 flex items-center">
                            <Clock className="w-3 h-3 animate-pulse" />
                            Pending
                          </Badge>
                        )}
                        {isRejected && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1 flex items-center">
                            <XCircle className="w-3 h-3" />
                            Ditolak
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{ws.year}</span>
                    </div>
                    <CardTitle className="mt-2 text-xl">{ws.name}</CardTitle>
                    <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                      <span>Kode: {ws.code}</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide uppercase ${roleBadgeColor}`}>
                        {roleDisplay}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Kelola data peserta, pendamping, dan laporan untuk periode {ws.year}.
                    </div>
                    {isPending && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-700 font-medium flex flex-col gap-2.5 animate-in fade-in duration-300">
                        <div className="flex gap-2 items-start">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>
                            Keanggotaan Anda sedang ditinjau oleh Admin. Silakan hubungi koordinator Anda untuk mempercepat verifikasi.
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefreshData}
                            disabled={isRefreshing}
                            className="h-7 px-2.5 text-xs text-amber-800 hover:text-amber-900 hover:bg-amber-500/20 gap-1.5"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                            <span>{isRefreshing ? "Memeriksa..." : "Cek Status Verifikasi"}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                    {isRejected && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive font-medium flex gap-2 items-start animate-in fade-in duration-300">
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Pendaftaran Anda ditolak. Silakan klik tombol "Ajukan Ulang" di bawah untuk memilih kembali afiliasi universitas Anda.
                        </span>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t p-4">
                    <div className="flex gap-2 items-center">
                      {isGlobalBypass && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => handleShareLink(ws.id, ws.name)}
                          title="Bagikan Link Workspace"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      {isSuperAdmin && (
                        <>
                          <WorkspaceDialog initialData={ws} />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(ws.id, ws.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {isRejected && userMembership && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-destructive/30 text-destructive hover:bg-destructive/10 gap-1.5"
                          onClick={() => handleReapply(userMembership.id)}
                          disabled={isDeletingMember}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Ajukan Ulang
                        </Button>
                      )}
                    </div>
                    {isPending ? (
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedWorkspaceIdForModal(ws.id)}
                        className="gap-1.5"
                      >
                        <School className="h-4 w-4" />
                        Ganti Universitas
                      </Button>
                    ) : isGlobalBypass || userMembership?.universityId ? (
                      <Button 
                        onClick={() => handleSelect(ws.id)}
                        disabled={isRejected || (!ws.isActive && !isGlobalBypass)}
                      >
                        Buka
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => setSelectedWorkspaceIdForModal(ws.id)}
                        disabled={isRejected || (!ws.isActive && !isGlobalBypass)}
                      >
                        Pilih Universitas
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AffiliationModal 
        open={selectedWorkspaceIdForModal !== null} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedWorkspaceIdForModal(null);
            if (joinWorkspaceId) {
              router.replace("/workspaces");
            }
          }
        }} 
        workspaceId={selectedWorkspaceIdForModal}
      />
    </div>
  );
}

export default function WorkspaceSelectorPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Memuat...</div>}>
      <WorkspaceSelectorContent />
    </Suspense>
  );
}
