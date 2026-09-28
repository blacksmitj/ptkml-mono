"use client";

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
import { Button } from "@/components/ui/button";
import {
  CircleUserRound as CircleUserRoundIcon,
  LogOut as LogOutIcon,
  LayoutGrid,
  Settings2 as Settings2Icon,
  ChevronDown,
} from "lucide-react";

import Link from "next/link";
import { useAppStore } from "@/store/use-app-store";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
    universityName?: string;
    verificationStatus?: string;
    hasAddress?: boolean;
  };
}) {
  const queryClient = useQueryClient();
  const currentRole = useAppStore((state) => state.currentRole);
  const isSuperAdmin = currentRole === "SUPER_ADMIN";
  const setWorkspaceId = useAppStore((state) => state.setWorkspaceId);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUniversityId = useAppStore((state) => state.setUniversityId);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-9 max-w-100 items-center gap-2 rounded-full px-2 py-1.5 hover:bg-accent/50 focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="relative shrink-0">
            <Avatar className="h-7.5 w-7.5 rounded-full border border-border bg-muted flex items-center justify-center text-xs">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-full font-bold">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {user.hasAddress === false && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-background" />
              </span>
            )}
          </div>
          <div className="hidden flex-col items-start text-left text-xs leading-none md:flex gap-0.5 min-w-0 overflow-hidden flex-1">
            <span className="font-semibold truncate w-full">{user.name}</span>
            {user.verificationStatus === "APPROVED" ? (
              <span className="text-[9px] text-emerald-500 font-medium truncate w-full">
                Terverifikasi
              </span>
            ) : user.verificationStatus === "PENDING" ? (
              <span className="text-[9px] text-amber-500 font-medium animate-pulse truncate w-full">
                Pending
              </span>
            ) : null}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-xl"
        align="end"
        sideOffset={6}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex flex-col gap-2 px-2.5 py-2 text-left text-sm">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-full font-bold">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{user.name}</span>
                </div>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </div>
            {user.universityName && (
              <div className="mt-1 bg-secondary/40 text-secondary-foreground rounded-lg px-2.5 py-1.5 flex flex-col gap-0.5 border border-border/50">
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider leading-none">
                  Terafiliasi Dengan
                </span>
                <span className="text-xs font-bold leading-tight text-foreground truncate">
                  {user.universityName}
                </span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/profile"
              className="flex w-full items-center justify-between cursor-pointer"
            >
              <div className="flex items-center">
                <CircleUserRoundIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Akun Saya</span>
              </div>
              {user.hasAddress === false && (
                <span className="relative flex h-2 w-2 shrink-0 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              href="/workspaces"
              className="flex w-full items-center cursor-pointer"
            >
              <LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Ganti Workspace</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex w-full items-center cursor-pointer"
            >
              <Settings2Icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Pengaturan</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive focus:bg-destructive/5 cursor-pointer"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
