"use client"
import * as React from "react"
import { Check, Search, School, ArrowRight, Loader2, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useUniversities } from "@/hooks/use-universities"
import { useAppStore } from "@/store/use-app-store"
import { useMe } from "@/hooks/use-me"
import { useUpdateMember, useCreateMember } from "@/hooks/use-members"
import { WorkspaceRole, VerificationStatus } from "@/types"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { normalizeFileUrl } from "@/lib/normalize-file-url"


import { useDebounce } from "@/hooks/use-debounce"

interface AffiliationModalProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  isForced?: boolean
  workspaceId?: string | null
}

export function AffiliationModal({ open, onOpenChange, isForced = false, workspaceId }: AffiliationModalProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const storeWorkspaceId = useAppStore((state) => state.currentWorkspaceId)
  const currentWorkspaceId = workspaceId !== undefined ? workspaceId : storeWorkspaceId
  const { data: universities, isLoading: isLoadingUnivs } = useUniversities(
    currentWorkspaceId ? { workspaceId: currentWorkspaceId } : undefined
  )
  const setUniversityId = useAppStore((state) => state.setUniversityId)
  const { data: user } = useMe()
  const updateMember = useUpdateMember()
  const createMember = useCreateMember()

  const activeMembership = React.useMemo(() => {
    if (!user || !currentWorkspaceId) return null;
    return user.workspaceMemberships?.find((m) => m.workspaceId === currentWorkspaceId) || null;
  }, [user, currentWorkspaceId]);

  React.useEffect(() => {
    if (open) {
      setSelectedId(activeMembership?.universityId || null);
      setSearch("");
    }
  }, [open, activeMembership?.universityId]);

  const filteredUniversities = (universities || []).filter((univ) =>
    univ.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const handleSelect = async () => {
    if (!selectedId) return
    if (!user || !currentWorkspaceId) {
      toast.error("Gagal memperbarui: Pengguna atau workspace tidak valid")
      return
    }

    try {
      if (activeMembership) {
        // Update existing membership
        await updateMember.mutateAsync({
          id: activeMembership.id,
          universityId: selectedId,
          verificationStatus: VerificationStatus.PENDING,
        })
      } else {
        // Create new membership in active workspace
        await createMember.mutateAsync({
          workspaceId: currentWorkspaceId,
          userId: user.id,
          universityId: selectedId,
          role: WorkspaceRole.MENTOR,
        })
      }
      
      // Only set in store if this is the active workspace
      if (currentWorkspaceId === storeWorkspaceId) {
        setUniversityId(selectedId)
      }
      toast.success("Pendaftaran berhasil diajukan! Silakan menunggu persetujuan Admin.")
      onOpenChange?.(false)
      
      // Bersihkan parameter join dari URL dan arahkan ke workspaces
      if (window.location.pathname === "/workspaces") {
        router.replace("/workspaces")
      } else {
        setTimeout(() => {
          router.push("/workspaces")
        }, 1500)
      }
    } catch (err) {
      console.error("Gagal menyimpan afiliasi ke database:", err)
      toast.error("Gagal menyimpan afiliasi ke database")
    }
  }

  return (
    <Dialog 
        open={open} 
        onOpenChange={isForced ? (o) => { if(!o && selectedId) onOpenChange?.(o) } : onOpenChange}
    >
      <DialogContent className="sm:max-w-[425px] p-6 gap-4">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg text-primary">
              <School className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              Pilih Afiliasi Universitas
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Pilih universitas tempat Anda bernaung untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari universitas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        <ScrollArea className="h-[220px] pr-3 -mr-1">
          <div className="space-y-1.5 py-1">
            {filteredUniversities.length > 0 ? (
              filteredUniversities.map((univ) => (
                <button
                  key={univ.id}
                  onClick={() => setSelectedId(univ.id)}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 p-2.5 rounded-md text-left transition-all text-xs",
                    selectedId === univ.id 
                      ? "bg-primary text-primary-foreground font-medium" 
                      : "hover:bg-accent hover:text-accent-foreground border border-border/50"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn(
                      "relative h-7 w-7 rounded flex items-center justify-center font-bold text-xs shrink-0 border overflow-hidden bg-background p-0.5",
                      selectedId === univ.id 
                        ? "border-white/20 text-primary" 
                        : "bg-muted text-muted-foreground border-border"
                    )}>
                      {univ.logo ? (
                        <Image
                          src={normalizeFileUrl(univ.logo)}
                          alt={univ.name}
                          fill
                          className="object-contain p-0.5"
                          unoptimized
                        />
                      ) : (
                        univ.name.charAt(0)
                      )}
                    </div>
                    <span className="truncate">{univ.name}</span>
                  </div>
                  {selectedId === univ.id && (
                    <Check className="h-4 w-4 shrink-0" />
                  )}
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Search className="h-6 w-6 opacity-30 mb-1" />
                <p className="text-xs">Universitas tidak ditemukan</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-2 border-t">
          {isForced && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                router.push("/workspaces")
              }}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Kembali
            </Button>
          )}
          <Button 
            size="sm"
            className="flex-1" 
            disabled={!selectedId || updateMember.isPending || createMember.isPending}
            onClick={handleSelect}
          >
            {updateMember.isPending || createMember.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              "Konfirmasi"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
