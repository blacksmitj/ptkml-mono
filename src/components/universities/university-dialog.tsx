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
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { useCreateUniversity, useUpdateUniversity } from "@/hooks/use-universities";
import { University } from "@/types";
import { ImageUploadSingle } from "@/components/ui/image-upload-single";
import { useAppStore } from "@/store/use-app-store";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Nama universitas minimal 2 karakter.",
  }),
  logo: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface UniversityDialogProps {
  children?: React.ReactNode;
  initialData?: University;
}

export function UniversityDialog({ children, initialData }: UniversityDialogProps) {
  const [open, setOpen] = useState(false);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const createUniversity = useCreateUniversity();
  const updateUniversity = useUpdateUniversity();

  const isEditing = !!initialData;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      logo: initialData?.logo || null,
    },
  });

  async function onSubmit(values: FormValues) {
    try {
      if (isEditing) {
        await updateUniversity.mutateAsync({
          id: initialData.id,
          ...values,
        });
      } else {
        await createUniversity.mutateAsync({
          ...values,
          workspaceId: currentWorkspaceId,
        });
      }
      setOpen(false);
      if (!isEditing) form.reset();
    } catch (error: any) {
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
                Tambah Universitas
              </>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Universitas" : "Tambah Universitas"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Ubah informasi universitas mitra pendampingan." : "Daftarkan universitas baru sebagai mitra pendampingan."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field>
            <FieldLabel>Logo Universitas</FieldLabel>
            <ImageUploadSingle 
              value={form.watch("logo")} 
              onChange={(url) => form.setValue("logo", url)} 
              maxSize={10}
              category="university-logos"
            />
            <FieldDescription>
              Gunakan gambar persegi (rasio 1:1) untuk hasil terbaik. Gambar akan otomatis dipotong dan dioptimalkan (Maks. 10MB).
            </FieldDescription>
            <FieldError errors={[form.formState.errors.logo]} />
          </Field>

          <Field>
            <FieldLabel>Nama Universitas</FieldLabel>
            <Input placeholder="Universitas Indonesia" {...form.register("name")} />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={createUniversity.isPending || updateUniversity.isPending} className="w-full">
              {createUniversity.isPending || updateUniversity.isPending ? "Menyimpan..." : "Simpan Universitas"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
