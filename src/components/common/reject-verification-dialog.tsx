"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

interface RejectVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  isSubmitting?: boolean;
  onConfirm: (note: string) => void;
  placeholder?: string;
}

export function RejectVerificationDialog({
  open,
  onOpenChange,
  title = "Tolak Laporan",
  description = "Berikan catatan atau alasan penolakan. Tenaga pendamping akan dapat melihat catatan ini untuk melakukan revisi.",
  isSubmitting = false,
  onConfirm,
  placeholder = "Contoh: Mohon perbaiki deskripsi kendala dan lampirkan bukti foto kegiatan yang lebih jelas...",
}: RejectVerificationDialogProps) {
  const [note, setNote] = React.useState("");

  // Reset note when dialog opens
  React.useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  const handleSubmit = () => {
    if (!note || note.trim() === "") {
      toast.error("Catatan verifikasi wajib diisi jika menolak laporan");
      return;
    }
    onConfirm(note.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertCircle className="h-5 w-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <label className="text-xs font-semibold text-foreground">
            Catatan Revisi / Alasan Penolakan <span className="text-destructive">*</span>
          </label>
          <textarea
            className="w-full min-h-[110px] p-3 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-destructive/30 resize-none leading-relaxed"
            placeholder={placeholder}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-[11px] text-muted-foreground italic">
            * Catatan ini wajib diisi dan akan diteruskan ke pembuat laporan.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !note.trim()}
          >
            {isSubmitting ? "Menolak..." : "Konfirmasi Tolak"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
