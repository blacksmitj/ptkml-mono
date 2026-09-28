"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Edit } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { useCreateWorkspace, useUpdateWorkspace } from "@/hooks/use-workspaces";
import { Workspace } from "@/types";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nama workspace minimal 2 karakter.",
  }),
  year: z.number().min(2000).max(2100),
  code: z.string().optional().nullable(),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkspaceDialogProps {
  children?: React.ReactNode;
  initialData?: Workspace;
}

export function WorkspaceDialog({ children, initialData }: WorkspaceDialogProps) {
  const [open, setOpen] = useState(false);
  const createWorkspace = useCreateWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      year: initialData?.year || new Date().getFullYear(),
      code: initialData?.code || "",
      isActive: initialData?.isActive ?? true,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing) {
        await updateWorkspace.mutateAsync({
          id: initialData.id,
          ...values,
        });
        toast.success("Workspace berhasil diperbarui");
      } else {
        await createWorkspace.mutateAsync(values);
        toast.success("Workspace berhasil dibuat");
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Gagal ${isEditing ? 'memperbarui' : 'membuat'} workspace`);
      console.error(error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant={isEditing ? "ghost" : "default"} size={isEditing ? "icon" : "default"}>
            {isEditing ? <Edit className="h-4 w-4" /> : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Workspace
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Workspace" : "Tambah Workspace"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Ubah informasi workspace periode pendampingan." : "Buat workspace baru untuk periode pendampingan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Nama Workspace</FieldLabel>
            <Input placeholder="TKML 2024 - Tahap 1" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field>
            <FieldLabel>Tahun</FieldLabel>
            <Input 
              type="number" 
              {...form.register("year", { valueAsNumber: true })} 
              onFocus={(e) => e.target.select()}
            />
            <FieldError errors={[form.formState.errors.year]} />
          </Field>

          <Field>
            <FieldLabel>Kode (Opsional)</FieldLabel>
            <Input placeholder="TKML24-1" {...form.register("code")} />
            <FieldError errors={[form.formState.errors.code]} />
          </Field>

          <Field className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FieldLabel className="text-base">Status Aktif</FieldLabel>
              <FieldDescription>
                Workspace yang aktif dapat diakses oleh user.
              </FieldDescription>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(checked: boolean) => form.setValue("isActive", checked)}
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={createWorkspace.isPending || updateWorkspace.isPending} className="w-full">
              {createWorkspace.isPending || updateWorkspace.isPending ? "Menyimpan..." : "Simpan Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
