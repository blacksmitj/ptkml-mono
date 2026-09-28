"use client";

import * as React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Lightbulb, 
  Check, 
  Copy, 
  Sparkles, 
  Wallet, 
  TrendingUp, 
  Factory, 
  FileCheck2,
  ArrowRight,
  MessageSquare,
  UserCheck,
  BookOpen,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ObstacleExample {
  title: string;
  obstacle: string;
  solution?: string;
}

export interface ExampleCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  examples: ObstacleExample[];
}

const LOGBOOK_EXAMPLES: ExampleCategory[] = [
  {
    id: "jadwal_komunikasi",
    label: "Jadwal & Komunikasi",
    icon: MessageSquare,
    examples: [
      {
        title: "Penyesuaian Waktu Temu",
        obstacle: "Peserta sulit mencocokkan jadwal pendampingan tatap muka karena sedang sibuk melayani pelanggan dan mengurus produksi di jam operasional usaha.",
        solution: "Menyepakati jadwal sesi pendampingan di luar jam sibuk toko (pagi sebelum toko buka atau sore hari) serta konfirmasi waktu via WhatsApp 1 hari sebelumnya."
      },
      {
        title: "Respon Komunikasi Terbatas",
        obstacle: "Komunikasi melalui pesan singkat lambat direspon oleh peserta sehingga konfirmasi materi lanjutan dan jadwal kunjungan sempat tertunda.",
        solution: "Melakukan koordinasi via panggilan telepon langsung pada jam istirahat dan menetapkan jadwal pendampingan rutin mingguan yang disepakati bersama."
      },
    ]
  },
  {
    id: "pemahaman_materi",
    label: "Pemahaman Materi",
    icon: BookOpen,
    examples: [
      {
        title: "Konsep Teknis Pembukuan",
        obstacle: "Peserta merasa kesulitan memahami istilah teknis laporan keuangan dan rumus perhitungan Harga Pokok Penjualan (HPP).",
        solution: "Menyampaikan materi dengan bahasa dan analogi sederhana sehari-hari, serta membuatkan lembar kerja simulasi langsung menggunakan data produk riil peserta."
      },
      {
        title: "Adaptasi Aplikasi Digital",
        obstacle: "Peserta belum terbiasa mengoperasikan aplikasi pembukuan/kasir digital di smartphone (literasi digital masih terbatas).",
        solution: "Membimbing praktik input transaksi satu per satu secara perlahan dan menyusun modul panduan ringkas bergambar langkah demi langkah."
      },
    ]
  },
  {
    id: "komitmen_tindaklanjut",
    label: "Komitmen & Tindak Lanjut",
    icon: UserCheck,
    examples: [
      {
        title: "Penyelesaian Tugas Mandiri",
        obstacle: "Peserta belum sempat mencatat buku kas harian yang ditugaskan pada pertemuan minggu lalu karena alasan lupa dan tidak terbiasa.",
        solution: "Mendampingi pengisian buku kas secara langsung di tempat untuk beberapa transaksi terakhir dan menyederhanakan format catatan agar lebih mudah dikerjakan."
      },
      {
        title: "Fokus Selama Pendampingan",
        obstacle: "Sesi pendampingan kurang kondusif karena sering terinterupsi oleh aktivitas transaksi dan interaksi pelanggan di lokasi usaha.",
        solution: "Mengatur posisi diskusi ke area yang lebih tenang di dekat lokasi usaha agar materi dapat dipahami dan didiskusikan secara optimal."
      },
    ]
  },
  {
    id: "dokumen_teknis",
    label: "Dokumen & Teknis",
    icon: FileText,
    examples: [
      {
        title: "Kelengkapan Berkas Administrasi",
        obstacle: "Peserta membutuhkan waktu lama dalam mengumpulkan dokumen data usaha dan identitas untuk kelengkapan berkas pendampingan.",
        solution: "Membantu membuatkan daftar periksa (checklist) dokumen yang dibutuhkan serta memandu peserta dalam mengumpulkan berkas secara bertahap."
      },
      {
        title: "Koneksi Internet di Lokasi",
        obstacle: "Koneksi sinyal internet di lokasi usaha peserta kurang stabil sehingga demonstrasi platform digital dan pendaftaran izin online sempat terhambat.",
        solution: "Mempersiapkan formulir dan materi secara luring (offline) terlebih dahulu, lalu proses unggah data dilakukan saat sinyal kembali stabil."
      },
    ]
  }
];

