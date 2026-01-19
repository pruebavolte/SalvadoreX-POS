"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProducts } from "@/hooks/use-products";
import { useCart } from "@/hooks/use-sales";
import { useCustomers } from "@/hooks/use-customers";
import { ElevenLabsVoiceAgent } from "@/components/menu-digital/elevenlabs-voice-agent";
import { CategoryBrowser } from "@/components/pos/category-browser";
import { Cart } from "@/components/pos/cart";
import { PaymentModal } from "@/components/pos/payment-modal";
import { VariantSelectionModal } from "@/components/pos/variant-selection-modal";
import { ReceiptViewer } from "@/components/pos/receipt-viewer";
import { EditProductModal } from "@/components/pos/edit-product-modal";
import { Product } from "@/types/database";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getProductWithVariants } from "@/lib/services/supabase";
import { supabase } from "@/lib/supabase/client";
import { useSearch } from "@/contexts/search-context";

interface Category {
  id: string;
  name: string;
  description?: string;
}

export default function POSPage() {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<"products" | "voice">("products");
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<Product | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const prevCartCountRef = useRef(0);

  const { 
    registerSearchHandler, 
    unregisterSearchHandler, 
    setSearchResult,
    showAddProductModal,
    setShowAddProductModal,
    setNewProductName,
    setNewProductBarcode,
    searchValue,
    setSearchValue,
    categoryPosition,
    selectedCategory,
    setSelectedCategory,
  } = useSearch();

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const { products: allProducts, loading: productsLoading } = useProducts();
  const menuProducts = allProducts;
  const { customers } = useCustomers({ active: true });
  const {
    cart,
    addItem,
    addItemWithVariants,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    updateGlobalDiscount,
    clearCart,
    completeSale,
  } = useCart();

  const openAddProductModal = useCallback((name: string, barcode: string) => {
    setNewProductName(name);
    setNewProductBarcode(barcode);
    setShowAddProductModal(true);
    setSearchValue("");
  }, [setNewProductName, setNewProductBarcode, setShowAddProductModal, setSearchValue]);

  const handleSearch = useCallback(async (query: string, isNumberSearch: boolean) => {
    if (isNumberSearch) {
      const product = allProducts.find(
        (p) => p.barcode === query || p.sku === query
      );

      if (product) {
        const category = categories.find((c) => c.id === product.category_id);
        addItem(product, 1);
        toast.success(`${product.name} agregado al carrito`);
        setSearchResult({
          found: true,
          type: "barcode",
          source: "tenant",
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            image_url: product.image_url || undefined,
            barcode: product.barcode || product.sku,
            category: category?.name || "Sin categoría",
            cost: product.cost,
          },
          searchedBarcode: query,
        });
      } else {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const response = await fetch("/api/barcode-lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ barcode: query, userId: user?.id }),
          });
          
          if (response.ok) {
            const result = await response.json();
            
            if (result.source !== "not_found" && result.product) {
              setSearchResult({
                found: true,
                type: "barcode",
                source: result.source,
                product: {
                  name: result.product.name,
                  price: result.product.price || 0,
                  image_url: result.product.image_url,
                  barcode: result.product.barcode,
                  category: result.product.category,
                  brand: result.product.brand,
                  description: result.product.description,
                  confidence: result.product.confidence,
                },
                searchedBarcode: query,
                message: result.message,
              });
              
              const sourceLabel = result.source === "global" 
                ? "base de datos global" 
                : "API externa";
              toast.info(`Producto encontrado en ${sourceLabel}. Puedes agregarlo a tu inventario.`);
              openAddProductModal(result.product.name, query);
              return;
            }
          }
        } catch (error) {
          console.error("Error in barcode cascade lookup:", error);
        }
        
        openAddProductModal("", query);
      }
    } else {
      openAddProductModal(query, "");
    }
  }, [allProducts, categories, addItem, setSearchResult, openAddProductModal]);

  useEffect(() => {
    registerSearchHandler(handleSearch);
    return () => unregisterSearchHandler();
  }, [handleSearch, registerSearchHandler, unregisterSearchHandler]);

  const cartItemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (cartItemCount > prevCartCountRef.current) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(timer);
    }
    prevCartCountRef.current = cartItemCount;
  }, [cartItemCount]);

  const handleVoiceAddToCart = (product: { id: string; name: string; description?: string; price: number; currency: string; image_url?: string; category_id?: string }) => {
    const fullProduct = allProducts.find(p => p.id === product.id);
    if (fullProduct) {
      addItem(fullProduct, 1);
    }
  };

  const handleVoicePlaceOrder = async () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  const voiceCartItems = cart.items.map(item => ({
    id: item.product.id,
    name: item.product.name,
    description: item.product.description || undefined,
    price: item.product.price,
    currency: "MXN",
    image_url: item.product.image_url || undefined,
    category_id: item.product.category_id || undefined,
    quantity: item.quantity,
  }));

  const voiceProducts = menuProducts.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || undefined,
    price: p.price,
    currency: "MXN",
    image_url: p.image_url || undefined,
    category_id: p.category_id || undefined,
  }));

  const handleSelectProduct = async (product: Product) => {
    if (product.has_variants) {
      const response = await getProductWithVariants(product.id);
      if (response.success && response.data && response.data.variants && response.data.variants.length > 0) {
        setSelectedProductForVariants(response.data);
        setVariantModalOpen(true);
        return;
      }
    }
    addItem(product, 1);
    toast.success(`${product.name} agregado`);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    window.location.reload();
  };

  const handleVariantConfirm = (
    product: Product,
    selectedVariants: Array<{
      variant_id: string;
      variant_name: string;
      variant_type: string;
      price_applied: number;
    }>,
    quantity: number,
    totalPrice: number
  ) => {
    addItemWithVariants(product, selectedVariants, quantity, totalPrice);
    toast.success(`${product.name} agregado`);
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      toast.error("El carrito está vacío");
      return;
    }
    setPaymentModalOpen(true);
  };

  const handleCompleteSale = async (
    paymentMethod: string,
    customerId?: string,
    amountPaid?: number
  ) => {
    const result = await completeSale(paymentMethod, customerId);

    if (result.success) {
      toast.success("Venta completada", {
        description: `#${result.saleId}`,
      });

      if (paymentMethod === "cash" && amountPaid) {
        const change = amountPaid - cart.total;
        if (change > 0) {
          toast.info(`Cambio: $${change.toFixed(2)}`);
        }
      }

      if (result.saleId) {
        setLastSaleId(result.saleId);
        setReceiptViewerOpen(true);
      }
    } else {
      toast.error("Error al completar la venta", {
        description: result.error,
      });
      throw new Error(result.error);
    }
  };

  const sortedProducts = [...allProducts].sort((a, b) => {
    return a.name.localeCompare(b.name);
  });

  const bestSellers = sortedProducts.slice(0, 10);
  const remainingProducts = sortedProducts.slice(10);
  const orderedProducts = [...bestSellers, ...remainingProducts];

  const filteredProducts = orderedProducts.filter(product => {
    if (selectedCategory === "best-sellers") {
      return bestSellers.some(bs => bs.id === product.id);
    }
    if (!selectedCategory) return true;
    return product.category_id === selectedCategory;
  });

  const handleCategoryClick = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  const categoryCounts: { [key: string]: number } = {};
  allProducts.forEach((product) => {
    if (product.category_id) {
      categoryCounts[product.category_id] = (categoryCounts[product.category_id] || 0) + 1;
    }
  });

  const CategoryButtons = () => (
    <div className="flex gap-2 p-2 sm:p-3 overflow-x-auto scrollbar-hide sm:flex-wrap">
      <Button
        variant={selectedCategory === null ? "default" : "outline"}
        size="lg"
        onClick={() => handleCategoryClick(null)}
        className="min-h-[44px] min-w-[44px] text-sm sm:text-base flex-shrink-0 px-3 sm:px-4"
        data-testid="button-category-all"
      >
        Todos ({allProducts.length})
      </Button>
      <Button
        variant={selectedCategory === "best-sellers" ? "default" : "outline"}
        size="lg"
        onClick={() => handleCategoryClick("best-sellers")}
        className="min-h-[44px] min-w-[44px] text-sm sm:text-base flex-shrink-0 px-3 sm:px-4"
        data-testid="button-category-best-sellers"
      >
        Más vendidos
      </Button>
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.id ? "default" : "outline"}
          size="lg"
          onClick={() => handleCategoryClick(category.id)}
          className="min-h-[44px] min-w-[44px] text-sm sm:text-base flex-shrink-0 px-3 sm:px-4"
          data-testid={`button-category-${category.id}`}
        >
          {category.name} ({categoryCounts[category.id] || 0})
        </Button>
      ))}
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-4rem)] flex flex-col">
      {categoryPosition === "top" && (
        <div className="flex-shrink-0 border-b bg-background">
          <div className="w-full overflow-x-auto scrollbar-hide">
            <CategoryButtons />
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {categoryPosition === "left" && (
          <div className="hidden md:block w-40 lg:w-48 flex-shrink-0 border-r bg-background overflow-y-auto">
            <div className="flex flex-col gap-2 p-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="lg"
                onClick={() => handleCategoryClick(null)}
                className="w-full min-h-[44px] text-sm justify-start"
                data-testid="button-category-all-left"
              >
                Todos ({allProducts.length})
              </Button>
              <Button
                variant={selectedCategory === "best-sellers" ? "default" : "outline"}
                size="lg"
                onClick={() => handleCategoryClick("best-sellers")}
                className="w-full min-h-[44px] text-sm justify-start"
                data-testid="button-category-best-sellers-left"
              >
                Más vendidos
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="lg"
                  onClick={() => handleCategoryClick(category.id)}
                  className="w-full min-h-[44px] text-sm justify-start"
                  data-testid={`button-category-left-${category.id}`}
                >
                  {category.name} ({categoryCounts[category.id] || 0})
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 grid lg:grid-cols-[1fr_380px] min-h-0">
          <div className="min-h-0 overflow-hidden flex flex-col">
            {activeView === "products" ? (
              <CategoryBrowser
                products={filteredProducts}
                onSelectProduct={handleSelectProduct}
                onEditProduct={handleEditProduct}
                loading={productsLoading}
                hideCategories={true}
              />
            ) : (
              <div className="h-full p-4">
                <ElevenLabsVoiceAgent
                  products={voiceProducts}
                  onAddToCart={handleVoiceAddToCart}
                  onPlaceOrder={handleVoicePlaceOrder}
                  cart={voiceCartItems}
                  language="es"
                />
              </div>
            )}
          </div>

          <div className="h-full hidden lg:block border-l">
            <Cart
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onUpdateItemDiscount={updateItemDiscount}
              onUpdateGlobalDiscount={updateGlobalDiscount}
              onClearCart={clearCart}
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {categoryPosition === "bottom" && (
        <div className="flex-shrink-0 border-t bg-background">
          <div className="w-full overflow-x-auto scrollbar-hide">
            <CategoryButtons />
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 flex flex-col gap-2 z-50">
        <Button
          onClick={() => setActiveView(activeView === "voice" ? "products" : "voice")}
          className={cn(
            "h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-2xl",
            activeView === "voice" ? "bg-primary" : "bg-secondary"
          )}
          size="icon"
          data-testid="button-toggle-voice"
        >
          <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
        <Button
          onClick={() => setCartSheetOpen(true)}
          className={cn(
            "h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl lg:hidden",
            "bg-primary hover:bg-primary/90 text-primary-foreground",
            cartBounce && "animate-bounce"
          )}
          size="icon"
          data-testid="button-open-cart-mobile"
        >
          <ShoppingCart className="h-6 w-6 sm:h-7 sm:w-7" />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-red-500 text-white text-xs sm:text-sm font-bold flex items-center justify-center">
              {cartItemCount > 99 ? "99+" : cartItemCount}
            </span>
          )}
        </Button>
      </div>

      <Sheet open={cartSheetOpen} onOpenChange={setCartSheetOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0 [&>button]:hidden">
          <SheetHeader className="p-3 sm:p-4 border-b">
            <SheetTitle className="flex items-center justify-between">
              <span className="text-base sm:text-lg">Carrito</span>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setCartSheetOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100vh-60px)] overflow-hidden">
            <Cart
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onUpdateItemDiscount={updateItemDiscount}
              onUpdateGlobalDiscount={updateGlobalDiscount}
              onClearCart={clearCart}
              onCheckout={() => {
                setCartSheetOpen(false);
                handleCheckout();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <PaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        total={cart.total}
        onComplete={handleCompleteSale}
        customers={customers}
      />

      <VariantSelectionModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        product={selectedProductForVariants}
        onConfirm={handleVariantConfirm}
      />

      {lastSaleId && (
        <ReceiptViewer
          open={receiptViewerOpen}
          onOpenChange={setReceiptViewerOpen}
          saleId={lastSaleId}
        />
      )}

      <EditProductModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        product={productToEdit}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
