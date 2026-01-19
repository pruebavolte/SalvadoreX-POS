"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCategoryMutations } from "@/hooks/use-category-mutations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const categorySchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  available_in_pos: z.boolean().default(true),
  available_in_digital_menu: z.boolean().default(false),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultValues?: Partial<CategoryFormValues>;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultValues,
}: CreateCategoryDialogProps) {
  const { create, loading } = useCategoryMutations();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      available_in_pos: defaultValues?.available_in_pos ?? true,
      available_in_digital_menu: defaultValues?.available_in_digital_menu ?? false,
    },
  });

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      await create({
        name: values.name,
        active: true,
        available_in_pos: values.available_in_pos,
        available_in_digital_menu: values.available_in_digital_menu,
        user_id: "", // Will be set by the API
      });

      toast.success("Categoría creada correctamente");
      form.reset();
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in the hook
      toast.error("Error al crear la categoría");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear Nueva Categoría</DialogTitle>
          <DialogDescription>
            Agrega una nueva categoría para organizar tus productos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de la Categoría *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Bebidas, Entradas, Postres..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Visibility Section */}
            <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Visibilidad</h4>
                <p className="text-xs text-muted-foreground">
                  Controla dónde estará disponible esta categoría
                </p>
              </div>

              {/* Available in POS */}
              <FormField
                control={form.control}
                name="available_in_pos"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">🏪 Punto de Venta (POS)</FormLabel>
                      <FormDescription className="text-xs">
                        Disponible en el sistema POS
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Available in Digital Menu */}
              <FormField
                control={form.control}
                name="available_in_digital_menu"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-background">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">📱 Menú Digital</FormLabel>
                      <FormDescription className="text-xs">
                        Visible en el menú digital
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear Categoría
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
