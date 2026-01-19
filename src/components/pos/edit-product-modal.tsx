"use client";

import { useState, useEffect, useRef } from "react";
import { Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  Camera, 
  Upload, 
  Sparkles, 
  ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  X,
  Search
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useImageSearch } from "@/hooks/use-image-search";

interface Category {
  id: string;
  name: string;
}

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

export function EditProductModal({ open, onOpenChange, product, onSuccess }: EditProductModalProps) {
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productBarcode, setProductBarcode] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productMinStock, setProductMinStock] = useState("");
  const [productCategory, setProductCategory] = useState<string>("");
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const { 
    images: searchedImages, 
    loading: searchingImages, 
    searchImages, 
    currentImageIndex, 
    nextImage, 
    previousImage,
    clearImages 
  } = useImageSearch();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("id, name").order("name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (open && product) {
      setProductName(product.name || "");
      setProductDescription(product.description || "");
      setProductBarcode(product.barcode || "");
      setProductPrice(product.price?.toString() || "");
      setProductCost(product.cost?.toString() || "");
      setProductStock(product.stock?.toString() || "");
      setProductMinStock(product.min_stock?.toString() || "");
      setProductCategory(product.category_id || "");
      setProductImageUrl(product.image_url || "");
      setImageFile(null);
      clearImages();
      setShowAdvanced(false);
      setIsCameraOpen(false);
      
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open, product, clearImages]);

  const handleSearchImages = async () => {
    if (!productName.trim()) {
      toast.error("Ingresa un nombre de producto para buscar imágenes");
      return;
    }
    await searchImages(productName);
  };

  useEffect(() => {
    if (searchedImages.length > 0 && !productImageUrl) {
      setProductImageUrl(searchedImages[0].url);
    }
  }, [searchedImages, productImageUrl]);

  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + 'px';
    }
  }, [productDescription]);

  const handleNextSearchImage = () => {
    const next = nextImage();
    if (next) {
      setProductImageUrl(next.url);
      setImageFile(null);
    }
  };

  const handlePrevSearchImage = () => {
    const prev = previousImage();
    if (prev) {
      setProductImageUrl(prev.url);
      setImageFile(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Solo se permiten archivos de imagen");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máximo 5MB)");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraOpen(true);
    } catch (error) {
      toast.error("No se pudo acceder a la cámara");
      console.error("Camera error:", error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        setProductImageUrl(imageUrl);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setImageFile(file);
          }
        }, 'image/jpeg', 0.8);
      }
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const generateAIImage = async () => {
    if (!productName.trim()) {
      toast.error("Ingresa un nombre de producto para generar imagen");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName }),
      });
      const data = await response.json();
      if (data.success && data.imageUrl) {
        setProductImageUrl(data.imageUrl);
        setImageFile(null);
        toast.success("Imagen generada exitosamente");
      } else if (data.fallback && data.imageUrl) {
        setProductImageUrl(data.imageUrl);
        setImageFile(null);
        toast.info("Se usó una imagen de referencia");
      } else {
        toast.error(data.error || "Error al generar imagen");
      }
    } catch (error) {
      toast.error("Error al generar imagen con IA");
      console.error("AI Image error:", error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const removeImage = () => {
    setProductImageUrl("");
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      toast.error("Debe ingresar un nombre de producto");
      return;
    }
    if (!productPrice || parseFloat(productPrice) <= 0) {
      toast.error("Debe ingresar un precio válido");
      return;
    }
    if (!product?.id) {
      toast.error("Error: producto no encontrado");
      return;
    }

    setIsSaving(true);
    try {
      let finalImageUrl = productImageUrl;
      
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `products/${product.id}_${Date.now()}`);
        
        const uploadResponse = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.url) {
            finalImageUrl = uploadData.url;
          }
        }
      }
      
      const productData = {
        name: productName.trim(),
        description: productDescription.trim() || null,
        barcode: productBarcode.trim() || product.barcode,
        sku: productBarcode.trim() || product.sku,
        price: parseFloat(productPrice),
        cost: productCost ? parseFloat(productCost) : product.cost,
        stock: productStock ? parseInt(productStock) : product.stock,
        min_stock: productMinStock ? parseInt(productMinStock) : product.min_stock,
        category_id: productCategory || null,
        image_url: finalImageUrl || null,
      };

      const { error } = await (supabase
        .from("products") as any)
        .update(productData)
        .eq("id", product.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Producto actualizado exitosamente");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al actualizar producto");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Producto</DialogTitle>
          <DialogDescription>
            Modifica los datos del producto
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Nombre del Producto</p>
            <Input 
              ref={nameInputRef}
              value={productName} 
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Nombre del producto"
              data-testid="input-edit-product-name"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Descripción</p>
            <Textarea 
              ref={descriptionRef}
              value={productDescription} 
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="preparado con ..."
              className="min-h-[60px] resize-none overflow-hidden"
              rows={3}
              data-testid="input-edit-product-description"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Código de Barras</p>
            <Input 
              value={productBarcode} 
              onChange={(e) => setProductBarcode(e.target.value)}
              placeholder="Código de barras"
              className="font-mono"
              data-testid="input-edit-product-barcode"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-2">Precio de Venta</p>
            <Input 
              type="number" 
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              data-testid="input-edit-product-price"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
            data-testid="button-edit-toggle-advanced"
          >
            <span>Avanzado</span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Imagen del Producto
                </p>
                
                {isCameraOpen ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-48 bg-black rounded-lg overflow-hidden">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={capturePhoto}
                        className="flex-1"
                        data-testid="button-edit-capture-photo"
                      >
                        <Camera className="h-4 w-4 mr-1" />
                        Capturar
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={stopCamera}
                        data-testid="button-edit-cancel-camera"
                      >
                        Cancelar
                      </Button>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                ) : productImageUrl ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                      <Image
                        src={productImageUrl}
                        alt="Vista previa"
                        fill
                        className="object-contain"
                        unoptimized={productImageUrl.startsWith('data:')}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={removeImage}
                        data-testid="button-edit-remove-image"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {searchedImages.length > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handlePrevSearchImage}
                          data-testid="button-edit-prev-image"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          {currentImageIndex + 1} / {searchedImages.length}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleNextSearchImage}
                          data-testid="button-edit-next-image"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">Sin imagen</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSearchImages}
                    disabled={searchingImages || !productName.trim()}
                    className="text-xs"
                    data-testid="button-edit-search-images"
                  >
                    {searchingImages ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Search className="h-3 w-3 mr-1" />
                    )}
                    Buscar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startCamera}
                    className="text-xs"
                    data-testid="button-edit-open-camera"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Cámara
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                    data-testid="button-edit-upload-file"
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Archivo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateAIImage}
                    disabled={isGeneratingAI || !productName.trim()}
                    className="text-xs"
                    data-testid="button-edit-generate-ai"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    IA
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  data-testid="input-edit-file-upload"
                />
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Me Cuesta (Costo)</p>
                <Input 
                  type="number" 
                  value={productCost}
                  onChange={(e) => setProductCost(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  data-testid="input-edit-product-cost"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2">Categoría</p>
                <Select value={productCategory} onValueChange={setProductCategory}>
                  <SelectTrigger data-testid="select-edit-product-category">
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Stock Actual</p>
                  <Input 
                    type="number" 
                    value={productStock}
                    onChange={(e) => setProductStock(e.target.value)}
                    placeholder="0"
                    min="0"
                    data-testid="input-edit-product-stock"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Stock Mínimo</p>
                  <Input 
                    type="number" 
                    value={productMinStock}
                    onChange={(e) => setProductMinStock(e.target.value)}
                    placeholder="0"
                    min="0"
                    data-testid="input-edit-product-min-stock"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSaveProduct}
              disabled={isSaving}
              data-testid="button-save-edit-product"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
