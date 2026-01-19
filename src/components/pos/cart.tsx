"use client";

import { Cart as CartType, CartItem } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, X, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CartProps {
  cart: CartType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onUpdateItemDiscount: (productId: string, discount: number) => void;
  onUpdateGlobalDiscount: (discount: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
  onUpdateGlobalDiscount,
  onClearCart,
  onCheckout,
}: CartProps) {
  const isEmpty = cart.items.length === 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 space-y-0 pb-3 sm:pb-4 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
            <CardTitle className="text-base sm:text-lg">Carrito</CardTitle>
            <span className="text-xs sm:text-sm text-muted-foreground">
              ({cart.items.length})
            </span>
          </div>
          {!isEmpty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearCart}
              className="text-destructive hover:text-destructive min-h-[44px] px-2 sm:px-3"
              data-testid="button-clear-cart"
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Limpiar</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
            <ShoppingCart className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="font-semibold text-base sm:text-lg mb-2">Carrito vacío</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Agrega productos para comenzar una venta
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-3 sm:px-6">
              <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
                {cart.items.map((item) => (
                  <CartItemComponent
                    key={item.product.id}
                    item={item}
                    onUpdateQuantity={onUpdateQuantity}
                    onRemove={onRemoveItem}
                    onUpdateDiscount={onUpdateItemDiscount}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="flex-shrink-0 border-t px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm font-medium whitespace-nowrap">
                  Descuento:
                </label>
                <div className="relative flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    defaultValue={0}
                    onChange={(e) =>
                      onUpdateGlobalDiscount(parseFloat(e.target.value) || 0)
                    }
                    className="pr-8 h-10 sm:h-9 text-base sm:text-sm"
                    data-testid="input-global-discount"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">
                    %
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
                </div>
                {cart.discount > 0 && (
                  <div className="flex justify-between text-xs sm:text-sm gap-2">
                    <span className="text-muted-foreground">Descuento:</span>
                    <span className="font-medium text-green-600">
                      -${cart.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs sm:text-sm gap-2">
                  <span className="text-muted-foreground">IVA (16%):</span>
                  <span className="font-medium">${cart.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center gap-2">
                  <span className="text-base sm:text-lg font-bold">Total:</span>
                  <span className="text-xl sm:text-2xl font-bold text-primary">
                    ${cart.total.toFixed(2)}
                  </span>
                </div>
              </div>

              <Button
                onClick={onCheckout}
                className="w-full min-h-[48px] sm:min-h-[52px] text-base sm:text-lg font-semibold"
                size="lg"
                data-testid="button-checkout"
              >
                Proceder al Pago
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface CartItemComponentProps {
  item: CartItem;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onUpdateDiscount: (productId: string, discount: number) => void;
}

function CartItemComponent({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateDiscount,
}: CartItemComponentProps) {
  const itemTotal =
    item.product.price * item.quantity * (1 - item.discount / 100);

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-start gap-2 sm:gap-3">
        <div className="relative w-11 h-11 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden flex-shrink-0">
          {item.product.image_url ? (
            <Image
              src={item.product.image_url}
              alt={item.product.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-0.5 sm:space-y-1 min-w-0">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <h4 className="font-medium text-xs sm:text-sm leading-tight line-clamp-2">
              {item.product.name}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-7 sm:w-7 flex-shrink-0 min-h-[32px] min-w-[32px]"
              onClick={() => onRemove(item.product.id)}
              data-testid={`button-remove-${item.product.id}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            ${item.product.price.toFixed(2)} c/u
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9 min-h-[40px] min-w-[40px]"
            onClick={() =>
              onUpdateQuantity(item.product.id, Math.max(1, item.quantity - 1))
            }
            data-testid={`button-decrease-${item.product.id}`}
          >
            <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
          <div className="w-10 sm:w-12 text-center">
            <span className="font-medium text-sm sm:text-base">{item.quantity}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 sm:h-9 sm:w-9 min-h-[40px] min-w-[40px]"
            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
            data-testid={`button-increase-${item.product.id}`}
          >
            <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="1"
            value={item.discount}
            onChange={(e) =>
              onUpdateDiscount(item.product.id, parseFloat(e.target.value) || 0)
            }
            className="w-14 sm:w-16 h-10 sm:h-9 text-xs sm:text-sm text-center"
            data-testid={`input-discount-${item.product.id}`}
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="font-bold text-sm sm:text-base">${itemTotal.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
