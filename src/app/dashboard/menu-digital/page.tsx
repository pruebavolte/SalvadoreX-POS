"use client";

import { useState, useEffect } from "react";
import { useProducts, useCategories, useProductMutations } from "@/hooks/use-products";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Sparkles, Grid3x3, List, Edit, Trash2, MoreVertical, Plus, Check, X, Eye, Share2, Copy, Loader2, AlertTriangle, Minimize2, Square, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DigitalizeMenuDialog } from "@/components/menu-digital/digitalize-menu-dialog";
import { MenuProductModal } from "@/components/menu-digital/menu-product-modal";
import { LanguageSelector } from "@/components/menu-digital/language-selector";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useLanguage, LANGUAGES } from "@/contexts/language-context";
import { useMenuDigitalTranslations } from "@/lib/translations/menu-digital";
import { getProductPriceDisplays, convertCurrency, getCurrencySymbol } from "@/lib/currency";
import { Currency } from "@/types/database";
import { useRouter } from "next/navigation";
import { CurrencySelector, useSelectedCurrency } from "@/components/menu-digital/currency-selector";
import { CurrencyPreferenceDialog, useCurrencyPreferenceDialog } from "@/components/menu-digital/currency-preference-dialog";
import { CurrencyCode } from "@/contexts/language-context";

type ImageSize = "small" | "medium" | "large";

