"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  ChefHat,
  Search,
  Loader2,
  CheckCircle,
  Check,
  Maximize2,
  Minimize2,
  Square,
  Mic,
  UtensilsCrossed,
  ChevronLeft,
  ChevronRight,
  Star,
  ArrowRight,
  CreditCard,
  Banknote,
  Smartphone,
  QrCode,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage, LANGUAGES } from "@/contexts/language-context";
import { useCustomerMenuTranslations } from "@/lib/translations/customer-menu";
import { getProductPriceDisplays } from "@/lib/currency";
import { Currency, Product as DatabaseProduct } from "@/types/database";
import { ElevenLabsVoiceAgent } from "@/components/menu-digital/elevenlabs-voice-agent";
import { QRModal } from "@/components/menu-digital/qr-modal";
import { VariantSelectionModal } from "@/components/pos/variant-selection-modal";
import { getProductWithVariants } from "@/lib/services/supabase";
import { CurrencySelector, useSelectedCurrency } from "@/components/menu-digital/currency-selector";
import { CurrencyPreferenceDialog, useCurrencyPreferenceDialog } from "@/components/menu-digital/currency-preference-dialog";
import { convertCurrency, getCurrencySymbol, formatPrice } from "@/lib/currency";
import { CurrencyCode } from "@/contexts/language-context";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id?: string;
  has_variants?: boolean;
  categories?: {
    id: string;
    name: string;
  };
}

interface CartItem extends Product {
  quantity: number;
  selectedVariants?: Array<{
    variant_id: string;
    variant_name: string;
    variant_type: string;
    price_applied: number;
  }>;
  unitPriceWithVariants?: number;
}

type ImageSize = "small" | "medium" | "large";

