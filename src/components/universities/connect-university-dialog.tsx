"use client";

import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { normalizeFileUrl } from "@/lib/normalize-file-url";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useUniversities, useConnectUniversities } from "@/hooks/use-universities";
import { useAppStore } from "@/store/use-app-store";
import Image from "next/image";
import { useDebounce } from "@/hooks/use-debounce";

interface ConnectUniversityDialogProps {
  children?: React.ReactNode;
}

export function ConnectUniversityDialog({ children }: ConnectUniversityDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const connectUniversities = useConnectUniversities();

  // Fetch universities NOT in this workspace
  const { data: universities, isLoading } = useUniversities({
    excludeWorkspaceId: currentWorkspaceId || undefined,
  });

  const filteredUniversities = useMemo(() => {
    if (!universities) return [];
    return universities.filter((u) =>
      u.name.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [universities, debouncedSearch]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredUniversities.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUniversities.map((u) => u.id));
    }
  };

  async function handleConnect() {
    if (!currentWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan");
      return;
    }

    if (selectedIds.length === 0) {
      toast.error("Pilih setidaknya satu universitas");
      return;
    }

    try {
      await connectUniversities.mutateAsync({
        workspaceId: currentWorkspaceId,
        universityIds: selectedIds,
      });
      setOpen(false);
      setSelectedIds([]);
      setSearch("");
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Hubungkan Universitas
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Hubungkan Universitas</DialogTitle>
          <DialogDescription>
            Pilih dari daftar universitas mitra yang sudah ada di database untuk ditambahkan ke workspace saat ini.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2 flex-1 overflow-hidden">
          <Input
            placeholder="Cari universitas berdasarkan nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex-1 overflow-y-auto border rounded-lg max-h-[350px]">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Memuat daftar universitas...
              </div>
            ) : filteredUniversities.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Tidak ada universitas yang tersedia untuk dihubungkan.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-center">
                      <Checkbox
                        checked={
                          filteredUniversities.length > 0 &&
                          selectedIds.length === filteredUniversities.length
                        }
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead className="w-[80px]">Logo</TableHead>
                    <TableHead>Nama Universitas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUniversities.map((univ) => (
                    <TableRow
                      key={univ.id}
                      className="cursor-pointer"
                      onClick={() => toggleSelect(univ.id)}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.includes(univ.id)}
                          onCheckedChange={() => toggleSelect(univ.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted overflow-hidden border p-0.5">
                          {univ.logo ? (
                            <Image
                              src={normalizeFileUrl(univ.logo)}
                              alt={univ.name}
                              fill
                              className="object-contain p-0.5"
                              unoptimized
                            />
                          ) : (
                            <span className="text-[10px] font-bold uppercase">
                              {univ.name.substring(0, 2)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {univ.name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleConnect}
            disabled={connectUniversities.isPending || selectedIds.length === 0}
          >
            {connectUniversities.isPending ? "Menghubungkan..." : `Hubungkan Terpilih (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
