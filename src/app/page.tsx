import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RootPage() {
  return (
    <div className="flex min-h-svh md:h-svh flex-col md:flex-row relative overflow-hidden bg-background">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

      {/* Left side: Hero Text & Actions */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-12 lg:p-16 xl:p-20 z-10 relative min-h-svh md:min-h-0 md:h-full">
        <div></div>{" "}
        {/* spacer to help center content vertically with justify-between */}
        <div className="max-w-xl my-auto py-4 md:py-0">
          <div className="mb-6 md:mb-8">
            <img
              src="/logo.png"
              alt="Pendampingan TKML oleh Kemnaker"
              className="h-10 md:h-12 w-auto object-contain dark:brightness-0 dark:invert transition-all duration-200"
            />
          </div>

          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-4 md:mb-6">
            Versi 3.0
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4 md:mb-6 leading-tight">
            Platform Monitoring <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-primary to-primary/60">
              & Evaluasi TKML
            </span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-lg leading-relaxed">
            Sistem Terintegrasi Pendampingan Tenaga Kerja Mandiri Lanjutan.
            Kelola data peserta, pendamping, logbook, dan laporan output dalam
            satu pintu.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-8">
            <Button
              asChild
              size="lg"
              className="h-11 md:h-12 px-6 md:px-8 scale-[0.98]"
            >
              <Link href="/login">Masuk ke Akun</Link>
            </Button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs md:text-sm text-muted-foreground font-medium border-t pt-6 md:pt-8 border-border">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              Verifikasi Real-time
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              Multi Workspace
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              Analitik Visual
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground pt-4">
          &copy; {new Date().getFullYear()} Tim Pengembang Sistem Pendampingan
        </div>
      </div>

      {/* Right side: Full Image Cover */}
      <div className="hidden md:block flex-1 relative h-full">
        <img
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
          alt="Working space"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Soft elegant overlay */}
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/10 to-transparent"></div>
      </div>
    </div>
  );
}
