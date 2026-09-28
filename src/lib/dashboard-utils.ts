export function computeGreeting(userName?: string) {
  const hour = new Date().getHours();
  let text = "Selamat Datang";
  let description = "Semoga aktivitas pendampingan hari ini berjalan lancar.";
  let iconName = "sun";

  if (hour >= 4 && hour < 11) {
    text = "Selamat Pagi";
    description = "Awali hari dengan memeriksa progres dan capaian terbaru.";
    iconName = "sun";
  } else if (hour >= 11 && hour < 15) {
    text = "Selamat Siang";
    description = "Pantau aktivitas harian dan pembaruan data pendampingan.";
    iconName = "sun";
  } else if (hour >= 15 && hour < 18) {
    text = "Selamat Sore";
    description = "Tinjau rekap aktivitas dan evaluasi pencapaian hari ini.";
    iconName = "sunset";
  } else {
    text = "Selamat Malam";
    description = "Istirahat sejenak dan persiapkan rencana esok hari.";
    iconName = "moon";
  }

  if (userName) {
    text = `${text}, ${userName}!`;
  }

  return { text, description, iconName };
}

export function computeDemographics(applicants: any[]) {
  const eduMap = new Map<string, number>();
  const sectorMap = new Map<string, number>();
  const provinceMap = new Map<string, number>();
  const genderMap = new Map<string, number>();

  const ageGroups = [
    { name: "< 20", count: 0 },
    { name: "20 - 29", count: 0 },
    { name: "30 - 39", count: 0 },
    { name: "40 - 49", count: 0 },
    { name: "≥ 50", count: 0 },
  ];

  applicants.forEach((app) => {
    // Pendidikan
    const edu = app.profile?.lastEducation || app.lastEducation || "Tidak Ada Data";
    eduMap.set(edu, (eduMap.get(edu) || 0) + 1);

    // Sektor Usaha
    const sec = app.businessProfile?.sector || app.businessSector || app.sector || "Lainnya";
    sectorMap.set(sec, (sectorMap.get(sec) || 0) + 1);

    // Jenis Kelamin
    const rawGender = (app.profile?.gender || app.gender || "").toString().trim().toUpperCase();
    let genderLabel =
      rawGender === "MALE" || rawGender === "LAKI_LAKI" || rawGender === "LAKI-LAKI" || rawGender === "L"
        ? "Laki-laki"
        : rawGender === "FEMALE" || rawGender === "PEREMPUAN" || rawGender === "P"
        ? "Perempuan"
        : null;

    // Fallback deteksi gender dari digit NIK jika belum ada (NIK wanita: tanggal lahir + 40, sehingga hari > 40)
    if (!genderLabel && app.profile?.nik && app.profile.nik.length === 16) {
      const day = parseInt(app.profile.nik.substring(6, 8), 10);
      if (!isNaN(day)) {
        genderLabel = day > 40 ? "Perempuan" : "Laki-laki";
      }
    }

    if (genderLabel) {
      genderMap.set(genderLabel, (genderMap.get(genderLabel) || 0) + 1);
    }

    // Provinsi
    const prov =
      app.profile?.addresses?.find((a: any) => a.provinceName)?.provinceName ||
      app.address?.provinceName ||
      app.wilayah ||
      null;
    if (prov) {
      const cleanProv = prov.trim().toUpperCase();
      provinceMap.set(cleanProv, (provinceMap.get(cleanProv) || 0) + 1);
    }

    // Umur
    let birthDate = app.profile?.birthDate ? new Date(app.profile.birthDate) : null;
    if (!birthDate && app.profile?.nik && app.profile.nik.length === 16) {
      const nik = app.profile.nik;
      const day = parseInt(nik.substring(6, 8), 10);
      const month = parseInt(nik.substring(8, 10), 10);
      let year = parseInt(nik.substring(10, 12), 10);
      const realDay = day > 40 ? day - 40 : day;
      year += year > 30 ? 1900 : 2000;
      if (realDay >= 1 && realDay <= 31 && month >= 1 && month <= 12) {
        birthDate = new Date(year, month - 1, realDay);
      }
    }

    if (birthDate && !isNaN(birthDate.getTime())) {
      const age = new Date().getFullYear() - birthDate.getFullYear();
      if (age < 20) ageGroups[0].count++;
      else if (age <= 29) ageGroups[1].count++;
      else if (age <= 39) ageGroups[2].count++;
      else if (age <= 49) ageGroups[3].count++;
      else ageGroups[4].count++;
    }
  });

  const topEducations = Array.from(eduMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topSectors = Array.from(sectorMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topProvinces = Array.from(provinceMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const genderGroups = Array.from(genderMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return { topEducations, ageGroups, topSectors, topProvinces, genderGroups };
}
