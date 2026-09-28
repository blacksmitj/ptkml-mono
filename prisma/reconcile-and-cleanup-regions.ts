import "dotenv/config";
import prisma from "../src/lib/prisma";
import { delCachePattern } from "../src/lib/redis";

/**
 * Self-contained region normalizer
 */
function cleanRegionName(rawName: string): string {
  if (!rawName) return "";
  return rawName
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
    .replace(
      /\b(provinsi|prov\.|prov|kabupaten|kab\.|kab|kota|kotamadya|kecamatan|kec\.|kec|kelurahan|kel\.|kel|desa|dsn|kampung|kp\.|kp)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper to check if an ID is a dynamic CUID rather than an official Kemendagri code (numeric)
 */
function isCuidId(id: string): boolean {
  if (!id) return false;
  return !/^\d+$/.test(id);
}

async function reconcileAndCleanup() {
  console.log("=================================================================");
  console.log("  BATCH REGION RECONCILIATION & CLEANUP SCRIPT");
  console.log("=================================================================\n");

  // 1. Scan for CUID Cities
  const allCities: any[] = await prisma.city.findMany({
    include: { province: true },
  });
  const cuidCities = allCities.filter((c) => isCuidId(c.id));
  const officialCities = allCities.filter((c) => !isCuidId(c.id));

  console.log(`[1/5] Scanning Cities:`);
  console.log(`  - Total Cities: ${allCities.length}`);
  console.log(`  - Official Cities: ${officialCities.length}`);
  console.log(`  - CUID (Duplicate/Dynamic) Cities: ${cuidCities.length}`);

  const cityMapping = new Map<string, { id: string; name: string }>();

  for (const cc of cuidCities) {
    const normName = cleanRegionName(cc.name);
    const provId = cc.provinceId;

    const match =
      officialCities.find(
        (oc) => oc.provinceId === provId && cleanRegionName(oc.name) === normName
      ) ||
      officialCities.find(
        (oc) =>
          oc.provinceId === provId &&
          (cleanRegionName(oc.name).includes(normName) ||
            normName.includes(cleanRegionName(oc.name)))
      ) ||
      officialCities.find((oc) => oc.provinceId === provId) ||
      officialCities[0];

    if (match) {
      cityMapping.set(cc.id, { id: match.id, name: match.name });
      console.log(`    Mapped CUID City "${cc.name}" (${cc.id}) -> Official "${match.name}" (${match.id})`);
    } else {
      console.warn(`    ⚠️ Could not find official match for City "${cc.name}" (${cc.id})`);
    }
  }

  // 2. Scan for CUID Districts
  const allDistricts: any[] = await prisma.district.findMany({
    include: { city: true },
  });
  const cuidDistricts = allDistricts.filter((d) => isCuidId(d.id));
  const officialDistricts = allDistricts.filter((d) => !isCuidId(d.id));

  console.log(`\n[2/5] Scanning Districts:`);
  console.log(`  - Total Districts: ${allDistricts.length}`);
  console.log(`  - Official Districts: ${officialDistricts.length}`);
  console.log(`  - CUID Districts: ${cuidDistricts.length}`);

  const districtMapping = new Map<string, { id: string; name: string }>();

  for (const cd of cuidDistricts) {
    const normName = cleanRegionName(cd.name);
    const mappedCity = cityMapping.get(cd.cityId);
    const targetCityId = mappedCity ? mappedCity.id : cd.cityId;

    const match =
      officialDistricts.find(
        (od) =>
          od.cityId === targetCityId && cleanRegionName(od.name) === normName
      ) ||
      officialDistricts.find(
        (od) =>
          od.cityId === targetCityId &&
          (cleanRegionName(od.name).includes(normName) ||
            normName.includes(cleanRegionName(od.name)))
      ) ||
      officialDistricts.find((od) => od.cityId === targetCityId) ||
      officialDistricts[0];

    if (match) {
      districtMapping.set(cd.id, { id: match.id, name: match.name });
      console.log(`    Mapped CUID District "${cd.name}" (${cd.id}) -> Official "${match.name}" (${match.id})`);
    } else {
      console.warn(`    ⚠️ Could not find official match for District "${cd.name}" (${cd.id})`);
    }
  }

  // 3. Scan for CUID Subdistricts
  const allSubdistricts: any[] = await prisma.subdistrict.findMany({
    include: { district: true },
  });
  const cuidSubdistricts = allSubdistricts.filter((s) => isCuidId(s.id));
  const officialSubdistricts = allSubdistricts.filter((s) => !isCuidId(s.id));

  console.log(`\n[3/5] Scanning Subdistricts:`);
  console.log(`  - Total Subdistricts: ${allSubdistricts.length}`);
  console.log(`  - Official Subdistricts: ${officialSubdistricts.length}`);
  console.log(`  - CUID Subdistricts: ${cuidSubdistricts.length}`);

  const subdistrictMapping = new Map<string, { id: string; name: string }>();

  for (const cs of cuidSubdistricts) {
    const normName = cleanRegionName(cs.name);
    const mappedDist = districtMapping.get(cs.districtId);
    const targetDistId = mappedDist ? mappedDist.id : cs.districtId;

    const match =
      officialSubdistricts.find(
        (os) =>
          os.districtId === targetDistId && cleanRegionName(os.name) === normName
      ) ||
      officialSubdistricts.find(
        (os) =>
          os.districtId === targetDistId &&
          (cleanRegionName(os.name).includes(normName) ||
            normName.includes(cleanRegionName(os.name)))
      ) ||
      officialSubdistricts.find((os) => os.districtId === targetDistId) ||
      officialSubdistricts[0];

    if (match) {
      subdistrictMapping.set(cs.id, { id: match.id, name: match.name });
      console.log(`    Mapped CUID Subdistrict "${cs.name}" (${cs.id}) -> Official "${match.name}" (${match.id})`);
    } else {
      console.warn(`    ⚠️ Could not find official match for Subdistrict "${cs.name}" (${cs.id})`);
    }
  }

  // 4. Update Addresses referencing CUIDs
  console.log(`\n[4/5] Updating Address records...`);
  const addressesToUpdate: any[] = await prisma.address.findMany({
    where: {
      OR: [
        { cityId: { in: Array.from(cityMapping.keys()) } },
        { districtId: { in: Array.from(districtMapping.keys()) } },
        { subdistrictId: { in: Array.from(subdistrictMapping.keys()) } },
      ],
    },
  });

  console.log(`  Found ${addressesToUpdate.length} addresses with CUID references.`);

  let updatedCount = 0;
  for (const addr of addressesToUpdate) {
    const updatedData: any = {};

    if (cityMapping.has(addr.cityId)) {
      const mc = cityMapping.get(addr.cityId)!;
      updatedData.cityId = mc.id;
      updatedData.cityName = mc.name;
    }

    if (districtMapping.has(addr.districtId)) {
      const md = districtMapping.get(addr.districtId)!;
      updatedData.districtId = md.id;
      updatedData.districtName = md.name;
    }

    if (subdistrictMapping.has(addr.subdistrictId)) {
      const ms = subdistrictMapping.get(addr.subdistrictId)!;
      updatedData.subdistrictId = ms.id;
      updatedData.subdistrictName = ms.name;
    }

    if (Object.keys(updatedData).length > 0) {
      await prisma.address.update({
        where: { id: addr.id },
        data: updatedData,
      });
      updatedCount++;
    }
  }
  console.log(`  ✅ Successfully updated ${updatedCount} Address records to official Kemendagri IDs.`);

  // 5. Safe Delete CUID Subdistricts, Districts, Cities
  console.log(`\n[5/5] Deleting orphaned CUID regions...`);

  const remainingAddresses: any[] = await prisma.address.findMany({
    where: {
      OR: [
        { cityId: { in: cuidCities.map((c) => c.id) } },
        { districtId: { in: cuidDistricts.map((d) => d.id) } },
        { subdistrictId: { in: cuidSubdistricts.map((s) => s.id) } },
      ],
    },
    select: { id: true, cityId: true, districtId: true, subdistrictId: true },
  });

  const stillReferencedSubdistIds = new Set(remainingAddresses.map((a) => a.subdistrictId));
  const stillReferencedDistIds = new Set(remainingAddresses.map((a) => a.districtId));
  const stillReferencedCityIds = new Set(remainingAddresses.map((a) => a.cityId));

  const deletableSubdists = cuidSubdistricts.filter((s) => !stillReferencedSubdistIds.has(s.id));
  if (deletableSubdists.length > 0) {
    const delSub = await prisma.subdistrict.deleteMany({
      where: { id: { in: deletableSubdists.map((s) => s.id) } },
    });
    console.log(`  - Deleted ${delSub.count} CUID Subdistrict records.`);
  }

  const deletableDists = cuidDistricts.filter((d) => !stillReferencedDistIds.has(d.id));
  if (deletableDists.length > 0) {
    const delDist = await prisma.district.deleteMany({
      where: { id: { in: deletableDists.map((d) => d.id) } },
    });
    console.log(`  - Deleted ${delDist.count} CUID District records.`);
  }

  const deletableCities = cuidCities.filter((c) => !stillReferencedCityIds.has(c.id));
  if (deletableCities.length > 0) {
    const delCity = await prisma.city.deleteMany({
      where: { id: { in: deletableCities.map((c) => c.id) } },
    });
    console.log(`  - Deleted ${delCity.count} CUID City records.`);
  }

  // Flush Redis cache
  try {
    await delCachePattern("geo:*");
    console.log(`  ✅ Redis cache keys (geo:*) cleared.`);
  } catch (err: any) {
    console.warn(`  ⚠️ Redis cache clear skipped:`, err.message);
  }

  console.log("\n=================================================================");
  console.log("  RECONCILIATION & CLEANUP COMPLETED SUCCESSFULLY! 🎉");
  console.log("=================================================================\n");
}

reconcileAndCleanup()
  .catch((err) => {
    console.error("FATAL ERROR during reconciliation:", err);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma?.$disconnect) {
      await prisma.$disconnect();
    }
  });
