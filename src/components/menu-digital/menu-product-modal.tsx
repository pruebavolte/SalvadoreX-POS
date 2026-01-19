"use client";

import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Product, Category } from "@/types/database";
import { useProductMutations } from "@/hooks/use-products";
import { useLanguage } from "@/contexts/language-context";
import { useMenuDigitalTranslations } from "@/lib/translations/menu-digital";
import { useImageSearch } from "@/hooks/use-image-search";
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
import { Loader2, Upload, X, Image as ImageIcon, ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage, deleteImage } from "@/lib/supabase/storage";
import Image from "next/image";
import { CreateCategoryDialog } from "@/components/inventory/create-category-dialog";

const productSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category_id: z.string().min(1, "La categoría es requerida"),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  currency: z.enum(["MXN", "USD", "BRL", "EUR", "JPY"]).default("MXN"),
  active: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface MenuProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSuccess?: () => void;
  onCategoryCreated?: () => void;
}

export function MenuProductModal({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
  onCategoryCreated,
}: MenuProductModalProps) {
  const { language } = useLanguage();
  const t = useMenuDigitalTranslations(language);
  const { create, update, loading } = useProductMutations();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image search functionality
  const { images, loading: searchingImages, searchImages, currentImageIndex, nextImage, previousImage } = useImageSearch();
  const [useSearchedImage, setUseSearchedImage] = useState(false);
  const [searchedImageUrl, setSearchedImageUrl] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category_id: "",
      price: 0,
      currency: "MXN",
      active: true,
    },
  });

  // Update form when product changes
  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        description: product.description || "",
        category_id: product.category_id,
        price: product.price,
        currency: product.currency || "MXN",
        active: product.active,
      });
      setImagePreview(product.image_url || null);
      setImageFile(null);
      setUseSearchedImage(false);
      setSearchedImageUrl(null);
    } else {
      form.reset({
        name: "",
        description: "",
        category_id: "",
        price: 0,
        currency: "MXN",
        active: true,
      });
      setImagePreview(null);
      setImageFile(null);
      setUseSearchedImage(false);
      setSearchedImageUrl(null);
    }
  }, [product, form]);

  // Auto-search images when product name changes (only for new products)
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "name" && value.name && !product) {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        // Debounce search - wait 1 second after user stops typing
        searchTimeoutRef.current = setTimeout(() => {
          searchImages(value.name || "");
        }, 1000);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [form, product, searchImages]);

  // Auto-select first image when search results come in
  useEffect(() => {
    if (images.length > 0 && !imagePreview && !imageFile && !product) {
      const firstImage = images[0];
      setSearchedImageUrl(firstImage.url);
      setImagePreview(firstImage.url);
      setUseSearchedImage(true);
    }
  }, [images, imagePreview, imageFile, product]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(t.selectAtLeastOne);
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t.imageFormats);
        return;
      }

      setImageFile(file);
      setUseSearchedImage(false);
      setSearchedImageUrl(null);

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
    setUseSearchedImage(false);
    setSearchedImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Navigate to next searched image
  const handleNextImage = () => {
    const next = nextImage();
    if (next) {
      setSearchedImageUrl(next.url);
      setImagePreview(next.url);
      setUseSearchedImage(true);
      setImageFile(null);
    }
  };

  // Navigate to previous searched image
  const handlePreviousImage = () => {
    const prev = previousImage();
    if (prev) {
      setSearchedImageUrl(prev.url);
      setImagePreview(prev.url);
      setUseSearchedImage(true);
      setImageFile(null);
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
          toast.error(`${t.uploadingImage} ${error}`);
          return;
        }
        imageUrl = url;

        // Delete old image if updating and had an old image
        if (product?.image_url && product.image_url !== imageUrl) {
          await deleteImage(product.image_url);
        }
      } else if (useSearchedImage && searchedImageUrl) {
        // If using a searched image, download it and upload to our storage
        try {
          const response = await fetch(searchedImageUrl);
          const blob = await response.blob();
          const file = new File([blob], `${values.name}.jpg`, { type: blob.type });

          const { url, error } = await uploadProductImage(file, product?.id);
          if (error) {
            toast.error(`${t.uploadingImage} ${error}`);
            return;
          }
          imageUrl = url;

          // Delete old image if updating and had an old image
          if (product?.image_url && product.image_url !== imageUrl) {
            await deleteImage(product.image_url);
          }
        } catch (error) {
          console.error("Error downloading searched image:", error);
          toast.error("Error al descargar la imagen seleccionada");
          return;
        }
      }

      const productData = {
        ...values,
        image_url: imageUrl ?? undefined,
        product_type: "menu_digital" as const, // OBSOLETO: mantener por compatibilidad
        // Sistema unificado multi-canal
        available_in_pos: product?.available_in_pos ?? false,
        available_in_digital_menu: true, // Always true for menu digital products
        track_inventory: false, // Menu digital products don't need stock management
        // Menu digital products default values
        sku: product?.sku || `MENU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cost: product?.cost ?? 0,
        stock: product?.stock ?? 100,
        min_stock: product?.min_stock ?? 0,
        max_stock: product?.max_stock ?? 1000,
        barcode: product?.barcode ?? undefined,
      };

      if (product) {
        await update(product.id, productData);
        toast.success(t.productUpdated);
      } else {
        await create(productData);
        toast.success(t.productCreated);
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      // Error is already handled in the hook
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {product ? t.editProduct : t.addNewProduct}
          </DialogTitle>
          <DialogDescription>
            {product
              ? t.modifyProductInfo
              : t.completeProductInfo}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {/* Image Upload */}
              <div>
                <FormLabel>{t.productImage}</FormLabel>
                <div className="mt-2 space-y-4">
                  {/* Loading State */}
                  {searchingImages && !imagePreview && (
                    <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg">
                      <Loader2 className="h-8 w-8 text-gray-400 mb-2 animate-spin" />
                      <p className="text-sm text-gray-600">
                        Buscando imágenes...
                      </p>
                    </div>
                  )}

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

                      {/* Navigation buttons for searched images */}
                      {useSearchedImage && images.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                            onClick={handlePreviousImage}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <div className="flex items-center px-3 text-xs text-white font-medium">
                            {currentImageIndex + 1} / {images.length}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full bg-white/90 hover:bg-white"
                            onClick={handleNextImage}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Badge indicating if image is from search */}
                      {useSearchedImage && (
                        <div className="absolute top-2 left-2">
                          <div className="bg-blue-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                            <Search className="h-3 w-3" />
                            Auto
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Upload Button */}
                  {!imagePreview && !searchingImages && (
                    <div
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {t.clickToUpload}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.imageFormats}
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
                      {t.changeImage}
                    </Button>
                  )}

                  {/* Info message about auto search */}
                  {!product && !imagePreview && !searchingImages && (
                    <div className="text-xs text-muted-foreground text-center">
                      💡 Ingresa el nombre del platillo y buscaremos una imagen automáticamente
                    </div>
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

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.name} *</FormLabel>
                    <FormControl>
                      <Input placeholder={t.namePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.description}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.descriptionPlaceholder}
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
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
                  <FormItem>
                    <FormLabel>{t.category} *</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={categories.length === 0 ? "No hay categorías disponibles" : t.selectCategory} />
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

              {/* Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.price} *</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.currency} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t.selectCurrency} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MXN">$ MXN - Peso Mexicano</SelectItem>
                        <SelectItem value="USD">$ USD - Dólar Estadounidense</SelectItem>
                        <SelectItem value="BRL">R$ BRL - Real Brasileño</SelectItem>
                        <SelectItem value="EUR">€ EUR - Euro</SelectItem>
                        <SelectItem value="JPY">¥ JPY - Yen Japonés</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Se mostrarán equivalencias en MXN, USD y la divisa del idioma seleccionado
                    </FormDescription>
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
                      <FormLabel className="text-base">{t.active}</FormLabel>
                      <FormDescription>
                        {t.visibleInMenu}
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

            {/* Nota informativa sobre visibilidad */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <div className="flex gap-2">
                <div className="text-blue-600 dark:text-blue-400">ℹ️</div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Visibilidad del Producto
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Este producto será visible en el menú digital. Para controlar su disponibilidad
                    en el punto de venta (POS), edítalo desde la sección de Inventario.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading || uploading}
              >
                {t.cancel}
              </Button>
              <Button type="submit" disabled={loading || uploading}>
                {(loading || uploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {uploading ? t.uploadingImage : product ? t.update : t.create}
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
          available_in_pos: false,
          available_in_digital_menu: true,
        }}
        onSuccess={() => {
          onCategoryCreated?.();
        }}
      />
    </Dialog>
  );
}