const OUTPUT_EXAMPLES: ExampleCategory[] = [
  {
    id: "keuangan",
    label: "Keuangan",
    icon: Wallet,
    examples: [
      {
        title: "Penundaan Pembayaran Piutang Konsinyasi",
        obstacle: "Penundaan pembayaran tempo piutang dari beberapa toko mitra konsinyasi menyebabkan arus kas operasional bulan ini sempat mengalami defisit sementara."
      },
      {
        title: "Kenaikan Beban Operasional",
        obstacle: "Kenaikan biaya sewa tempat usaha dan tarif listrik operasional menyebabkan margin keuntungan bersih bulan ini terkoreksi turun sebesar 8%."
      },
    ]
  },
  {
    id: "pemasaran",
    label: "Pemasaran",
    icon: TrendingUp,
    examples: [
      {
        title: "Persaingan Pasar & Fluktuasi Permintaan",
        obstacle: "Terjadi penurunan volume penjualan sekitar 15% akibat maraknya kompetitor produk sejenis di pasar lokal dan penurunan daya beli konsumen pasca hari raya."
      },
      {
        title: "Efektivitas Biaya Promosi Iklan",
        obstacle: "Biaya promosi digital meningkat namun rasio konversi pesanan belum optimal akibat perubahan algoritma media sosial dan perlu evaluasi target audiens."
      },
    ]
  },
  {
    id: "produksi",
    label: "Produksi",
    icon: Factory,
    examples: [
      {
        title: "Kenaikan Bahan Baku & Faktor Cuaca",
        obstacle: "Kenaikan harga bahan baku pokok sebesar 20% serta curah hujan tinggi yang menghambat proses pengeringan bahan baku, menurunkan kapasitas produksi bulanan."
      },
      {
        title: "Kendala Kerusakan Mesin Produksi",
        obstacle: "Kerusakan pada mesin pencetak utama selama 4 hari mengakibatkan terhambatnya pemenuhan target pesanan grosir tepat waktu."
      },
    ]
  },
  {
    id: "sdm_legalitas",
    label: "Legalitas & SDM",
    icon: FileCheck2,
    examples: [
      {
        title: "Turnover Tenaga Kerja Produksi",
        obstacle: "Tingginya pergantian tenaga kerja produksi harian membuat kapasitas produksi sempat melambat karena pemilik usaha harus berulang kali melatih pekerja baru."
      },
      {
        title: "Proses Perizinan Lanjutan (P-IRT / BPOM)",
        obstacle: "Proses verifikasi uji laboratorium untuk pengurusan izin edar P-IRT baru masih berjalan, sehingga rencana ekspansi produk ke minimarket modern masih tertunda."
      },
    ]
  }
];

interface ObstacleExamplesPopoverProps {
  type: "logbook" | "output-report";
  onSelect: (obstacle: string, solution?: string) => void;
  className?: string;
}

export function ObstacleExamplesPopover({
  type,
  onSelect,
  className,
}: ObstacleExamplesPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<string | null>(null);

  const categories = type === "logbook" ? LOGBOOK_EXAMPLES : OUTPUT_EXAMPLES;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success("Teks berhasil disalin ke clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApply = (example: ObstacleExample) => {
    onSelect(example.obstacle, example.solution);
    setOpen(false);
    toast.success(
      type === "logbook"
        ? "Contoh kendala & solusi berhasil diterapkan ke formulir!"
        : "Contoh kendala berhasil diterapkan ke formulir!"
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-6 px-2 text-[11px] font-medium gap-1 text-primary border-primary/30 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer rounded-full",
            className
          )}
        >
          <Sparkles className="h-3 w-3 text-amber-500 fill-amber-500/20" />
          Lihat Contoh Kendala
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={6}
        className="w-[360px] sm:w-[460px] p-0 shadow-xl border-border/80 rounded-xl overflow-hidden"
      >
        {/* Popover Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-3.5 border-b flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">
              Inspirasi / Contoh Kendala {type === "logbook" ? "& Solusi" : "Usaha"}
            </h4>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pilih contoh yang sesuai dengan situasi dampingan Anda, atau klik <strong>Gunakan</strong> untuk mengisi form langsung.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs defaultValue={categories[0].id} className="w-full">
          <div className="px-3 pt-2.5 bg-muted/20 border-b">
            <TabsList className="grid grid-cols-4 h-8 p-0.5 bg-muted/60">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger
                    key={cat.id}
                    value={cat.id}
                    className="text-[10.5px] px-1 h-7 data-[state=active]:bg-background data-[state=active]:shadow-xs flex items-center gap-1"
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {categories.map((cat) => (
            <TabsContent
              key={cat.id}
              value={cat.id}
              className="p-3 space-y-2.5 max-h-[300px] overflow-y-auto focus-visible:outline-none"
            >
              {cat.examples.map((example, idx) => {
                const itemKey = `${cat.id}-${idx}`;
                const isCopied = copiedIndex === itemKey;

                return (
                  <div
                    key={itemKey}
                    className="p-2.5 rounded-lg border bg-card hover:border-primary/40 hover:bg-muted/10 transition-all duration-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
                          {cat.label}
                        </Badge>
                        {example.title}
                      </span>
                    </div>

                    {/* Obstacle Section */}
                    <div className="bg-muted/30 p-2 rounded-md border border-border/50">
                      <p className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-0.5">
                        Kendala:
                      </p>
                      <p className="text-[11px] text-foreground/90 leading-relaxed">
                        "{example.obstacle}"
                      </p>
                    </div>

                    {/* Solution Section (For Logbook) */}
                    {example.solution && (
                      <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-md border border-emerald-200/50 dark:border-emerald-900/40">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
                          Solusi / Pendampingan:
                        </p>
                        <p className="text-[11px] text-foreground/90 leading-relaxed">
                          "{example.solution}"
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            example.solution
                              ? `Kendala: ${example.obstacle}\nSolusi: ${example.solution}`
                              : example.obstacle,
                            itemKey
                          )
                        }
                        className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            Salin
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleApply(example)}
                        className="h-6 px-2.5 text-[10.5px] font-medium bg-primary/90 hover:bg-primary text-primary-foreground gap-1 cursor-pointer"
                      >
                        <span>Gunakan Contoh</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
