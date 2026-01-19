"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Soup,
  Plus,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  Search,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";

interface Ingredient {
  id: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  unit_type: string;
  unit_name: string;
  cost_per_unit: number;
  restaurant_id: string;
  created_at: string;
}

const CATEGORIES = [
  { value: "dairy", label: "Lácteos" },
  { value: "meat", label: "Carnes" },
  { value: "vegetable", label: "Verduras" },
  { value: "grain", label: "Granos" },
  { value: "spice", label: "Especias" },
  { value: "liquid", label: "Líquidos" },
  { value: "other", label: "Otros" },
];

const UNIT_TYPES = [
  { value: "unit", label: "Unidad" },
  { value: "weight", label: "Peso" },
  { value: "volume", label: "Volumen" },
];

export default function IngredientsPage() {
  const { user } = useCurrentUser();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showLowStock, setShowLowStock] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    sku: "",
    category: "other",
    current_stock: 0,
    min_stock: 0,
    max_stock: 1000,
    unit_type: "unit",
    unit_name: "unidad",
    cost_per_unit: 0,
  });

  const [stockAdjustment, setStockAdjustment] = useState({
    quantity: 0,
    transaction_type: "purchase",
    notes: "",
  });

  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (showLowStock) params.append("lowStock", "true");

      const response = await fetch(`/api/ingredients?${params}`);
      const data = await response.json();

      if (data.success) {
        setIngredients(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
      toast.error("Error al cargar ingredientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, [categoryFilter, showLowStock]);

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          restaurant_id: user?.id || "default",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Ingrediente creado exitosamente");
        setCreateModalOpen(false);
        resetForm();
        fetchIngredients();
      } else {
        toast.error(data.error || "Error al crear ingrediente");
      }
    } catch (error) {
      console.error("Error creating ingredient:", error);
      toast.error("Error al crear ingrediente");
    }
  };

  const handleUpdate = async () => {
    if (!selectedIngredient) return;

    try {
      const response = await fetch("/api/ingredients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedIngredient.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Ingrediente actualizado exitosamente");
        setEditModalOpen(false);
        setSelectedIngredient(null);
        resetForm();
        fetchIngredients();
      } else {
        toast.error(data.error || "Error al actualizar ingrediente");
      }
    } catch (error) {
      console.error("Error updating ingredient:", error);
      toast.error("Error al actualizar ingrediente");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este ingrediente?")) return;

    try {
      const response = await fetch(`/api/ingredients?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Ingrediente eliminado exitosamente");
        fetchIngredients();
      } else {
        toast.error(data.error || "Error al eliminar ingrediente");
      }
    } catch (error) {
      console.error("Error deleting ingredient:", error);
      toast.error("Error al eliminar ingrediente");
    }
  };

  const handleStockAdjustment = async () => {
    if (!selectedIngredient) return;

    try {
      const response = await fetch("/api/ingredients/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredient_id: selectedIngredient.id,
          quantity: stockAdjustment.quantity,
          transaction_type: stockAdjustment.transaction_type,
          notes: stockAdjustment.notes,
          restaurant_id: user?.id || "default",
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Stock actualizado exitosamente");
        setStockModalOpen(false);
        setSelectedIngredient(null);
        setStockAdjustment({ quantity: 0, transaction_type: "purchase", notes: "" });
        fetchIngredients();
      } else {
        toast.error(data.error || "Error al actualizar stock");
      }
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast.error("Error al actualizar stock");
    }
  };

  const openEditModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      description: ingredient.description || "",
      sku: ingredient.sku,
      category: ingredient.category,
      current_stock: ingredient.current_stock,
      min_stock: ingredient.min_stock,
      max_stock: ingredient.max_stock,
      unit_type: ingredient.unit_type,
      unit_name: ingredient.unit_name,
      cost_per_unit: ingredient.cost_per_unit,
    });
    setEditModalOpen(true);
  };

  const openStockModal = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setStockModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      sku: "",
      category: "other",
      current_stock: 0,
      min_stock: 0,
      max_stock: 1000,
      unit_type: "unit",
      unit_name: "unidad",
      cost_per_unit: 0,
    });
  };

  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ing.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = ingredients.filter((ing) => ing.current_stock <= ing.min_stock).length;
  const totalValue = ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight flex items-center gap-2">
              <Soup className="h-6 w-6 sm:h-8 sm:w-8" />
              Ingredientes
            </h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Gestiona tu inventario de ingredientes base
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} size="lg" className="w-full sm:w-auto min-h-[48px]">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo Ingrediente</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ingredientes</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ingredients.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorías</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(ingredients.map((i) => i.category)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 min-h-[44px]"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[200px] min-h-[44px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showLowStock ? "default" : "outline"}
                  onClick={() => setShowLowStock(!showLowStock)}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Stock Bajo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Lista de Ingredientes</CardTitle>
            <CardDescription className="text-sm">
              {filteredIngredients.length} ingrediente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Costo/Unidad</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Cargando ingredientes...
                      </TableCell>
                    </TableRow>
                  ) : filteredIngredients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No se encontraron ingredientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIngredients.map((ingredient) => {
                      const isLowStock = ingredient.current_stock <= ingredient.min_stock;
                      const totalValue = ingredient.current_stock * ingredient.cost_per_unit;

                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell className="font-medium">
                            <div>
                              <p>{ingredient.name}</p>
                              {ingredient.description && (
                                <p className="text-xs text-muted-foreground">
                                  {ingredient.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {ingredient.sku}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {CATEGORIES.find((c) => c.value === ingredient.category)?.label || ingredient.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className={isLowStock ? "text-orange-600 font-semibold" : ""}>
                                {ingredient.current_stock} {ingredient.unit_name}
                              </span>
                              {isLowStock && (
                                <Badge variant="destructive" className="text-xs mt-1">
                                  Bajo
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            ${ingredient.cost_per_unit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            ${totalValue.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openStockModal(ingredient)}
                                title="Ajustar Stock"
                              >
                                {ingredient.current_stock <= ingredient.min_stock ? (
                                  <TrendingDown className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <TrendingUp className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditModal(ingredient)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(ingredient.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando ingredientes...
                </div>
              ) : filteredIngredients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron ingredientes
                </div>
              ) : (
                filteredIngredients.map((ingredient) => {
                  const isLowStock = ingredient.current_stock <= ingredient.min_stock;
                  const totalValue = ingredient.current_stock * ingredient.cost_per_unit;

                  return (
                    <Card key={ingredient.id} className="p-4" data-testid={`card-ingredient-${ingredient.id}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{ingredient.name}</p>
                          <code className="text-xs bg-muted px-2 py-0.5 rounded">
                            {ingredient.sku}
                          </code>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {CATEGORIES.find((c) => c.value === ingredient.category)?.label || ingredient.category}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground text-xs">Stock:</span>
                          <p className={`font-medium ${isLowStock ? "text-orange-600" : ""}`}>
                            {ingredient.current_stock} {ingredient.unit_name}
                            {isLowStock && (
                              <Badge variant="destructive" className="text-xs ml-2">
                                Bajo
                              </Badge>
                            )}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Costo/U:</span>
                          <p className="font-medium">${ingredient.cost_per_unit.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <span className="text-muted-foreground text-xs">Valor Total:</span>
                          <p className="font-semibold">${totalValue.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStockModal(ingredient)}
                            title="Ajustar Stock"
                            className="min-h-[44px] min-w-[44px]"
                          >
                            {ingredient.current_stock <= ingredient.min_stock ? (
                              <TrendingDown className="h-4 w-4 text-orange-500" />
                            ) : (
                              <TrendingUp className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditModal(ingredient)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(ingredient.id)}
                            className="min-h-[44px] min-w-[44px]"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={createModalOpen || editModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCreateModalOpen(false);
          setEditModalOpen(false);
          resetForm();
          setSelectedIngredient(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editModalOpen ? "Editar Ingrediente" : "Nuevo Ingrediente"}
            </DialogTitle>
            <DialogDescription>
              {editModalOpen ? "Modifica los datos del ingrediente" : "Agrega un nuevo ingrediente a tu inventario"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Carne molida de res"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="Ej: ING-CARNE-001"
                  disabled={editModalOpen}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
                className="min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_type">Tipo de Unidad</Label>
                <Select
                  value={formData.unit_type}
                  onValueChange={(value) => setFormData({ ...formData, unit_type: value })}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_name">Unidad de Medida</Label>
                <Input
                  id="unit_name"
                  value={formData.unit_name}
                  onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                  placeholder="kg, g, L, ml, pza"
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Stock Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_stock">Stock Máximo</Label>
                <Input
                  id="max_stock"
                  type="number"
                  value={formData.max_stock}
                  onChange={(e) => setFormData({ ...formData, max_stock: parseFloat(e.target.value) || 1000 })}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="current_stock">Stock Inicial</Label>
                <Input
                  id="current_stock"
                  type="number"
                  step="0.001"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: parseFloat(e.target.value) || 0 })}
                  disabled={editModalOpen}
                  className="min-h-[44px]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_per_unit">Costo por Unidad ($)</Label>
                <Input
                  id="cost_per_unit"
                  type="number"
                  step="0.01"
                  value={formData.cost_per_unit}
                  onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
                  className="min-h-[44px]"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setCreateModalOpen(false);
              setEditModalOpen(false);
              resetForm();
            }} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button onClick={editModalOpen ? handleUpdate : handleCreate} className="w-full sm:w-auto min-h-[44px]">
              {editModalOpen ? "Guardar Cambios" : "Crear Ingrediente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={stockModalOpen} onOpenChange={setStockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Stock</DialogTitle>
            <DialogDescription>
              {selectedIngredient?.name} - Stock actual: {selectedIngredient?.current_stock} {selectedIngredient?.unit_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transaction_type">Tipo de Movimiento</Label>
              <Select
                value={stockAdjustment.transaction_type}
                onValueChange={(value) => setStockAdjustment({ ...stockAdjustment, transaction_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Compra (+)</SelectItem>
                  <SelectItem value="adjustment">Ajuste</SelectItem>
                  <SelectItem value="waste">Desperdicio (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseFloat(e.target.value) || 0 })}
                placeholder={stockAdjustment.transaction_type === "waste" ? "Cantidad negativa" : "Cantidad positiva"}
              />
              <p className="text-xs text-muted-foreground">
                Nuevo stock: {((selectedIngredient?.current_stock || 0) + stockAdjustment.quantity).toFixed(3)} {selectedIngredient?.unit_name}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={stockAdjustment.notes}
                onChange={(e) => setStockAdjustment({ ...stockAdjustment, notes: e.target.value })}
                placeholder="Motivo del ajuste (opcional)"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setStockModalOpen(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button onClick={handleStockAdjustment} className="w-full sm:w-auto min-h-[44px]">
              Aplicar Ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
