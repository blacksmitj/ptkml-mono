"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function DetailPage() {
  const params = useParams();
  const router = useRouter();
  const { module, id } = params;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight capitalize">Detail {module}</h1>
            <p className="text-muted-foreground">ID: {id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" /> Simpan
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informasi Utama</CardTitle>
            <CardDescription>Detail informasi untuk record ini.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Label 1</p>
                <p className="text-base font-semibold">Value 1</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Label 2</p>
                <p className="text-base font-semibold">Value 2</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Deskripsi / Catatan</p>
              <p className="text-sm leading-relaxed">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Dibuat Pada</p>
              <p className="text-sm">01 Januari 2024</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Terakhir Diubah</p>
              <p className="text-sm">05 Januari 2024</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="rounded-xl border bg-muted/50 p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Edit className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Formulir & Detail Spesifik</h3>
          <p className="text-muted-foreground max-w-sm">
            Konten spesifik untuk modul <span className="font-bold">{module}</span> akan diimplementasikan pada Fase 4.
          </p>
        </div>
      </div>
    </div>
  );
}
