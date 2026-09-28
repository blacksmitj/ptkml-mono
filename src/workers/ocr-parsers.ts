// Regex extraction helpers
export function normalizeNumberText(text: string): string {
  return text
    .replace(/[OQ]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[zZeE]/g, "2")
    .replace(/[B]/g, "8")
    .replace(/[S]/g, "5")
    .replace(/[G]/g, "6")
    .replace(/[?]/g, "2")
    .replace(/[b]/g, "6");
}

export function extractNik(text: string): string | null {
  // Candidate pattern representing potential NIK (16 characters from digits and typical OCR typos)
  const candidateRegex = /[0-9OQIl|BSGb?zZeE]{16}/g;
  const matches = text.match(candidateRegex);
  if (matches) {
    for (const match of matches) {
      const normalized = normalizeNumberText(match);
      if (/^\d{16}$/.test(normalized)) {
        return normalized;
      }
    }
  }

  // Fallback: Clean line-by-line
  const lines = text.split("\n");
  for (const line of lines) {
    if (/nik/i.test(line)) {
      // Extract numeric/alphanumeric sequence after NIK label
      const parts = line.replace(/nik/i, "").replace(/[:\-\=\*_]/g, "").trim();
      const normalized = normalizeNumberText(parts).replace(/[^\d]/g, "");
      if (normalized.length >= 16) {
        return normalized.slice(0, 16);
      }
    }
  }

  return null;
}

export function extractBpjsNumber(text: string): string | null {
  const lines = text.split("\n");

  // 1. Look for lines containing "Nomor Kartu", "No. Kartu", "No Kartu", or "Nomor"
  for (const line of lines) {
    if (/no(?:mor)?\s*kar?tu/i.test(line)) {
      const parts = line.replace(/no(?:mor)?\s*kar?tu/i, "").replace(/[:\-\=\*_]/g, "").trim();
      const normalized = normalizeNumberText(parts).replace(/[^\d]/g, "");
      if (normalized.length === 13) {
        return normalized;
      }
      if (normalized.length === 12) {
        // BPJS numbers usually start with "0". If we got 12 digits, prepend "0"
        return "0" + normalized;
      }
      if (normalized.length > 13) {
        return normalized.slice(0, 13);
      }
    }
  }

  // 2. Fallback: Search for 13-digit sequence, avoiding NIK lines
  const candidateRegex = /\b[0-9OQIl|BSGb?zZeE]{13}\b/g;
  const matches = text.match(candidateRegex);
  if (matches) {
    for (const match of matches) {
      const normalized = normalizeNumberText(match);
      if (/^\d{13}$/.test(normalized)) {
        return normalized;
      }
    }
  }

  // 3. Fallback: Search line-by-line, skipping lines with NIK
  for (const line of lines) {
    if (/nik/i.test(line)) continue;
    const normalized = normalizeNumberText(line).replace(/[^\d]/g, "");
    if (normalized.length === 13) {
      return normalized;
    }
    if (normalized.length === 12) {
      return "0" + normalized;
    }
  }
  return null;
}

export function extractName(text: string): string | null {
  const lines = text.split("\n");

  // 1. First, search for "Nama" label line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/nama/i.test(line)) {
      const cleanLine = line.replace(/nama/i, "").replace(/[:\-\=\*_]/g, "").trim();

      // If the value is on the same line (e.g., "Nama : YUDIANTO")
      if (cleanLine.length > 3 && !/alamat|nik|tanggal|lahir|kartu|faskes/i.test(cleanLine)) {
        return cleanLine;
      }

      // If the value is on the next line (often the case in split columns or line wraps)
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length > 3 && !/nik|alamat|tanggal|lahir|kartu|faskes/i.test(nextLine)) {
          return nextLine;
        }
      }
    }
  }

  // 2. If it's a two-column layout split (like in the case of column-based output)
  const namaLabelIndex = lines.findIndex((l) => /^\s*nama\s*$/i.test(l.trim()));
  if (namaLabelIndex !== -1) {
    const valueLines = lines.filter((l) => l.trim().startsWith(":"));
    const labelLinesBefore = lines.slice(0, namaLabelIndex).filter((l) => /nomor|kartu/i.test(l));
    const rank = labelLinesBefore.length;
    if (valueLines[rank]) {
      const value = valueLines[rank].replace(/^:/, "").replace(/[:\-\=\*_]/g, "").trim();
      if (value.length > 3) {
        return value;
      }
    }
  }

  // Fallback: look for uppercase names in KTP layout
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      /^[A-Z\s]{4,30}$/.test(trimmed) &&
      !/PROVINSI/i.test(trimmed) &&
      !/KABUPATEN/i.test(trimmed) &&
      !/KOTA/i.test(trimmed) &&
      !/GOL/i.test(trimmed) &&
      !/ALAMAT/i.test(trimmed) &&
      !/KARTU/i.test(trimmed)
    ) {
      return trimmed;
    }
  }
  return null;
}

export function extractSalarySlip(text: string) {
  const result: {
    name?: string;
    totalSalary?: number;
    period?: string;
  } = {};

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const nameMatch = line.match(/(?:nama|karyawan|employee)\s*[:=-]?\s*(.+)/i);
    if (nameMatch && nameMatch[1] && !result.name) {
      result.name = nameMatch[1].trim();
    }

    const salaryMatch = line.match(/(?:total|gaji|take home pay|net)\s*[:=-]?\s*(?:rp\.?)?\s*([\d.,]+)/i);
    if (salaryMatch && salaryMatch[1] && !result.totalSalary) {
      const cleaned = salaryMatch[1].replace(/\./g, "").replace(/,/g, ".");
      const val = parseFloat(cleaned);
      if (!isNaN(val)) result.totalSalary = val;
    }
  }

  return result;
}
