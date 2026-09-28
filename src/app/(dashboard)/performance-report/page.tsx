"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PerformanceReportRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reports");
  }, [router]);

  return <div className="p-6 text-sm text-muted-foreground">Mengalihkan ke Download Center...</div>;
}
