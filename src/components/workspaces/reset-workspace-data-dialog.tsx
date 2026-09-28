"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Loader2, Eye, EyeOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useResetWorkspaceData } from "@/hooks/use-workspaces";
import { toast } from "sonner";
import { Workspace } from "@/types";

interface ResetWorkspaceDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: Workspace | null;
}

export function ResetWorkspaceDataDialog({
  open,
  onOpenChange,
  workspace,
}: ResetWorkspaceDataDialogProps) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const resetMutation = useResetWorkspaceData();

  if (!workspace) return null;

  const expectedText = `HAPUS DATA ${workspace.name}`.trim().toUpperCase();
  const isConfirmationMatched = confirmationInput.trim().toUpperCase() === expectedText;
  const canSubmit = isConfirmationMatched && password.trim().length > 0 && !resetMutation.isPending;

  const handleClose = () => {
    if (resetMutation.isPending) return;
    setConfirmationInput("");
    setPassword("");
    setShowPassword(false);
    onOpenChange(false);
  };

  const handleReset = async () => {
    if (!canSubmit) return;

    try {
      const result = await resetMutation.mutateAsync({
        id: workspace.id,
        confirmationText: confirmationInput.trim(),
        password: password,
      });

      toast.success("Workspace Berhasil Direset", {
        description: `Dihapus: ${result.summary.deletedApplicants} peserta, ${result.summary.deletedLogbooks} logbook, ${result.summary.deletedReports} laporan, ${result.summary.deletedFiles} berkas fisik.`,
        duration: 6000,
      });

      handleClose();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error || error?.message || "Terjadi kesalahan saat mereset data workspace";
      toast.error("Gagal Mereset Workspace", {
        description: errorMessage,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg border-rose-200 dark:border-rose-900/50 p-0 overflow-hidden shadow-2xl">
        {/* Header Banner */}
        <div className="bg-rose-500/10 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/30 p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-xl font-bold text-rose-950 dark:text-rose-100">
              Reset Seluruh Data Operasional
            </DialogTitle>
            <DialogDescription className="text-sm text-rose-900/80 dark:text-rose-300">
              Tindakan ini permanen dan tidak dapat dibatalkan (Irreversible).
            </DialogDescription>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Warning Card */}
          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-4 text-xs space-y-2 text-rose-900 dark:text-rose-200">
            <div className="font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Dampak Penghapusan pada "{workspace.name}":</span>
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1 text-muted-foreground dark:text-rose-200/70">
              <li>
                <strong className="text-rose-700 dark:text-rose-300">Dihapus permanen:</strong> Seluruh data Peserta (Applicant), Laporan Output bulanan, Tenaga Kerja, Logbook Mentoring, Rekomendasi, dan File lampiran fisik di Storage/MinIO.
              </li>
              <li>
                <strong className="text-rose-700 dark:text-rose-300">Dibersihkan:</strong> Profil NIK peserta non-user sehingga NIK bisa didaftarkan ulang.
              </li>
              <li>
                <strong className="text-emerald-700 dark:text-emerald-400">Tetap aman:</strong> Entitas Workspace, Anggota/Petugas (Admin Kampus, Pendamping, Supervisor), dan relasi Kampus mitra.
              </li>
            </ul>
          </div>

          {/* Form Step 1: Confirmation Phrase */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              1. Ketik kalimat konfirmasi berikut:
            </Label>
            <div className="p-2.5 rounded-lg bg-muted font-mono text-xs font-bold text-rose-600 dark:text-rose-400 border border-muted-foreground/20 select-all text-center">
              {expectedText}
            </div>
            <div className="relative">
              <Input
                value={confirmationInput}
                onChange={(e) => setConfirmationInput(e.target.value)}
                placeholder={expectedText}
                className="font-mono text-xs pr-9 border-rose-200 dark:border-rose-900/40 focus-visible:ring-rose-500"
                disabled={resetMutation.isPending}
                autoComplete="off"
              />
              {isConfirmationMatched && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
              )}
            </div>
          </div>

          {/* Form Step 2: Super Admin Password */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              2. Masukkan Password Akun Super Admin Anda:
            </Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Super Admin..."
                className="text-xs pr-10 border-rose-200 dark:border-rose-900/40 focus-visible:ring-rose-500"
                disabled={resetMutation.isPending}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 flex sm:justify-between items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={resetMutation.isPending}
            className="rounded-xl"
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReset}
            disabled={!canSubmit}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-md gap-2"
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sedang Mereset Data...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Eksekusi Reset Data</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
