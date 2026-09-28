"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-me";
import { useAppStore } from "@/store/use-app-store";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ShieldCheck,
  Activity,
  Trash2,
  CircleUserRound,
  LogOut,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";

export default function WorkspaceSelectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useMe();
  const currentUserId = useAppStore((state) => state.currentUserId);
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUniversityId = useAppStore((state) => state.setUniversityId);

  React.useEffect(() => {
    if (user?.id && currentUserId !== user.id) {
      setUserId(user.id);
    }
  }, [user?.id, currentUserId, setUserId]);

  const isSuperAdmin = user?.globalRole === "SUPER_ADMIN";

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
      queryClient.clear();
      setWorkspaceId(null);
      setUserId(null);
      setUniversityId(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = "/";
    }
  };

  const displayName = user?.profile?.name || user?.username || "Pengguna";
  const displayEmail = user?.profile?.email || "";
  const avatarUrl = user?.profile?.photo || "";
  const initial = displayName.charAt(0).toUpperCase();

  const navItems = [
    {
      title: "Pilih Workspace",
      href: "/workspaces",
      icon: LayoutGrid,
      show: true,
    },
    {
      title: "Profil Saya",
      href: "/profile",
      icon: CircleUserRound,
      show: true,
    },
    {
      title: "Admin Global",
      href: "/global-admins",
      icon: ShieldCheck,
      show: isSuperAdmin,
    },
    {
      title: "Perawatan File",
      href: "/file-maintenance",
      icon: Trash2,
      show: isSuperAdmin,
    },
    {
      title: "Speed Test",
      href: "/speed-test",
      icon: Activity,
      show: isSuperAdmin,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Top Navbar Bersama (Bertingkat) */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-md shadow-xs">
        {/* Baris 1: Logo, Informasi, Theme Toggle & User Dropdown */}
        <div className="mx-auto max-w-7xl h-16 px-4 md:px-8 flex items-center justify-between border-b border-border/40">
          {/* Sisi Kiri: Branding */}
          <div className="flex items-center gap-4 md:gap-6">
            <Link
              href="/workspaces"
              className="flex items-center gap-3 hover:opacity-85 transition-opacity"
            >
              <img
                src="/logo.png"
                alt="Pendampingan TKML oleh Kemnaker"
                className="h-8 md:h-9 w-auto object-contain dark:brightness-0 dark:invert transition-all duration-200"
              />
            </Link>
          </div>

          {/* Sisi Kanan: Theme Toggle & User Dropdown */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Toggle */}
            <ThemeToggle />

            <div className="h-5 w-px bg-border/80 mx-1"></div>

            {/* Profile Dropdown (Semua Role) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex h-10 max-w-[280px] items-center gap-2 rounded-full px-2 py-1.5 hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring overflow-hidden cursor-pointer"
                >
                  <Avatar className="h-7.5 w-7.5 rounded-full border border-primary/20 bg-primary/10 text-primary text-xs shrink-0">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start text-left text-xs leading-none max-w-[150px] truncate">
                    <span className="font-semibold truncate w-full">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground truncate w-full mt-0.5">
                      {isSuperAdmin ? "Super Admin" : user?.globalRole === "WORKSPACE_SUPERVISOR" ? "Pengawas Global" : "Anggota"}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block shrink-0 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end" sideOffset={8}>
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex flex-col gap-1 px-3 py-2 text-left">
                    <p className="text-sm font-semibold leading-tight text-foreground truncate">
                      {displayName}
                    </p>
                    {displayEmail && (
                      <p className="text-xs text-muted-foreground truncate">
                        {displayEmail}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2.5 cursor-pointer">
                      <CircleUserRound className="h-4 w-4 text-muted-foreground" />
                      <span>Akun Saya</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/workspaces" className="flex items-center gap-2.5 cursor-pointer">
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span>Pilih Workspace</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer flex items-center gap-2.5"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Baris 2: Sub-navbar Navigasi Tab Horizontal di bawah Logo Brand */}
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 no-scrollbar">
            {navItems.filter(item => item.show).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Konten Halaman */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}
