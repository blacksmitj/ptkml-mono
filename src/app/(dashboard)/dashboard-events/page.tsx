"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit, Calendar, Clock, Bell, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore } from "@/store/use-app-store";
import { useMe } from "@/hooks/use-me";
import { RoleGuard } from "@/components/role-guard";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  recurrenceType: "MONTHLY_DAY" | "EXACT_DATE" | "WEEKLY";
  dayOfMonth?: number;
  dayOfWeek?: number;
  exactDate?: string;
  activeDaysBefore: number;
  activeDaysAfter: number;
  actionUrl?: string;
  actionLabel?: string;
  targetRole: string;
  isActive: boolean;
  createdAt: string;
}

export default function DashboardEventsPage() {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const currentRole = useAppStore((state) => state.currentRole);
  const { data: me } = useMe();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdminOrGlobalSpv =
    currentRole === "SUPER_ADMIN" ||
    currentRole === "WORKSPACE_SUPERVISOR" ||
    me?.globalRole === "SUPER_ADMIN" ||
    me?.globalRole === "WORKSPACE_SUPERVISOR";

  const fetchEvents = async () => {
    if (!currentWorkspaceId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/workspaces/${currentWorkspaceId}/dashboard-events`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentWorkspaceId]);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus pengingat event tanggal ini?")) return;
    try {
      const res = await fetch(`/api/dashboard-events/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="flex flex-col gap-6 p-1 md:p-6 animate-in fade-in duration-300">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" />
              Kelola Pengingat Event Tanggal
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Konfigurasi pengingat tanggal berulang (seperti tanggal 18 & 23) atau pengingat spesifik untuk ditampilkan di Dashboard.
          </p>
        </div>

        <Button asChild className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shadow-sm shrink-0">
          <Link href="/dashboard-events/new">
            <Plus className="w-4 h-4" />
            Tambah Pengingat Baru
          </Link>
        </Button>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Daftar Pengingat Tanggal Aktif</CardTitle>
          <CardDescription className="text-xs">
            Daftar aturan pengingat event yang terdaftar di workspace aktif saat ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Memuat data pengingat...
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-accent/20">
              <Calendar className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-sm">Belum Ada Pengingat Event</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Anda belum membuat pengingat event tanggal. Klik tombol "Tambah Pengingat Baru" untuk mulai membuat aturan pengingat.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-4 gap-1.5">
                <Link href="/dashboard-events/new">
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Pengingat
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-accent/40 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                    <th className="p-3">Judul & Deskripsi</th>
                    <th className="p-3">Tipe Tanggal</th>
                    <th className="p-3">Target Role</th>
                    <th className="p-3">Aktif (H-N)</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((ev) => {
                    const formattedDate = ev.exactDate
                      ? new Date(ev.exactDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : null;

                    return (
                      <tr key={ev.id} className="hover:bg-accent/30 transition-colors">
                        <td className="p-3 max-w-xs">
                          <div className="font-semibold text-foreground text-sm">{ev.title}</div>
                          {ev.description && (
                            <div className="text-muted-foreground line-clamp-1 text-xs mt-0.5">
                              {ev.description}
                            </div>
                          )}
                        </td>

                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-[11px] bg-background">
                            {ev.recurrenceType === "MONTHLY_DAY"
                              ? `Setiap Tgl ${ev.dayOfMonth}`
                              : ev.recurrenceType === "EXACT_DATE"
                              ? formattedDate
                              : `Hari ke-${ev.dayOfWeek}`}
                          </Badge>
                        </td>

                        <td className="p-3">
                          <Badge variant="secondary" className="text-[10px]">
                            {ev.targetRole}
                          </Badge>
                        </td>

                        <td className="p-3 text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            H-{ev.activeDaysBefore} s/d H+{ev.activeDaysAfter}
                          </span>
                        </td>

                        <td className="p-3">
                          <Badge
                            className={
                              ev.isActive
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                : "bg-muted text-muted-foreground"
                            }
                            variant="outline"
                          >
                            {ev.isActive ? "Aktif" : "Non-aktif"}
                          </Badge>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                              <Link href={`/dashboard-events/${ev.id}/edit`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(ev.id)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  </RoleGuard>
);
}
