"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/use-app-store";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceRole } from "@/types";

import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

import { useSearchParams } from "next/navigation";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/workspaces";
  const queryClient = useQueryClient();
  const setRole = useAppStore((state) => state.setRole);
  const setUserId = useAppStore((state) => state.setUserId);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const allowLocalLogin = process.env.NEXT_PUBLIC_ALLOW_LOCAL_LOGIN !== "false";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data } = await apiClient.post("/auth/login", {
        username,
        password,
      });

      if (data.success) {
        queryClient.clear();
        toast.success(`Selamat datang, ${data.user.name}!`);
        setRole(data.user.role);
        setUserId(data.user.id);
        router.push(redirectTarget);
        router.refresh(); // Force refresh to update server components
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ||
          "Gagal masuk. Periksa kembali username/password.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0 border-none shadow-2xl rounded-3xl">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form
            className="p-6 md:p-12 flex flex-col justify-center"
            onSubmit={handleSubmit}
          >
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  Masuk
                </h1>
                <p className="text-muted-foreground">
                  {allowLocalLogin
                    ? "Gunakan akun development Anda untuk masuk."
                    : "Silakan gunakan layanan SSO untuk masuk ke dashboard."}
                </p>
              </div>

              <div className="space-y-4">
                {allowLocalLogin && (
                  <>
                    <Field>
                      <FieldLabel htmlFor="username">Username</FieldLabel>
                      <Input
                        id="username"
                        placeholder="admin"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        maxLength={100}
                        autoComplete="username"
                        className="h-12 rounded-xl"
                      />
                    </Field>

                    <Field>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={200}
                        autoComplete="current-password"
                        className="h-12 rounded-xl"
                      />
                    </Field>

                    <Button
                      type="submit"
                      className="w-full h-12 rounded-xl font-bold text-base"
                      disabled={isLoading}
                    >
                      {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
                    </Button>

                    <div className="relative flex items-center justify-center my-2">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-dashed" />
                      </div>
                      <span className="relative bg-card px-3 text-xs text-muted-foreground uppercase">
                        Atau
                      </span>
                    </div>
                  </>
                )}

                <Button
                  type="button"
                  variant={"default"}
                  className="w-full h-12 rounded-xl font-bold text-base bg-linear-to-r from-[#18bcac] to-[#3ab9b3] text-white"
                  onClick={() => {
                    const apiUrl =
                      process.env.NEXT_PUBLIC_API_URL ||
                      "http://localhost:5000/api";
                    window.location.href = `${apiUrl}/auth/kemnaker/login`;
                  }}
                >
                  Masuk dengan SiapKerja SSO
                </Button>

                <Link href="/">
                  <Button
                    className="w-full h-12 rounded-xl"
                    variant={"outline"}
                  >
                    Kembali
                  </Button>
                </Link>
              </div>
            </div>
          </form>
          <div className="relative hidden md:block overflow-hidden bg-zinc-900">
            <img
              src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop"
              alt="Background"
              className="absolute inset-0 h-full w-full object-cover brightness-[0.4] contrast-125 dark:brightness-[0.25] dark:grayscale"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/30" />
            <div className="relative z-10 flex h-full items-center justify-center p-12 text-white">
              <div className="text-center drop-shadow-md">
                <h2 className="text-3xl font-extrabold mb-4 tracking-tight">TKML Lanjutan</h2>
                <p className="text-lg text-zinc-100 font-medium opacity-95">
                  Sistem Terintegrasi Pendampingan Tenaga Kerja Mandiri
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="px-6 text-center text-xs text-muted-foreground">
        Produk dari Tim Pengembang Sistem Pendampingan
      </p>
    </div>
  );
}
