"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { Button } from "@/components/ui/button";
import { WorkspaceRole } from "@/types";

type RoleType = WorkspaceRole | "SUPER_ADMIN" | "WORKSPACE_SUPERVISOR";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const currentRole = useAppStore((state) => state.currentRole);
  const hasHydrated = useAppStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground text-sm">Memeriksa hak akses...</div>
      </div>
    );
  }

  const isAllowed = allowedRoles.includes(currentRole as RoleType);

  if (!isAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Akses Ditolak (403 Forbidden)</h2>
        <p className="mt-2 text-muted-foreground max-w-md">
          Anda tidak memiliki izin untuk mengakses halaman ini. Peran Anda saat ini adalah{" "}
          <span className="font-semibold text-foreground">
            {currentRole === "UNIVERSITY_ADMIN"
              ? "Admin Universitas"
              : currentRole === "UNIVERSITY_SUPERVISOR"
              ? "Pengawas Universitas"
              : currentRole === "MENTOR"
              ? "Pendamping"
              : currentRole.replace("_", " ")}
          </span>.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button asChild variant="default">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
