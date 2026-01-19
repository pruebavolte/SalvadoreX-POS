"use client";

import { useState } from "react";
import { useProducts, useCategories, useProductMutations } from "@/hooks/use-products";
import { Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProductModal } from "@/components/inventory/product-modal";
import { RecipeModal } from "@/components/inventory/recipe-modal";

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);

  const { products, loading, page, totalPages, setPage, updateFilter } = useProducts({});
  const { categories, refresh: refreshCategories } = useCategories();
  const { remove } = useProductMutations();

  const handleSearch = () => {
    updateFilter({
      search: searchQuery || undefined,
      category_id: selectedCategory !== "all" ? selectedCategory : undefined,
      in_stock: stockFilter === "in_stock" ? true : stockFilter === "out_of_stock" ? false : undefined,
      available_in_pos: channelFilter === "pos" ? true : undefined,
      available_in_digital_menu: channelFilter === "menu" ? true : undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setStockFilter("all");
    setChannelFilter("all");
    updateFilter({});
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setProductModalOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`¿Estás seguro de eliminar "${product.name}"?`)) {
      try {
        await remove(product.id);
        toast.success("Producto eliminado correctamente");
      } catch (error) {
        toast.error("Error al eliminar producto");
      }
    }
  };

  const handleAddNew = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleCloseModal = () => {
    setProductModalOpen(false);
    setEditingProduct(null);
  };

  const handleManageRecipe = (product: Product) => {
    setRecipeProduct(product);
    setRecipeModalOpen(true);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) {
      return { label: "Agotado", color: "bg-red-500" };
    } else if (product.stock <= product.min_stock) {
      return { label: "Stock Bajo", color: "bg-orange-500" };
    } else {
      return { label: "En Stock", color: "bg-green-500" };
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Inventario
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Gestiona todos tus productos (POS y Menú Digital)
            </p>
          </div>
          <Button 
            onClick={handleAddNew} 
            size="lg" 
            className="w-full sm:w-auto min-h-[44px]"
            data-testid="button-add-product"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Producto
          </Button>
        </div>

        {/* Stats Cards - Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Productos
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-products">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stock Bajo
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-low-stock">
                {products.filter((p) => p.stock > 0 && p.stock <= p.min_stock).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agotados</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-out-of-stock">
                {products.filter((p) => p.stock === 0).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Valor Total
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-value">
                ${products.reduce((sum, p) => sum + p.price * p.stock, 0).toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Stack vertically on mobile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Filtra y busca productos en tu inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Search input - always full width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, SKU o código de barras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 min-h-[44px]"
                  data-testid="input-search"
                />
              </div>
              
              {/* Selects - Stack on mobile, row on tablet+ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full min-h-[44px]" data-testid="select-category">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-full min-h-[44px]" data-testid="select-stock">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in_stock">En Stock</SelectItem>
                    <SelectItem value="out_of_stock">Agotados</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger className="w-full min-h-[44px]" data-testid="select-channel">
                    <SelectValue placeholder="Canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los canales</SelectItem>
                    <SelectItem value="pos">Solo POS</SelectItem>
                    <SelectItem value="menu">Solo Menú Digital</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Action buttons - Full width on mobile */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSearch} 
                  className="w-full sm:w-auto min-h-[44px]"
                  data-testid="button-search"
                >
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto min-h-[44px]"
                  data-testid="button-clear-filters"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products - Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Cargando productos...
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No se encontraron productos
              </CardContent>
            </Card>
          ) : (
            products.map((product) => {
              const status = getStockStatus(product);
              const category = categories.find((c) => c.id === product.category_id);

              return (
                <Card key={product.id} data-testid={`card-product-${product.id}`}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product image */}
                      <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <Image
                            src={product.image_url}
                            alt={product.name}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                            <Package className="h-8 w-8" />
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-base truncate">{product.name}</h3>
                            <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="min-h-[44px] min-w-[44px] flex-shrink-0"
                                data-testid={`button-actions-${product.id}`}
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleEdit(product)}
                                className="min-h-[44px]"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleManageRecipe(product)}
                                className="min-h-[44px]"
                              >
                                <ChefHat className="h-4 w-4 mr-2" />
                                Gestionar Receta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(product)}
                                className="text-destructive min-h-[44px]"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Category and availability badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {category && (
                            <Badge variant="outline" className="text-xs">{category.name}</Badge>
                          )}
                          {product.available_in_pos && (
                            <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-xs">
                              POS
                            </Badge>
                          )}
                          {product.available_in_digital_menu && (
                            <Badge variant="default" className="bg-purple-500 hover:bg-purple-600 text-xs">
                              Menú
                            </Badge>
                          )}
                        </div>

                        {/* Price, stock and status */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t">
                          <div>
                            <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "font-medium",
                              product.stock === 0 && "text-red-600",
                              product.stock > 0 && product.stock <= product.min_stock && "text-orange-600"
                            )}>
                              Stock: {product.stock}
                            </p>
                            <Badge
                              className={cn(status.color, "text-white text-xs mt-1")}
                              variant="secondary"
                            >
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Products Table - Desktop view */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Imagen</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Disponibilidad</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Cargando productos...
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        No se encontraron productos
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => {
                      const status = getStockStatus(product);
                      const category = categories.find((c) => c.id === product.category_id);

                      return (
                        <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                          <TableCell>
                            <div className="relative w-16 h-16 bg-muted rounded-lg overflow-hidden">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              ) : (
                                <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                  <Package className="h-6 w-6" />
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {product.sku}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {product.description}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {category ? (
                              <Badge variant="outline">{category.name}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                Sin categoría
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {product.available_in_pos && (
                                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                                  POS
                                </Badge>
                              )}
                              {product.available_in_digital_menu && (
                                <Badge variant="default" className="bg-purple-500 hover:bg-purple-600">
                                  Menú
                                </Badge>
                              )}
                              {!product.available_in_pos && !product.available_in_digital_menu && (
                                <Badge variant="outline" className="text-muted-foreground">
                                  No disponible
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${product.price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-medium",
                                product.stock === 0 && "text-red-600",
                                product.stock > 0 &&
                                  product.stock <= product.min_stock &&
                                  "text-orange-600"
                              )}
                            >
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(status.color, "text-white")}
                              variant="secondary"
                            >
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageRecipe(product)}>
                                  <ChefHat className="h-4 w-4 mr-2" />
                                  Gestionar Receta
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(product)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination - Touch-friendly */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-1 sm:hidden">Anterior</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                data-testid="button-next-page"
              >
                <span className="mr-1 sm:hidden">Siguiente</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      <ProductModal
        open={productModalOpen}
        onOpenChange={handleCloseModal}
        product={editingProduct}
        categories={categories}
        onCategoryCreated={refreshCategories}
      />

      {/* Recipe Modal */}
      <RecipeModal
        open={recipeModalOpen}
        onOpenChange={setRecipeModalOpen}
        product={recipeProduct}
      />
    </div>
  );
}
