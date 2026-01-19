"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product, Category } from "@/types/database";
import { useProductMutations } from "@/hooks/use-products";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, X, Image as ImageIcon, Plus } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage, deleteImage } from "@/lib/supabase/storage";
import Image from "next/image";
import { CreateCategoryDialog } from "@/components/inventory/create-category-dialog";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  sku: z.string().min(1, "El SKU es requerido"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().min(1, "La categoría es requerida"),
  price: z.coerce.number().min(0, "El precio debe ser mayor a 0"),
  cost: z.coerce.number().min(0, "El costo debe ser mayor a 0"),
  stock: z.coerce.number().int().min(0, "El stock no puede ser negativo"),
  min_stock: z.coerce.number().int().min(0, "El stock mínimo no puede ser negativo"),
  max_stock: z.coerce.number().int().min(0, "El stock máximo no puede ser negativo"),
  active: z.boolean().default(true),
  // Sistema unificado multi-canal
  available_in_pos: z.boolean().default(true),
  available_in_digital_menu: z.boolean().default(false),
  track_inventory: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onCategoryCreated?: () => void;
}

export function ProductModal({
  open,
  onOpenChange,
  product,
  categories,
  onCategoryCreated,
}: ProductModalProps) {
  const { create, update, loading } = useProductMutations();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      barcode: "",
      description: "",
      category_id: "",
      price: 0,
      cost: 0,
      stock: 0,
      min_stock: 10,
      max_stock: 500,
      active: true,
      // Sistema unificado multi-canal
      available_in_pos: true,
      available_in_digital_menu: false,
      track_inventory: true,
    },
  });

  // Update form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        description: product.description || "",
        category_id: product.category_id,
        price: product.price,
        cost: product.cost,
        stock: product.stock,
        min_stock: product.min_stock,
        max_stock: product.max_stock,
        active: product.active,
        // Sistema unificado multi-canal
        available_in_pos: product.available_in_pos ?? true,
        available_in_digital_menu: product.available_in_digital_menu ?? false,
        track_inventory: product.track_inventory ?? true,
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
    } else {
      form.reset({
        name: "",
        sku: "",
        barcode: "",
        description: "",
        category_id: "",
        price: 0,
        cost: 0,
        stock: 0,
        min_stock: 10,
        max_stock: 500,
        active: true,
        // Sistema unificado multi-canal
        available_in_pos: true,
        available_in_digital_menu: false,
        track_inventory: true,
      });
      setImagePreview(null);
      setImageFile(null);
    }
  }, [product, form]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen es demasiado grande. Tamaño máximo: 5MB');
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle remove image
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      setUploading(true);
      let imageUrl = product?.image_url || null;

      // Upload image if a new one was selected
      if (imageFile) {
        const { url, error } = await uploadProductImage(imageFile, product?.id);
        if (error) {
          toast.error(`Error al subir imagen: ${error}`);
          return;
        }
        imageUrl = url;

        // Delete old image if updating and had an old image
        if (product?.image_url && product.image_url !== imageUrl) {
          await deleteImage(product.image_url);
        }
      }

      const productData = {
        ...values,
        image_url: imageUrl ?? undefined,
        product_type: "inventory" as const, // OBSOLETO: mantener por compatibilidad
        currency: "MXN" as const, // Default currency
        // Sistema unificado multi-canal - ya incluido en values
      };

      if (product) {
        await update(product.id, productData);
        toast.success("Producto actualizado correctamente");
      } else {
        await create(productData);
        toast.success("Producto creado correctamente");
      }
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in the hook
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? "Editar Producto" : "Agregar Producto"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Modifica la información del producto"
              : "Completa la información para agregar un nuevo producto"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nombre del producto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input placeholder="SKU-000001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Barcode */}
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código de Barras</FormLabel>
                    <FormControl>
                      <Input placeholder="7890123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category */}
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Categoría *</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={categories.length === 0 ? "No hay categorías disponibles" : "Selecciona una categoría"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.length === 0 ? (
                            <div className="p-4 text-center text-sm text-muted-foreground">
                              No hay categorías disponibles.
                              <br />
                              Haz clic en el botón "+" para crear una.
                            </div>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setCreateCategoryOpen(true)}
                        title="Crear nueva categoría"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <FormDescription>
                      {categories.length === 0 && (
                        <span className="text-orange-600 font-medium">
                          ⚠️ Crea al menos una categoría para poder agregar productos
                        </span>
                      )}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <div className="md:col-span-2">
                <FormLabel>Imagen del Producto</FormLabel>
                <div className="mt-2 space-y-4">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Upload Button */}
                  {!imagePreview && (
                    <div
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        Click para subir una imagen
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, WebP o GIF (máx. 5MB)
                      </p>
                    </div>
                  )}

                  {/* Change Image Button */}
                  {imagePreview && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Cambiar Imagen
                    </Button>
                  )}

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descripción del producto"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio de Venta *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cost */}
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock */}
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Actual *</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Min Stock */}
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Mínimo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormDescription>
                      Alerta cuando el stock esté por debajo de este valor
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Stock */}
              <FormField
                control={form.control}
                name="max_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Máximo *</FormLabel>
                    <FormControl>
                      <Input type="number" step="1" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active */}
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Activo</FormLabel>
                      <FormDescription>
                        Producto disponible para la venta
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

            {/* Visibilidad y Canales de Venta - Sección destacada */}
            <div className="space-y-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">Visibilidad del Producto</h3>
                <p className="text-sm text-muted-foreground">
                  Controla dónde estará disponible este producto
                </p>
              </div>

              <div className="grid gap-4">
                {/* Available in POS */}
                <FormField
                  control={form.control}
                  name="available_in_pos"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">🏪 Punto de Venta (POS)</FormLabel>
                        <FormDescription>
                          Disponible para ventas en mostrador
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
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">📱 Menú Digital / Venta en Línea</FormLabel>
                        <FormDescription>
                          Visible en el menú digital para clientes
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

                {/* Track Inventory */}
                <FormField
                  control={form.control}
                  name="track_inventory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-semibold">📦 Control de Inventario</FormLabel>
                        <FormDescription>
                          Controlar stock (desactivar para servicios)
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
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || uploading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? "Subiendo imagen..." : product ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      {/* Create Category Dialog */}
      <CreateCategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        defaultValues={{
          available_in_pos: true,
          available_in_digital_menu: false,
        }}
        onSuccess={() => {
          onCategoryCreated?.();
        }}
      />
    </Dialog>
  );
}
