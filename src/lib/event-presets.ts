export interface EventActionPreset {
  id: string;
  label: string;
  url: string;
  actionLabel: string;
}

export const EVENT_ACTION_PRESETS: EventActionPreset[] = [
  {
    id: "logbook_pending",
    label: "Verifikasi Logbook Pending",
    url: "/logbooks?status=PENDING",
    actionLabel: "Verifikasi Logbook",
  },
  {
    id: "output_pending",
    label: "Verifikasi Capaian Output Pending",
    url: "/output-reports?status=PENDING",
    actionLabel: "Verifikasi Output",
  },
  {
    id: "laporan_kinerja",
    label: "Cetak / Lihat Laporan Kinerja Pendamping",
    url: "/performance-report",
    actionLabel: "Lihat Laporan Kinerja",
  },
  {
    id: "output_initial",
    label: "Input Capaian Output Data Awal",
    url: "/output-reports/new",
    actionLabel: "Isi Data Awal",
  },
  {
    id: "output_month1",
    label: "Input Capaian Output Bulan Pertama",
    url: "/output-reports",
    actionLabel: "Isi Capaian Bulan 1",
  },
  {
    id: "applicants_list",
    label: "Kelola Peserta TKM",
    url: "/applicants",
    actionLabel: "Kelola Peserta",
  },
  {
    id: "custom",
    label: "Lainnya (Kustom URL)",
    url: "",
    actionLabel: "",
  },
];
