import prisma from "./prisma";
import { getCache, setCache } from "./redis";
import type {
  Province,
  City,
  District,
  Subdistrict,
} from "@prisma/client";

/**
 * Helper to normalize region names by stripping common Indonesian administrative prefixes and punctuation
 */
export function cleanRegionName(rawName: string): string {
  if (!rawName) return "";
  return rawName
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ") // remove punctuation
    .replace(
      /\b(provinsi|prov\.|prov|kabupaten|kab\.|kab|kota|kotamadya|kecamatan|kec\.|kec|kelurahan|kel\.|kel|desa|dsn|kampung|kp\.|kp)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * In-memory LRU-like caches to avoid redundant DB/Redis hits during bulk operations
 */
const memProvinceCache = new Map<string, { id: string; name: string }>();
const memCityCache = new Map<string, { id: string; name: string }>();
const memDistrictCache = new Map<string, { id: string; name: string }>();
const memSubdistrictCache = new Map<string, { id: string; name: string }>();

/**
 * Resolve Province by name (STRICT READ-ONLY matching against official master)
 */
export async function resolveProvince(rawName: string): Promise<{ id: string; name: string }> {
  const normKey = cleanRegionName(rawName) || "jawa barat";
  if (memProvinceCache.has(normKey)) return memProvinceCache.get(normKey)!;

  const redisKey = `geo:v2:prov:${normKey}`;
  const cached = await getCache<{ id: string; name: string }>(redisKey);
  if (cached) {
    memProvinceCache.set(normKey, cached);
    return cached;
  }

  // 1. Exact match (case-insensitive)
  let prov: Province | null = await prisma.province.findFirst({
    where: { name: { equals: rawName.trim(), mode: "insensitive" } },
  });

  // 2. Cleaned name match
  if (!prov) {
    const allProvs: Province[] = await prisma.province.findMany();
    prov =
      allProvs.find((p: Province) => cleanRegionName(p.name) === normKey) ||
      allProvs.find(
        (p: Province) =>
          cleanRegionName(p.name).includes(normKey) ||
          normKey.includes(cleanRegionName(p.name))
      ) ||
      allProvs.find((p: Province) => p.name.toUpperCase().includes("JAWA BARAT")) ||
      allProvs[0] ||
      null;
  }

  if (!prov) {
    throw new Error(`Master Province data is empty. Please ensure master regions are seeded.`);
  }

  const result = { id: prov.id, name: prov.name };
  await setCache(redisKey, result, 86400 * 30);
  memProvinceCache.set(normKey, result);
  return result;
}

/**
 * Resolve City by name within a Province (STRICT READ-ONLY matching against official master)
 */
export async function resolveCity(
  rawName: string,
  provinceId: string
): Promise<{ id: string; name: string }> {
  const normKey = cleanRegionName(rawName) || "bandung";
  const cacheKey = `${provinceId}:${normKey}`;
  if (memCityCache.has(cacheKey)) return memCityCache.get(cacheKey)!;

  const redisKey = `geo:v2:city:${provinceId}:${normKey}`;
  const cached = await getCache<{ id: string; name: string }>(redisKey);
  if (cached) {
    memCityCache.set(cacheKey, cached);
    return cached;
  }

  const citiesInProv: City[] = await prisma.city.findMany({
    where: { provinceId },
  });

  // 1. Exact match (case-insensitive)
  let city: City | undefined = citiesInProv.find(
    (c: City) => c.name.trim().toLowerCase() === rawName.trim().toLowerCase()
  );

  // 2. Normalized match (without KAB/KOTA prefixes)
  if (!city) {
    city = citiesInProv.find((c: City) => cleanRegionName(c.name) === normKey);
  }

  // 3. Substring / Contains match
  if (!city) {
    city = citiesInProv.find((c: City) => {
      const cClean = cleanRegionName(c.name);
      return cClean.includes(normKey) || normKey.includes(cClean);
    });
  }

  // 4. Strict Fallback to existing official city (NEVER CREATE)
  let selectedCity: City | undefined = city || citiesInProv[0];

  if (!selectedCity) {
    const anyCity = await prisma.city.findFirst();
    if (!anyCity) {
      throw new Error(`Master City data is empty. Please ensure master regions are seeded.`);
    }
    selectedCity = anyCity;
  }

  const result = { id: selectedCity.id, name: selectedCity.name };
  await setCache(redisKey, result, 86400 * 30);
  memCityCache.set(cacheKey, result);
  return result;
}

/**
 * Resolve District by name within a City (STRICT READ-ONLY matching against official master)
 */
export async function resolveDistrict(
  rawName: string,
  cityId: string
): Promise<{ id: string; name: string }> {
  const normKey = cleanRegionName(rawName) || "-";
  const cacheKey = `${cityId}:${normKey}`;
  if (memDistrictCache.has(cacheKey)) return memDistrictCache.get(cacheKey)!;

  const redisKey = `geo:v2:dist:${cityId}:${normKey}`;
  const cached = await getCache<{ id: string; name: string }>(redisKey);
  if (cached) {
    memDistrictCache.set(cacheKey, cached);
    return cached;
  }

  const districtsInCity: District[] = await prisma.district.findMany({
    where: { cityId },
  });

  // 1. Exact match (case-insensitive)
  let dist: District | undefined = districtsInCity.find(
    (d: District) => d.name.trim().toLowerCase() === rawName.trim().toLowerCase()
  );

  // 2. Normalized match (without KEC prefixes)
  if (!dist) {
    dist = districtsInCity.find((d: District) => cleanRegionName(d.name) === normKey);
  }

  // 3. Contains match
  if (!dist) {
    dist = districtsInCity.find((d: District) => {
      const dClean = cleanRegionName(d.name);
      return dClean.includes(normKey) || normKey.includes(dClean);
    });
  }

  // 4. Strict Fallback to existing official district in city (NEVER CREATE)
  let selectedDist: District | undefined = dist || districtsInCity[0];

  if (!selectedDist) {
    const anyDist = await prisma.district.findFirst();
    if (!anyDist) {
      throw new Error(`Master District data is empty. Please ensure master regions are seeded.`);
    }
    selectedDist = anyDist;
  }

  const result = { id: selectedDist.id, name: selectedDist.name };
  await setCache(redisKey, result, 86400 * 30);
  memDistrictCache.set(cacheKey, result);
  return result;
}

/**
 * Resolve Subdistrict by name within a District (STRICT READ-ONLY matching against official master)
 */
export async function resolveSubdistrict(
  rawName: string,
  districtId: string
): Promise<{ id: string; name: string }> {
  const normKey = cleanRegionName(rawName) || "-";
  const cacheKey = `${districtId}:${normKey}`;
  if (memSubdistrictCache.has(cacheKey)) return memSubdistrictCache.get(cacheKey)!;

  const redisKey = `geo:v2:subdist:${districtId}:${normKey}`;
  const cached = await getCache<{ id: string; name: string }>(redisKey);
  if (cached) {
    memSubdistrictCache.set(cacheKey, cached);
    return cached;
  }

  const subdistrictsInDist: Subdistrict[] = await prisma.subdistrict.findMany({
    where: { districtId },
  });

  // 1. Exact match (case-insensitive)
  let subdist: Subdistrict | undefined = subdistrictsInDist.find(
    (s: Subdistrict) => s.name.trim().toLowerCase() === rawName.trim().toLowerCase()
  );

  // 2. Normalized match (without KEL/DESA prefixes)
  if (!subdist) {
    subdist = subdistrictsInDist.find((s: Subdistrict) => cleanRegionName(s.name) === normKey);
  }

  // 3. Contains match
  if (!subdist) {
    subdist = subdistrictsInDist.find((s: Subdistrict) => {
      const sClean = cleanRegionName(s.name);
      return sClean.includes(normKey) || normKey.includes(sClean);
    });
  }

  // 4. Strict Fallback to existing official subdistrict in district (NEVER CREATE)
  let selectedSubdist: Subdistrict | undefined = subdist || subdistrictsInDist[0];

  if (!selectedSubdist) {
    const anySubdist = await prisma.subdistrict.findFirst();
    if (!anySubdist) {
      throw new Error(`Master Subdistrict data is empty. Please ensure master regions are seeded.`);
    }
    selectedSubdist = anySubdist;
  }

  const result = { id: selectedSubdist.id, name: selectedSubdist.name };
  await setCache(redisKey, result, 86400 * 30);
  memSubdistrictCache.set(cacheKey, result);
  return result;
}

/**
 * Full hierarchical location resolver (100% STRICT READ-ONLY from Master Data)
 */
export async function resolveLocationHierarchy(
  provinceName: string,
  cityName: string,
  districtName: string,
  subdistrictName: string
) {
  const prov = await resolveProvince(provinceName);
  const city = await resolveCity(cityName, prov.id);
  const dist = await resolveDistrict(districtName, city.id);
  const subdist = await resolveSubdistrict(subdistrictName, dist.id);

  return {
    provinceId: prov.id,
    provinceName: prov.name,
    cityId: city.id,
    cityName: city.name,
    districtId: dist.id,
    districtName: dist.name,
    subdistrictId: subdist.id,
    subdistrictName: subdist.name,
  };
}
