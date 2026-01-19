"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLanguage, LANGUAGES } from "@/contexts/language-context";
import { useCustomerMenuTranslations } from "@/lib/translations/customer-menu";
import { getProductPriceDisplays } from "@/lib/currency";
import { Currency } from "@/types/database";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  category_id?: string;
  categories?: {
    id: string;
    name: string;
  };
}

interface CartItem extends Product {
  quantity: number;
}

export default function MenuPage() {
  const { language } = useLanguage();
  const t = useCustomerMenuTranslations(language);

  // Get local currency based on selected language
  const currentLanguageData = LANGUAGES.find((l) => l.code === language);
  const localCurrency = (currentLanguageData?.currency || "MXN") as Currency;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/menu-products");
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(t.loadMenuError);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(
      products
        .filter((p) => p.categories)
        .map((p) => JSON.stringify(p.categories))
    )
  ).map((c) => JSON.parse(c));

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !selectedCategory || product.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

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

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: orderItems,
          notes: orderNotes,
          currency: cart[0]?.currency || "MXN",
        }),
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
      {/* Cart Button - Fixed Position */}
      <div className="fixed bottom-6 right-6 z-50 lg:bottom-8 lg:right-8">
          <Button
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="relative">
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <Badge className="absolute -top-3 -right-3 h-6 w-6 flex items-center justify-center p-0 rounded-full">
                  {cartItemsCount}
                </Badge>
              )}
            </div>
          </Button>
      </div>

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Search and Filters */}
        <div className="space-y-4 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
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
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <ChefHat className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">
              {t.noProductsFound}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const productCurrency = (product.currency || "MXN") as Currency;
              const priceDisplays = getProductPriceDisplays(
                product.price,
                productCurrency,
                localCurrency
              );

              return (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-all duration-300 group"
                >
                  {/* Image */}
                  <div className="relative w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
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
                        <ChefHat className="h-16 w-16" />
                      </div>
                    )}

                    {/* Category Badge */}
                    {product.categories && (
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-white/95 text-gray-900 backdrop-blur-sm shadow-lg border-0">
                          {product.categories.name}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg line-clamp-1">
                        {product.name}
                      </h3>
                    </div>

                    {/* Price Section - Multi-currency */}
                    <div className="pt-2 border-t space-y-2">
                      {/* Primary Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-primary">
                          {priceDisplays.primary.symbol}{priceDisplays.primary.amount.toFixed(productCurrency === "JPY" ? 0 : 2)}
                        </span>
                        <span className="text-sm font-semibold text-primary/70">
                          {priceDisplays.primary.currency}
                        </span>
                      </div>

                      {/* Secondary and Local Prices */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col bg-muted/50 rounded-md px-2 py-1.5">
                          <span className="text-xs text-muted-foreground font-medium">
                            {priceDisplays.secondary.currency}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {priceDisplays.secondary.symbol}{priceDisplays.secondary.amount.toFixed(priceDisplays.secondary.currency === "JPY" ? 0 : 2)}
                          </span>
                        </div>

                        {priceDisplays.local && (
                          <div className="flex flex-col bg-accent/50 rounded-md px-2 py-1.5 border-2 border-accent">
                            <span className="text-xs text-muted-foreground font-medium">
                              {priceDisplays.local.currency}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {priceDisplays.local.symbol}{priceDisplays.local.amount.toFixed(priceDisplays.local.currency === "JPY" ? 0 : 2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <Button onClick={() => addToCart(product)} size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        {t.addToCart}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-2xl">
              <ShoppingCart className="h-6 w-6" />
              {t.shoppingCart}
            </SheetTitle>
            <SheetDescription>
              {cartItemsCount} {cartItemsCount === 1 ? t.item : t.items} {t.itemsInCart}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-6 space-y-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-4">
                <ShoppingCart className="h-20 w-20 text-muted-foreground" />
                <p className="text-muted-foreground text-lg">{t.emptyCart}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="relative w-20 h-20 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
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

                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <h4 className="font-bold text-base">{item.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        ${item.price.toFixed(2)} {item.currency}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-10 text-center font-bold text-lg">
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9"
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="pt-2 border-t">
                      <p className="text-sm font-semibold text-right">
                        {t.subtotal} <span className="text-primary">${(item.price * item.quantity).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t pt-4 space-y-4 mt-auto">
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">{t.subtotal}</span>
                  <span className="font-semibold">${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">{t.taxes}</span>
                  <span className="font-semibold">$0.00</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-xl font-bold">
                  <span>{t.total}</span>
                  <span className="text-primary">
                    ${cartTotal.toFixed(2)} {cart[0]?.currency || "MXN"}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCartOpen(false)}
                  className="flex-1"
                >
                  {t.continueShopping}
                </Button>
                <Button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="flex-1"
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
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
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
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t.confirmOrder}</DialogTitle>
                <DialogDescription>
                  {t.reviewOrder}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span className="font-semibold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
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
                    ${cartTotal.toFixed(2)} {cart[0]?.currency || "MXN"}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCheckoutOpen(false)}
                  disabled={submitting}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleCheckout} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.processing}
                    </>
                  ) : (
                    t.confirmOrderButton
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
