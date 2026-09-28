import * as React from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";

export function useFormDraft<T extends FieldValues>({
  key,
  methods,
  hasFormData,
  skip,
  onRestore,
}: {
  key: string;
  methods: UseFormReturn<T>;
  hasFormData: (values: any) => boolean;
  skip: boolean;
  onRestore?: (data: any) => void;
}) {
  const [showRestoreDialog, setShowRestoreDialog] = React.useState(false);
  const [draftData, setDraftData] = React.useState<any>(null);
  const disableDraftRef = React.useRef(false);
  const watchedValues = methods.watch();

  // 1. Load draft on mount
  React.useEffect(() => {
    if (skip) return;
    const saved = localStorage.getItem(key);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (hasFormData(parsed)) {
        setDraftData(parsed);
        setShowRestoreDialog(true);
      }
    } catch (e) {
      console.error(`Failed to parse draft for ${key}`, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  // 2. Save draft on value changes with race-condition guard
  React.useEffect(() => {
    if (disableDraftRef.current || skip) return;
    if (showRestoreDialog) return; // Guard: Jangan overwrite/remove draf saat dialog konfirmasi aktif
    if (methods.formState.isSubmitting || methods.formState.isSubmitSuccessful) return;

    if (hasFormData(watchedValues)) {
      localStorage.setItem(key, JSON.stringify(watchedValues));
    } else {
      localStorage.removeItem(key);
    }
  }, [watchedValues, skip, showRestoreDialog, methods.formState.isSubmitting, methods.formState.isSubmitSuccessful]);

  const restoreDraft = () => {
    if (draftData) {
      if (onRestore) {
        onRestore(draftData);
      } else {
        Object.entries(draftData).forEach(([k, v]) => {
          methods.setValue(k as any, v as any, { 
            shouldValidate: true, 
            shouldDirty: true, 
            shouldTouch: true 
          });
        });
      }
    }
    setShowRestoreDialog(false);
  };

  const discardDraft = () => {
    localStorage.removeItem(key);
    setShowRestoreDialog(false);
  };

  const clearDraft = () => localStorage.removeItem(key);

  return {
    showRestoreDialog,
    setShowRestoreDialog,
    disableDraftRef,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}
