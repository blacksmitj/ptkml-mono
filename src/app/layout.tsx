import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Roboto, Roboto_Slab } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import QueryProvider from "@/components/providers/query-provider";
import { FilePreviewProvider } from "@/components/providers/file-preview-provider";
import { ConfirmProvider } from "@/components/providers/confirm-provider";

const robotoSlabHeading = Roboto_Slab({subsets:['latin'],variable:'--font-heading'});

const roboto = Roboto({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TKML Lanjutan - Sistem Pendampingan",
  description: "Platform Monitoring & Evaluasi Pendampingan TKML",
};

import { DevRoleSwitcher } from "@/components/dev-role-switcher";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", roboto.variable, robotoSlabHeading.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem={true}
            disableTransitionOnChange
          >
            <TooltipProvider>
              <FilePreviewProvider>
                <ConfirmProvider>
                  {children}
                  <DevRoleSwitcher />
                </ConfirmProvider>
              </FilePreviewProvider>
              <Toaster position="top-right" richColors closeButton />
            </TooltipProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
