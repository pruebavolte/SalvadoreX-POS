"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  PackageX,
  Plus,
  Minus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SaleItem {
  id: string;
  product_id: string;
  product: {
    id: string;
    name: string;
    sku: string;
  };
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  sale_number: string;
  customer?: {
    id: string;
    name: string;
  };
  total: number;
  payment_method: string;
  created_at: string;
  items: SaleItem[];
}

interface ReturnItem {
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  max_quantity: number;
  unit_price: number;
}

interface Return {
  id: string;
  return_number: string;
  sale: {
    sale_number: string;
  };
  customer?: {
    name: string;
  };
  total: number;
  status: string;
  created_at: string;
  reason?: string;
}

export default function ReturnsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Sale[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(true);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch existing returns
  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const response = await fetch("/api/returns");
      const data = await response.json();
      if (data.success) {
        setReturns(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setLoadingReturns(false);
    }
  };

  // Search for sales
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingresa un número de ticket para buscar");
      return;
    }

    try {
      setSearching(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customer:customers(id, name),
          items:sale_items(
            id,
            product_id,
            quantity,
            unit_price,
            subtotal,
            product:products(id, name, sku)
          )
        `)
        .or(`sale_number.ilike.%${searchTerm}%,id.eq.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      setSearchResults(data as any || []);

      if (data.length === 0) {
        toast.info("No se encontraron ventas con ese número de ticket");
      }
    } catch (error) {
      console.error("Error searching sales:", error);
      toast.error("Error al buscar ventas");
    } finally {
      setSearching(false);
    }
  };

  // Select a sale for return
  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setSearchResults([]);
    setSearchTerm("");

    // Initialize return items with all sale items
    const items: ReturnItem[] = sale.items.map((item) => ({
      product_id: item.product_id,
      product_name: item.product.name,
      sku: item.product.sku,
      quantity: 0, // Start with 0, user will select quantity
      max_quantity: item.quantity,
      unit_price: item.unit_price,
    }));
    setReturnItems(items);
  };

  // Update return item quantity
  const updateReturnQuantity = (productId: string, quantity: number) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.product_id === productId
          ? { ...item, quantity: Math.max(0, Math.min(quantity, item.max_quantity)) }
          : item
      )
    );
  };

  // Calculate totals
  const calculateTotal = () => {
    return returnItems.reduce(
      (sum, item) => sum + item.quantity * item.unit_price,
      0
    );
  };

  // Create return
  const handleCreateReturn = async () => {
    try {
      // Validate
      const itemsToReturn = returnItems.filter((item) => item.quantity > 0);
      if (itemsToReturn.length === 0) {
        toast.error("Selecciona al menos un producto para devolver");
        return;
      }

      if (!reason.trim()) {
        toast.error("Ingresa el motivo de la devolución");
        return;
      }

      setCreating(true);

      const total = calculateTotal();

      const response = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sale_id: selectedSale?.id,
          customer_id: selectedSale?.customer?.id,
          reason,
          total,
          items: itemsToReturn.map((item) => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Devolución creada exitosamente", {
          description: `Número de devolución: ${data.data.return_number}`,
        });

        // Reset form
        setSelectedSale(null);
        setReturnItems([]);
        setReason("");
        setConfirmDialogOpen(false);

        // Refresh returns list
        fetchReturns();
      } else {
        toast.error("Error al crear devolución", {
          description: data.error,
        });
      }
    } catch (error) {
      console.error("Error creating return:", error);
      toast.error("Error al crear devolución");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" } = {
      completed: "default",
      pending: "secondary",
      cancelled: "destructive",
    };

    const labels: { [key: string]: string } = {
      completed: "Completada",
      pending: "Pendiente",
      cancelled: "Cancelada",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalToReturn = calculateTotal();
  const itemsCount = returnItems.filter((item) => item.quantity > 0).length;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Devoluciones
          </h1>
          <p className="text-muted-foreground">
            Gestiona devoluciones y reembolsos de productos
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Create Return */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageX className="h-5 w-5" />
                Nueva Devolución
              </CardTitle>
              <CardDescription>
                Busca una venta y selecciona los productos a devolver
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Sale */}
              {!selectedSale && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar Venta</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search"
                        placeholder="Número de ticket..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button onClick={handleSearch} disabled={searching}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Resultados</Label>
                      <ScrollArea className="h-[300px] border rounded-lg">
                        <div className="p-2 space-y-2">
                          {searchResults.map((sale) => (
                            <Card
                              key={sale.id}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => handleSelectSale(sale)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-semibold">
                                      {sale.sale_number}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(sale.created_at).toLocaleDateString("es-MX")}
                                      {sale.customer && ` · ${sale.customer.name}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">${sale.total.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {sale.items.length} producto(s)
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}

              {/* Selected Sale & Return Items */}
              {selectedSale && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Venta seleccionada</p>
                      <p className="font-semibold">{selectedSale.sale_number}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSale(null);
                        setReturnItems([]);
                        setReason("");
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>

                  <Separator />

                  {/* Products to Return */}
                  <div className="space-y-2">
                    <Label>Productos a Devolver</Label>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="p-3 space-y-3">
                        {returnItems.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center gap-3 pb-3 border-b last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.product_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                SKU: {item.sku} · Max: {item.max_quantity} · $
                                {item.unit_price.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateReturnQuantity(
                                    item.product_id,
                                    item.quantity - 1
                                  )
                                }
                                disabled={item.quantity === 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <div className="w-10 text-center">
                                <span className="font-medium text-sm">
                                  {item.quantity}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  updateReturnQuantity(
                                    item.product_id,
                                    item.quantity + 1
                                  )
                                }
                                disabled={item.quantity >= item.max_quantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo de Devolución</Label>
                    <Textarea
                      id="reason"
                      placeholder="Ej: Producto defectuoso, cambio de opinión, etc."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Total Summary */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Productos seleccionados:
                      </span>
                      <span className="font-medium">{itemsCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">
                        ${totalToReturn.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IVA (16%):</span>
                      <span className="font-medium">
                        ${(totalToReturn * 0.16).toFixed(2)}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total a Reembolsar:</span>
                      <span className="text-xl font-bold text-primary">
                        ${(totalToReturn * 1.16).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Create Return Button */}
                  <Button
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={itemsCount === 0 || !reason.trim() || creating}
                    className="w-full"
                    size="lg"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Procesar Devolución
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Column - Returns History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Historial de Devoluciones
              </CardTitle>
              <CardDescription>
                {returns.length} devoluciones registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                {loadingReturns ? (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-muted-foreground">Cargando...</p>
                  </div>
                ) : returns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <PackageX className="h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground text-center">
                      No hay devoluciones registradas
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {returns.map((returnItem) => (
                      <Card key={returnItem.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-sm">
                                  {returnItem.return_number}
                                </p>
                                {getStatusBadge(returnItem.status)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Venta: {returnItem.sale.sale_number}
                              </p>
                              {returnItem.customer && (
                                <p className="text-xs text-muted-foreground">
                                  Cliente: {returnItem.customer.name}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {new Date(returnItem.created_at).toLocaleDateString(
                                  "es-MX",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )}
                              </p>
                              {returnItem.reason && (
                                <p className="text-xs text-muted-foreground italic mt-2">
                                  "{returnItem.reason}"
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-destructive">
                                -${returnItem.total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Confirmar Devolución
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de procesar esta devolución?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Venta:</span>
                <span className="font-medium">{selectedSale?.sale_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Productos:</span>
                <span className="font-medium">{itemsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Total a Reembolsar:</span>
                <span className="text-lg font-bold text-destructive">
                  ${(totalToReturn * 1.16).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                El inventario se actualizará automáticamente sumando las cantidades
                devueltas.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateReturn} disabled={creating}>
              {creating ? "Procesando..." : "Confirmar Devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
