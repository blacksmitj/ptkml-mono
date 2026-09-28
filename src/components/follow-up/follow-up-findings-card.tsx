"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FollowUpFindingItem } from "@/types";
import { CheckCircle2, AlertTriangle, Plus, Trash2, Sparkles, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FollowUpFindingsCardProps {
  findings: FollowUpFindingItem[];
  onChange: (findings: FollowUpFindingItem[]) => void;
  isReadOnly?: boolean;
  onResetAutoGenerate?: () => void;
}

export function FollowUpFindingsCard({
  findings,
  onChange,
  isReadOnly = false,
  onResetAutoGenerate,
}: FollowUpFindingsCardProps) {
  const [newText, setNewText] = React.useState("");
  const [newType, setNewType] = React.useState<"POSITIVE" | "OBSTACLE" | "WARNING">("POSITIVE");

  const handleAddFinding = () => {
    if (!newText.trim()) return;
    const item: FollowUpFindingItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: newType,
      text: newText.trim(),
      source: "MANUAL",
    };
    onChange([...findings, item]);
    setNewText("");
  };

  const handleRemoveFinding = (id: string) => {
    onChange(findings.filter((f) => f.id !== id));
  };

  const handleUpdateFindingText = (id: string, text: string) => {
    onChange(
      findings.map((f) => (f.id === id ? { ...f, text } : f))
    );
  };

  const handleUpdateFindingType = (id: string, type: "POSITIVE" | "OBSTACLE" | "WARNING") => {
    onChange(
      findings.map((f) => (f.id === id ? { ...f, type } : f))
    );
  };

  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-bold tracking-tight">Temuan & Catatan Pendamping</CardTitle>
            <CardDescription>
              Daftar capaian keberhasilan usaha, kendala operasional, dan poin penting hasil pendampingan
            </CardDescription>
          </div>
          {!isReadOnly && onResetAutoGenerate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onResetAutoGenerate}
                    className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reset Temuan Otomatis
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Tarik ulang otomatis temuan dari data Output B0-B3</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {findings.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground text-sm">
            Belum ada catatan temuan. Tambahkan temuan baru di bawah.
          </div>
        ) : (
          <div className="space-y-2.5">
            {findings.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start gap-2.5 p-2.5 rounded-xl border bg-card hover:bg-muted/10 transition-colors"
              >
                {/* Type Selector / Badge */}
                {isReadOnly ? (
                  <div className="pt-0.5">
                    {finding.type === "POSITIVE" ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-300 dark:border-emerald-800 gap-1 text-xs font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Catatan Positif
                      </Badge>
                    ) : finding.type === "WARNING" ? (
                      <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20 border-rose-300 dark:border-rose-800 gap-1 text-xs font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" /> Catatan Khusus
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-amber-300 dark:border-amber-800 gap-1 text-xs font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" /> Kendala
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="w-[145px] shrink-0">
                    <Select
                      value={finding.type}
                      onValueChange={(val: any) => handleUpdateFindingType(finding.id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POSITIVE" className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Catatan Positif
                        </SelectItem>
                        <SelectItem value="OBSTACLE" className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          ⚠ Kendala
                        </SelectItem>
                        <SelectItem value="WARNING" className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          ! Catatan Khusus
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Text Content */}
                <div className="flex-1 min-w-0">
                  {isReadOnly ? (
                    <p className="text-sm text-foreground pt-0.5 leading-relaxed">{finding.text}</p>
                  ) : (
                    <Input
                      value={finding.text}
                      onChange={(e) => handleUpdateFindingText(finding.id, e.target.value)}
                      className="h-8 text-xs bg-background"
                      placeholder="Tuliskan poin temuan..."
                    />
                  )}
                  {finding.source === "OUTPUT_REPORT" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Sparkles className="h-2.5 w-2.5 text-primary" /> Otomatis dari kendala laporan bulanan
                    </span>
                  )}
                  {finding.source === "SMART_METRIC" && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Sparkles className="h-2.5 w-2.5 text-emerald-500" /> Otomatis dari metrik capaian output
                    </span>
                  )}
                </div>

                {/* Delete Button */}
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFinding(finding.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Tambah Temuan Baru */}
        {!isReadOnly && (
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t">
            <Select
              value={newType}
              onValueChange={(val: any) => setNewType(val)}
            >
              <SelectTrigger className="w-full sm:w-[155px] h-9 text-xs">
                <SelectValue placeholder="Pilih Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="POSITIVE" className="text-xs text-emerald-600 font-medium">✓ Catatan Positif</SelectItem>
                <SelectItem value="OBSTACLE" className="text-xs text-amber-600 font-medium">⚠ Kendala</SelectItem>
                <SelectItem value="WARNING" className="text-xs text-rose-600 font-medium">! Catatan Khusus</SelectItem>
              </SelectContent>
            </Select>

            <Input
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFinding();
                }
              }}
              placeholder="Tulis temuan lapangan baru... (tekan Enter untuk menambah)"
              className="flex-1 h-9 text-xs"
            />

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddFinding}
              disabled={!newText.trim()}
              className="w-full sm:w-auto h-9 gap-1.5 text-xs font-medium shrink-0"
            >
              <Plus className="h-3.5 w-3.5" /> Tambah Temuan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
