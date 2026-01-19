"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Product } from "@/types/database";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

type ImageSize = "small" | "medium" | "large";

interface ProductSearchProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  loading?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  hideSearch?: boolean;
}

function usePinchZoom(
  initialSize: ImageSize,
  onChange: (size: ImageSize) => void
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const currentSize = useRef<ImageSize>(initialSize);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      initialDistance.current = getDistance(e.touches);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance.current !== null) {
      const currentDistance = getDistance(e.touches);
      const ratio = currentDistance / initialDistance.current;

      if (ratio > 1.3) {
        if (currentSize.current === "small") {
          currentSize.current = "medium";
          onChange("medium");
        } else if (currentSize.current === "medium") {
          currentSize.current = "large";
          onChange("large");
        }
        initialDistance.current = currentDistance;
      } else if (ratio < 0.7) {
        if (currentSize.current === "large") {
          currentSize.current = "medium";
          onChange("medium");
        } else if (currentSize.current === "medium") {
          currentSize.current = "small";
          onChange("small");
        }
        initialDistance.current = currentDistance;
      }
    }
  }, [onChange]);

  const handleTouchEnd = useCallback(() => {
    initialDistance.current = null;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    currentSize.current = initialSize;
  }, [initialSize]);

  return containerRef;
}

export function ProductSearch({
  products,
  onSelectProduct,
  loading = false,
  searchValue,
  onSearchChange,
  hideSearch = false,
}: ProductSearchProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [imageSize, setImageSize] = useState<ImageSize>("medium");

  const search = searchValue !== undefined ? searchValue : localSearch;
  const setSearch = onSearchChange || setLocalSearch;

  const pinchRef = usePinchZoom(imageSize, setImageSize);

  const imageSizeConfig = {
    small: {
      gridCols: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      imageHeight: "aspect-square",
      fontSize: "text-xs",
    },
    medium: {
      gridCols: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
      imageHeight: "aspect-square",
      fontSize: "text-sm",
    },
    large: {
      gridCols: "grid-cols-2 sm:grid-cols-2 lg:grid-cols-3",
      imageHeight: "aspect-square",
      fontSize: "text-base",
    },
  };

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products.slice(0, 50);
    }

    const searchLower = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  const config = imageSizeConfig[imageSize];

  return (
    <div className="flex flex-col h-full gap-2">
      {!hideSearch && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10"
              autoFocus
              data-testid="input-product-search"
            />
          </div>
        </div>
      )}

      <div ref={pinchRef} className="flex-1 min-h-0 touch-pan-y">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-muted-foreground">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {search
                  ? "No se encontraron productos"
                  : "No hay productos disponibles"}
              </p>
            </div>
          ) : (
            <div className={cn("grid gap-3 p-1 transition-all duration-300", config.gridCols)}>
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  data-testid={`card-product-${product.id}`}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group",
                    "border border-gray-100 dark:border-gray-700",
                    product.stock <= product.min_stock && "ring-2 ring-orange-400"
                  )}
                  onClick={() => onSelectProduct(product)}
                >
                  <div className={cn(
                    "relative w-full bg-gray-50 dark:bg-gray-900",
                    config.imageHeight
                  )}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 33vw, (max-width: 1200px) 25vw, 20vw"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-300">
                        <Package className="h-12 w-12" />
                      </div>
                    )}

                    {product.stock <= product.min_stock && (
                      <div className="absolute top-1 right-1 bg-orange-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                        Bajo
                      </div>
                    )}
                  </div>

                  <div className="p-2 text-center">
                    <h3 className={cn(
                      "font-medium text-foreground line-clamp-2 leading-tight mb-1",
                      config.fontSize
                    )}>
                      {product.name}
                    </h3>
                    <p className="text-primary font-bold text-sm">
                      ${product.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {search && (
        <div className="text-xs text-muted-foreground text-center flex-shrink-0">
          {filteredProducts.length} producto(s)
        </div>
      )}
    </div>
  );
}
