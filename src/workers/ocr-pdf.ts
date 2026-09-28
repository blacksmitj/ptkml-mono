import fs from "fs";

export async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  // Support both default / named exports of pdf-parse depending on version
  const pdfParseModule = await import("pdf-parse");
  const PDFParse = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default || pdfParseModule;

  if (typeof PDFParse === "function" && PDFParse.prototype && PDFParse.prototype.getText) {
    const parser = new PDFParse({ data: dataBuffer });
    try {
      const data = await parser.getText();
      if (!data.text || data.text.trim().length === 0) {
        throw new Error("PDF tidak mengandung teks digital yang dapat dibaca (kemungkinan hasil scan).");
      }
      return data.text;
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy().catch(() => {});
      }
    }
  } else if (typeof PDFParse === "function") {
    // Legacy / simple function call style: pdf(dataBuffer)
    const data = await PDFParse(dataBuffer);
    if (!data.text || data.text.trim().length === 0) {
      throw new Error("PDF tidak mengandung teks digital yang dapat dibaca (kemungkinan hasil scan).");
    }
    return data.text;
  }

  throw new Error("Gagal menginisialisasi modul parser PDF.");
}
