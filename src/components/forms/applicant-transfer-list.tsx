"use client"

import * as React from "react"
import { Search, X, Check, ArrowRight, UserPlus, Users, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"

interface Applicant {
  id: string
  name: string
  idTkm?: string
}

interface ApplicantTransferListProps {
  available: Applicant[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function ApplicantTransferList({ available, selected = [], onChange }: ApplicantTransferListProps) {
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 300)
  
  const safeSelected = Array.isArray(selected) ? selected : []
  const selectedObjects = available.filter(a => safeSelected.includes(a.id))
  // Filter available items: not selected AND matches search
  const remainingObjects = available.filter(a => 
    !safeSelected.includes(a.id) && 
    (a.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || (a.idTkm && a.idTkm.toLowerCase().includes(debouncedSearch.toLowerCase())))
  )

  const handleSelect = (id: string) => {
    onChange([...safeSelected, id])
  }

  const handleRemove = (id: string) => {
    onChange(safeSelected.filter(s => s !== id))
  }

  const handleSelectAll = () => {
    const allIds = available.map(a => a.id)
    onChange(allIds)
  }

  const handleClearAll = () => {
    onChange([])
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-[500px]">
        {/* Left Column: Available */}
        <div className="flex flex-col h-[380px] md:h-full min-h-0 border rounded-lg overflow-hidden bg-card shadow-xs border-border">
          <div className="p-4 border-b bg-muted/40 space-y-3 h-[110px] flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Daftar Peserta</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs hover:bg-accent"
                onClick={handleSelectAll}
                disabled={remainingObjects.length === 0}
              >
                Pilih Semua
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama peserta..." 
                className="pl-9 h-10 bg-background" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <ScrollArea className="flex-1 h-full bg-background/50">
            <div className="p-3 space-y-1">
              {remainingObjects.map(app => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleSelect(app.id)}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center justify-between group transition-colors border border-transparent"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{app.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">ID: {app.idTkm || app.id.split('-')[0]}</span>
                  </div>
                  <div className="h-6 w-6 rounded-md bg-muted text-muted-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </button>
              ))}
              {remainingObjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted">
                    <Search className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Tidak ada peserta</p>
                    <p className="text-xs text-muted-foreground">Coba cari dengan nama lain atau semua sudah terpilih.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t bg-muted/20">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Klik nama peserta untuk memindahkan ke kolom kanan
            </p>
          </div>
        </div>

        {/* Right Column: Selected */}
        <div className="flex flex-col h-[380px] md:h-full min-h-0 border rounded-lg overflow-hidden bg-card shadow-xs border-border">
          <div className="p-4 border-b bg-muted/40 h-[110px] flex flex-col justify-center gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
                  <Check className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">Peserta Terpilih</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleClearAll}
                disabled={selectedObjects.length === 0}
              >
                Hapus Semua
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold px-2 py-0.5">
                {selectedObjects.length}
              </Badge>
              <span className="text-xs text-muted-foreground">Peserta akan ditambahkan ke logbook</span>
            </div>
          </div>
          
          <ScrollArea className="flex-1 h-full bg-background/50">
            <div className="p-3 space-y-2">
              {selectedObjects.map(app => (
                <div
                  key={app.id}
                  className="w-full px-3 py-2 rounded-md bg-accent/40 border border-border/50 flex items-center justify-between group animate-in fade-in duration-200"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{app.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ID: {app.idTkm || app.id.split('-')[0]}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    onClick={() => handleRemove(app.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {selectedObjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
                  <div className="p-3 rounded-full bg-muted">
                    <UserPlus className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Belum ada peserta terpilih</p>
                    <p className="text-xs text-muted-foreground">Pilih minimal satu peserta dari kolom kiri.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-3 border-t bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status: Ready</span>
              <div className="flex -space-x-1.5">
                {selectedObjects.slice(0, 5).map((app, i) => (
                  <div key={app.id} className="h-5 w-5 rounded-full border border-background bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary ring-1 ring-border">
                    {app.name[0]}
                  </div>
                ))}
                {selectedObjects.length > 5 && (
                  <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground ring-1 ring-border">
                    +{selectedObjects.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
