"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/use-app-store";
import { RoleGuard } from "@/components/role-guard";
import { EVENT_ACTION_PRESETS } from "@/lib/event-presets";
import { toast } from "sonner";

export default function EditDashboardEventPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"MONTHLY_DAY" | "EXACT_DATE" | "WEEKLY">("MONTHLY_DAY");
  const [dayOfMonth, setDayOfMonth] = useState<number>(18);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [exactDate, setExactDate] = useState<string>("");
  const [activeDaysBefore, setActiveDaysBefore] = useState<number>(5);
  const [activeDaysAfter, setActiveDaysAfter] = useState<number>(1);
  const [actionUrl, setActionUrl] = useState("/logbooks");
  const [actionLabel, setActionLabel] = useState("Isi Laporan Sekarang");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("custom");
  const [targetRole, setTargetRole] = useState("MENTOR");
  const [isActive, setIsActive] = useState(true);

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = EVENT_ACTION_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== "custom") {
      setActionUrl(found.url);
      setActionLabel(found.actionLabel);
    }
  };

  useEffect(() => {
    const fetchEventData = async () => {
      if (!currentWorkspaceId || !eventId) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/workspaces/${currentWorkspaceId}/dashboard-events`);
        if (res.ok) {
          const data = await res.json();
          const target = (data.events || []).find((ev: any) => ev.id === eventId);
          if (target) {
            setTitle(target.title);
            setDescription(target.description || "");
            setRecurrenceType(target.recurrenceType);
            setDayOfMonth(target.dayOfMonth || 18);
            setDayOfWeek(target.dayOfWeek || 1);
            setExactDate(target.exactDate ? new Date(target.exactDate).toISOString().split("T")[0] : "");
            setActiveDaysBefore(target.activeDaysBefore || 5);
            setActiveDaysAfter(target.activeDaysAfter || 1);
            const url = target.actionUrl || "";
            setActionUrl(url);
            setActionLabel(target.actionLabel || "");
            setTargetRole(target.targetRole || "MENTOR");
            setIsActive(target.isActive);

            const matchedPreset = EVENT_ACTION_PRESETS.find((p) => p.url === url && p.id !== "custom");
            setSelectedPresetId(matchedPreset ? matchedPreset.id : "custom");
          }
        }
      } catch (err) {
        console.error("Failed to fetch event:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [currentWorkspaceId, eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) {
      toast.error("ID event tidak valid.");
      return;
    }
    if (!title.trim()) {
      toast.error("Judul pengingat tidak boleh kosong.");
      return;
    }

    const payload = {
      title,
      description,
      recurrenceType,
      dayOfMonth: recurrenceType === "MONTHLY_DAY" ? dayOfMonth : null,
      dayOfWeek: recurrenceType === "WEEKLY" ? dayOfWeek : null,
      exactDate: recurrenceType === "EXACT_DATE" ? exactDate : null,
      activeDaysBefore,
      activeDaysAfter,
      actionUrl,
      actionLabel,
      targetRole,
      isActive,
    };

    try {
      setSaving(true);
      const res = await fetch(`/api/dashboard-events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Pengingat event berhasil diperbarui.");
        router.push("/dashboard-events");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Gagal memperbarui pengingat event.");
      }
    } catch (err) {
      console.error("Failed to update event:", err);
      toast.error("Terjadi kesalahan jaringan saat memperbarui pengingat.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-sm text-muted-foreground">
        Memuat data pengingat...
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["SUPER_ADMIN"]}>
      <div className="flex flex-col gap-6 p-1 md:p-6 max-w-4xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href="/dashboard-events">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-amber-500" />
              Edit Pengingat Event Tanggal
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ubah aturan pengingat event yang sudah dibuat.
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Form Aturan Pengingat</CardTitle>
            <CardDescription className="text-xs">
              Isi rincian pengingat tanggal, pesan deskripsi, dan target penerima notifikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Judul Pengingat *</Label>
                  <Input
                    placeholder="Contoh: Pengumpulan Capaian Output Data Awal"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Deskripsi / Penjelasan Instruksi</Label>
                  <Textarea
                    placeholder="Penjelasan instruksi..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Target Penerima (Role)</Label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Role Pengguna</SelectItem>
                      <SelectItem value="MENTOR">Pendamping</SelectItem>
                      <SelectItem value="UNIVERSITY_ADMIN">Admin Universitas</SelectItem>
                      <SelectItem value="UNIVERSITY_SUPERVISOR">Supervisor PT</SelectItem>
                      <SelectItem value="WORKSPACE_SUPERVISOR">Supervisor Global</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tipe Pengulangan Tanggal</Label>
                  <Select value={recurrenceType} onValueChange={(val: any) => setRecurrenceType(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY_DAY">Berulang Bulanan (Setiap Tanggal Ke-X)</SelectItem>
                      <SelectItem value="EXACT_DATE">Tanggal Spesifik (Satu Kali Event)</SelectItem>
                      <SelectItem value="WEEKLY">Berulang Mingguan (Hari Ke-X)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "MONTHLY_DAY" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Setiap Tanggal Ke- (1-31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                      placeholder="Contoh: 18 atau 23"
                      required
                    />
                  </div>
                )}

                {recurrenceType === "EXACT_DATE" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Pilih Tanggal Spesifik</Label>
                    <Input
                      type="date"
                      value={exactDate}
                      onChange={(e) => setExactDate(e.target.value)}
                      required
                    />
                  </div>
                )}

                {recurrenceType === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Setiap Hari (1=Senin, 7=Minggu)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={7}
                      value={dayOfWeek}
                      onChange={(e) => setDayOfWeek(parseInt(e.target.value, 10))}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Hari Sebelum Target Tampil (H-N)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={activeDaysBefore}
                    onChange={(e) => setActiveDaysBefore(parseInt(e.target.value, 10))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Pilihan Preset Link Aksi</Label>
                  <Select value={selectedPresetId} onValueChange={handlePresetChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Halaman Aksi" />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_ACTION_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">URL Halaman Aksi</Label>
                  <Input
                    placeholder="/logbooks atau /output-reports"
                    value={actionUrl}
                    onChange={(e) => {
                      setActionUrl(e.target.value);
                      setSelectedPresetId("custom");
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Label Tombol Aksi</Label>
                  <Input
                    placeholder="Isi Laporan Sekarang"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2 flex items-center justify-between p-3 border rounded-lg bg-accent/20">
                  <div>
                    <Label className="text-xs font-semibold cursor-pointer">Status Aktif Pengingat</Label>
                    <p className="text-xs text-muted-foreground">
                      Jika diaktifkan, banner pengingat ini akan tampil di Dashboard pengguna.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" asChild>
                  <Link href="/dashboard-events">Batal</Link>
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
