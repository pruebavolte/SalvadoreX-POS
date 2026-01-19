"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Product } from "@/types/database";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Package, Grid3x3, GripVertical, Move, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

interface CategoryBrowserProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  loading?: boolean;
  selectedCategory?: string | null;
  onCategoryChange?: (categoryId: string | null) => void;
  hideCategories?: boolean;
}

type CardSize = "small" | "medium" | "large";

function usePinchZoom(
  initialSize: CardSize,
  onChange: (size: CardSize) => void
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialDistance = useRef<number | null>(null);
  const currentSize = useRef<CardSize>(initialSize);

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

interface SortableProductCardProps {
  product: Product;
  onSelectProduct: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  config: {
    gridCols: string;
    imageHeight: string;
    fontSize: string;
  };
  isDragging?: boolean;
}

function SortableProductCard({ product, onSelectProduct, onEditProduct, config, isDragging }: SortableProductCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isSortableDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`card-category-product-${product.id}`}
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group relative",
        "border border-gray-100 dark:border-gray-700",
        isSortableDragging && "shadow-xl ring-2 ring-primary"
      )}
    >
      <div className="absolute top-1 left-1 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          {...attributes}
          {...listeners}
          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 hover:bg-black/80 rounded text-[10px] text-white cursor-grab active:cursor-grabbing touch-none"
          onClick={(e) => e.stopPropagation()}
          data-testid={`button-move-${product.id}`}
        >
          <Move className="h-3 w-3" />
          <span>Mover</span>
        </div>
        <button
          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/60 hover:bg-black/80 rounded text-[10px] text-white"
          onClick={(e) => {
            e.stopPropagation();
            onEditProduct?.(product);
          }}
          data-testid={`button-edit-${product.id}`}
        >
          <Pencil className="h-3 w-3" />
          <span>Editar</span>
        </button>
      </div>

      <div
        onClick={() => onSelectProduct(product)}
        className="h-full"
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
        </div>

        <div className="p-1.5 sm:p-2 text-center">
          <h3 className={cn(
            "font-medium text-foreground line-clamp-2 leading-tight mb-0.5 sm:mb-1",
            config.fontSize
          )}>
            {product.name}
          </h3>
          <p className="text-primary font-bold text-xs sm:text-sm">
            ${product.price.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductCardOverlay({ product, config }: { product: Product; config: SortableProductCardProps["config"] }) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-2xl cursor-grabbing",
        "border-2 border-primary ring-4 ring-primary/20",
        "transform scale-105"
      )}
      style={{ width: "150px" }}
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
            className="object-cover"
            sizes="150px"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-300">
            <Package className="h-12 w-12" />
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
  );
}

export function CategoryBrowser({
  products,
  onSelectProduct,
  onEditProduct,
  loading = false,
  selectedCategory: externalSelectedCategory,
  onCategoryChange,
  hideCategories = false,
}: CategoryBrowserProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [localSelectedCategory, setLocalSelectedCategory] = useState<string | null>(null);
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [productOrder, setProductOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedCategory = externalSelectedCategory !== undefined ? externalSelectedCategory : localSelectedCategory;
  const setSelectedCategory = onCategoryChange || setLocalSelectedCategory;

  const pinchRef = usePinchZoom(cardSize, setCardSize);

  const cardSizeConfig = {
    small: {
      gridCols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
      imageHeight: "aspect-square",
      fontSize: "text-xs sm:text-sm",
    },
    medium: {
      gridCols: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5",
      imageHeight: "aspect-square",
      fontSize: "text-sm",
    },
    large: {
      gridCols: "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
      imageHeight: "aspect-[4/3]",
      fontSize: "text-sm sm:text-base",
    },
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (!error && data) {
        setCategories(data);
      }
      setLoadingCategories(false);
    };

    fetchCategories();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) {
      return products;
    }
    return products.filter((product) => product.category_id === selectedCategory);
  }, [products, selectedCategory]);

  useEffect(() => {
    const savedOrder = localStorage.getItem(`productOrder_${selectedCategory || 'all'}`);
    if (savedOrder) {
      setProductOrder(JSON.parse(savedOrder));
    } else {
      setProductOrder(filteredProducts.map(p => p.id));
    }
  }, [filteredProducts, selectedCategory]);

  const orderedProducts = useMemo(() => {
    if (productOrder.length === 0) return filteredProducts;
    
    const orderMap = new Map(productOrder.map((id, index) => [id, index]));
    const sorted = [...filteredProducts].sort((a, b) => {
      const orderA = orderMap.get(a.id) ?? Infinity;
      const orderB = orderMap.get(b.id) ?? Infinity;
      return orderA - orderB;
    });
    
    return sorted;
  }, [filteredProducts, productOrder]);

  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    products.forEach((product) => {
      if (product.category_id) {
        counts[product.category_id] = (counts[product.category_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = orderedProducts.findIndex(p => p.id === active.id);
      const newIndex = orderedProducts.findIndex(p => p.id === over.id);

      const newOrderedProducts = arrayMove(orderedProducts, oldIndex, newIndex);
      const newOrder = newOrderedProducts.map(p => p.id);
      
      setProductOrder(newOrder);
      localStorage.setItem(`productOrder_${selectedCategory || 'all'}`, JSON.stringify(newOrder));
    }
  };

  const activeProduct = activeId ? orderedProducts.find(p => p.id === activeId) : null;

  if (loading || loadingCategories) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  const config = cardSizeConfig[cardSize];

  return (
    <div className="flex flex-col h-full gap-2">
      {!hideCategories && (
        <div className="flex-shrink-0">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 sm:gap-3 pb-2 px-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
                className={cn(
                  "px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-full font-medium text-xs sm:text-sm transition-all duration-200 flex-shrink-0",
                  selectedCategory === null
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>Todos</span>
                  <span className={cn(
                    "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold",
                    selectedCategory === null
                      ? "bg-primary-foreground/20"
                      : "bg-primary/10 text-primary"
                  )}>
                    {products.length}
                  </span>
                </div>
              </button>

              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`button-category-${category.id}`}
                  className={cn(
                    "px-3 sm:px-4 py-2 sm:py-2.5 min-h-[44px] rounded-full font-medium text-xs sm:text-sm transition-all duration-200 flex-shrink-0",
                    selectedCategory === category.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span>{category.name}</span>
                    <span className={cn(
                      "px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold",
                      selectedCategory === category.id
                        ? "bg-primary-foreground/20"
                        : "bg-primary/10 text-primary"
                    )}>
                      {categoryCounts[category.id] || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      <div ref={pinchRef} className="flex-1 min-h-0 touch-pan-y">
        <ScrollArea className="h-full">
          {orderedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-2">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                No hay productos
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={orderedProducts.map(p => p.id)}
                strategy={rectSortingStrategy}
              >
                <div className={cn("grid gap-2 sm:gap-3 p-1 sm:p-2 transition-all duration-300", config.gridCols)}>
                  {orderedProducts.map((product) => (
                    <SortableProductCard
                      key={product.id}
                      product={product}
                      onSelectProduct={onSelectProduct}
                      onEditProduct={onEditProduct}
                      config={config}
                    />
                  ))}
                </div>
              </SortableContext>
              <DragOverlay>
                {activeProduct ? (
                  <ProductCardOverlay product={activeProduct} config={config} />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
