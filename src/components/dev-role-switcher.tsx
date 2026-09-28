"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  GraduationCap,
  UserCheck,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AppDevRole, MOCK_USERS_BY_ROLE } from "@/mocks/mock-data";

interface RoleOption {
  role: AppDevRole;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  badgeClass: string;
  dotClass: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "SUPER_ADMIN",
    label: "Super Admin",
    sublabel: "Akses penuh nasional",
    icon: ShieldAlert,
    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
    dotClass: "bg-red-500",
  },
  {
    role: "WORKSPACE_SUPERVISOR",
    label: "Pengawas Global",
    sublabel: "Supervisor kementerian",
    icon: ShieldCheck,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  {
    role: "UNIVERSITY_ADMIN",
    label: "Admin Univ (ITB)",
    sublabel: "Kelola pendamping & verifikasi",
    icon: Building2,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  {
    role: "UNIVERSITY_SUPERVISOR",
    label: "Pengawas Univ (ITB)",
    sublabel: "Supervisor kampus",
    icon: GraduationCap,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  {
    role: "MENTOR",
    label: "Pendamping Lapangan",
    sublabel: "Input logbook & output",
    icon: UserCheck,
    badgeClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
    dotClass: "bg-indigo-500",
  },
];

export function DevRoleSwitcher() {
  // CRITICAL GUARD: Only render in development and when Mock API is active
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.NEXT_PUBLIC_MOCK_API !== "true"
  ) {
    return null;
  }

  const queryClient = useQueryClient();
  const currentRole = useAppStore((state) => state.currentRole);
  const setRole = useAppStore((state) => state.setRole);
  const setUserId = useAppStore((state) => state.setUserId);
  const setUniversityId = useAppStore((state) => state.setUniversityId);
  const hasHydrated = useAppStore((state) => state.hasHydrated);

  const [activeRole, setActiveRole] = React.useState<AppDevRole>("SUPER_ADMIN");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("tkml_dev_active_role") as AppDevRole;
      if (stored && MOCK_USERS_BY_ROLE[stored]) {
        setActiveRole(stored);
      }
    }
  }, []);

  const handleSwitchRole = (opt: RoleOption) => {
    const selectedUser = MOCK_USERS_BY_ROLE[opt.role];
    if (!selectedUser) return;

    setActiveRole(opt.role);
    localStorage.setItem("tkml_dev_active_role", opt.role);

    // Sync app store
    setRole(opt.role as any);
    setUserId(selectedUser.id);

    if (opt.role === "UNIVERSITY_ADMIN" || opt.role === "UNIVERSITY_SUPERVISOR") {
      setUniversityId("univ-1");
    } else if (opt.role === "SUPER_ADMIN" || opt.role === "WORKSPACE_SUPERVISOR") {
      setUniversityId(null);
    } else {
      setUniversityId("univ-1");
    }

    // Invalidate react query caches to update UI immediately
    queryClient.invalidateQueries();

    toast.success(`Role beralih ke: ${opt.label}`, {
      description: `Akun: ${selectedUser.profile?.name}`,
    });
  };

  const currentOption =
    ROLE_OPTIONS.find((opt) => opt.role === activeRole) || ROLE_OPTIONS[0];
  const Icon = currentOption.icon;

  if (!hasHydrated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 shadow-lg hover:shadow-xl border-border/80 bg-background/95 backdrop-blur-md gap-2 rounded-full font-medium"
          >
            <span className={`size-2.5 rounded-full ${currentOption.dotClass} animate-pulse`} />
            <Icon className="size-4 text-muted-foreground" />
            <span className="text-xs font-semibold">{currentOption.label}</span>
            <Badge variant="outline" className={`text-[10px] px-1 py-0 uppercase ${currentOption.badgeClass}`}>
              Dev Role
            </Badge>
            <ChevronUp className="size-3.5 text-muted-foreground ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="w-64 p-2 shadow-2xl rounded-2xl border-border">
          <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground flex items-center justify-between">
            <span>Pilih Peran Pengguna</span>
            <Badge variant="secondary" className="text-[10px]">Mock 5 Roles</Badge>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {ROLE_OPTIONS.map((opt) => {
            const ItemIcon = opt.icon;
            const isSelected = opt.role === activeRole;
            return (
              <DropdownMenuItem
                key={opt.role}
                onClick={() => handleSwitchRole(opt)}
                className={`flex items-start gap-2.5 p-2 rounded-xl cursor-pointer ${
                  isSelected ? "bg-accent/80 font-medium" : ""
                }`}
              >
                <div className={`p-1.5 rounded-lg border ${opt.badgeClass} mt-0.5 shrink-0`}>
                  <ItemIcon className="size-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                    {isSelected && (
                      <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground truncate">
                    {opt.sublabel}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