export default function MenuDigitalPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const t = useMenuDigitalTranslations(language);
  const { user } = useCurrentUser();

  // Currency management with preference dialog
  const { selectedCurrency, setSelectedCurrency } = useSelectedCurrency("MXN");
  const { showDialog: showCurrencyDialog, setShowDialog: setShowCurrencyDialog } = useCurrencyPreferenceDialog();

  // Get local currency based on selected language (fallback)
  const currentLanguageData = LANGUAGES.find(l => l.code === language);
  const localCurrency = currentLanguageData?.currency || "MXN";

  const [digitalizeDialogOpen, setDigitalizeDialogOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [imageSize, setImageSize] = useState<ImageSize>("medium");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingProgress, setDeletingProgress] = useState({ current: 0, total: 0 });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);

  // Filter only digital menu products (Sistema unificado multi-canal)
  const { products, loading, refresh } = useProducts({ available_in_digital_menu: true });
  const { categories: allCategories, refresh: refreshCategories } = useCategories();
  const { remove } = useProductMutations();

  // Fetch best sellers on mount
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        const response = await fetch("/api/best-sellers");
        const data = await response.json();

        if (response.ok) {
          setBestSellers(data.products || []);
        }
      } catch (error) {
        console.error("Error fetching best sellers:", error);
        // Silently fail, best sellers is not critical
      }
    };

    fetchBestSellers();
  }, []);

  // Filter products based on selected category
  const menuProducts = selectedCategory === "best-sellers"
    ? bestSellers
    : selectedCategory
      ? products.filter(p => p.category_id === selectedCategory)
      : products;

  // Get unique categories that have products in the menu
  const menuCategories = allCategories.filter((category) =>
    products.some((product) => product.category_id === category.id)
  );

  // Image size configurations
  const imageSizeConfig = {
    small: {
      gridCols: "grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6",
      imageHeight: "h-32",
    },
    medium: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      imageHeight: "h-56",
    },
    large: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
      imageHeight: "h-72",
    },
  };

  const handleProductsAdded = () => {
    refresh();
    setDigitalizeDialogOpen(false);
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(t.deleteProductConfirm.replace("{name}", product.name))) {
      try {
        await remove(product.id);
        toast.success(t.productDeleted);
        refresh();
      } catch (error) {
        toast.error(t.deleteError.replace("{count}", "1"));
      }
    }
  };

  const handleProductSuccess = () => {
    refresh();
    setProductModalOpen(false);
    setEditingProduct(null);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedProducts(new Set());
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    setSelectedProducts(new Set(menuProducts.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedProducts(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.size === 0) {
      toast.error(t.noProductsSelected);
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    try {
      setIsDeleting(true);
      setDeletingProgress({ current: 0, total: selectedProducts.size });

      let deletedCount = 0;
      let errorCount = 0;
      let currentIndex = 0;

      for (const productId of selectedProducts) {
        currentIndex++;
        setDeletingProgress({ current: currentIndex, total: selectedProducts.size });

        try {
          await remove(productId);
          deletedCount++;
        } catch (error) {
          errorCount++;
          console.error(`Error deleting product ${productId}:`, error);
        }
      }

      if (deletedCount > 0) {
        toast.success(t.deleteSuccess.replace("{count}", deletedCount.toString()));
        refresh();
      }

      if (errorCount > 0) {
        toast.error(t.deleteError.replace("{count}", errorCount.toString()));
      }

      setSelectedProducts(new Set());
      setIsSelectionMode(false);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error in delete process:", error);
      toast.error(t.deleteError.replace("{count}", selectedProducts.size.toString()));
    } finally {
      setIsDeleting(false);
      setDeletingProgress({ current: 0, total: 0 });
    }
  };

  // Generar link del menú para compartir
  const getMenuLink = () => {
    if (!user?.id) return "";
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/dashboard-user/menu?restaurantId=${user.id}`;
  };

  const handleCopyMenuLink = () => {
    const link = getMenuLink();
    if (!link) {
      toast.error("No se pudo generar el link");
      return;
    }

    navigator.clipboard.writeText(link);
    toast.success("Link copiado al portapapeles!");
  };

  const handleViewAsCustomer = () => {
    if (!user?.id) {
      toast.error("No se pudo obtener tu información");
      return;
    }
    router.push(`/dashboard-user/menu?restaurantId=${user.id}`);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              {t.pageTitle}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              {t.pageDescription}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap w-full sm:w-auto">
            <LanguageSelector />
            <CurrencySelector
              selectedCurrency={selectedCurrency}
              onCurrencyChange={setSelectedCurrency}
              language={language}
            />
            {!isSelectionMode && (
              <>
                {/* Botón para copiar link del menú */}
                <Button
                  variant="outline"
                  onClick={handleCopyMenuLink}
                  className="gap-2 min-h-[44px]"
                  disabled={!user?.id}
                >
                  <Share2 className="h-5 w-5" />
                  <span className="hidden sm:inline">Compartir Menú</span>
                </Button>

                {/* View mode buttons - hidden on smallest screens */}
                <div className="hidden xs:flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={cn("min-h-[44px] min-w-[44px]", viewMode === "grid" && "bg-accent")}
                    title={t.gridView}
                  >
                    <Grid3x3 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={cn("min-h-[44px] min-w-[44px]", viewMode === "list" && "bg-accent")}
                    title={t.listView}
                  >
                    <List className="h-5 w-5" />
                  </Button>
                </div>

                {/* Image Size Controls - Only show in grid view on larger screens */}
                {viewMode === "grid" && (
                  <div className="hidden sm:flex gap-1 border rounded-lg p-1 bg-muted/30">
                    <Button
                      variant={imageSize === "small" ? "default" : "ghost"}
                      size="icon"
                      className="h-9 w-9 min-h-[36px] min-w-[36px]"
                      onClick={() => setImageSize("small")}
                      title="Pequeño"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={imageSize === "medium" ? "default" : "ghost"}
                      size="icon"
                      className="h-9 w-9 min-h-[36px] min-w-[36px]"
                      onClick={() => setImageSize("medium")}
                      title="Mediano"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={imageSize === "large" ? "default" : "ghost"}
                      size="icon"
                      className="h-9 w-9 min-h-[36px] min-w-[36px]"
                      onClick={() => setImageSize("large")}
                      title="Grande"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button onClick={handleAddNew} className="min-h-[44px]">
                  <Plus className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">{t.addProduct}</span>
                </Button>
              </>
            )}
            {menuProducts.length > 0 && (
              <Button
                variant={isSelectionMode ? "default" : "outline"}
                onClick={toggleSelectionMode}
                className="min-h-[44px]"
              >
                {isSelectionMode ? (
                  <>
                    <X className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">{t.cancel}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 sm:mr-2" />
                    <span className="hidden sm:inline">{t.select}</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.totalItems}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menuProducts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t.productsInMenu}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.categories}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{menuCategories.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {menuCategories.length === 1 ? t.categoryInMenu : t.categoriesInMenu}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t.averagePrice}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${menuProducts.length > 0
                  ? (menuProducts.reduce((sum, p) => sum + p.price, 0) / menuProducts.length).toFixed(2)
                  : "0.00"
                }
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {menuProducts.length > 0 ? t.ofDigitalMenu : t.noProducts}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Products Grid/List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t.menuProducts}</CardTitle>
            </div>
            {/* Category Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mt-4">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                {t.all}
              </Button>
              <Button
                variant={selectedCategory === "best-sellers" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("best-sellers")}
                className="whitespace-nowrap"
              >
                {t.bestSellers}
              </Button>
              {menuCategories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t.loadingProducts}</p>
              </div>
            ) : menuProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <ChefHat className="h-8 w-8 text-primary" />
                </div>
                {selectedCategory === "best-sellers" ? (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      {t.noBestSellers}
                    </h3>
                    <p className="text-muted-foreground">
                      {t.noBestSellersDescription}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      {t.noProductsInMenu}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {t.startDigitalizing}
                    </p>
                    <Button onClick={() => setDigitalizeDialogOpen(true)}>
                      <Sparkles className="h-5 w-5 mr-2" />
                      {t.digitalizeMenu}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  viewMode === "grid"
                    ? cn("grid gap-4", imageSizeConfig[imageSize].gridCols)
                    : "flex flex-col gap-2"
                )}
              >
                {menuProducts.map((product) => {
                  const category = allCategories.find((c) => c.id === product.category_id);

                  if (viewMode === "grid") {
                    const isSelected = selectedProducts.has(product.id);
                    const productCurrency = (product.currency || "MXN") as Currency;
                    const convertedPrice = convertCurrency(
                      product.price,
                      productCurrency as CurrencyCode,
                      selectedCurrency
                    );
                    const currencySymbol = getCurrencySymbol(selectedCurrency);
                    const decimals = selectedCurrency === "JPY" ? 0 : 2;

                    return (
                      <Card
                        key={product.id}
                        className={cn(
                          "overflow-hidden hover:shadow-xl transition-all duration-300 group relative border-2",
                          isSelected ? "ring-4 ring-primary border-primary shadow-xl" : "hover:border-primary/50"
                        )}
                        onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                      >
                        {/* Image Section */}
                        <div className={cn("relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", imageSizeConfig[imageSize].imageHeight)}>
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-300">
                              <ChefHat className="h-16 w-16 group-hover:scale-110 transition-transform" />
                            </div>
                          )}

                          {/* Product Name Overlay */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-8">
                            <h3 className="font-bold text-lg text-white line-clamp-2 drop-shadow-lg">
                              {product.name}
                            </h3>
                          </div>

                          {/* Selection Checkbox */}
                          {isSelectionMode && (
                            <div className="absolute top-3 left-3 z-10">
                              <div className="bg-white rounded-lg p-1.5 shadow-xl border-2 border-primary">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {!isSelectionMode && (
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="icon" className="h-9 w-9 rounded-full shadow-xl backdrop-blur-sm bg-white/90">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEdit(product)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t.edit}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDelete(product)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t.deleteProduct}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}

                        </div>

                        {/* Content Section */}
                        <CardContent className="p-5 space-y-3">

                          {/* Price Section - Single Currency Display */}
                          <div className="pt-2 border-t space-y-2">
                            {/* Price in Selected Currency */}
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-black text-primary">
                                {currencySymbol}{convertedPrice.toFixed(decimals)}
                              </span>
                              <span className="text-sm font-semibold text-primary/70">
                                {selectedCurrency}
                              </span>
                            </div>

                            {/* Original Price (if different currency) */}
                            {productCurrency !== selectedCurrency && (
                              <div className="flex items-baseline gap-1 text-xs text-muted-foreground">
                                <span>
                                  {language === "es" ? "Precio original:" : "Original price:"}
                                </span>
                                <span className="font-medium">
                                  {getCurrencySymbol(productCurrency as CurrencyCode)}{product.price.toFixed(productCurrency === "JPY" ? 0 : 2)} {productCurrency}
                                </span>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  } else {
                    const isSelected = selectedProducts.has(product.id);
                    const productCurrency = (product.currency || "MXN") as Currency;
                    const convertedPrice = convertCurrency(
                      product.price,
                      productCurrency as CurrencyCode,
                      selectedCurrency
                    );
                    const currencySymbol = getCurrencySymbol(selectedCurrency);
                    const decimals = selectedCurrency === "JPY" ? 0 : 2;

                    return (
                      <div
                        key={product.id}
                        className={cn(
                          "flex items-center gap-4 p-4 border-2 rounded-xl hover:shadow-lg transition-all duration-300 group bg-card",
                          isSelected && "ring-4 ring-primary border-primary shadow-xl bg-accent",
                          isSelectionMode && "cursor-pointer"
                        )}
                        onClick={() => isSelectionMode && toggleProductSelection(product.id)}
                      >
                        {/* Selection Checkbox */}
                        {isSelectionMode && (
                          <div className="flex-shrink-0">
                            <div className="bg-white rounded-lg p-1.5 shadow-md border-2 border-primary">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleProductSelection(product.id)}
                              />
                            </div>
                          </div>
                        )}

                        {/* Image */}
                        <div className="relative w-24 h-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-110 transition-transform duration-300"
                              sizes="96px"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-gray-300">
                              <ChefHat className="h-10 w-10" />
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="font-bold text-lg truncate">{product.name}</h3>
                          {product.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {product.description}
                            </p>
                          )}
                          {category && (
                            <Badge className="text-xs mt-1 bg-white/95 text-gray-900 border-0 font-semibold">
                              {category.name}
                            </Badge>
                          )}
                        </div>

                        {/* Price Section */}
                        <div className="flex-shrink-0 space-y-2">
                          {/* Price in Selected Currency */}
                          <div className="text-right">
                            <div className="flex items-baseline justify-end gap-1.5">
                              <span className="text-2xl font-black text-primary">
                                {currencySymbol}{convertedPrice.toFixed(decimals)}
                              </span>
                              <span className="text-xs font-semibold text-primary/70">
                                {selectedCurrency}
                              </span>
                            </div>
                          </div>

                          {/* Original Price (if different) */}
                          {productCurrency !== selectedCurrency && (
                            <div className="text-right">
                              <div className="bg-muted/50 rounded-md px-2 py-1">
                                <div className="text-[10px] text-muted-foreground font-medium">
                                  {language === "es" ? "Original" : "Original"}
                                </div>
                                <div className="text-xs font-bold text-foreground">
                                  {getCurrencySymbol(productCurrency as CurrencyCode)}{product.price.toFixed(productCurrency === "JPY" ? 0 : 2)} {productCurrency}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions Menu */}
                        {!isSelectionMode && (
                          <div className="flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-accent">
                                  <MoreVertical className="h-5 w-5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  {t.edit}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(product)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  {t.deleteProduct}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button - Mobile optimized */}
      {!isSelectionMode && (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-12 sm:h-14 px-4 sm:px-6 min-h-[48px]"
            onClick={() => setDigitalizeDialogOpen(true)}
          >
            <Sparkles className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline">{t.digitalizeMenu}</span>
          </Button>
        </div>
      )}

      {/* Selection Actions Bar - Mobile optimized */}
      {isSelectionMode && (
        <div className="fixed bottom-4 sm:bottom-8 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 bg-primary text-primary-foreground rounded-2xl sm:rounded-full shadow-2xl px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-4 z-50">
          <span className="font-semibold text-sm sm:text-base">
            {selectedProducts.size} {t.selected}
          </span>
          <div className="hidden sm:block h-6 w-px bg-primary-foreground/20" />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAll}
              className="text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] text-xs sm:text-sm"
            >
              {t.selectAll}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAll}
              className="text-primary-foreground hover:bg-primary-foreground/10 min-h-[44px] text-xs sm:text-sm"
              disabled={selectedProducts.size === 0}
            >
              {t.deselectAll}
            </Button>
          </div>
          <div className="hidden sm:block h-6 w-px bg-primary-foreground/20" />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={selectedProducts.size === 0}
            className="min-h-[44px] text-xs sm:text-sm"
          >
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t.delete}</span> ({selectedProducts.size})
          </Button>
        </div>
      )}

      {/* Digitalize Dialog */}
      <DigitalizeMenuDialog
        open={digitalizeDialogOpen}
        onOpenChange={setDigitalizeDialogOpen}
        onSuccess={handleProductsAdded}
      />

      {/* Product Edit/Create Modal */}
      <MenuProductModal
        open={productModalOpen}
        onOpenChange={setProductModalOpen}
        product={editingProduct}
        categories={allCategories}
        onSuccess={handleProductSuccess}
        onCategoryCreated={refreshCategories}
      />

      {/* Currency Preference Dialog */}
      <CurrencyPreferenceDialog
        open={showCurrencyDialog}
        onOpenChange={setShowCurrencyDialog}
        onCurrencySelect={setSelectedCurrency}
        language={language}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Confirmar Eliminación
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Los productos seleccionados serán eliminados permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Progress bar during deletion */}
            {isDeleting && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Eliminando productos...</span>
                  <span className="font-semibold">
                    {deletingProgress.current} / {deletingProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-destructive transition-all duration-300"
                    style={{
                      width: `${(deletingProgress.current / deletingProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Products list */}
            <div className="space-y-3">
              <p className="font-semibold text-sm">
                Se eliminarán {selectedProducts.size} producto{selectedProducts.size !== 1 ? "s" : ""}:
              </p>
              <div className="max-h-[300px] overflow-y-auto border rounded-lg p-3 space-y-2">
                {menuProducts
                  .filter((product) => selectedProducts.has(product.id))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-2 bg-muted/50 rounded-md"
                    >
                      {product.image_url ? (
                        <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <ChefHat className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ${product.price.toFixed(2)} {product.currency || "MXN"}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={executeDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar {selectedProducts.size} producto{selectedProducts.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
