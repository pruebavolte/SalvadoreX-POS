"use client";

import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/dashboard/sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Menu, Search, X, Loader2, ChevronDown, ChevronUp, Grid3x3, TrendingUp, PanelLeft, ArrowUp, ArrowDown, Settings2, Camera, Upload, Sparkles, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { SearchProvider, useSearch } from "@/contexts/search-context";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { useImageSearch } from "@/hooks/use-image-search";

interface Category {
  id: string;
  name: string;
}

function SearchBar({ onCloseSidebar }: { onCloseSidebar?: () => void }) {
  const { 
    searchValue, 
    setSearchValue, 
    triggerSearch, 
    searchResult, 
    setSearchResult,
    showAddProductModal,
    setShowAddProductModal,
    newProductName,
    setNewProductName,
    newProductBarcode,
    setNewProductBarcode,
    searchType,
    setSearchType,
    categoryPosition,
    setCategoryPosition,
    selectedCategory,
    setSelectedCategory,
  } = useSearch();

  const [productPrice, setProductPrice] = useState("");
  const [productCost, setProductCost] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [productStock, setProductStock] = useState("");
  const [productMinStock, setProductMinStock] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [productCategory, setProductCategory] = useState<string>("");
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [productDescription, setProductDescription] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const nameInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
    if (showAddProductModal) {
      setProductCost("");
      setProductStock("");
      setProductMinStock("");
      setImageFile(null);
      clearImages();
      setIsCameraOpen(false);
      
      if (searchResult?.source === "global" || searchResult?.source === "external") {
        setProductPrice(searchResult.product?.price?.toString() || "");
        setProductImageUrl(searchResult.product?.image_url || "");
        setProductDescription(searchResult.product?.description || "");
        
        if (searchResult.product?.category) {
          const matchingCategory = categories.find(
            c => c.name.toLowerCase() === searchResult.product?.category?.toLowerCase()
          );
          setProductCategory(matchingCategory?.id || "");
        } else {
          setProductCategory("");
        }
        
        if (searchResult.product?.description || searchResult.product?.image_url) {
          setShowAdvanced(true);
        } else {
          setShowAdvanced(false);
        }
      } else {
        setProductPrice("");
        setProductImageUrl("");
        setProductDescription("");
        setProductCategory("");
        setShowAdvanced(false);
      }
      
      setTimeout(() => {
        if (searchType === "barcode") {
          nameInputRef.current?.focus();
        } else {
          priceInputRef.current?.focus();
        }
      }, 100);
    }
  }, [showAddProductModal, searchType, clearImages, searchResult, categories]);

  const generateBarcode = () => {
    return `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-13);
  };

  const handleSearchImages = async () => {
    if (!newProductName.trim()) {
      toast.error("Ingresa un nombre de producto para buscar imágenes");
      return;
    }
    await searchImages(newProductName);
    if (searchedImages.length > 0) {
      setProductImageUrl(searchedImages[0].url);
    }
  };

  useEffect(() => {
    if (searchedImages.length > 0 && !productImageUrl) {
      setProductImageUrl(searchedImages[0].url);
    }
  }, [searchedImages, productImageUrl]);

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
    if (!newProductName.trim()) {
      toast.error("Ingresa un nombre de producto para generar imagen");
      return;
    }
    setIsGeneratingAI(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName: newProductName }),
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
    if (!newProductName.trim() && !newProductBarcode.trim()) {
      toast.error("Debe ingresar al menos un nombre o código de barras");
      return;
    }
    if (!productPrice || parseFloat(productPrice) <= 0) {
      toast.error("Debe ingresar un precio válido");
      return;
    }

    setIsSaving(true);
    try {
      const finalBarcode = newProductBarcode.trim() || generateBarcode();
      
      let finalImageUrl = productImageUrl;
      
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('path', `products/${finalBarcode}_${Date.now()}`);
        
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
        name: newProductName.trim() || `Producto ${finalBarcode}`,
        barcode: finalBarcode,
        sku: finalBarcode,
        price: parseFloat(productPrice),
        cost: productCost ? parseFloat(productCost) : 0,
        stock: productStock ? parseInt(productStock) : 0,
        min_stock: productMinStock ? parseInt(productMinStock) : 0,
        category_id: productCategory || null,
        image_url: finalImageUrl || null,
        description: productDescription.trim() || null,
        active: true,
        available_in_digital_menu: false,
        available_in_pos: true,
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar producto");
      }

      toast.success("Producto guardado exitosamente");
      setShowAddProductModal(false);
      setNewProductName("");
      setNewProductBarcode("");
      setProductPrice("");
      setProductCost("");
      setProductDescription("");
      setProductImageUrl("");
      setImageFile(null);
      setSearchType(null);
      setSearchResult(null);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar producto");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      triggerSearch();
    }
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    if (onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const handleModalInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, nextRef?: React.RefObject<HTMLInputElement | null>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      if (nextRef?.current) {
        e.preventDefault();
        nextRef.current.focus();
      }
    }
  };

  return (
    <>
      <div className="flex-1 flex items-center gap-2">
        <div className="relative flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar producto..."
              value={searchValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              className="pl-10 h-9"
              data-testid="input-header-search"
            />
          </div>
          <Button size="sm" onClick={triggerSearch} data-testid="button-search">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? null : val)}>
          <SelectTrigger className="w-40 h-9" data-testid="select-header-categories">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <div className="flex items-center gap-1">
                <Grid3x3 className="h-3 w-3" />
                <span>Todos</span>
              </div>
            </SelectItem>
            <SelectItem value="best-sellers">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span>Más vendidos</span>
              </div>
            </SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9" data-testid="button-category-settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("left")}
              className="flex items-center gap-2"
            >
              <PanelLeft className="h-4 w-4" />
              Fijar categorías izquierda
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("top")}
              className="flex items-center gap-2"
            >
              <ArrowUp className="h-4 w-4" />
              Fijar categorías arriba
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("bottom")}
              className="flex items-center gap-2"
            >
              <ArrowDown className="h-4 w-4" />
              Fijar categorías abajo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setCategoryPosition("hidden")}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Ocultar categorías
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={searchResult !== null && searchResult.found} onOpenChange={() => setSearchResult(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Producto Encontrado</DialogTitle>
          </DialogHeader>
          {searchResult?.product && (
            <div className="flex flex-col gap-4 py-4">
              <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center overflow-hidden relative mx-auto">
                {searchResult.product.image_url ? (
                  <Image
                    src={searchResult.product.image_url}
                    alt={searchResult.product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <Package className="h-16 w-16 text-muted-foreground" />
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Nombre del Producto</p>
                  <h3 className="font-semibold text-lg">{searchResult.product.name}</h3>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Código de Barras</p>
                  <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                    {searchResult.product.barcode}
                  </p>
                </div>

                {searchResult.product.category && (
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">Categoría</p>
                    <p className="text-sm">{searchResult.product.category}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Precio de Venta</p>
                  <p className="text-2xl font-bold text-primary">
                    ${searchResult.product.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Agregar Nuevo Producto
              {(searchResult?.source === "global" || searchResult?.source === "external") && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {searchResult.source === "global" ? "Base Global" : "API Externa"}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {(searchResult?.source === "global" || searchResult?.source === "external") 
                ? searchResult.message || "Producto encontrado. Revisa los datos y agrega a tu inventario."
                : "Complete los datos del nuevo producto"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Nombre del Producto</p>
              <Input 
                ref={nameInputRef}
                value={newProductName} 
                onChange={(e) => setNewProductName(e.target.value)}
                onKeyDown={(e) => handleModalInputKeyDown(e, barcodeInputRef)}
                placeholder="Nombre del producto"
                data-testid="input-product-name"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Código de Barras</p>
              <Input 
                ref={barcodeInputRef}
                value={newProductBarcode} 
                onChange={(e) => setNewProductBarcode(e.target.value)}
                onKeyDown={(e) => handleModalInputKeyDown(e, priceInputRef)}
                placeholder={searchType === "name" ? "Se generará automáticamente" : "Código de barras"}
                className="font-mono"
                data-testid="input-product-barcode"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Precio de Venta</p>
              <Input 
                ref={priceInputRef}
                type="number" 
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                data-testid="input-product-price"
              />
            </div>
            
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-2">Descripción (opcional)</p>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="preparado con..."
                className="w-full min-h-[60px] px-3 py-2 text-sm rounded-md border border-input bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                data-testid="input-product-description"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
              data-testid="button-toggle-advanced"
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
                          data-testid="button-capture-photo"
                        >
                          <Camera className="h-4 w-4 mr-1" />
                          Capturar
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={stopCamera}
                          data-testid="button-cancel-camera"
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
                          data-testid="button-remove-image"
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
                            data-testid="button-prev-image"
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
                            data-testid="button-next-image"
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
                      disabled={searchingImages || !newProductName.trim()}
                      className="text-xs"
                      data-testid="button-search-images"
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
                      data-testid="button-open-camera"
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
                      data-testid="button-upload-file"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Archivo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAIImage}
                      disabled={isGeneratingAI || !newProductName.trim()}
                      className="text-xs"
                      data-testid="button-generate-ai"
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
                    data-testid="input-file-upload"
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
                    data-testid="input-product-cost"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-2">Categoría</p>
                  <Select value={productCategory} onValueChange={setProductCategory}>
                    <SelectTrigger data-testid="select-product-category">
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
                    <p className="text-xs text-muted-foreground font-medium mb-2">Stock Inicial</p>
                    <Input 
                      type="number" 
                      value={productStock}
                      onChange={(e) => setProductStock(e.target.value)}
                      placeholder="0"
                      min="0"
                      data-testid="input-product-stock"
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
                      data-testid="input-product-min-stock"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowAddProductModal(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={handleSaveProduct}
                disabled={isSaving}
                data-testid="button-add-product"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Agregar Producto"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const showSearchBar = pathname === "/dashboard/pos";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleMainClick = () => {
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UserSync />

      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        mobileMenuOpen={mobileMenuOpen}
        onMobileMenuChange={setMobileMenuOpen}
      />

      <div
        className={`transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
        onClick={handleMainClick}
      >
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen(true);
                }}
                className="lg:hidden"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <img src="/images/logo_salvadorx.png" alt="Logo SalvadoreX" className="h-8" />
            </div>

            {showSearchBar && <SearchBar onCloseSidebar={() => setMobileMenuOpen(false)} />}

            <div className="flex-1"></div>
            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
              {isMounted && <UserButton afterSignOutUrl="/" />}
            </div>
          </div>
        </header>

        <main className="w-full">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SearchProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SearchProvider>
  );
}
