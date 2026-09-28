/**
 * Utilitas untuk mencetak elemen DOM tertentu menggunakan window popup terisolasi.
 * Solusi ini memisahkan area cetak dari layout utama dan portal modal (Radix Dialog),
 * sehingga seluruh isi dokumen, layout Tailwind, dan warna/font tercetak sempurna.
 */

export interface PrintElementOptions {
  title?: string;
  pageOrientation?: "portrait" | "landscape";
  pageSize?: string;
  customStyle?: string;
}

export function printElement(
  element: HTMLElement | null,
  options: PrintElementOptions = {}
): boolean {
  if (!element || typeof window === "undefined") {
    console.error("Elemen yang akan dicetak tidak ditemukan.");
    return false;
  }

  const {
    title = "Cetak Dokumen",
    pageOrientation = "portrait",
    pageSize = "A4",
    customStyle = "",
  } = options;

  // 1. Kumpulkan semua tag <link rel="stylesheet"> dan <style> yang sedang aktif
  let headStyles = "";
  const styleElements = document.querySelectorAll("link[rel='stylesheet'], style");
  styleElements.forEach((node) => {
    headStyles += node.outerHTML + "\n";
  });

  // 2. Buka jendela popup baru
  const printWindow = window.open("", "_blank", "width=1000,height=800,menubar=no,toolbar=no,location=no,status=no");

  if (!printWindow) {
    alert("Gagal membuka jendela cetak. Pastikan pop-up blocker di browser Anda diizinkan untuk situs ini.");
    return false;
  }

  // 3. Susun HTML bersih untuk jendela cetak
  const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  ${headStyles}
  <style>
    @page {
      size: ${pageSize} ${pageOrientation};
      margin: 10mm;
    }
    html, body {
      background-color: #ffffff !important;
      color: #18181b !important;
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-content-wrapper {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      width: 100%;
      min-height: 100%;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
    }
    /* Pastikan shadow dan border layar tidak mengganggu cetakan */
    .print-content-wrapper > * {
      box-shadow: none !important;
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
    }
    ${customStyle}
  </style>
</head>
<body>
  <div class="print-content-wrapper">
    ${element.outerHTML}
  </div>
  <script>
    // Tunggu semua gambar dan font termuat sempurna sebelum trigger print
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
    // Otomatis tutup jendela popup setelah user menutup dialog cetak
    window.onafterprint = function() {
      setTimeout(function() {
        window.close();
      }, 100);
    };
  </script>
</body>
</html>`;

  // 4. Tulis ke popup window dan picu render
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  return true;
}
