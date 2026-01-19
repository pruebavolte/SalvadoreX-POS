"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CatalogProduct {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  imageUrl?: string;
}

interface TemplateProductSelectorProps {
  products: CatalogProduct[];
  selectedProducts: Set<string>;
  onToggleProduct: (product: CatalogProduct) => void;
  loading?: boolean;
}

export function TemplateProductSelector({
  products,
  selectedProducts,
  onToggleProduct,
  loading = false,
}: TemplateProductSelectorProps) {
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    if (!search.trim()) {
      return products.slice(0, 100);
    }

    const searchLower = search.toLowerCase();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(searchLower) ||
        product.sku?.toLowerCase().includes(searchLower) ||
        product.barcode?.toLowerCase().includes(searchLower)
    );
  }, [products, search]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar productos del catálogo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10"
            autoFocus
            data-testid="input-template-product-search"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
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
                  : "No hay productos disponibles en el catálogo"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.has(product.id);
                return (
                  <div
                    key={product.id}
                    data-testid={`card-catalog-product-${product.id}`}
                    className={cn(
                      "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm transition-all duration-200 cursor-pointer group",
                      "border-2",
                      isSelected 
                        ? "border-primary shadow-md ring-2 ring-primary/20" 
                        : "border-gray-100 dark:border-gray-700 hover:border-primary/50"
                    )}
                    onClick={() => onToggleProduct(product)}
                  >
                    <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900">
                      {product.imageUrl ? (
                        <Image
                          src={product.imageUrl}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-300">
                          <Package className="h-12 w-12" />
                        </div>
                      )}

                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center">
                          <span className="text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>

                    <div className="p-2 text-center">
                      <h3 className="font-medium text-foreground line-clamp-2 leading-tight mb-1 text-xs">
                        {product.name}
                      </h3>
                      <p className="text-primary font-bold text-sm">
                        ${product.price.toFixed(2)}
                      </p>
                      {product.sku && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {search && (
        <div className="text-xs text-muted-foreground text-center flex-shrink-0">
          {filteredProducts.length} producto(s) encontrado(s)
          {selectedProducts.size > 0 && ` · ${selectedProducts.size} seleccionado(s)`}
        </div>
      )}
    </div>
  );
}
