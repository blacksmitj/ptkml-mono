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
import { ApplicantTransferList } from "@/components/forms/applicant-transfer-list";
import { useApplicants, useAssignMentor } from "@/hooks/use-applicants";
import { useWorkspace } from "@/hooks/use-workspaces";
import { useAppStore } from "@/store/use-app-store";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

interface MentorAssignmentDialogProps {
  mentorId: string;
  mentorName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MentorAssignmentDialog({
  mentorId,
  mentorName,
  open,
  onOpenChange,
  onSuccess,
}: MentorAssignmentDialogProps) {
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const { data: workspace } = useWorkspace(currentWorkspaceId || "");
  const isWorkspaceInactive = workspace?.isActive === false;
  const [selectedApplicants, setSelectedApplicants] = React.useState<string[]>([]);
  const { mutate: assignMentor, isPending: isSaving } = useAssignMentor();
  const { data: applicants } = useApplicants(currentWorkspaceId || undefined);

  // Filter unassigned applicants in the same workspace
  const availableApplicants = React.useMemo(() => {
    const list = applicants?.data || (Array.isArray(applicants) ? applicants : []);
    return list
      .filter((a: any) => !a.mentorId)
      .map((a: any) => {
        return {
          id: a.id,
          name: a.profile?.name || "N/A",
          idTkm: a.idTkm,
        };
      });
  }, [applicants, open]);

  const handleSave = () => {
    if (isWorkspaceInactive) {
      toast.error("Workspace ini tidak aktif. Perubahan tidak dapat disimpan.");
      return;
    }
    if (selectedApplicants.length === 0) {
      toast.error("Pilih minimal satu peserta");
      return;
    }

    assignMentor({
      mentorId,
      applicantIds: selectedApplicants,
    }, {
      onSuccess: () => {
        toast.success("Peserta berhasil dialokasikan");
        setSelectedApplicants([]);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      },
      onError: (err: any) => {
        toast.error(err.response?.data?.error || "Gagal mengalokasikan peserta");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Kelola Peserta Bimbingan
          </DialogTitle>
          <DialogDescription>
            Pilih peserta yang akan dibimbing oleh <span className="font-semibold text-foreground">{mentorName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-2">
          <ApplicantTransferList
            available={availableApplicants}
            selected={selectedApplicants}
            onChange={setSelectedApplicants}
          />
        </div>

        <DialogFooter className="p-6 bg-muted/30 border-t flex items-center justify-between sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedApplicants.length > 0 ? (
              <span className="flex items-center gap-2 text-indigo-600 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {selectedApplicants.length} peserta siap dialokasikan
              </span>
            ) : (
              "Pilih peserta dari daftar di sebelah kiri"
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedApplicants.length === 0 || isWorkspaceInactive}
              className="px-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : isWorkspaceInactive ? (
                "Workspace Read-Only"
              ) : (
                "Simpan Alokasi"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
