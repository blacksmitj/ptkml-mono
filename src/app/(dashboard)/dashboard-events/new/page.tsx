"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Calendar, Bell } from "lucide-react";
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

export default function NewDashboardEventPage() {
  const router = useRouter();
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<"MONTHLY_DAY" | "EXACT_DATE" | "WEEKLY">("MONTHLY_DAY");
  const [dayOfMonth, setDayOfMonth] = useState<number>(18);
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [exactDate, setExactDate] = useState<string>("");
  const [activeDaysBefore, setActiveDaysBefore] = useState<number>(5);
  const [activeDaysAfter, setActiveDaysAfter] = useState<number>(1);
  const [actionUrl, setActionUrl] = useState("/logbooks?status=PENDING");
  const [actionLabel, setActionLabel] = useState("Verifikasi Logbook");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("logbook_pending");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspaceId) {
      toast.error("Workspace aktif tidak ditemukan. Silakan pilih workspace terlebih dahulu.");
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
      setLoading(true);
      const res = await fetch(`/api/workspaces/${currentWorkspaceId}/dashboard-events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success("Pengingat event berhasil dibuat.");
        router.push("/dashboard-events");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Gagal membuat pengingat event.");
      }
    } catch (err) {
      console.error("Failed to create event:", err);
      toast.error("Terjadi kesalahan jaringan saat menyimpan pengingat.");
    } finally {
      setLoading(false);
    }
  };

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
              Tambah Pengingat Event Tanggal
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Buat aturan jadwal pengingat baru yang akan otomatis muncul di Dashboard pengguna.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Form Pengingat Event</CardTitle>
            <CardDescription className="text-xs">
              Isi data detail event dan sesuaikan rentang hari aktif serta halaman tujuan aksi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Judul Pengingat Event *</Label>
                  <Input
                    placeholder="Contoh: Batas Input Logbook Bulan Ini"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-xs font-semibold">Deskripsi / Instruksi</Label>
                  <Textarea
                    placeholder="Jelaskan detail tindakan yang perlu dilakukan pengguna..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tipe Penjadwalan *</Label>
                  <Select
                    value={recurrenceType}
                    onValueChange={(val: any) => setRecurrenceType(val)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Tipe Schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY_DAY">Bulanan (Hari ke-N setiap bulan)</SelectItem>
                      <SelectItem value="WEEKLY">Mingguan (Hari tertentu dalam seminggu)</SelectItem>
                      <SelectItem value="EXACT_DATE">Tanggal Spesifik (Satu kali)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Target Peran (Siapa yang melihat)</Label>
                  <Select value={targetRole} onValueChange={setTargetRole}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Target Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Peran (Public)</SelectItem>
                      <SelectItem value="MENTOR">Pendamping</SelectItem>
                      <SelectItem value="UNIVERSITY_ADMIN">Admin Universitas</SelectItem>
                      <SelectItem value="UNIVERSITY_SUPERVISOR">Supervisor Universitas</SelectItem>
                      <SelectItem value="WORKSPACE_SUPERVISOR">Supervisor Global</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrenceType === "MONTHLY_DAY" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Tanggal Target Setiap Bulan (1 - 31)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                      required
                    />
                  </div>
                )}

                {recurrenceType === "WEEKLY" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Hari Setiap Minggu</Label>
                    <Select
                      value={dayOfWeek.toString()}
                      onValueChange={(val) => setDayOfWeek(parseInt(val, 10))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih Hari" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Senin</SelectItem>
                        <SelectItem value="2">Selasa</SelectItem>
                        <SelectItem value="3">Rabu</SelectItem>
                        <SelectItem value="4">Kamis</SelectItem>
                        <SelectItem value="5">Jumat</SelectItem>
                        <SelectItem value="6">Sabtu</SelectItem>
                        <SelectItem value="0">Minggu</SelectItem>
                      </SelectContent>
                    </Select>
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

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tampil H- (Hari Sebelum Target)</Label>
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
                <Button type="submit" disabled={loading} className="gap-2">
                  <Save className="w-4 h-4" />
                  {loading ? "Menyimpan..." : "Simpan Pengingat"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
