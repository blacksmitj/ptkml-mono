import ExcelJS from "exceljs";

export async function exportLogbooksToExcel(
  rawList: any[],
  options?: {
    startDate?: string;
    endDate?: string;
    role?: string;
  }
) {
  const isPrivilegedGlobal =
    options?.role === "SUPER_ADMIN" || options?.role === "WORKSPACE_SUPERVISOR";

  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Logbook Harian");

  ws.columns = [
    { header: "ID Logbook", key: "id", width: 28 },
    { header: "Tanggal", key: "logbookDate", width: 15 },
    { header: "Nama Pendamping", key: "mentorName", width: 25 },
    { header: "Waktu Mulai", key: "startTime", width: 12 },
    { header: "Waktu Selesai", key: "endTime", width: 12 },
    { header: "Metode", key: "deliveryMethod", width: 12 },
    { header: "Jenis Pertemuan", key: "meetingType", width: 15 },
    { header: "Jenis Kunjungan", key: "visitType", width: 15 },
    { header: "Jumlah Peserta Hadir", key: "attendeeCount", width: 20 },
    { header: "ID TKM Peserta", key: "attendeeTkmIds", width: 30 },
    { header: "Nama Peserta Hadir", key: "attendeeNames", width: 35 },
    { header: "Materi", key: "mentoringMaterial", width: 30 },
    { header: "Rangkuman", key: "activitySummary", width: 40 },
    { header: "Hambatan", key: "obstacle", width: 30 },
    { header: "Solusi", key: "solutions", width: 30 },
    { header: "Total Biaya", key: "totalExpense", width: 15 },
    { header: "Alasan Tanpa Biaya", key: "reasonNoExpense", width: 25 },
    { header: "Status", key: "verificationStatus", width: 15 },
    { header: "Catatan Verifikasi", key: "verificationNote", width: 25 },
    { header: "Diverifikasi Oleh", key: "verifiedByName", width: 25 },
    { header: "Tanggal Verifikasi", key: "verifiedAt", width: 20 },
    { header: "Dokumentasi Pendampingan", key: "logbookDocumentation", width: 50 },
    { header: "Bukti Pengeluaran", key: "expenseProof", width: 50 },
  ];

  const deliveryMethodLabels: Record<string, string> = {
    OFFLINE: "Luring (Offline)",
    ONLINE: "Daring (Online)",
  };

  const meetingTypeLabels: Record<string, string> = {
    INDIVIDUAL: "Individu",
    GROUP: "Kelompok",
  };

  const visitTypeLabels: Record<string, string> = {
    LOCAL: "Lokal",
    OUT_OF_TOWN: "Luar Kota",
    NONE: "-",
  };

  // Sheet 2: Peserta Pendampingan
  const participantSheet = workbook.addWorksheet("Peserta Pendampingan");

  const participantColumns: any[] = [
    { header: "ID Logbook", key: "logbookId", width: 28 },
    { header: "Tanggal", key: "logbookDate", width: 15 },
    { header: "Nama Pendamping", key: "mentorName", width: 25 },
    { header: "ID TKM", key: "idTkm", width: 20 },
    { header: "Nama Peserta TKML", key: "applicantName", width: 30 },
  ];

  if (isPrivilegedGlobal) {
    participantColumns.push({ header: "NIK", key: "nik", width: 20 });
  }

  participantColumns.push(
    { header: "No WhatsApp", key: "whatsapp", width: 18 },
    { header: "Materi", key: "mentoringMaterial", width: 30 },
    { header: "Status Logbook", key: "verificationStatus", width: 15 }
  );

  participantSheet.columns = participantColumns;

  rawList.forEach((item: any) => {
    const creatorProfile = item.createdBy?.user?.profile;
    const mentorName = creatorProfile?.name || "N/A";
    const logbookDateStr = item.logbookDate
      ? new Date(item.logbookDate).toLocaleDateString("id-ID")
      : "-";

    const logbookDocumentation = (item.files || [])
      .filter((f: any) => f.category === "LOGBOOK_DOCUMENTATION")
      .map((f: any) => f.url)
      .join("\n") || "-";

    const expenseProof = (item.files || [])
      .filter((f: any) => f.category === "EXPENSE_PROOF")
      .map((f: any) => f.url)
      .join("\n") || "-";

    const applicantsRel = item.applicants || [];
    const attendeeCount = applicantsRel.length;
    const attendeeTkmIds = applicantsRel
      .map((a: any) => a.applicant?.idTkm || "-")
      .filter(Boolean)
      .join(", ") || "-";
    const attendeeNames = applicantsRel
      .map((a: any) => a.applicant?.profile?.name || "-")
      .filter(Boolean)
      .join(", ") || "-";

    // Row for Sheet 1
    ws.addRow({
      id: item.id || "-",
      logbookDate: logbookDateStr,
      mentorName,
      startTime: item.startTime
        ? new Date(item.startTime).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      endTime: item.endTime
        ? new Date(item.endTime).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "-",
      deliveryMethod: deliveryMethodLabels[item.deliveryMethod] || item.deliveryMethod || "-",
      meetingType: meetingTypeLabels[item.meetingType] || item.meetingType || "-",
      visitType: visitTypeLabels[item.visitType] || item.visitType || "-",
      attendeeCount,
      attendeeTkmIds,
      attendeeNames,
      mentoringMaterial: item.mentoringMaterial || "-",
      activitySummary: item.activitySummary || "-",
      obstacle: item.obstacle || "-",
      solutions: item.solutions || "-",
      totalExpense:
        typeof item.totalExpense === "number"
          ? item.totalExpense
          : item.totalExpense
          ? Number(item.totalExpense)
          : 0,
      reasonNoExpense: item.reasonNoExpense || "-",
      verificationStatus: item.verificationStatus || "-",
      verificationNote: item.verificationNote || "-",
      verifiedByName: item.verifiedBy?.user?.profile?.name || "-",
      verifiedAt: item.verifiedAt
        ? new Date(item.verifiedAt).toLocaleString("id-ID")
        : "-",
      logbookDocumentation,
      expenseProof,
    });

    // Rows for Sheet 2 (one row per participant)
    applicantsRel.forEach((rel: any) => {
      const applicant = rel.applicant;
      const profile = applicant?.profile;

      const rowData: any = {
        logbookId: item.id || "-",
        logbookDate: logbookDateStr,
        mentorName,
        idTkm: applicant?.idTkm || "-",
        applicantName: profile?.name || "-",
        whatsapp: profile?.whatsapp || "-",
        mentoringMaterial: item.mentoringMaterial || "-",
        verificationStatus: item.verificationStatus || "-",
      };

      if (isPrivilegedGlobal) {
        rowData.nik = profile?.nik || "-";
      }

      participantSheet.addRow(rowData);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const dateSuffix =
    options?.startDate && options?.endDate
      ? `_${options.startDate}_sd_${options.endDate}`
      : options?.startDate
      ? `_dari_${options.startDate}`
      : options?.endDate
      ? `_sd_${options.endDate}`
      : `_${new Date().toISOString().split("T")[0]}`;
  a.download = `logbook${dateSuffix}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportOutputReportsToExcel(rawList: any[], options?: { role?: string }) {
  const isSuperAdmin = options?.role === "SUPER_ADMIN";
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Laporan Capaian Output
  const ws = workbook.addWorksheet("Laporan Capaian Output");

  ws.columns = [
    { header: "Nama Peserta", key: "applicantName", width: 25 },
    { header: "ID TKM", key: "applicantIdTkm", width: 20 },
    { header: "Tanggal", key: "createdAt", width: 15 },
    { header: "Bulan Laporan", key: "monthReport", width: 15 },
    { header: "Omzet", key: "revenue", width: 20 },
    { header: "Kapasitas Produksi", key: "productionCapacity", width: 20 },
    { header: "Satuan Kapasitas Produksi", key: "productionCapacityUnit", width: 22 },
    { header: "Volume Penjualan", key: "salesVolume", width: 20 },
    { header: "Satuan Volume Penjualan", key: "salesVolumeUnit", width: 22 },
    { header: "Area Pemasaran", key: "marketingArea", width: 20 },
    { header: "Buku Kas Harian", key: "bookkeepingCashflow", width: 20 },
    { header: "Catatan Laba Rugi Bulanan", key: "bookkeepingIncomeStatement", width: 28 },
    { header: "Status Omzet", key: "businessCondition", width: 35 },
    { header: "Hambatan", key: "obstacle", width: 35 },
    { header: "Status Verifikasi", key: "verificationStatus", width: 15 },
    { header: "Catatan Verifikasi", key: "verificationNote", width: 25 },
    { header: "Diverifikasi Oleh", key: "verifiedByName", width: 25 },
    { header: "Tanggal Verifikasi", key: "verifiedAt", width: 20 },
    { header: "Bukti Cashflow", key: "cashflowProof", width: 50 },
    { header: "Bukti Catatan Laba Rugi Bulanan", key: "incomeProof", width: 50 },
  ];

  rawList.forEach((item: any) => {
    const applicant = item.applicant;
    const profile = applicant?.profile;
    const applicantName = profile?.name || "N/A";
    const applicantIdTkm = applicant?.idTkm || "N/A";

    const cashflowProof = (item.files || [])
      .filter((f: any) => f.category === "OUTPUT_CASHFLOW_PROOF")
      .map((f: any) => f.url)
      .join("\n") || "-";

    const incomeProof = (item.files || [])
      .filter((f: any) => f.category === "OUTPUT_INCOME_PROOF")
      .map((f: any) => f.url)
      .join("\n") || "-";

    const marketingAreaLabels: Record<string, string> = {
      VILLAGE: "Desa/Kelurahan",
      DISTRICT: "Kecamatan",
      CITY: "Kabupaten/Kota",
      PROVINCE: "Provinsi",
      INTERNATIONAL: "Internasional",
    };

    const bookkeepingLabels: Record<string, string> = {
      NONE: "Tidak Menerapkan",
      MANUAL: "Manual (Buku)",
      EXCEL: "Excel/Spreadsheet",
      APPLICATION: "Aplikasi Digital",
    };

    const formatBusinessCondition = (cond: string) => {
      if (cond === "stabil" || cond === "tetap") return "Tetap";
      if (cond === "meningkat") return "Meningkat";
      if (cond === "turun") return "Turun";
      return cond || "-";
    };

    ws.addRow({
      applicantName,
      applicantIdTkm,
      createdAt: new Date(item.createdAt).toLocaleDateString("id-ID"),
      monthReport: item.monthReport === 0 ? "Data Awal" : `Bulan ${item.monthReport}`,
      revenue: typeof item.revenue === "number" ? item.revenue : (item.revenue ? Number(item.revenue) : 0),
      productionCapacity: typeof item.productionCapacity === "number" ? item.productionCapacity : (item.productionCapacity ? Number(item.productionCapacity) : 0),
      productionCapacityUnit: item.productionCapacityUnit || "-",
      salesVolume: typeof item.salesVolume === "number" ? item.salesVolume : (item.salesVolume ? Number(item.salesVolume) : 0),
      salesVolumeUnit: item.salesVolumeUnit || "-",
      marketingArea: marketingAreaLabels[item.marketingArea] || item.marketingArea,
      bookkeepingCashflow: bookkeepingLabels[item.bookkeepingCashflow] || item.bookkeepingCashflow,
      bookkeepingIncomeStatement: bookkeepingLabels[item.bookkeepingIncomeStatement] || item.bookkeepingIncomeStatement,
      businessCondition: formatBusinessCondition(item.businessCondition),
      obstacle: item.obstacle || "-",
      verificationStatus: item.verificationStatus,
      verificationNote: item.verificationNote || "-",
      verifiedByName: item.verifiedBy?.user?.profile?.name || "-",
      verifiedAt: item.verifiedAt ? new Date(item.verifiedAt).toLocaleString("id-ID") : "-",
      cashflowProof,
      incomeProof,
    });
  });

  // Sheet 2: Daftar Karyawan
  const employeeSheet = workbook.addWorksheet("Daftar Karyawan");
  const employeeColumns: any[] = [
    { header: "Nama Peserta", key: "applicantName", width: 25 },
    { header: "ID TKM", key: "applicantIdTkm", width: 20 },
    { header: "Bulan Laporan", key: "monthReport", width: 15 },
    { header: "Nama Karyawan", key: "employeeName", width: 25 },
    { header: "NIK", key: "nik", width: 20 },
    { header: "Jabatan", key: "role", width: 15 },
    { header: "Jenis Kelamin", key: "gender", width: 15 },
    { header: "Status Hubungan Kerja", key: "employmentStatus", width: 20 },
    { header: "Disabilitas", key: "disability", width: 20 },
    { header: "Status BPJS", key: "bpjsStatus", width: 25 },
    { header: "Nomor BPJS", key: "bpjsNumber", width: 20 },
    { header: "Validasi NIK", key: "nikStatus", width: 15 },
    ...(isSuperAdmin ? [{ header: "KTP Karyawan", key: "employeeKtp", width: 50 }] : []),
    { header: "Slip Gaji Karyawan", key: "employeeSalarySlip", width: 50 },
    { header: "Kartu BPJS Karyawan", key: "employeeBpjsCard", width: 50 },
    { header: "Status Verifikasi Capaian Output", key: "verificationStatus", width: 25 },
    { header: "Catatan Verifikasi Capaian Output", key: "verificationNote", width: 30 },
    { header: "Diverifikasi Oleh", key: "verifiedByName", width: 25 },
    { header: "Tanggal Verifikasi", key: "verifiedAt", width: 20 },
  ];
  employeeSheet.columns = employeeColumns;

  rawList.forEach((report: any) => {
    const applicant = report.applicant;
    const profile = applicant?.profile;
    const applicantName = profile?.name || "N/A";
    const applicantIdTkm = applicant?.idTkm || "N/A";
    const monthReport = report.monthReport === 0 ? "Data Awal" : `Bulan ${report.monthReport}`;

    const employees = report.employees || [];
    employees.forEach((emp: any) => {
      const disabilityText = emp.hasDisability 
        ? `Ya (${
            emp.disabilityType === "disabilitas_daksa" ? "Fisik (Daksa)" :
            emp.disabilityType === "disabilitas_netra" ? "Sensorik (Netra)" :
            emp.disabilityType === "disabilitas_rungu" ? "Sensorik (Rungu)" :
            emp.disabilityType === "disabilitas_wicara" ? "Sensorik (Wicara)" :
            emp.disabilityType === "disabilitas_intelektual" ? "Intelektual" :
            emp.disabilityType === "disabilitas_mental" ? "Mental" :
            emp.disabilityType || "Penyandang Disabilitas"
          })` 
        : "Tidak";
      const bpjsTypeLabel = emp.bpjsType === "WAGE_EARNER" 
        ? "Penerima Upah (PU)" 
        : emp.bpjsType === "NON_WAGE_EARNER" 
        ? "Bukan Penerima Upah (BPU)" 
        : emp.bpjsType || "Tidak ditentukan";
      const bpjsText = emp.bpjsStatus === "REGISTERED" 
        ? `Terdaftar (${bpjsTypeLabel})` 
        : "Tidak Terdaftar";

      const employeeKtp = isSuperAdmin
        ? (emp.files || [])
            .filter((f: any) => f.category === "EMPLOYEE_KTP")
            .map((f: any) => f.url)
            .join("\n") || "-"
        : "-";

      const employeeSalarySlip = (emp.files || [])
        .filter((f: any) => f.category === "EMPLOYEE_SALARY_SLIP")
        .map((f: any) => f.url)
        .join("\n") || "-";

      const employeeBpjsCard = (emp.files || [])
        .filter((f: any) => f.category === "EMPLOYEE_BPJS_CARD")
        .map((f: any) => f.url)
        .join("\n") || "-";

      const rowData: Record<string, any> = {
        applicantName,
        applicantIdTkm,
        monthReport,
        employeeName: emp.name,
        nik: emp.nik,
        role: emp.role,
        gender: emp.gender === "MALE" ? "Laki-laki" : "Perempuan",
        employmentStatus: emp.employmentStatus,
        disability: disabilityText,
        bpjsStatus: bpjsText,
        bpjsNumber: emp.bpjsNumber || "-",
        nikStatus: emp.nikStatus,
        employeeSalarySlip,
        employeeBpjsCard,
        verificationStatus: report.verificationStatus,
        verificationNote: report.verificationNote || "-",
        verifiedByName: report.verifiedBy?.user?.profile?.name || "-",
        verifiedAt: report.verifiedAt ? new Date(report.verifiedAt).toLocaleString("id-ID") : "-",
      };
      if (isSuperAdmin) {
        rowData.employeeKtp = employeeKtp;
      }
      employeeSheet.addRow(rowData);
    });
  });

  // Sheet 3: Matrix Capaian Output
  const matrixSheet = workbook.addWorksheet("Capaian Output");
  matrixSheet.columns = [
    { header: "ID TKM", key: "idTkm", width: 20 },
    { header: "Nama", key: "name", width: 25 },
    { header: "NIK", key: "nik", width: 20 },
    { header: "Tanggal Lahir", key: "birthDate", width: 15 },
    { header: "Umur", key: "age", width: 10 },
    { header: "Nama Usaha", key: "businessName", width: 25 },
    { header: "Jenis Usaha", key: "businessType", width: 20 },
    { header: "Sektor Usaha", key: "businessSector", width: 20 },
    { header: "Alamat Usaha", key: "businessAddress", width: 35 },
    { header: "Kelurahan Usaha", key: "businessSubdistrict", width: 20 },
    { header: "Kecamatan Usaha", key: "businessDistrict", width: 20 },
    { header: "Kota Usaha", key: "businessCity", width: 20 },
    { header: "Provinsi Usaha", key: "businessProvince", width: 20 },
    { header: "Tanggal Laporan Bulan Data Awal", key: "reportDateB0", width: 18 },
    { header: "Tanggal Laporan Bulan 1", key: "reportDateB1", width: 18 },
    { header: "Tanggal Laporan Bulan 2", key: "reportDateB2", width: 18 },
    { header: "Tanggal Laporan Bulan 3", key: "reportDateB3", width: 18 },
    { header: "Pendamping", key: "mentorName", width: 25 },
    { header: "Universitas", key: "universityName", width: 25 },
    { header: "Omzet Bulan Data Awal", key: "revenueB0", width: 22 },
    { header: "Omzet Bulan 1", key: "revenueB1", width: 20 },
    { header: "Status Omzet Bulan 1", key: "statusRevenueB1", width: 22 },
    { header: "Persentase Status Omzet Bulan 1", key: "pctRevenueB1", width: 28 },
    { header: "Omzet Bulan 2", key: "revenueB2", width: 20 },
    { header: "Status Omzet Bulan 2", key: "statusRevenueB2", width: 22 },
    { header: "Persentase Status Omzet Bulan 2", key: "pctRevenueB2", width: 28 },
    { header: "Omzet Bulan 3", key: "revenueB3", width: 20 },
    { header: "Status Omzet Bulan 3", key: "statusRevenueB3", width: 22 },
    { header: "Persentase Status Omzet Bulan 3", key: "pctRevenueB3", width: 28 },
    { header: "Rata-rata Omzet", key: "avgRevenue", width: 20 },
    { header: "Status Omzet Final", key: "statusRevenueFinal", width: 20 },
    { header: "Persentase Status Omzet Final", key: "pctRevenueFinal", width: 26 },
    { header: "Omset Menigkat Terus", key: "omzetMeningkatTerus", width: 22 },
    { header: "B3/B0", key: "ratioB3B0", width: 18 },
    { header: "B123/B0", key: "ratioB123B0", width: 18 },
    { header: "Kapasitas Produksi Bulan Data Awal", key: "productionB0", width: 30 },
    { header: "Satuan Kapasitas Produksi Bulan Data Awal", key: "productionUnitB0", width: 32 },
    { header: "Kapasitas Produksi Bulan 1", key: "productionB1", width: 25 },
    { header: "Satuan Kapasitas Produksi Bulan 1", key: "productionUnitB1", width: 28 },
    { header: "Kapasitas Produksi Bulan 2", key: "productionB2", width: 25 },
    { header: "Satuan Kapasitas Produksi Bulan 2", key: "productionUnitB2", width: 28 },
    { header: "Kapasitas Produksi Bulan 3", key: "productionB3", width: 25 },
    { header: "Satuan Kapasitas Produksi Bulan 3", key: "productionUnitB3", width: 28 },
    { header: "Volume Penjualan Bulan Data Awal", key: "salesB0", width: 28 },
    { header: "Satuan Volume Penjualan Bulan Data Awal", key: "salesUnitB0", width: 30 },
    { header: "Volume Penjualan Bulan 1", key: "salesB1", width: 25 },
    { header: "Satuan Volume Penjualan Bulan 1", key: "salesUnitB1", width: 28 },
    { header: "Volume Penjualan Bulan 2", key: "salesB2", width: 25 },
    { header: "Satuan Volume Penjualan Bulan 2", key: "salesUnitB2", width: 28 },
    { header: "Volume Penjualan Bulan 3", key: "salesB3", width: 25 },
    { header: "Satuan Volume Penjualan Bulan 3", key: "salesUnitB3", width: 28 },
    { header: "Area Pemasaran Bulan Data Awal", key: "marketingAreaB0", width: 28 },
    { header: "Area Pemasaran Bulan 1", key: "marketingAreaB1", width: 25 },
    { header: "Area Pemasaran Bulan 2", key: "marketingAreaB2", width: 25 },
    { header: "Area Pemasaran Bulan 3", key: "marketingAreaB3", width: 25 },
    { header: "Penerapan Buku Kas Bulan Data Awal", key: "cashflowB0", width: 30 },
    { header: "Penerapan Buku Kas Bulan 1", key: "cashflowB1", width: 28 },
    { header: "Penerapan Buku Kas Bulan 2", key: "cashflowB2", width: 28 },
    { header: "Penerapan Buku Kas Bulan 3", key: "cashflowB3", width: 28 },
    { header: "Status Penerapan Buku Kas Bulan 3", key: "cashflowStatusB3", width: 30 },
    { header: "Penerapan BukuKas Final", key: "cashflowFinal", width: 25 },
    { header: "Bukti Buku Kas Bulan Data Awal", key: "cashflowProofB0", width: 35 },
    { header: "Bukti Buku Kas Bulan 1", key: "cashflowProofB1", width: 35 },
    { header: "Bukti Buku Kas Bulan 2", key: "cashflowProofB2", width: 35 },
    { header: "Bukti Buku Kas Bulan 3", key: "cashflowProofB3", width: 35 },
    { header: "Penerapan Laba Rugi Bulan Data Awal", key: "incomeStatementB0", width: 32 },
    { header: "Penerapan Laba Rugi Bulan 1", key: "incomeStatementB1", width: 28 },
    { header: "Penerapan Laba Rugi Bulan 2", key: "incomeStatementB2", width: 28 },
    { header: "Penerapan Laba Rugi Bulan 3", key: "incomeStatementB3", width: 28 },
    { header: "Status Penerapan Laba Rugi Bulan 3", key: "incomeStatementStatusB3", width: 32 },
    { header: "Penerapan Laba Rugi final", key: "incomeStatementFinal", width: 25 },
    { header: "Status Penerapan Catatan Keuangan", key: "financialRecordStatus", width: 32 },
    { header: "Status Catatan Keuangan Final", key: "financialRecordFinal", width: 28 },
    { header: "Bukti Laba Rugi Bulan Data Awal", key: "incomeProofB0", width: 35 },
    { header: "Bukti Laba Rugi Bulan 1", key: "incomeProofB1", width: 35 },
    { header: "Bukti Laba Rugi Bulan 2", key: "incomeProofB2", width: 35 },
    { header: "Bukti Laba Rugi Bulan 3", key: "incomeProofB3", width: 35 },
    { header: "Verifikasi Awal", key: "verificationB0", width: 18 },
    { header: "Verifikasi 1", key: "verificationB1", width: 15 },
    { header: "Verifikasi 2", key: "verificationB2", width: 15 },
    { header: "Verifikasi 3", key: "verificationB3", width: 15 },
    { header: "Verifikasi Final", key: "verificationFinal", width: 18 },
  ];

  const marketingAreaLabels: Record<string, string> = {
    VILLAGE: "Desa/Kelurahan",
    DISTRICT: "Kecamatan",
    CITY: "Kabupaten/Kota",
    PROVINCE: "Provinsi",
    INTERNATIONAL: "Internasional",
  };

  const bookkeepingLabels: Record<string, string> = {
    NONE: "Tidak Menerapkan",
    MANUAL: "Manual (Buku)",
    EXCEL: "Excel/Spreadsheet",
    APPLICATION: "Aplikasi Digital",
  };

  // Group reports by applicant
  const applicantMap = new Map<string, { applicant: any; reports: any[] }>();
  rawList.forEach((rep: any) => {
    const app = rep.applicant;
    const key = app?.id || app?.idTkm || rep.applicantId;
    if (!key) return;

    if (!applicantMap.has(key)) {
      applicantMap.set(key, { applicant: app, reports: [] });
    }
    applicantMap.get(key)!.reports.push(rep);
  });

  applicantMap.forEach(({ applicant, reports }) => {
    const profile = applicant?.profile || {};
    const businessProfile = applicant?.businessProfile || {};
    const mentorProfile = applicant?.mentor?.user?.profile || {};
    const university = applicant?.university || {};

    // Get Business Address
    const addresses = profile.addresses || [];
    const busAddress = addresses.find((a: any) => a.label === "BUSINESS") || addresses[0] || {};

    // Calculate age (numeric)
    let age: number | string = "-";
    if (profile.birthDate) {
      const bDate = new Date(profile.birthDate);
      const diffMs = Date.now() - bDate.getTime();
      const ageDt = new Date(diffMs);
      age = Math.abs(ageDt.getUTCFullYear() - 1970);
    }

    // Sort reports by monthReport ascending
    const sortedReports = [...reports].sort((a, b) => a.monthReport - b.monthReport);
    const rB0 = sortedReports.find((r) => r.monthReport === 0);
    const rB1 = sortedReports.find((r) => r.monthReport === 1);
    const rB2 = sortedReports.find((r) => r.monthReport === 2);
    const rB3 = sortedReports.find((r) => r.monthReport === 3);

    // Dates
    const fmtDate = (r?: any) => (r?.createdAt ? new Date(r.createdAt).toLocaleDateString("id-ID") : "-");
    const reportDateB0 = fmtDate(rB0);
    const reportDateB1 = fmtDate(rB1);
    const reportDateB2 = fmtDate(rB2);
    const reportDateB3 = fmtDate(rB3);

    // Revenues as raw numbers
    const rev0 = rB0?.revenue !== undefined && rB0?.revenue !== null ? Number(rB0.revenue) : null;
    const rev1 = rB1?.revenue !== undefined && rB1?.revenue !== null ? Number(rB1.revenue) : null;
    const rev2 = rB2?.revenue !== undefined && rB2?.revenue !== null ? Number(rB2.revenue) : null;
    const rev3 = rB3?.revenue !== undefined && rB3?.revenue !== null ? Number(rB3.revenue) : null;

    // Monthly status and percentage vs previous month / B0
    const calcGrowth = (curr: number | null, prev: number | null) => {
      if (curr === null || prev === null) return { status: "-", pct: null as number | null };
      const diff = curr - prev;
      let pct = 0;
      if (prev > 0) {
        pct = (diff / prev) * 100;
      } else {
        pct = curr > 0 ? 100 : 0;
      }
      let status = "Tetap";
      if (diff > 0) status = "Naik";
      else if (diff < 0) status = "Turun";
      return { status, pct: Math.round(pct * 100) / 100 };
    };

    const growthB1 = calcGrowth(rev1, rev0);
    const growthB2 = calcGrowth(rev2, rev1 !== null ? rev1 : rev0);
    const growthB3 = calcGrowth(rev3, rev2 !== null ? rev2 : (rev1 !== null ? rev1 : rev0));

    // Rata-rata Omzet
    const validRevs = [rev0, rev1, rev2, rev3].filter((v): v is number => v !== null);
    const avgRevenueNum = validRevs.length > 0 ? Math.round((validRevs.reduce((a, b) => a + b, 0) / validRevs.length) * 100) / 100 : null;

    // Status Omzet Final & Persentase Status Omzet Final (perbandingan B3 terhadap B0, atau latest terhadap B0)
    const latestRev = rev3 !== null ? rev3 : (rev2 !== null ? rev2 : (rev1 !== null ? rev1 : null));
    const growthFinal = calcGrowth(latestRev, rev0);

    // Omset Meningkat Terus
    // True / Ya jika B0 < B1 < B2 < B3 atau seluruh urutan laporan bulanan yang ada selalu naik
    let omzetMeningkatTerus = "-";
    if (rev0 !== null && rev1 !== null && rev2 !== null && rev3 !== null) {
      omzetMeningkatTerus = (rev0 < rev1 && rev1 < rev2 && rev2 < rev3) ? "Ya" : "Tidak";
    } else if (rev1 !== null && rev2 !== null && rev3 !== null) {
      omzetMeningkatTerus = (rev1 < rev2 && rev2 < rev3) ? "Ya" : "Tidak";
    }

    // B3/B0 & B123/B0 as raw numeric percentage values
    let ratioB3B0: number | string = "-";
    if (rev0 !== null && rev3 !== null) {
      if (rev0 > 0) {
        ratioB3B0 = Math.round((((rev3 - rev0) / rev0) * 100) * 100) / 100;
      } else {
        ratioB3B0 = rev3 > 0 ? 100 : 0;
      }
    }

    let ratioB123B0: number | string = "-";
    const monthlyRevs = [rev1, rev2, rev3].filter((v): v is number => v !== null);
    if (rev0 !== null && monthlyRevs.length > 0) {
      const avgMonthly = monthlyRevs.reduce((a, b) => a + b, 0) / monthlyRevs.length;
      if (rev0 > 0) {
        ratioB123B0 = Math.round((((avgMonthly - rev0) / rev0) * 100) * 100) / 100;
      } else {
        ratioB123B0 = avgMonthly > 0 ? 100 : 0;
      }
    }

    // Production & Sales (Separated raw value and unit)
    const getCapacityVal = (r?: any) => (r && r.productionCapacity !== undefined && r.productionCapacity !== null ? Number(r.productionCapacity) : null);
    const getCapacityUnit = (r?: any) => r?.productionCapacityUnit || "-";
    const getSalesVal = (r?: any) => (r && r.salesVolume !== undefined && r.salesVolume !== null ? Number(r.salesVolume) : null);
    const getSalesUnit = (r?: any) => r?.salesVolumeUnit || "-";

    // Marketing Area
    const fmtArea = (r?: any) => (r?.marketingArea ? marketingAreaLabels[r.marketingArea] || r.marketingArea : "-");

    // Bookkeeping
    const fmtBk = (val?: string) => (val ? bookkeepingLabels[val] || val : "-");
    const isMenerapkan = (val?: string) => val && val !== "NONE";

    const cashflowStatusB3 = rB3 ? (isMenerapkan(rB3.bookkeepingCashflow) ? "Menerapkan" : "Tidak Menerapkan") : "-";
    const cashflowFinal = rB3 
      ? (isMenerapkan(rB3.bookkeepingCashflow) ? "Menerapkan" : "Tidak Menerapkan")
      : ([rB0, rB1, rB2].some((r) => isMenerapkan(r?.bookkeepingCashflow)) ? "Menerapkan" : "Tidak Menerapkan");

    const incomeStatementStatusB3 = rB3 ? (isMenerapkan(rB3.bookkeepingIncomeStatement) ? "Menerapkan" : "Tidak Menerapkan") : "-";
    const incomeStatementFinal = rB3
      ? (isMenerapkan(rB3.bookkeepingIncomeStatement) ? "Menerapkan" : "Tidak Menerapkan")
      : ([rB0, rB1, rB2].some((r) => isMenerapkan(r?.bookkeepingIncomeStatement)) ? "Menerapkan" : "Tidak Menerapkan");

    const financialRecordStatus = (isMenerapkan(rB3?.bookkeepingCashflow) || isMenerapkan(rB3?.bookkeepingIncomeStatement)) ? "Menerapkan" : "Tidak Menerapkan";
    const financialRecordFinal = (cashflowFinal === "Menerapkan" || incomeStatementFinal === "Menerapkan") ? "Menerapkan" : "Tidak Menerapkan";

    // Proof Files Helper
    const getProof = (r?: any, category?: string) => {
      if (!r || !r.files) return "-";
      return r.files
        .filter((f: any) => f.category === category)
        .map((f: any) => f.url)
        .join("\n") || "-";
    };

    // Verification Status
    const fmtVerif = (r?: any) => r?.verificationStatus || "-";
    const verifB0 = fmtVerif(rB0);
    const verifB1 = fmtVerif(rB1);
    const verifB2 = fmtVerif(rB2);
    const verifB3 = fmtVerif(rB3);

    // Verifikasi Final: APPROVED jika B0..B3 semua ada dan APPROVED
    const allReports = [rB0, rB1, rB2, rB3].filter(Boolean);
    const isAllApproved = allReports.length === 4 && allReports.every((r) => r.verificationStatus === "APPROVED");
    const hasRejected = allReports.some((r) => r.verificationStatus === "REJECTED");
    const verificationFinal = isAllApproved ? "APPROVED" : hasRejected ? "REJECTED" : "PENDING";

    matrixSheet.addRow({
      idTkm: applicant?.idTkm || "-",
      name: profile?.name || "-",
      nik: profile?.nik || "-",
      birthDate: profile?.birthDate ? new Date(profile.birthDate).toLocaleDateString("id-ID") : "-",
      age,
      businessName: businessProfile?.businessName || "-",
      businessType: businessProfile?.businessType || "-",
      businessSector: businessProfile?.businessSector || "-",
      businessAddress: busAddress.address || "-",
      businessSubdistrict: busAddress.subdistrictName || "-",
      businessDistrict: busAddress.districtName || "-",
      businessCity: busAddress.cityName || "-",
      businessProvince: busAddress.provinceName || "-",
      reportDateB0,
      reportDateB1,
      reportDateB2,
      reportDateB3,
      mentorName: mentorProfile?.name || "-",
      universityName: university?.name || "-",
      revenueB0: rev0 !== null ? rev0 : "-",
      revenueB1: rev1 !== null ? rev1 : "-",
      statusRevenueB1: growthB1.status,
      pctRevenueB1: growthB1.pct !== null ? growthB1.pct : "-",
      revenueB2: rev2 !== null ? rev2 : "-",
      statusRevenueB2: growthB2.status,
      pctRevenueB2: growthB2.pct !== null ? growthB2.pct : "-",
      revenueB3: rev3 !== null ? rev3 : "-",
      statusRevenueB3: growthB3.status,
      pctRevenueB3: growthB3.pct !== null ? growthB3.pct : "-",
      avgRevenue: avgRevenueNum !== null ? avgRevenueNum : "-",
      statusRevenueFinal: growthFinal.status,
      pctRevenueFinal: growthFinal.pct !== null ? growthFinal.pct : "-",
      omzetMeningkatTerus,
      ratioB3B0,
      ratioB123B0,
      productionB0: getCapacityVal(rB0) !== null ? getCapacityVal(rB0) : "-",
      productionUnitB0: getCapacityUnit(rB0),
      productionB1: getCapacityVal(rB1) !== null ? getCapacityVal(rB1) : "-",
      productionUnitB1: getCapacityUnit(rB1),
      productionB2: getCapacityVal(rB2) !== null ? getCapacityVal(rB2) : "-",
      productionUnitB2: getCapacityUnit(rB2),
      productionB3: getCapacityVal(rB3) !== null ? getCapacityVal(rB3) : "-",
      productionUnitB3: getCapacityUnit(rB3),
      salesB0: getSalesVal(rB0) !== null ? getSalesVal(rB0) : "-",
      salesUnitB0: getSalesUnit(rB0),
      salesB1: getSalesVal(rB1) !== null ? getSalesVal(rB1) : "-",
      salesUnitB1: getSalesUnit(rB1),
      salesB2: getSalesVal(rB2) !== null ? getSalesVal(rB2) : "-",
      salesUnitB2: getSalesUnit(rB2),
      salesB3: getSalesVal(rB3) !== null ? getSalesVal(rB3) : "-",
      salesUnitB3: getSalesUnit(rB3),
      marketingAreaB0: fmtArea(rB0),
      marketingAreaB1: fmtArea(rB1),
      marketingAreaB2: fmtArea(rB2),
      marketingAreaB3: fmtArea(rB3),
      cashflowB0: fmtBk(rB0?.bookkeepingCashflow),
      cashflowB1: fmtBk(rB1?.bookkeepingCashflow),
      cashflowB2: fmtBk(rB2?.bookkeepingCashflow),
      cashflowB3: fmtBk(rB3?.bookkeepingCashflow),
      cashflowStatusB3,
      cashflowFinal,
      cashflowProofB0: getProof(rB0, "OUTPUT_CASHFLOW_PROOF"),
      cashflowProofB1: getProof(rB1, "OUTPUT_CASHFLOW_PROOF"),
      cashflowProofB2: getProof(rB2, "OUTPUT_CASHFLOW_PROOF"),
      cashflowProofB3: getProof(rB3, "OUTPUT_CASHFLOW_PROOF"),
      incomeStatementB0: fmtBk(rB0?.bookkeepingIncomeStatement),
      incomeStatementB1: fmtBk(rB1?.bookkeepingIncomeStatement),
      incomeStatementB2: fmtBk(rB2?.bookkeepingIncomeStatement),
      incomeStatementB3: fmtBk(rB3?.bookkeepingIncomeStatement),
      incomeStatementStatusB3,
      incomeStatementFinal,
      financialRecordStatus,
      financialRecordFinal,
      incomeProofB0: getProof(rB0, "OUTPUT_INCOME_PROOF"),
      incomeProofB1: getProof(rB1, "OUTPUT_INCOME_PROOF"),
      incomeProofB2: getProof(rB2, "OUTPUT_INCOME_PROOF"),
      incomeProofB3: getProof(rB3, "OUTPUT_INCOME_PROOF"),
      verificationB0: verifB0,
      verificationB1: verifB1,
      verificationB2: verifB2,
      verificationB3: verifB3,
      verificationFinal,
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `capaian_output_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportMentorsToExcel(
  rawList: any[],
  options?: {
    universityName?: string;
    statusFilter?: string;
  }
) {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Daftar Pendamping");

  // Title / metadata row
  const univTitle = options?.universityName ? `Universitas: ${options.universityName}` : "Cakupan: Semua Universitas";
  const statusLabel =
    options?.statusFilter === "APPROVED"
      ? "Aktif (Approved)"
      : options?.statusFilter === "PENDING"
      ? "Menunggu Verifikasi"
      : options?.statusFilter === "REJECTED"
      ? "Ditolak"
      : "Semua Status";

  ws.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Nama Lengkap", key: "name", width: 28 },
    { header: "NIK", key: "nik", width: 20 },
    { header: "Email", key: "email", width: 28 },
    { header: "No. WhatsApp", key: "whatsapp", width: 18 },
    { header: "Perguruan Tinggi", key: "universityName", width: 30 },
    { header: "Alamat Domisili", key: "address", width: 35 },
    { header: "Kelurahan / Desa", key: "subdistrict", width: 20 },
    { header: "Kecamatan", key: "district", width: 20 },
    { header: "Kota / Kabupaten", key: "city", width: 22 },
    { header: "Provinsi", key: "province", width: 22 },
    { header: "Kode Pos", key: "postalCode", width: 12 },
    { header: "Pendidikan Terakhir", key: "lastEducation", width: 20 },
    { header: "Disabilitas", key: "hasDisability", width: 14 },
    { header: "Jumlah Binaan (TKM)", key: "participantCount", width: 20 },
    { header: "Status Akun", key: "verificationStatus", width: 18 },
  ];

  // Styling Header Row
  const headerRow = ws.getRow(1);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }, // Dark Blue
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });

  // Populate data
  rawList.forEach((item: any, index: number) => {
    const profile = item.user?.profile;
    const addr = profile?.addresses?.[0] || null;

    const statusMap: Record<string, string> = {
      APPROVED: "Aktif",
      PENDING: "Menunggu",
      REJECTED: "Ditolak",
    };

    const row = ws.addRow({
      no: index + 1,
      name: profile?.name || item.user?.username || "N/A",
      nik: profile?.nik ? `'${profile.nik}` : "-",
      email: profile?.email || item.user?.email || "-",
      whatsapp: profile?.whatsapp ? `'${profile.whatsapp}` : "-",
      universityName: item.university?.name || "-",
      address: addr?.address || "-",
      subdistrict: addr?.subdistrictName || "-",
      district: addr?.districtName || "-",
      city: addr?.cityName || "-",
      province: addr?.provinceName || "-",
      postalCode: addr?.postalCode || "-",
      lastEducation: profile?.lastEducation || "-",
      hasDisability: profile?.hasDisability ? "Ya" : "Tidak",
      participantCount: item._count?.applicants ?? 0,
      verificationStatus: statusMap[item.verificationStatus] || item.verificationStatus || "-",
    });

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Alignment rules
      if (colNumber === 1 || colNumber === 14 || colNumber === 15 || colNumber === 16) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 3 || colNumber === 5 || colNumber === 12) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      // Zebra striping
      if ((index + 1) % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      }
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const univSlug = options?.universityName
    ? `_${options.universityName.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 20)}`
    : "";
  a.download = `daftar_pendamping${univSlug}_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportRtlToExcel(
  rawList: any[],
  options?: {
    statusFilter?: string;
  }
) {
  const workbook = new ExcelJS.Workbook();

  const statusMap: Record<string, string> = {
    APPROVED: "Disetujui",
    SUBMITTED: "Menunggu Verifikasi",
    DRAFT: "Draft",
    REJECTED: "Perlu Revisi",
  };

  const categoryLabels: Record<string, string> = {
    MODAL: "Bantuan Modal",
    ALAT: "Alat & Mesin Produksi",
    PELATIHAN: "Pelatihan & Bimtek",
    LEGALITAS: "Sertifikasi & Legalitas",
    PASAR: "Akses Pasar & Ekosistem",
    LAINNYA: "Intervensi Khusus Lain",
  };

  const priorityLabels: Record<string, string> = {
    HIGH: "Tinggi",
    MEDIUM: "Sedang",
    LOW: "Rendah",
  };

  // ==========================================
  // SHEET 1: DAFTAR RTL PESERTA
  // ==========================================
  const wsRtl = workbook.addWorksheet("Daftar RTL");

  wsRtl.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "ID TKM", key: "idTkm", width: 18 },
    { header: "Nama Peserta TKML", key: "applicantName", width: 30 },
    { header: "Nama Usaha", key: "businessName", width: 28 },
    { header: "Sektor Usaha", key: "businessSector", width: 22 },
    { header: "Perguruan Tinggi", key: "universityName", width: 30 },
    { header: "Nama Pendamping", key: "mentorName", width: 26 },
    { header: "Status RTL", key: "status", width: 22 },
    { header: "Jml Temuan", key: "findingsCount", width: 14 },
    { header: "Jml Rekomendasi", key: "recommendationsCount", width: 18 },
    { header: "Catatan Akhir Pendamping", key: "mentorNote", width: 40 },
    { header: "Catatan Verifikator", key: "reviewNote", width: 40 },
    { header: "Diverifikasi Oleh", key: "reviewedByName", width: 24 },
    { header: "Tanggal Diajukan", key: "submittedAt", width: 20 },
    { header: "Tanggal Verifikasi", key: "reviewedAt", width: 20 },
  ];

  // Header Styling Sheet 1
  const headerRtl = wsRtl.getRow(1);
  headerRtl.height = 26;
  headerRtl.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F766E" }, // Teal 700
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });

  // ==========================================
  // SHEET 2: RINCIAN REKOMENDASI (INTERVENSI)
  // ==========================================
  const wsDetails = workbook.addWorksheet("Rincian Rekomendasi");

  wsDetails.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "ID TKM", key: "idTkm", width: 18 },
    { header: "Nama Peserta", key: "applicantName", width: 30 },
    { header: "Nama Usaha", key: "businessName", width: 26 },
    { header: "Nama Pendamping", key: "mentorName", width: 26 },
    { header: "Usulan / Jenis Intervensi", key: "interventionType", width: 34 },
    { header: "Tingkat Prioritas", key: "priority", width: 18 },
    { header: "Uraian / Deskripsi Tindak Lanjut", key: "description", width: 50 },
  ];

  // Header Styling Sheet 2
  const headerDetails = wsDetails.getRow(1);
  headerDetails.height = 26;
  headerDetails.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0369A1" }, // Sky/Blue 700
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "medium" },
      right: { style: "thin" },
    };
  });

  // Populate Data
  let detailRowIndex = 1;

  rawList.forEach((item: any, index: number) => {
    const applicant = item.applicant || {};
    const profile = applicant.profile || {};
    const business = applicant.businessProfile || {};
    const univ = applicant.university || {};
    const mentor = item.mentor || {};
    const mentorProfile = mentor.user?.profile || {};
    const reviewer = item.reviewedBy || {};
    const reviewerProfile = reviewer.user?.profile || {};

    const applicantName = profile.name || applicant.name || "N/A";
    const idTkm = applicant.idTkm || applicant.registrationNumber || "-";
    const businessName = business.businessName || profile.businessName || "-";
    const businessSector = business.businessSector || "-";
    const universityName = univ.name || "-";
    const mentorName = mentorProfile.name || mentor.user?.username || "-";

    const findingsArr = Array.isArray(item.findings) ? item.findings : [];
    const recommendationsArr = Array.isArray(item.recommendations) ? item.recommendations : [];

    const submittedDateStr = item.submittedAt
      ? new Date(item.submittedAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

    const reviewedDateStr = item.reviewedAt
      ? new Date(item.reviewedAt).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "-";

    // Row Sheet 1
    const row = wsRtl.addRow({
      no: index + 1,
      idTkm,
      applicantName,
      businessName,
      businessSector,
      universityName,
      mentorName,
      status: statusMap[item.status] || item.status || "-",
      findingsCount: findingsArr.length,
      recommendationsCount: recommendationsArr.length,
      mentorNote: item.mentorNote || "-",
      reviewNote: item.reviewNote || "-",
      reviewedByName: reviewerProfile.name || reviewer.user?.username || "-",
      submittedAt: submittedDateStr,
      reviewedAt: reviewedDateStr,
    });

    row.height = 22;
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if ([1, 2, 8, 9, 10, 14, 15].includes(colNumber)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      if ((index + 1) % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0FDFA" }, // Teal 50 light zebra
        };
      }
    });

    // Populate Sheet 2: Rekomendasi
    if (recommendationsArr.length > 0) {
      recommendationsArr.forEach((rec: any) => {
        const rawPriority = rec.priority || rec.urgency || "";
        const priorityLabel = priorityLabels[rawPriority] || rawPriority || "-";
        const interventionTitle = rec.interventionType || rec.title || "-";

        const dRow = wsDetails.addRow({
          no: detailRowIndex++,
          idTkm,
          applicantName,
          businessName,
          mentorName,
          interventionType: interventionTitle,
          priority: priorityLabel,
          description: rec.description || "-",
        });

        dRow.height = 22;
        dRow.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };

          if ([1, 2, 7].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
          }

          if (detailRowIndex % 2 === 0) {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFF0F9FF" }, // Sky 50 light zebra
            };
          }
        });
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const statusSlug = options?.statusFilter && options.statusFilter !== "ALL"
    ? `_${options.statusFilter.toLowerCase()}`
    : "";
  a.download = `rekap_rtl_tkm${statusSlug}_${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

