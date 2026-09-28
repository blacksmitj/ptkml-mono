import { OutputReport } from "@/types";
import { OcrSummary } from "@/components/ocr-attention-cell";

export type { OcrSummary };

export interface MappedOutputReport extends Omit<OutputReport, "createdAt" | "updatedAt"> {
  createdAt: string | Date;
  updatedAt: string | Date;
  applicantName: string;
  applicantIdTkm: string;
  applicantPhoto: string | null;
  mentorName?: string | null;
  mentorPhoto?: string | null;
  mentorUnivName?: string | null;
  verifierName?: string | null;
  verifierPhoto?: string | null;
  revenueFormatted: string;
  formattedDate: string;
  ocrSummary?: OcrSummary;
}

export interface OutputReportActions {
  deletingId: string | null;
  processingId: string | null;
  onDelete: (id: string) => void;
  onReprocessAll: (id: string) => void;
}
