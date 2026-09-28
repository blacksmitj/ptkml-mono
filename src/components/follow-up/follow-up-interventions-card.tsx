"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FollowUpRecommendationItem, InterventionPriority } from "@/types";
import { Plus, Trash2, HelpCircle, ArrowUpRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FollowUpInterventionsCardProps {
  recommendations: FollowUpRecommendationItem[];
  onChange: (items: FollowUpRecommendationItem[]) => void;
  isReadOnly?: boolean;
}

export function FollowUpInterventionsCard({
  recommendations,
  onChange,
  isReadOnly = false,
}: FollowUpInterventionsCardProps) {
  const [interventionType, setInterventionType] = React.useState("");
  const [priority, setPriority] = React.useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [description, setDescription] = React.useState("");

  const handleAddItem = () => {
    if (!interventionType.trim()) return;
    const item: FollowUpRecommendationItem = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      interventionType: interventionType.trim(),
      priority,
      description: description.trim(),
    };
    onChange([...recommendations, item]);
    setInterventionType("");
    setDescription("");
  };

  const handleRemoveItem = (id: string) => {
    onChange(recommendations.filter((r) => r.id !== id));
  };

  const handleUpdateItem = (id: string, updates: Partial<FollowUpRecommendationItem>) => {
    onChange(
      recommendations.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "HIGH":
        return <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-300 dark:border-rose-800 text-xs">🔴 Prioritas Tinggi</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-300 dark:border-amber-800 text-xs">🟡 Prioritas Sedang</Badge>;
      case "LOW":
        return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-300 dark:border-emerald-800 text-xs">🟢 Prioritas Rendah</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{p}</Badge>;
    }
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Rekomendasi Tindak Lanjut</CardTitle>
            <CardDescription>
              Usulan program intervensi spesifik untuk pengembangan usaha peserta pada tahap selanjutnya
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 hover:bg-muted p-1.5 px-2.5 rounded-lg cursor-help transition-colors border border-border/80">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium hidden sm:inline">Contoh Intervensi</span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-xs text-xs space-y-2 p-3 bg-popover text-popover-foreground border border-border shadow-md rounded-lg"
              >
                <p className="font-semibold text-popover-foreground">Contoh bentuk rekomendasi tindak lanjut:</p>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  <li><strong className="text-foreground">Fasilitasi Legalitas Usaha</strong> (NIB, NPWP Usaha, Izin Edar)</li>
                  <li><strong className="text-foreground">Sertifikasi Produk</strong> (P-IRT, Halal MUI/BPJPH, BPOM)</li>
                  <li><strong className="text-foreground">Akses Pembiayaan</strong> (Fasilitasi KUR, Modal Usaha Lanjutan)</li>
                  <li><strong className="text-foreground">Digitalisasi & Pemasaran</strong> (Go Digital, Marketplace, Branding)</li>
                  <li><strong className="text-foreground">Pendampingan Manajemen</strong> (Pembukuan aplikasi, SOP produksi)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
            Belum ada rekomendasi tindak lanjut. Tambahkan rekomendasi di bawah.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-xl border bg-card hover:bg-muted/10 transition-colors space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-muted-foreground w-5">{index + 1}.</span>
                    {isReadOnly ? (
                      <div className="font-semibold text-sm text-foreground flex-1">
                        {rec.interventionType}
                      </div>
                    ) : (
                      <Input
                        value={rec.interventionType}
                        onChange={(e) => handleUpdateItem(rec.id, { interventionType: e.target.value })}
                        placeholder="Nama/Jenis Intervensi Rekomendasi..."
                        className="h-8 text-xs font-semibold flex-1 bg-background"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isReadOnly ? (
                      getPriorityBadge(rec.priority)
                    ) : (
                      <Select
                        value={rec.priority}
                        onValueChange={(val: any) => handleUpdateItem(rec.id, { priority: val })}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH" className="text-xs text-rose-600 font-medium">🔴 Tinggi</SelectItem>
                          <SelectItem value="MEDIUM" className="text-xs text-amber-600 font-medium">🟡 Sedang</SelectItem>
                          <SelectItem value="LOW" className="text-xs text-emerald-600 font-medium">🟢 Rendah</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {!isReadOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(rec.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  {isReadOnly ? (
                    rec.description && (
                      <p className="text-xs text-muted-foreground pl-7 leading-relaxed">{rec.description}</p>
                    )
                  ) : (
                    <Textarea
                      value={rec.description}
                      onChange={(e) => handleUpdateItem(rec.id, { description: e.target.value })}
                      placeholder="Uraian alasan, tujuan intervensi, atau langkah yang perlu diambil..."
                      className="min-h-[50px] text-xs resize-y ml-7 w-[calc(100%-1.75rem)] bg-background"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Tambah Rekomendasi Baru */}
        {!isReadOnly && (
          <div className="p-3.5 rounded-xl border border-dashed bg-muted/20 space-y-3 pt-3">
            <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" /> Tambah Rekomendasi Baru
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
              <div className="sm:col-span-8">
                <Input
                  value={interventionType}
                  onChange={(e) => setInterventionType(e.target.value)}
                  placeholder="Contoh: Fasilitasi Legalitas NIB / Pelatihan Pemasaran Digital"
                  className="h-9 text-xs"
                />
              </div>
              <div className="sm:col-span-4">
                <Select
                  value={priority}
                  onValueChange={(val: any) => setPriority(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Pilih Prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH" className="text-xs text-rose-600 font-medium">🔴 Prioritas Tinggi</SelectItem>
                    <SelectItem value="MEDIUM" className="text-xs text-amber-600 font-medium">🟡 Prioritas Sedang</SelectItem>
                    <SelectItem value="LOW" className="text-xs text-emerald-600 font-medium">🟢 Prioritas Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan kebutuhan peserta dan tindak lanjut yang diharapkan... (opsional)"
              className="min-h-[60px] text-xs resize-y"
            />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleAddItem}
                disabled={!interventionType.trim()}
                className="h-8 text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Masukkan Rekomendasi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
