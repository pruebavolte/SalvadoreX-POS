"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Plus,
  Trash2,
  Loader2,
  ChefHat,
  DollarSign,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Product } from "@/types/database";

interface Ingredient {
  id: string;
  name: string;
  sku: string;
  unit_name: string;
  cost_per_unit: number;
  current_stock: number;
}

interface RecipeIngredient {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit_name: string;
  cost: number;
}

interface RecipeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess?: () => void;
}

export function RecipeModal({
  open,
  onOpenChange,
  product,
  onSuccess,
}: RecipeModalProps) {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [suggestingWithAI, setSuggestingWithAI] = useState(false);
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [existingRecipe, setExistingRecipe] = useState<any[]>([]);

  // New ingredient form
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");

  useEffect(() => {
    if (open && product) {
      fetchIngredients();
      fetchExistingRecipe();
    }
  }, [open, product]);

  const fetchIngredients = async () => {
    try {
      const response = await fetch("/api/ingredients");
      const data = await response.json();
      if (data.success) {
        setAvailableIngredients(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  const fetchExistingRecipe = async () => {
    if (!product) return;

    try {
      const response = await fetch(`/api/recipes?product_id=${product.id}`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const mapped = data.data.map((item: any) => ({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient.name,
          quantity: item.quantity,
          unit_name: item.unit_name,
          cost: item.quantity * item.ingredient.cost_per_unit,
        }));
        setRecipeIngredients(mapped);
        setExistingRecipe(data.data);
      }
    } catch (error) {
      console.error("Error fetching existing recipe:", error);
    }
  };

  const handleAISuggest = async () => {
    if (!product) return;

    try {
      setSuggestingWithAI(true);
      const response = await fetch("/api/recipes/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: product.name,
          product_description: product.description,
          category: product.category?.name,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`IA sugirió ${data.data.ingredients.length} ingredientes`);

        // Map AI suggestions to our format (matching with existing ingredients)
        const suggestions = data.data.ingredients
          .map((aiIng: any) => {
            // Try to find matching ingredient
            const match = availableIngredients.find(
              (ing) =>
                ing.name.toLowerCase().includes(aiIng.name.toLowerCase()) ||
                aiIng.name.toLowerCase().includes(ing.name.toLowerCase())
            );

            if (match) {
              return {
                ingredient_id: match.id,
                ingredient_name: match.name,
                quantity: aiIng.quantity,
                unit_name: match.unit_name,
                cost: aiIng.quantity * match.cost_per_unit,
              };
            }

            return null;
          })
          .filter(Boolean);

        if (suggestions.length > 0) {
          setRecipeIngredients(suggestions);
          toast.info(`Se encontraron ${suggestions.length} ingredientes en tu inventario`);
        } else {
          toast.warning(
            "La IA sugirió ingredientes, pero no se encontraron en tu inventario. Agrégalos primero."
          );
        }
      } else {
        toast.error(data.error || "Error al obtener sugerencias de IA");
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      toast.error("Error al obtener sugerencias de IA");
    } finally {
      setSuggestingWithAI(false);
    }
  };

  const handleAddIngredient = () => {
    if (!selectedIngredientId || !quantity) {
      toast.error("Selecciona un ingrediente y una cantidad");
      return;
    }

    const ingredient = availableIngredients.find((i) => i.id === selectedIngredientId);
    if (!ingredient) return;

    const qty = parseFloat(quantity);
    if (qty <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    // Check if already added
    if (recipeIngredients.some((ri) => ri.ingredient_id === selectedIngredientId)) {
      toast.error("Este ingrediente ya está en la receta");
      return;
    }

    setRecipeIngredients([
      ...recipeIngredients,
      {
        ingredient_id: ingredient.id,
        ingredient_name: ingredient.name,
        quantity: qty,
        unit_name: ingredient.unit_name,
        cost: qty * ingredient.cost_per_unit,
      },
    ]);

    setSelectedIngredientId("");
    setQuantity("1");
  };

  const handleRemoveIngredient = (ingredientId: string) => {
    setRecipeIngredients(
      recipeIngredients.filter((ri) => ri.ingredient_id !== ingredientId)
    );
  };

  const handleUpdateQuantity = (ingredientId: string, newQuantity: number) => {
    setRecipeIngredients(
      recipeIngredients.map((ri) => {
        if (ri.ingredient_id === ingredientId) {
          const ingredient = availableIngredients.find((i) => i.id === ingredientId);
          return {
            ...ri,
            quantity: newQuantity,
            cost: newQuantity * (ingredient?.cost_per_unit || 0),
          };
        }
        return ri;
      })
    );
  };

  const handleSaveRecipe = async () => {
    if (!product) return;

    if (recipeIngredients.length === 0) {
      toast.error("Agrega al menos un ingrediente a la receta");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: product.id,
          ingredients: recipeIngredients.map((ri) => ({
            ingredient_id: ri.ingredient_id,
            quantity: ri.quantity,
            unit_name: ri.unit_name,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Receta guardada exitosamente", {
          description: `Costo calculado: $${data.product?.calculated_cost?.toFixed(2) || "0.00"}`,
        });
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Error al guardar receta");
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      toast.error("Error al guardar receta");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!product) return;

    if (!confirm("¿Estás seguro de eliminar esta receta?")) return;

    try {
      setLoading(true);

      const response = await fetch(`/api/recipes?product_id=${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Receta eliminada exitosamente");
        setRecipeIngredients([]);
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(data.error || "Error al eliminar receta");
      }
    } catch (error) {
      console.error("Error deleting recipe:", error);
      toast.error("Error al eliminar receta");
    } finally {
      setLoading(false);
    }
  };

  const totalCost = recipeIngredients.reduce((sum, ri) => sum + ri.cost, 0);
  const profitMargin = product
    ? ((product.price - totalCost) / product.price) * 100
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Receta: {product?.name}
          </DialogTitle>
          <DialogDescription>
            Define los ingredientes y cantidades necesarios para preparar este producto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Suggestion */}
          <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Sugerencias con IA
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Claude analizará el producto y sugerirá ingredientes automáticamente
                </p>
              </div>
              <Button
                onClick={handleAISuggest}
                disabled={suggestingWithAI || loading}
                variant="outline"
              >
                {suggestingWithAI ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sugerir con IA
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Add Ingredient */}
          <div className="space-y-4">
            <h3 className="font-semibold">Agregar Ingrediente</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un ingrediente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIngredients
                      .filter(
                        (ing) => !recipeIngredients.some((ri) => ri.ingredient_id === ing.id)
                      )
                      .map((ing) => (
                        <SelectItem key={ing.id} value={ing.id}>
                          {ing.name} ({ing.current_stock} {ing.unit_name} disponibles)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="Cantidad"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>
              <Button onClick={handleAddIngredient} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Recipe Ingredients List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Ingredientes de la Receta ({recipeIngredients.length})
              </h3>
              {existingRecipe.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteRecipe}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar Receta
                </Button>
              )}
            </div>

            <ScrollArea className="h-[300px] border rounded-lg">
              {recipeIngredients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Package className="h-12 w-12 mb-2" />
                  <p className="text-sm">No hay ingredientes en la receta</p>
                  <p className="text-xs">Agrégalos manualmente o usa IA</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {recipeIngredients.map((ri) => {
                    const ingredient = availableIngredients.find(
                      (i) => i.id === ri.ingredient_id
                    );

                    return (
                      <div
                        key={ri.ingredient_id}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{ri.ingredient_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Stock disponible: {ingredient?.current_stock} {ri.unit_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            value={ri.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(
                                ri.ingredient_id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 text-center"
                          />
                          <span className="text-sm text-muted-foreground w-12">
                            {ri.unit_name}
                          </span>
                          <Badge variant="secondary" className="w-20 justify-center">
                            ${ri.cost.toFixed(2)}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveIngredient(ri.ingredient_id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {recipeIngredients.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Costo Total de Ingredientes:</span>
                <span className="font-semibold">${totalCost.toFixed(2)}</span>
              </div>
              {product && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Precio de Venta:</span>
                    <span className="font-semibold">${product.price.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Margen de Ganancia:</span>
                    <Badge
                      variant={profitMargin >= 50 ? "default" : profitMargin >= 30 ? "secondary" : "destructive"}
                      className="text-base px-3 py-1"
                    >
                      {profitMargin.toFixed(1)}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ganancia: ${(product.price - totalCost).toFixed(2)} por unidad
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSaveRecipe} disabled={loading || recipeIngredients.length === 0}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <ChefHat className="h-4 w-4 mr-2" />
                Guardar Receta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
