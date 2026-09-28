"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { useGlobalAdmins, useSearchUsers, useUpdateGlobalRole } from "@/hooks/use-global-admins";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, ShieldCheck, UserPlus, UserCog, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeFileUrl } from "@/lib/normalize-file-url";
import { GlobalRole } from "@/types";
import { useDebounce } from "@/hooks/use-debounce";

export default function GlobalAdminsPage() {
  const router = useRouter();
  const { data: currentUser, isLoading: isLoadingMe } = useMe();
  const { data: admins, isLoading: isLoadingAdmins } = useGlobalAdmins();
  const updateRoleMutation = useUpdateGlobalRole();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 400);

  const { data: searchResults, isLoading: isSearching } = useSearchUsers(debouncedQuery);

  // Role promotion selection
  const [selectedUserForElevation, setSelectedUserForElevation] = useState<string | null>(null);
  const [elevationRole, setElevationRole] = useState<GlobalRole>(GlobalRole.WORKSPACE_SUPERVISOR);

  useEffect(() => {
    if (!isLoadingMe && (!currentUser || currentUser.globalRole !== "SUPER_ADMIN")) {
      router.push("/workspaces");
    }
  }, [currentUser, isLoadingMe, router]);

  if (isLoadingMe || (currentUser && currentUser.globalRole !== "SUPER_ADMIN")) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">Memuat halaman...</p>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (userId: string, newRole: GlobalRole) => {
    await updateRoleMutation.mutateAsync({ userId, globalRole: newRole });
  };

  const handleElevateUser = async () => {
    if (!selectedUserForElevation) return;
    
    await updateRoleMutation.mutateAsync({
      userId: selectedUserForElevation,
      globalRole: elevationRole
    }, {
      onSuccess: () => {
        setSearchOpen(false);
        setSelectedUserForElevation(null);
        setSearchQuery("");
      }
    });
  };

  return (
    <main className="mx-auto max-w-7xl w-full px-4 md:px-8 py-8">
      <div className="space-y-6">
        {/* Navigation & Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold tracking-tight">Admin Global</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Kelola hak akses tingkat tinggi aplikasi (Super Admin & Pengawas Global).
              </p>
            </div>
          </div>

          {/* Dialog for elevating users */}
          <Dialog open={searchOpen} onOpenChange={(open) => {
            setSearchOpen(open);
            if (!open) {
              setSearchQuery("");
              setSelectedUserForElevation(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-xs font-semibold rounded-xl">
                <UserPlus className="w-4 h-4" />
                Tambah Peran Global
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Tingkatkan Peran Pengguna</DialogTitle>
                <DialogDescription>
                  Cari user berdasarkan nama, username, atau email untuk diberikan peran Super Admin atau Pengawas Global.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cari Pengguna</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Ketik nama atau email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isSearching && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}

                {!isSearching && searchResults && searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-muted/20">
                    {searchResults.map((u) => {
                      const isSelected = selectedUserForElevation === u.id;
                      return (
                        <div
                          key={u.id}
                          onClick={() => setSelectedUserForElevation(u.id)}
                          className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <Avatar className="h-7 w-7 border">
                              <AvatarImage src={u.profile?.photo ? normalizeFileUrl(u.profile.photo) : undefined} />
                              <AvatarFallback className="text-xs">{u.profile?.name?.charAt(0) || u.username?.charAt(0) || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="overflow-hidden text-left">
                              <p className="text-xs font-semibold truncate leading-tight">{u.profile?.name || u.username}</p>
                              <p className={`text-[10px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {u.profile?.email || u.username}
                              </p>
                            </div>
                          </div>
                          <Badge variant={isSelected ? "outline" : "secondary"} className="text-[10px] shrink-0 border-primary-foreground/20">
                            {u.globalRole}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isSearching && searchQuery.length >= 2 && searchResults && searchResults.length === 0 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Pengguna tidak ditemukan.
                  </p>
                )}

                {selectedUserForElevation && (
                  <div className="space-y-2 pt-2 border-t">
                    <label className="text-sm font-medium">Pilih Peran Baru</label>
                    <Select
                      value={elevationRole}
                      onValueChange={(val) => setElevationRole(val as GlobalRole)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={GlobalRole.SUPER_ADMIN}>Super Admin</SelectItem>
                        <SelectItem value={GlobalRole.WORKSPACE_SUPERVISOR}>Pengawas Global</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSearchOpen(false)}>
                  Batal
                </Button>
                <Button
                  disabled={!selectedUserForElevation || updateRoleMutation.isPending}
                  onClick={handleElevateUser}
                >
                  {updateRoleMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Simpan Peran
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabel Administrator */}
        <Card className="border-border/60 shadow-xs overflow-hidden">
          <CardHeader className="bg-card px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">Pengguna Dengan Hak Istimewa</CardTitle>
            </div>
            <CardDescription className="text-xs">
              Super Admin memiliki otoritas tertinggi di seluruh workspace. Pengawas Global dapat memonitor seluruh dashboard tanpa batas.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingAdmins ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : admins && admins.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[300px] pl-6">Pengguna</TableHead>
                    <TableHead>Email / Username</TableHead>
                    <TableHead>Peran Global</TableHead>
                    <TableHead className="text-right pr-6">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const isSelf = admin.id === currentUser?.id;
                    return (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium pl-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={admin.profile?.photo ? normalizeFileUrl(admin.profile.photo) : undefined} />
                              <AvatarFallback className="text-xs font-bold">
                                {admin.profile?.name?.charAt(0) || admin.username?.charAt(0) || "A"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-semibold leading-none">{admin.profile?.name || admin.username}</p>
                              <p className="text-xs text-muted-foreground mt-1">@{admin.username}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {admin.profile?.email || "-"}
                        </TableCell>
                        <TableCell>
                          {admin.globalRole === GlobalRole.SUPER_ADMIN ? (
                            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border-red-500/20">
                              Super Admin
                            </Badge>
                          ) : admin.globalRole === GlobalRole.WORKSPACE_SUPERVISOR ? (
                            <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border-purple-500/20">
                              Pengawas Global
                            </Badge>
                          ) : (
                            <Badge variant="outline">User</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end">
                            {isSelf ? (
                              <span className="text-xs font-semibold text-muted-foreground italic bg-muted/40 py-1.5 px-3 rounded-md">
                                Peran tidak dapat diubah
                              </span>
                            ) : (
                              <Select
                                defaultValue={admin.globalRole}
                                disabled={updateRoleMutation.isPending}
                                onValueChange={(val) => handleRoleChange(admin.id, val as GlobalRole)}
                              >
                                <SelectTrigger className="w-[180px] h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={GlobalRole.SUPER_ADMIN}>Super Admin</SelectItem>
                                  <SelectItem value={GlobalRole.WORKSPACE_SUPERVISOR}>Pengawas Global</SelectItem>
                                  <SelectItem value={GlobalRole.USER}>Nonaktifkan (User Biasa)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                Tidak ada administrator yang terdaftar.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
