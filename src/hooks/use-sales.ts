"use client";

import { useState, useCallback } from "react";
import { Product } from "@/types/database";
import { Cart, CartItem, CartItemVariant } from "@/types/api";
import { createSaleWithItems } from "@/lib/services/supabase";
import { useCurrentUser } from "@/hooks/use-current-user";

const TAX_RATE = 0.16; // 16% IVA

export function useCart() {
  const { user } = useCurrentUser();
  const [cart, setCart] = useState<Cart>({
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0,
  });

  const calculateTotals = useCallback((items: CartItem[], globalDiscount: number = 0) => {
    const subtotal = items.reduce((sum, item) => {
      // Use unitPriceWithVariants if available, otherwise use base price
      const unitPrice = item.unitPriceWithVariants || item.product.price;
      const itemSubtotal = unitPrice * item.quantity;
      const itemDiscount = (itemSubtotal * item.discount) / 100;
      return sum + (itemSubtotal - itemDiscount);
    }, 0);

    const discountAmount = (subtotal * globalDiscount) / 100;
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * TAX_RATE;
    const total = taxableAmount + tax;

    return {
      subtotal,
      discount: discountAmount,
      tax,
      total,
    };
  }, []);

  const addItem = useCallback(
    (product: Product, quantity: number = 1) => {
      setCart((prev) => {
        const existingIndex = prev.items.findIndex(
          (item) => item.product.id === product.id
        );

        let newItems: CartItem[];

        if (existingIndex >= 0) {
          // Actualizar cantidad si ya existe
          newItems = [...prev.items];
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + quantity,
          };
        } else {
          // Agregar nuevo item
          newItems = [
            ...prev.items,
            {
              product,
              quantity,
              discount: 0,
            },
          ];
        }

        const totals = calculateTotals(newItems, prev.discount);

        return {
          items: newItems,
          ...totals,
        };
      });
    },
    [calculateTotals]
  );

  // Add item with variants
  const addItemWithVariants = useCallback(
    (
      product: Product,
      selectedVariants: CartItemVariant[],
      quantity: number = 1,
      totalPrice: number
    ) => {
      setCart((prev) => {
        // For items with variants, always add as new item (don't merge)
        // because different variant combinations should be separate
        const unitPriceWithVariants = totalPrice / quantity;

        const newItems: CartItem[] = [
          ...prev.items,
          {
            product,
            quantity,
            discount: 0,
            selectedVariants,
            unitPriceWithVariants,
          },
        ];

        const totals = calculateTotals(newItems, prev.discount);

        return {
          items: newItems,
          ...totals,
        };
      });
    },
    [calculateTotals]
  );

  const removeItem = useCallback(
    (productId: string, itemIndex?: number) => {
      setCart((prev) => {
        let newItems: CartItem[];

        if (itemIndex !== undefined) {
          // Remove specific item by index (for items with variants)
          newItems = prev.items.filter((_, index) => index !== itemIndex);
        } else {
          // Remove all items with this product ID (legacy behavior)
          newItems = prev.items.filter((item) => item.product.id !== productId);
        }

        const totals = calculateTotals(newItems, prev.discount);

        return {
          items: newItems,
          ...totals,
        };
      });
    },
    [calculateTotals]
  );

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId);
        return;
      }

      setCart((prev) => {
        const newItems = prev.items.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
        const totals = calculateTotals(newItems, prev.discount);

        return {
          items: newItems,
          ...totals,
        };
      });
    },
    [calculateTotals, removeItem]
  );

  const updateItemDiscount = useCallback(
    (productId: string, discount: number) => {
      setCart((prev) => {
        const newItems = prev.items.map((item) =>
          item.product.id === productId ? { ...item, discount } : item
        );
        const totals = calculateTotals(newItems, prev.discount);

        return {
          items: newItems,
          ...totals,
        };
      });
    },
    [calculateTotals]
  );

  const updateGlobalDiscount = useCallback(
    (discount: number) => {
      setCart((prev) => {
        const totals = calculateTotals(prev.items, discount);

        return {
          items: prev.items,
          ...totals,
        };
      });
    },
    [calculateTotals]
  );

  const clearCart = useCallback(() => {
    setCart({
      items: [],
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
    });
  }, []);

  const completeSale = useCallback(
    async (
      paymentMethod: string,
      customerId?: string
    ): Promise<{ success: boolean; saleId?: string; error?: string }> => {
      try {
        if (cart.items.length === 0) {
          return { success: false, error: "El carrito está vacío" };
        }

        if (!user?.id) {
          return { success: false, error: "Usuario no autenticado" };
        }

        // Prepare sale items (use price with variants if available)
        const saleItems = cart.items.map((item) => {
          const unitPrice = item.unitPriceWithVariants || item.product.price;
          return {
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: unitPrice,
            discount: item.discount,
            subtotal: unitPrice * item.quantity * (1 - item.discount / 100),
            selectedVariants: item.selectedVariants, // Include variants
          };
        });

        const response = await createSaleWithItems(
          {
            customer_id: customerId,
            user_id: user.id,
            subtotal: cart.subtotal,
            discount: cart.discount,
            tax: cart.tax,
            total: cart.total,
            payment_method: paymentMethod as any,
            status: "completed",
          },
          saleItems
        );

        if (response.success && response.data) {
          clearCart();
          return { success: true, saleId: response.data.id };
        }

        return {
          success: false,
          error: response.error || "Error al completar la venta",
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Error desconocido",
        };
      }
    },
    [cart, clearCart, user]
  );

  return {
    cart,
    addItem,
    addItemWithVariants,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    updateGlobalDiscount,
    clearCart,
    completeSale,
  };
}
