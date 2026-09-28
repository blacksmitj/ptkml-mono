import { Logbook } from "@/types";
import { OcrSummary } from "@/components/ocr-attention-cell";

export interface MappedLogbook extends Omit<Logbook, "createdAt" | "updatedAt"> {
  createdAt: string | Date;
  updatedAt: string | Date;
  mentorName: string;
  mentorPhoto: string | null;
  formattedDate: string;
  ocrSummary?: OcrSummary;
}

export interface LogbookActions {
  deletingId: string | null;
  processingId: string | null;
  onDelete: (id: string) => void;
  onReprocessAll: (id: string, files?: any[]) => void;
}
