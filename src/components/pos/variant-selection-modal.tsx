"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Product, ProductVariant } from "@/types/database";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Package, Plus, Minus } from "lucide-react";

interface VariantSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onConfirm: (
    product: Product,
    selectedVariants: Array<{
      variant_id: string;
      variant_name: string;
      variant_type: string;
      price_applied: number;
    }>,
    quantity: number,
    totalPrice: number
  ) => void;
}

interface GroupedVariants {
  [typeName: string]: ProductVariant[];
}

export function VariantSelectionModal({
  open,
  onOpenChange,
  product,
  onConfirm,
}: VariantSelectionModalProps) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set());
  const [quantity, setQuantity] = useState(1);

  // Reset selections when product changes
  useEffect(() => {
    if (product) {
      setSelectedVariants({});
      setSelectedExtras(new Set());
      setQuantity(1);

      // Set default variants
      if (product.variants) {
        const defaults: Record<string, string> = {};
        product.variants.forEach((variant) => {
          if (variant.is_default && variant.variant_type) {
            const typeName = typeof variant.variant_type === 'object'
              ? variant.variant_type.name
              : variant.variant_type;
            defaults[typeName] = variant.id;
          }
        });
        setSelectedVariants(defaults);
      }
    }
  }, [product]);

  // Group variants by type
  const groupedVariants = useMemo<GroupedVariants>(() => {
    if (!product?.variants) return {};

    const groups: GroupedVariants = {};

    product.variants.forEach((variant) => {
      const typeName = typeof variant.variant_type === 'object'
        ? variant.variant_type.name
        : (variant.variant_type_id || 'Otro');

      if (!groups[typeName]) {
        groups[typeName] = [];
      }
      groups[typeName].push(variant);
    });

    return groups;
  }, [product?.variants]);

  // Determine which types are single-select (like sizes) vs multi-select (like toppings)
  const singleSelectTypes = useMemo(() => {
    const types = new Set<string>();
    Object.entries(groupedVariants).forEach(([typeName, variants]) => {
      // If type is "Tamaño", "Porción", or has absolute prices, it's single-select
      const hasAbsolutePrice = variants.some(v => v.is_absolute_price);
      if (
        typeName.toLowerCase().includes('tamaño') ||
        typeName.toLowerCase().includes('porción') ||
        typeName.toLowerCase().includes('size') ||
        hasAbsolutePrice
      ) {
        types.add(typeName);
      }
    });
    return types;
  }, [groupedVariants]);

  // Calculate total price
  const totalPrice = useMemo(() => {
    if (!product) return 0;

    let price = product.price;

    // Add single-select variant modifiers
    Object.values(selectedVariants).forEach((variantId) => {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        if (variant.is_absolute_price) {
          price = variant.price_modifier;
        } else {
          price += variant.price_modifier;
        }
      }
    });

    // Add multi-select extras
    selectedExtras.forEach((variantId) => {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        price += variant.price_modifier;
      }
    });

    return price * quantity;
  }, [product, selectedVariants, selectedExtras, quantity]);

  const handleConfirm = () => {
    if (!product) return;

    const allSelectedVariants: Array<{
      variant_id: string;
      variant_name: string;
      variant_type: string;
      price_applied: number;
    }> = [];

    // Add single-select variants
    Object.entries(selectedVariants).forEach(([typeName, variantId]) => {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        allSelectedVariants.push({
          variant_id: variant.id,
          variant_name: variant.name,
          variant_type: typeName,
          price_applied: variant.is_absolute_price ? variant.price_modifier : variant.price_modifier,
        });
      }
    });

    // Add multi-select extras
    selectedExtras.forEach((variantId) => {
      const variant = product.variants?.find((v) => v.id === variantId);
      if (variant) {
        const typeName = typeof variant.variant_type === 'object'
          ? variant.variant_type.name
          : 'Extra';
        allSelectedVariants.push({
          variant_id: variant.id,
          variant_name: variant.name,
          variant_type: typeName,
          price_applied: variant.price_modifier,
        });
      }
    });

    onConfirm(product, allSelectedVariants, quantity, totalPrice);
    onOpenChange(false);
  };

  const handleSingleSelect = (typeName: string, variantId: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [typeName]: variantId,
    }));
  };

  const handleMultiSelect = (variantId: string, checked: boolean) => {
    setSelectedExtras((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(variantId);
      } else {
        newSet.delete(variantId);
      }
      return newSet;
    });
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {product.image_url ? (
              <div className="relative w-12 h-12 rounded-lg overflow-hidden">
                <Image
                  src={product.image_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <span>{product.name}</span>
          </DialogTitle>
          <DialogDescription>
            Selecciona las opciones para tu producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[400px] overflow-y-auto">
          {Object.entries(groupedVariants).map(([typeName, variants]) => {
            const isSingleSelect = singleSelectTypes.has(typeName);

            return (
              <div key={typeName} className="space-y-3">
                <Label className="text-base font-semibold">
                  {typeName}
                  {isSingleSelect && <span className="text-muted-foreground text-sm ml-2">(Selecciona uno)</span>}
                </Label>

                {isSingleSelect ? (
                  <RadioGroup
                    value={selectedVariants[typeName] || ""}
                    onValueChange={(value) => handleSingleSelect(typeName, value)}
                  >
                    <div className="grid gap-2">
                      {variants.map((variant) => {
                        const priceDisplay = variant.is_absolute_price
                          ? `$${variant.price_modifier.toFixed(2)}`
                          : variant.price_modifier > 0
                          ? `+$${variant.price_modifier.toFixed(2)}`
                          : variant.price_modifier < 0
                          ? `-$${Math.abs(variant.price_modifier).toFixed(2)}`
                          : "Incluido";

                        return (
                          <div
                            key={variant.id}
                            className={cn(
                              "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                              selectedVariants[typeName] === variant.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-accent"
                            )}
                            onClick={() => handleSingleSelect(typeName, variant.id)}
                          >
                            <div className="flex items-center gap-3">
                              <RadioGroupItem value={variant.id} id={variant.id} />
                              <Label htmlFor={variant.id} className="cursor-pointer font-medium">
                                {variant.name}
                              </Label>
                            </div>
                            <span className={cn(
                              "font-semibold",
                              variant.price_modifier > 0 && "text-primary"
                            )}>
                              {priceDisplay}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="grid gap-2">
                    {variants.map((variant) => {
                      const priceDisplay = variant.price_modifier > 0
                        ? `+$${variant.price_modifier.toFixed(2)}`
                        : variant.price_modifier < 0
                        ? `-$${Math.abs(variant.price_modifier).toFixed(2)}`
                        : "Gratis";

                      return (
                        <div
                          key={variant.id}
                          className={cn(
                            "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors",
                            selectedExtras.has(variant.id)
                              ? "border-primary bg-primary/5"
                              : "hover:bg-accent"
                          )}
                          onClick={() => handleMultiSelect(variant.id, !selectedExtras.has(variant.id))}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={variant.id}
                              checked={selectedExtras.has(variant.id)}
                              onCheckedChange={(checked) =>
                                handleMultiSelect(variant.id, checked as boolean)
                              }
                            />
                            <Label htmlFor={variant.id} className="cursor-pointer font-medium">
                              {variant.name}
                            </Label>
                          </div>
                          <span className={cn(
                            "font-semibold",
                            variant.price_modifier > 0 ? "text-primary" : "text-green-600"
                          )}>
                            {priceDisplay}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <Separator />
              </div>
            );
          })}

          {/* Quantity Selector */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Cantidad</Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center font-bold text-lg">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between py-2">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-primary">
            ${totalPrice.toFixed(2)}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Agregar al carrito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
