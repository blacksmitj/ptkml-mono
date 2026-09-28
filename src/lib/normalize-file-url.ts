export function normalizeFileUrl(url: string | null | undefined): string {
  if (!url) return "";
  
  const bucketName = process.env.MINIO_BUCKET || "pendampingan";
  const bucketPrefix = `/${bucketName}/`;

  const knownCategories = [
    "employee_ktp",
    "employee_salary_slip",
    "employee_bpjs_card",
    "output_income_proof",
    "output_cashflow_proof",
    "expense_proof",
    "logbook",
    "receipt",
    "university-logos",
  ];

  // Helper: check if a path starts with a known category folder
  function startsWithKnownCategory(path: string): boolean {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return knownCategories.some(cat => cleanPath.startsWith(cat + "/"));
  }

  try {
    // If already a relative path starting with bucket prefix, return as-is
    if (url.startsWith(bucketPrefix)) return url;
    
    // If relative path starting with known category (missing bucket), prepend bucket
    if (startsWithKnownCategory(url)) {
      const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
      return `${bucketPrefix}${cleanUrl}`;
    }

    // If relative path starting with /files/, convert to bucket prefix
    if (url.startsWith("/files/")) {
      return url.replace("/files/", bucketPrefix);
    }
    
    // Parse as full URL and extract pathname
    const parsed = new URL(url);
    
    const isLocalhost = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const isProductionDomain = parsed.hostname === "pendampingantkml.kemnaker.go.id";
    
    if (!isLocalhost && !isProductionDomain) {
      return url;
    }
    
    const pathname = parsed.pathname;
    
    // Handle /files/ prefix → bucket prefix
    if (pathname.startsWith("/files/")) {
      return bucketPrefix + pathname.slice("/files/".length);
    }
    
    // Already bucket prefix path
    if (pathname.startsWith(bucketPrefix)) {
      return pathname;
    }

    // Pathname starts with known category folder (bucket missing in URL)
    if (startsWithKnownCategory(pathname)) {
      const cleanPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
      return `${bucketPrefix}${cleanPath}`;
    }
    
    // Fallback: strip domain, keep path
    return pathname;
  } catch {
    // If URL parsing fails, try simple string operations
    if (startsWithKnownCategory(url)) {
      const cleanUrl = url.startsWith("/") ? url.slice(1) : url;
      return `${bucketPrefix}${cleanUrl}`;
    }

    const patterns = [
      /^https?:\/\/[^/]+\/files\//,
      new RegExp(`^https?:\\/\\/[^/]+\\/${bucketName}\\/`),
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        const match = url.match(pattern);
        if (match) {
          const pathStart = url.indexOf("/files/") !== -1 
            ? url.indexOf("/files/") 
            : url.indexOf(bucketPrefix);
          if (pathStart !== -1) {
            let path = url.slice(pathStart);
            if (path.startsWith("/files/")) {
              path = bucketPrefix + path.slice("/files/".length);
            }
            return path;
          }
        }
      }
    }
    
    return url;
  }
}
