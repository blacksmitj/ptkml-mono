"use client";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { University } from "@/types";
import {
  useUniversities,
  useDeleteUniversity,
  useUpdateUniversity,
  useDisconnectUniversity,
} from "@/hooks/use-universities";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Edit, MoreHorizontal, Plus, Trash, Unlink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UniversityDialog } from "@/components/universities/university-dialog";
import { ConnectUniversityDialog } from "@/components/universities/connect-university-dialog";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/use-app-store";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useConfirm } from "@/components/providers/confirm-provider";
import { RoleGuard } from "@/components/role-guard";

export default function UniversitiesPage() {
  const router = useRouter();
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const { data: universitiesData, isLoading } = useUniversities({
    workspaceId: currentWorkspaceId || undefined,
  });
  const deleteUniversity = useDeleteUniversity();
  const disconnectUniversity = useDisconnectUniversity();
  const updateUniversity = useUpdateUniversity();
  const confirm = useConfirm();

  const columns: ColumnDef<University>[] = [
    {
      accessorKey: "name",
      header: "Nama Universitas",
      meta: { className: "w-[250px] truncate" },
      cell: ({ row }) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted/40 overflow-hidden">
            {row.original.logo ? (
              <Image
                src={normalizeFileUrl(row.original.logo)}
                alt={row.getValue("name")}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="text-xs font-bold uppercase">
                {row.getValue<string>("name").substring(0, 2)}
              </span>
            )}
          </div>
          <span
            className="font-medium truncate"
            title={row.getValue("name")}
          >
            {row.getValue("name")}
          </span>
        </div>
      ),
    },
    {
      id: "applicantsCount",
      header: "Jumlah Peserta",
      meta: { className: "w-[140px]" },
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.original._count?.applicants ?? 0} Peserta
        </span>
      ),
    },
    {
      id: "mentorsCount",
      header: "Pendamping",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.original._count?.mentors ?? 0} Pendamping
        </span>
      ),
    },
    {
      id: "adminsCount",
      header: "Admin",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => (
        <span className="font-medium text-sm">
          {row.original._count?.admins ?? 0} Admin
        </span>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => {
        const university = row.original;
        return (
          <div className="flex items-center gap-2">
            <Switch
              checked={university.isActive}
              onCheckedChange={(checked) => {
                updateUniversity.mutate({
                  id: university.id,
                  isActive: checked,
                });
              }}
            />
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                university.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
              }`}
            >
              {university.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Tanggal Ditambahkan",
      meta: { className: "w-[200px] truncate" },
      cell: ({ row }) => {
        return formatDistanceToNow(new Date(row.getValue("createdAt")), {
          addSuffix: true,
          locale: id,
        });
      },
    },
    {
      id: "actions",
      meta: { className: "w-[120px]" },
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium cursor-pointer"
              onClick={() => router.push(`/universities/${row.original.id}`)}
            >
              Detail
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(row.original.id)}
                >
                  Salin ID
                </DropdownMenuItem>
              <DropdownMenuSeparator />
              <UniversityDialog initialData={row.original}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
              </UniversityDialog>
              {currentWorkspaceId && (
                <DropdownMenuItem
                  className="text-amber-600 focus:text-amber-600 dark:text-amber-400"
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: "Lepas dari Workspace?",
                      description: `Apakah Anda yakin ingin melepas universitas ${row.original.name} dari workspace ini? Universitas ini tidak akan dihapus dari sistem, namun hanya dilepas dari workspace yang sedang aktif.`,
                      confirmText: "Ya, Lepas",
                      cancelText: "Batal",
                      variant: "destructive",
                    });
                    if (isConfirmed) {
                      disconnectUniversity.mutate({
                        workspaceId: currentWorkspaceId,
                        universityId: row.original.id,
                      });
                    }
                  }}
                >
                  <Unlink className="mr-2 h-4 w-4" /> Lepas dari Workspace
                </DropdownMenuItem>
              )}
              {currentRole === "SUPER_ADMIN" && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={async () => {
                    const isConfirmed = await confirm({
                      title: "Hapus Permanen Universitas?",
                      description: `PERINGATAN: Tindakan ini akan menghapus universitas ${row.original.name} secara permanen dari seluruh sistem. Pastikan tidak ada data yang masih terhubung.`,
                      confirmText: "Ya, Hapus Permanen",
                      cancelText: "Batal",
                      variant: "destructive",
                    });
                    if (isConfirmed) {
                      deleteUniversity.mutate(row.original.id);
                    }
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" /> Hapus Permanen
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN", "WORKSPACE_SUPERVISOR"]}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Daftar Universitas
            </h1>
            <p className="text-muted-foreground mt-2">
              Kelola data universitas mitra pendampingan.
            </p>
          </div>
          <div className="flex gap-2">
            <ConnectUniversityDialog />
            <UniversityDialog>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Universitas Baru
              </Button>
            </UniversityDialog>
          </div>
        </div>

        {isLoading && !universitiesData ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={universitiesData || []}
            isLoading={isLoading}
            searchKey="name"
            searchPlaceholder="Cari universitas..."
          />
        )}
      </div>
    </RoleGuard>
  );
}
