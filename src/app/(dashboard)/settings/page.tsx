"use client"

import * as React from "react"
import { 
  Settings2Icon, 
  BellIcon, 
  PaletteIcon, 
  LockIcon, 
  UnlockIcon, 
  PowerIcon, 
  AlertTriangleIcon,
  Trash2Icon,
  ShieldAlertIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAppStore } from "@/store/use-app-store"
import { useMe } from "@/hooks/use-me"
import { useWorkspace, useUpdateWorkspace } from "@/hooks/use-workspaces"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/components/providers/confirm-provider"
import { ResetWorkspaceDataDialog } from "@/components/workspaces/reset-workspace-data-dialog"

export default function SettingsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId)
  const { data: user } = useMe()
  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN"

  const confirm = useConfirm()

  const { data: workspace, isLoading: isLoadingWorkspace } = useWorkspace(currentWorkspaceId || "")
  const { mutate: updateWorkspace, isPending: isUpdatingWorkspace } = useUpdateWorkspace()

  const [isResetDialogOpen, setIsResetDialogOpen] = React.useState(false)

  const handleToggleFreeze = (checked: boolean) => {
    if (!currentWorkspaceId) return
    updateWorkspace(
      { id: currentWorkspaceId, isInputFrozen: checked },
      {
        onSuccess: () => {
          toast.success(checked ? "Workspace berhasil dibekukan" : "Workspace berhasil dicairkan", {
            description: checked
              ? "Pendamping dan Admin (kecuali Super Admin) tidak dapat mengubah data lagi."
              : "Semua pengguna dapat kembali mengisi dan mengubah data.",
          })
        },
        onError: () => {
          toast.error("Gagal mengubah status pembekuan")
        },
      }
    )
  }

  const handleToggleActive = async (checked: boolean) => {
    if (!currentWorkspaceId || !workspace) return
    const message = checked
      ? "Apakah Anda yakin ingin mengaktifkan kembali workspace ini?"
      : "Apakah Anda yakin ingin menonaktifkan workspace ini? Pendamping dan Admin tidak akan dapat masuk ke dalamnya, dan Super Admin hanya akan memiliki akses Read-Only."
    
    const isConfirmed = await confirm({
      title: checked ? "Aktifkan Workspace?" : "Nonaktifkan Workspace?",
      description: message,
      confirmText: checked ? "Ya, Aktifkan" : "Ya, Nonaktifkan",
      cancelText: "Batal",
      variant: checked ? "default" : "destructive",
    })

    if (!isConfirmed) return

    updateWorkspace(
      { id: currentWorkspaceId, isActive: checked },
      {
        onSuccess: () => {
          toast.success(checked ? "Workspace berhasil diaktifkan" : "Workspace berhasil dinonaktifkan")
        },
        onError: () => {
          toast.error("Gagal mengubah status aktif")
        },
      }
    )
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
      <div className="flex items-center justify-between space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Settings2Icon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Pengaturan</h2>
            <p className="text-muted-foreground">
              Kelola preferensi dan konfigurasi sistem Anda.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Workspace Settings (Only visible to SUPER_ADMIN) */}
        {isSuperAdmin && (
          <>
            <Card className="border-primary/10 shadow-sm md:col-span-2 bg-amber-50/20 dark:bg-amber-950/5">
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <AlertTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                  <CardTitle className="text-lg font-bold text-amber-900 dark:text-amber-100">
                    Pengaturan Workspace Aktif (Super Admin)
                  </CardTitle>
                </div>
                <CardDescription>
                  Kelola status operasional untuk workspace yang sedang aktif: <strong>{workspace?.name || "Memuat..."}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {isLoadingWorkspace ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    {/* Toggle Input Freeze */}
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-2xs">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          {workspace?.isInputFrozen ? (
                            <LockIcon className="h-4 w-4 text-rose-500" />
                          ) : (
                            <UnlockIcon className="h-4 w-4 text-emerald-500" />
                          )}
                          <p className="text-sm font-semibold">Bekukan Pengisian Data (Freeze Workspace)</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Jika diaktifkan, seluruh aktivitas input dan modifikasi data (create, update, delete) oleh Pendamping dan Admin Universitas di workspace ini akan dinonaktifkan. Anda (Super Admin) masih dapat mengubah data.
                        </p>
                      </div>
                      <Switch
                        checked={workspace?.isInputFrozen || false}
                        onCheckedChange={handleToggleFreeze}
                        disabled={isUpdatingWorkspace}
                      />
                    </div>

                    {/* Toggle Active Status */}
                    <div className="flex items-center justify-between p-4 rounded-xl border bg-card shadow-2xs">
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2">
                          <PowerIcon className={`h-4 w-4 ${workspace?.isActive ? "text-emerald-500" : "text-rose-500"}`} />
                          <p className="text-sm font-semibold">Status Keaktifan Workspace</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Jika dinonaktifkan, workspace diarsipkan. Pendamping dan Admin tidak akan dapat masuk ke workspace ini dari selektor. Anda (Super Admin) dapat membuka workspace ini, namun secara otomatis berada dalam mode Read-Only.
                        </p>
                      </div>
                      <Switch
                        checked={workspace?.isActive ?? true}
                        onCheckedChange={handleToggleActive}
                        disabled={isUpdatingWorkspace}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Danger Zone: Reset Workspace Operational Data */}
            <Card className="border-rose-300/70 dark:border-rose-900/50 shadow-sm md:col-span-2 bg-rose-50/25 dark:bg-rose-950/10 overflow-hidden">
              <CardHeader className="border-b border-rose-200/50 dark:border-rose-900/30 bg-rose-500/5">
                <div className="flex items-center gap-2">
                  <ShieldAlertIcon className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  <CardTitle className="text-lg font-bold text-rose-950 dark:text-rose-100">
                    Zona Bahaya (Danger Zone) — Reset Data Operasional
                  </CardTitle>
                </div>
                <CardDescription className="text-rose-900/70 dark:text-rose-300/70">
                  Tindakan khusus Super Admin untuk mengosongkan seluruh data operasional peserta uji coba pada workspace ini.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 bg-card shadow-2xs">
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <Trash2Icon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <p className="text-sm font-bold text-foreground">
                        Kosongkan Seluruh Data Peserta, Logbook & Laporan
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Menghapus permanen semua peserta (Applicant), profil NIK peserta, logbook mentoring, laporan bulanan, tenaga kerja, serta berkas/file fisik MinIO di workspace <strong>{workspace?.name}</strong>. Struktur workspace dan akun pendamping/admin tetap utuh.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setIsResetDialogOpen(true)}
                    disabled={isLoadingWorkspace || !workspace}
                    className="shrink-0 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-xs gap-2"
                  >
                    <Trash2Icon className="h-4 w-4" />
                    <span>Reset Data Workspace</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Reset Workspace Confirmation Dialog */}
            <ResetWorkspaceDataDialog
              open={isResetDialogOpen}
              onOpenChange={setIsResetDialogOpen}
              workspace={workspace || null}
            />
          </>
        )}

        <Card className="border-primary/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PaletteIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Tampilan</CardTitle>
            </div>
            <CardDescription>Sesuaikan tampilan antarmuka aplikasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Mode Gelap</p>
                <p className="text-xs text-muted-foreground">Gunakan tema gelap untuk mengurangi kelelahan mata.</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Aktifkan</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Warna Aksen</p>
                <p className="text-xs text-muted-foreground">Pilih warna utama untuk antarmuka.</p>
              </div>
              <div className="flex gap-2">
                {["#3b82f6", "#10b981", "#f59e0b", "#ef4444"].map((color) => (
                  <div 
                    key={color} 
                    className="h-6 w-6 rounded-full cursor-pointer border-2 border-background ring-1 ring-muted" 
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/5 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BellIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-lg">Notifikasi</CardTitle>
            </div>
            <CardDescription>Atur bagaimana Anda menerima pemberitahuan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Email Notifikasi</p>
                <p className="text-xs text-muted-foreground">Terima update harian via email.</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-lg">Konfigurasi</Button>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Push Notifikasi</p>
                <p className="text-xs text-muted-foreground">Dapatkan pemberitahuan langsung di browser.</p>
              </div>
              <Badge variant="secondary" className="rounded-lg px-3">Nonaktif</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