export default function MenuPage() {
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");

  const { language } = useLanguage();
  const t = useCustomerMenuTranslations(language);

  // Currency selector with persistence
  const { selectedCurrency, setSelectedCurrency } = useSelectedCurrency("MXN");
  const { showDialog: showCurrencyDialog, setShowDialog: setShowCurrencyDialog } = useCurrencyPreferenceDialog();

  // Get local currency based on selected language (fallback)
  const localCurrency = useMemo(() => {
    const currentLanguageData = LANGUAGES.find((l) => l.code === language);
    return (currentLanguageData?.currency || "MXN") as Currency;
  }, [language]);

  const [products, setProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<ImageSize>("medium");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("menu");
  const [checkoutStep, setCheckoutStep] = useState<"review" | "payment">("review");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<DatabaseProduct | null>(null);

  // Generate menu URL
  const menuUrl = typeof window !== "undefined"
    ? `${window.location.origin}/dashboard-user/menu${restaurantId ? `?restaurantId=${restaurantId}` : ""}`
    : "";

  const paymentMethods = [
    { id: "cash", name: language === "es" ? "Efectivo" : "Cash", icon: Banknote },
    { id: "card", name: language === "es" ? "Tarjeta" : "Card", icon: CreditCard },
    { id: "transfer", name: language === "es" ? "Transferencia" : "Transfer", icon: Smartphone },
  ];

  // Top 3 best sellers for carousel
  const top3BestSellers = useMemo(() => {
    return bestSellers.slice(0, 3);
  }, [bestSellers]);

  useEffect(() => {
    fetchProducts();
    fetchBestSellers();
  }, [restaurantId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);

      // Si hay restaurantId en la URL, usarlo. Si no, la API usará el usuario autenticado
      const url = restaurantId
        ? `/api/menu-products?restaurantId=${restaurantId}`
        : "/api/menu-products";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar menú");
      }

      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t.loadMenuError);
    } finally {
      setLoading(false);
    }
  };

  const fetchBestSellers = async () => {
    try {
      const url = restaurantId
        ? `/api/best-sellers?restaurantId=${restaurantId}`
        : "/api/best-sellers";

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setBestSellers(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching best sellers:", error);
      // Silently fail, best sellers is not critical
    }
  };

  const categories = Array.from(
    new Set(
      products
        .filter((p) => p.categories)
        .map((p) => JSON.stringify(p.categories))
    )
  ).map((c) => JSON.parse(c));

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        !selectedCategory || product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, selectedCategory, searchTerm]);

  const addToCart = async (product: Product) => {
    // Check if product has variants
    if (product.has_variants) {
      // Fetch product with variants
      const response = await getProductWithVariants(product.id);
      if (response.success && response.data && response.data.variants && response.data.variants.length > 0) {
        setSelectedProductForVariants(response.data);
        setVariantModalOpen(true);
        return;
      }
    }

    // No variants, add directly
    const existingItem = cart.find((item) => item.id === product.id && !item.selectedVariants);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id && !item.selectedVariants
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    toast.success(`${product.name} ${t.addedToCart}`);
  };

  // Handler for variant selection confirmation
  const handleVariantConfirm = (
    product: DatabaseProduct,
    selectedVariants: Array<{
      variant_id: string;
      variant_name: string;
      variant_type: string;
      price_applied: number;
    }>,
    quantity: number,
    totalPrice: number
  ) => {
    const unitPriceWithVariants = totalPrice / quantity;

    // Always add as new item for items with variants
    setCart([...cart, {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      currency: product.currency || "MXN",
      image_url: product.image_url,
      category_id: product.category_id,
      has_variants: product.has_variants,
      categories: product.category,
      quantity,
      selectedVariants,
      unitPriceWithVariants,
    }]);

    toast.success(`${product.name} ${t.addedToCart}`);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  // Calculate cart total in selected currency
  const cartTotal = cart.reduce(
    (sum, item) => {
      const unitPrice = item.unitPriceWithVariants || item.price;
      const itemCurrency = (item.currency || "MXN") as CurrencyCode;
      const convertedPrice = convertCurrency(unitPrice, itemCurrency, selectedCurrency);
      return sum + convertedPrice * item.quantity;
    },
    0
  );

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCurrencySymbol = getCurrencySymbol(selectedCurrency);
  const cartDecimals = selectedCurrency === "JPY" ? 0 : 2;

  // Image size configurations - optimized for mobile
  const imageSizeConfig = {
    small: {
      gridCols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
      imageHeight: "h-24 sm:h-32",
    },
    medium: {
      gridCols: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
      imageHeight: "h-32 sm:h-48",
    },
    large: {
      gridCols: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
      imageHeight: "h-48 sm:h-64",
    },
  };

  const handleCheckout = async () => {
    try {
      setSubmitting(true);

      const orderItems = cart.map((item) => ({
        productId: item.id,
        productName: item.name,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency,
        imageUrl: item.image_url || null,
      }));

      const orderPayload: any = {
        items: orderItems,
        notes: orderNotes,
        currency: cart[0]?.currency || "MXN",
        paymentMethod: paymentMethod,
      };

      // Include restaurantId if viewing a shared menu (public access)
      if (restaurantId) {
        orderPayload.restaurantId = restaurantId;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t.createOrderError);
      }

      setOrderSuccess(true);
      setCart([]);
      setOrderNotes("");

      setTimeout(() => {
        setIsCheckoutOpen(false);
        setOrderSuccess(false);
        setCheckoutStep("review");
        setPaymentMethod("cash");
      }, 3000);
    } catch (error: any) {
      console.error("Error creating order:", error);
      toast.error(error.message || t.createOrderError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Cart Button - Fixed Position (Mobile Only) */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 lg:hidden">
        <Button
          size="lg"
          className="h-12 sm:h-14 px-4 sm:px-6 rounded-full shadow-lg gap-1.5 sm:gap-2"
          onClick={() => setIsCartOpen(true)}
        >
          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-semibold text-sm sm:text-base">{t.viewOrder}</span>
          {cartItemsCount > 0 && (
            <Badge className="h-5 sm:h-6 min-w-[20px] sm:min-w-[24px] px-1 sm:px-1.5 flex items-center justify-center rounded-full text-xs">
              {cartItemsCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Desktop Layout: Two columns */}
      <div className="lg:flex lg:gap-6 lg:h-screen lg:overflow-hidden">
        {/* Left Column: Products (Desktop & Mobile) */}
        <div className="lg:flex-1 lg:overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center border-b sticky top-0 z-10 bg-background">
              <TabsList className="flex-1 justify-start rounded-none h-auto p-0 bg-transparent overflow-x-auto">
                <TabsTrigger
                  value="menu"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1 px-2 sm:px-4 sm:gap-2 text-xs sm:text-sm"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{language === "es" ? "Ver Menú" : "View Menu"}</span>
                  <span className="sm:hidden">{language === "es" ? "Menú" : "Menu"}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="best-sellers"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1 px-2 sm:px-4 sm:gap-2 text-xs sm:text-sm"
                >
                  <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{language === "es" ? "Más Vendidos" : "Best Sellers"}</span>
                  <span className="sm:hidden">{language === "es" ? "Top" : "Top"}</span>
                </TabsTrigger>
                <TabsTrigger
                  value="voice"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent gap-1 px-2 sm:px-4 sm:gap-2 text-xs sm:text-sm"
                >
                  <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{language === "es" ? "Ordenar por Voz" : "Voice Order"}</span>
                  <span className="sm:hidden">{language === "es" ? "Voz" : "Voice"}</span>
                </TabsTrigger>
              </TabsList>

              {/* Currency Selector and QR Button */}
              <div className="flex items-center gap-1 sm:gap-2">
                <CurrencySelector
                  selectedCurrency={selectedCurrency}
                  onCurrencyChange={setSelectedCurrency}
                  language={language}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 flex-shrink-0"
                  onClick={() => setIsQRModalOpen(true)}
                >
                  <QrCode className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">
                    {language === "es" ? "QR" : "QR"}
                  </span>
                </Button>
              </div>
            </div>

            <TabsContent value="menu" className="px-3 py-4 sm:px-6 sm:py-8 lg:px-8 mt-0">
        {/* Best Sellers Carousel */}
        {top3BestSellers.length > 0 && (
          <div className="mb-4 sm:mb-8">
            <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border">
              {/* Carousel Container */}
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
              >
                {top3BestSellers.map((product, index) => {
                  const productCurrency = (product.currency || "MXN") as Currency;
                  const convertedPrice = convertCurrency(product.price, productCurrency as CurrencyCode, selectedCurrency);
                  const currencySymbol = getCurrencySymbol(selectedCurrency);
                  const decimals = selectedCurrency === "JPY" ? 0 : 2;

                  return (
                    <div
                      key={product.id}
                      className="w-full flex-shrink-0 p-3 sm:p-6 flex items-center gap-3 sm:gap-6 cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      {/* Text Content */}
                      <div className="flex-1 space-y-1.5 sm:space-y-3 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                            #{index + 1} {language === "es" ? "Más Vendido" : "Best Seller"}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-xl font-bold line-clamp-2">{product.name}</h3>
                        {product.description && (
                          <p className="hidden sm:block text-sm text-muted-foreground line-clamp-2">
                            {product.description}
                          </p>
                        )}
                        <div className="flex items-baseline gap-1 sm:gap-2">
                          <span className="text-xl sm:text-2xl font-black text-primary">
                            {currencySymbol}{convertedPrice.toFixed(decimals)}
                          </span>
                          <span className="text-xs sm:text-sm font-semibold text-primary/70">
                            {selectedCurrency}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab("best-sellers");
                          }}
                        >
                          <span className="hidden sm:inline">{language === "es" ? "Ver más vendidos" : "View best sellers"}</span>
                          <span className="sm:hidden">{language === "es" ? "Ver más" : "More"}</span>
                          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>

                      {/* Product Image */}
                      <div className="relative w-20 h-20 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex-shrink-0 ring-2 ring-primary/20">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 80px, 160px"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ChefHat className="h-8 w-8 sm:h-12 sm:w-12 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Carousel Controls - Below carousel */}
              {top3BestSellers.length > 1 && (
                <div className="flex items-center justify-center gap-3 sm:gap-4 py-2 sm:py-3 border-t bg-muted/30">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-background hover:bg-accent shadow-sm"
                    onClick={() => setCarouselIndex((prev) => (prev === 0 ? top3BestSellers.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>

                  {/* Dots Indicator */}
                  <div className="flex gap-1.5">
                    {top3BestSellers.map((_, index) => (
                      <button
                        key={index}
                        className={cn(
                          "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all",
                          index === carouselIndex ? "bg-primary w-3 sm:w-4" : "bg-primary/30"
                        )}
                        onClick={() => setCarouselIndex(index)}
                      />
                    ))}
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-background hover:bg-accent shadow-sm"
                    onClick={() => setCarouselIndex((prev) => (prev === top3BestSellers.length - 1 ? 0 : prev + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9 sm:h-10 text-sm"
            />
          </div>

          {/* Category Filter and Image Size Control */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide flex-1">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0"
                onClick={() => setSelectedCategory(null)}
              >
                {t.all}
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={
                    selectedCategory === category.id ? "default" : "outline"
                  }
                  size="sm"
                  className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 flex-shrink-0"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Image Size Controls - Hidden on very small screens */}
            <div className="hidden xs:flex gap-0.5 sm:gap-1 border rounded-lg p-0.5 sm:p-1 bg-muted/30 flex-shrink-0">
              <Button
                variant={imageSize === "small" ? "default" : "ghost"}
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => setImageSize("small")}
                title="Pequeño"
              >
                <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant={imageSize === "medium" ? "default" : "ghost"}
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => setImageSize("medium")}
                title="Mediano"
              >
                <Square className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant={imageSize === "large" ? "default" : "ghost"}
                size="icon"
                className="h-6 w-6 sm:h-8 sm:w-8"
                onClick={() => setImageSize("large")}
                title="Grande"
              >
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 gap-3 sm:gap-4">
            <ChefHat className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            <p className="text-sm sm:text-base text-muted-foreground text-center">
              {t.noProductsFound}
            </p>
          </div>
        ) : (
          <div className={cn("grid gap-2 sm:gap-4 lg:gap-6 pb-20 lg:pb-0", imageSizeConfig[imageSize].gridCols)}>
            {filteredProducts.map((product) => {
              const productCurrency = (product.currency || "MXN") as Currency;
              const convertedPrice = convertCurrency(product.price, productCurrency as CurrencyCode, selectedCurrency);
              const currencySymbol = getCurrencySymbol(selectedCurrency);
              const decimals = selectedCurrency === "JPY" ? 0 : 2;
              const isInCart = cart.some((item) => item.id === product.id);

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  {/* Image */}
                  <div className={cn("relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", imageSizeConfig[imageSize].imageHeight)}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-300">
                        <ChefHat className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
                      </div>
                    )}

                    {/* Product Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 sm:p-4 pt-4 sm:pt-8">
                      <h3 className="font-bold text-xs sm:text-sm lg:text-lg text-white line-clamp-2 drop-shadow-lg">
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  {/* Content */}
                  <CardContent className="p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3">

                    {/* Price Section - Simplified with single currency */}
                    <div className="space-y-1.5 sm:space-y-2">
                      {/* Price in Selected Currency */}
                      <div className="flex items-baseline gap-1">
                        <span className="text-base sm:text-xl lg:text-2xl font-black text-primary">
                          {currencySymbol}{convertedPrice.toFixed(decimals)}
                        </span>
                        <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-primary/70">
                          {selectedCurrency}
                        </span>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product);
                        }}
                        size="sm"
                        className="w-full h-7 sm:h-8 lg:h-9 text-xs sm:text-sm"
                        variant={isInCart ? "secondary" : "default"}
                      >
                        {isInCart ? (
                          <>
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">{t.inCart}</span>
                            <span className="sm:hidden">En carrito</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">{t.addToCart}</span>
                            <span className="sm:hidden">Agregar</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
            </TabsContent>

            {/* Best Sellers Tab */}
            <TabsContent value="best-sellers" className="px-3 py-4 sm:px-6 sm:py-8 lg:px-8 mt-0">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                  <div>
                    <h2 className="text-lg sm:text-2xl font-bold">
                      {language === "es" ? "Más Vendidos" : "Best Sellers"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === "es"
                        ? "Los favoritos"
                        : "Customer favorites"}
                    </p>
                  </div>
                </div>

                {bestSellers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 gap-3 sm:gap-4">
                    <Star className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
                    <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">
                      {t.noBestSellers}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground text-center">
                      {t.noBestSellersDescription}
                    </p>
                  </div>
                ) : (
                  <div className={cn("grid gap-2 sm:gap-4 lg:gap-6 pb-20 lg:pb-0", imageSizeConfig[imageSize].gridCols)}>
                    {bestSellers.map((product, index) => {
                      const productCurrency = (product.currency || "MXN") as Currency;
                      const convertedPrice = convertCurrency(product.price, productCurrency as CurrencyCode, selectedCurrency);
                      const currencySymbol = getCurrencySymbol(selectedCurrency);
                      const decimals = selectedCurrency === "JPY" ? 0 : 2;
                      const isInCart = cart.some((item) => item.id === product.id);

                      return (
                        <Card
                          key={product.id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer relative"
                          onClick={() => addToCart(product)}
                        >
                          {/* Rank Badge */}
                          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 z-10">
                            <Badge variant="secondary" className="gap-0.5 sm:gap-1 bg-yellow-500/90 text-white hover:bg-yellow-500 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                              <Star className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-white" />
                              #{index + 1}
                            </Badge>
                          </div>

                          {/* Image */}
                          <div className={cn("relative w-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900", imageSizeConfig[imageSize].imageHeight)}>
                            {product.image_url ? (
                              <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                              />
                            ) : (
                              <div className="flex items-center justify-center w-full h-full text-gray-300">
                                <ChefHat className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16" />
                              </div>
                            )}

                            {/* Product Name Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-2 sm:p-4 pt-4 sm:pt-8">
                              <h3 className="font-bold text-xs sm:text-sm lg:text-lg text-white line-clamp-2 drop-shadow-lg">
                                {product.name}
                              </h3>
                            </div>
                          </div>

                          {/* Content */}
                          <CardContent className="p-2 sm:p-3 lg:p-4 space-y-2 sm:space-y-3">
                            {/* Price Section - Simplified with single currency */}
                            <div className="space-y-1.5 sm:space-y-2">
                              <div className="flex items-baseline gap-1">
                                <span className="text-base sm:text-xl lg:text-2xl font-black text-primary">
                                  {currencySymbol}{convertedPrice.toFixed(decimals)}
                                </span>
                                <span className="text-[10px] sm:text-xs lg:text-sm font-semibold text-primary/70">
                                  {selectedCurrency}
                                </span>
                              </div>

                              {/* Add to Cart Button */}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(product);
                                }}
                                size="sm"
                                className="w-full h-7 sm:h-8 lg:h-9 text-xs sm:text-sm"
                                variant={isInCart ? "secondary" : "default"}
                              >
                                {isInCart ? (
                                  <>
                                    <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="hidden sm:inline">{t.inCart}</span>
                                    <span className="sm:hidden">En carrito</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="hidden sm:inline">{t.addToCart}</span>
                                    <span className="sm:hidden">Agregar</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="voice" className="mt-0 h-[calc(100vh-48px)]">
              <ElevenLabsVoiceAgent
                products={products}
                onAddToCart={addToCart}
                onPlaceOrder={handleCheckout}
                cart={cart}
                language={language}
                agentId="agent_5201kahzqda2fgpas8jhsep7xnvc"
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column: Ticket (Desktop Only) */}
        <div className="hidden lg:flex lg:w-80 xl:w-96 bg-background items-center justify-center p-6">
          <div className="w-full max-w-md border rounded-xl shadow-lg bg-card">
            {/* Header */}
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <div>
                  <h2 className="text-sm font-semibold">{t.shoppingCart}</h2>
                  <p className="text-xs text-muted-foreground">
                    {cartItemsCount} {cartItemsCount === 1 ? t.item : t.items}
                  </p>
                </div>
              </div>
            </div>

            {/* Cart Items */}
            <div className="p-3 max-h-[400px] overflow-y-auto">
              <div className="space-y-2.5">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 px-4">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">{t.emptyCart}</p>
                  </div>
                </div>
              ) : (
                cart.map((item) => {
                  const unitPrice = item.unitPriceWithVariants || item.price;
                  const itemCurrency = (item.currency || "MXN") as CurrencyCode;
                  const convertedPrice = convertCurrency(unitPrice, itemCurrency, selectedCurrency);
                  const itemTotal = convertedPrice * item.quantity;

                  return (
                  <div
                    key={item.id}
                    className="group relative p-2 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex gap-2">
                      {/* Image */}
                      <div className="relative w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-md overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <ChefHat className="h-6 w-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="pr-6">
                          <h4 className="font-semibold text-xs line-clamp-2 leading-tight">{item.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {cartCurrencySymbol}{convertedPrice.toFixed(cartDecimals)}
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5 bg-muted/50 rounded p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-background"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-semibold text-xs">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 hover:bg-background"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Item Total */}
                          <div className="ml-auto">
                            <p className="text-xs font-bold text-primary">
                              {cartCurrencySymbol}{itemTotal.toFixed(cartDecimals)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )})
              )}
              </div>
            </div>

            {/* Footer with Total and Checkout */}
            {cart.length > 0 && (
              <div className="border-t p-3 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.subtotal}</span>
                    <span className="font-medium">{cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t.taxes}</span>
                    <span className="font-medium">{cartCurrencySymbol}0{cartDecimals > 0 ? '.00' : ''}</span>
                  </div>
                  <div className="h-px bg-border my-1.5" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{t.total}</span>
                    <div className="text-right">
                      <span className="text-lg font-bold text-primary">
                        {cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        {selectedCurrency}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full h-10 text-sm font-medium"
                >
                  {t.placeOrder}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar (Mobile) */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold">{t.shoppingCart}</SheetTitle>
                <SheetDescription className="text-xs">
                  {cartItemsCount} {cartItemsCount === 1 ? t.item : t.items}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-4">
                <div className="p-6 rounded-full bg-muted/50">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-muted-foreground text-lg">{t.emptyCart}</p>
                  <p className="text-sm text-muted-foreground">{t.emptyCartSubtext}</p>
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const unitPrice = item.unitPriceWithVariants || item.price;
                const itemCurrency = (item.currency || "MXN") as CurrencyCode;
                const convertedPrice = convertCurrency(unitPrice, itemCurrency, selectedCurrency);
                const itemTotal = convertedPrice * item.quantity;

                return (
                <div
                  key={item.id}
                  className="group relative p-3 border rounded-xl bg-card hover:shadow-md transition-all duration-200"
                >
                  <div className="flex gap-3">
                    {/* Image */}
                    <div className="relative w-20 h-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-border">
                      {item.image_url ? (
                        <Image
                          src={item.image_url}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full">
                          <ChefHat className="h-10 w-10 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="pr-8">
                        <h4 className="font-bold text-base line-clamp-2 leading-tight">{item.name}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {cartCurrencySymbol}{convertedPrice.toFixed(cartDecimals)} {selectedCurrency}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-bold text-base">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Item Total */}
                        <div className="ml-auto">
                          <p className="text-base font-bold text-primary">
                            {cartCurrencySymbol}{itemTotal.toFixed(cartDecimals)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )})
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t p-4 space-y-4 mt-auto bg-background shadow-lg">
              <div className="space-y-2.5 p-4 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="font-semibold">{cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">{t.taxes}</span>
                  <span className="font-semibold">{cartCurrencySymbol}0{cartDecimals > 0 ? '.00' : ''}</span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{t.total}</span>
                  <span className="text-2xl font-bold text-primary">
                    {cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground text-right">
                  {selectedCurrency}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCartOpen(false)}
                  className="flex-1 h-11"
                >
                  {t.continueShopping}
                </Button>
                <Button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="flex-1 h-11 font-semibold"
                  size="lg"
                >
                  {t.placeOrder}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={(open) => {
        setIsCheckoutOpen(open);
        if (!open) {
          setCheckoutStep("review");
          setPaymentMethod("cash");
        }
      }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
          {orderSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
              <DialogTitle className="text-2xl">
                {t.orderSuccess}
              </DialogTitle>
              <DialogDescription className="text-center">
                {t.orderSuccessDescription}
              </DialogDescription>
            </div>
          ) : checkoutStep === "review" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t.confirmOrder}</DialogTitle>
                <DialogDescription>
                  {t.reviewOrder}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {cart.map((item) => {
                    const unitPrice = item.unitPriceWithVariants || item.price;
                    const itemCurrency = (item.currency || "MXN") as CurrencyCode;
                    const convertedPrice = convertCurrency(unitPrice, itemCurrency, selectedCurrency);
                    const itemTotal = convertedPrice * item.quantity;

                    return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-semibold">
                        {cartCurrencySymbol}{itemTotal.toFixed(cartDecimals)}
                      </span>
                    </div>
                  )})}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t.additionalNotes}
                  </label>
                  <Textarea
                    placeholder={t.notesPlaceholder}
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="border-t pt-4 flex items-center justify-between text-lg font-bold">
                  <span>{t.total}</span>
                  <span className="text-primary text-2xl">
                    {cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)} {selectedCurrency}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCheckoutOpen(false)}
                >
                  {t.cancel}
                </Button>
                <Button onClick={() => setCheckoutStep("payment")}>
                  {language === "es" ? "Proceder al Pago" : "Proceed to Payment"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  {language === "es" ? "Método de Pago" : "Payment Method"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  {language === "es"
                    ? "Selecciona cómo deseas pagar"
                    : "Select how to pay"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                {/* Total */}
                <div className="bg-primary/10 rounded-lg p-3 sm:p-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                    {language === "es" ? "Total a pagar" : "Total to pay"}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">
                    {cartCurrencySymbol}{cartTotal.toFixed(cartDecimals)} {selectedCurrency}
                  </p>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm">{language === "es" ? "Método de Pago" : "Payment Method"}</Label>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {paymentMethods.map((method) => {
                        const Icon = method.icon;
                        return (
                          <div key={method.id}>
                            <RadioGroupItem
                              value={method.id}
                              id={method.id}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={method.id}
                              className={cn(
                                "flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-background p-2 sm:p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                              )}
                            >
                              <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
                              <span className="text-xs sm:text-sm font-medium">{method.name}</span>
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCheckoutStep("review")}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  {language === "es" ? "Atrás" : "Back"}
                </Button>
                <Button onClick={handleCheckout} disabled={submitting} className="w-full sm:w-auto">
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    language === "es" ? "Completar" : "Complete"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Modal */}
      <QRModal
        open={isQRModalOpen}
        onOpenChange={setIsQRModalOpen}
        menuUrl={menuUrl}
        restaurantName={language === "es" ? "Menú Digital" : "Digital Menu"}
        language={language}
        canEdit={false}
      />

      {/* Variant Selection Modal */}
      <VariantSelectionModal
        open={variantModalOpen}
        onOpenChange={setVariantModalOpen}
        product={selectedProductForVariants}
        onConfirm={handleVariantConfirm}
      />

      {/* Currency Preference Dialog */}
      <CurrencyPreferenceDialog
        open={showCurrencyDialog}
        onOpenChange={setShowCurrencyDialog}
        onCurrencySelect={setSelectedCurrency}
        language={language}
      />
    </>
  );
}
