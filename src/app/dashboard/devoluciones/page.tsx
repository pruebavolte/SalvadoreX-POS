"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  Receipt,
  CreditCard,
  Search,
  Plus,
  Minus,
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface ProductoVenta {
  id: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Venta {
  id: string;
  ticketNumero: string;
  fecha: string;
  cliente?: string;
  total: number;
  metodoPago: string;
  productos: ProductoVenta[];
}

interface DevolucionItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  maxCantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Devolucion {
  id: string;
  numeroDevolucion: string;
  ticketOriginal: string;
  fechaVentaOriginal: string;
  fechaDevolucion: string;
  cliente?: string;
  productos: {
    productoId: string;
    productoNombre: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
  }[];
  montoTotal: number;
  motivo: string;
  motivoDescripcion?: string;
  tipoReembolso: string;
  estado: string;
  notaCreditoId?: string;
}

interface NotaCredito {
  id: string;
  numeroNota: string;
  cliente?: string;
  montoOriginal: number;
  montoDisponible: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: string;
}

const motivoLabels: Record<string, string> = {
  defecto: "Defecto",
  error: "Error",
  cambio_opinion: "Cambio de opinión",
  otro: "Otro",
};

const tipoReembolsoLabels: Record<string, string> = {
  efectivo: "Efectivo",
  nota_credito: "Nota de crédito",
  cambio_producto: "Cambio por producto",
};

export default function DevolucionesPage() {
  const [loading, setLoading] = useState(true);
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [notasCredito, setNotasCredito] = useState<NotaCredito[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usarNotaDialogOpen, setUsarNotaDialogOpen] = useState(false);
  const [selectedNota, setSelectedNota] = useState<NotaCredito | null>(null);
  const [montoAplicar, setMontoAplicar] = useState("");
  const [ticketAplicar, setTicketAplicar] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Venta[]>([]);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [itemsDevolucion, setItemsDevolucion] = useState<DevolucionItem[]>([]);
  const [motivo, setMotivo] = useState<string>("");
  const [motivoDescripcion, setMotivoDescripcion] = useState("");
  const [tipoReembolso, setTipoReembolso] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devRes, notasRes] = await Promise.all([
        fetch(`/api/devoluciones?estado=${filtroEstado}`),
        fetch("/api/notas-credito?soloActivas=true"),
      ]);

      const devData = await devRes.json();
      const notasData = await notasRes.json();

      if (devData.success) {
        setDevoluciones(devData.data);
      }
      if (notasData.success) {
        setNotasCredito(notasData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filtroEstado]);

  const handleSearchTicket = async () => {
    if (!searchTerm.trim()) {
      toast.error("Ingresa un número de ticket para buscar");
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(`/api/devoluciones?buscarTicket=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();

      if (data.success && data.type === "ventas") {
        setSearchResults(data.data);
        if (data.data.length === 0) {
          toast.info("No se encontraron ventas con ese número de ticket");
        }
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Error al buscar ventas");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectVenta = (venta: Venta) => {
    setSelectedVenta(venta);
    setSearchResults([]);
    setSearchTerm("");

    const items: DevolucionItem[] = venta.productos.map((p) => ({
      productoId: p.id,
      productoNombre: p.nombre,
      cantidad: 0,
      maxCantidad: p.cantidad,
      precioUnitario: p.precioUnitario,
      subtotal: 0,
    }));
    setItemsDevolucion(items);
  };

  const updateItemCantidad = (productoId: string, cantidad: number) => {
    setItemsDevolucion((prev) =>
      prev.map((item) =>
        item.productoId === productoId
          ? {
              ...item,
              cantidad: Math.max(0, Math.min(cantidad, item.maxCantidad)),
              subtotal: Math.max(0, Math.min(cantidad, item.maxCantidad)) * item.precioUnitario,
            }
          : item
      )
    );
  };

  const calcularTotal = () => {
    return itemsDevolucion.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const itemsSeleccionados = itemsDevolucion.filter((item) => item.cantidad > 0);

  const handleSubmitDevolucion = async () => {
    if (itemsSeleccionados.length === 0) {
      toast.error("Selecciona al menos un producto para devolver");
      return;
    }

    if (!motivo) {
      toast.error("Selecciona el motivo de devolución");
      return;
    }

    if (!tipoReembolso) {
      toast.error("Selecciona el tipo de reembolso");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/devoluciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketOriginal: selectedVenta?.ticketNumero,
          fechaVentaOriginal: selectedVenta?.fecha,
          cliente: selectedVenta?.cliente,
          productos: itemsSeleccionados.map((item) => ({
            productoId: item.productoId,
            productoNombre: item.productoNombre,
            cantidad: item.cantidad,
            precioUnitario: item.precioUnitario,
            subtotal: item.subtotal,
          })),
          motivo,
          motivoDescripcion: motivo === "otro" ? motivoDescripcion : undefined,
          tipoReembolso,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Devolución procesada exitosamente", {
          description: `Número: ${data.data.numeroDevolucion}`,
        });

        if (data.notaCredito) {
          toast.info("Nota de crédito generada", {
            description: `Número: ${data.notaCredito.numeroNota} - Monto: $${data.notaCredito.montoOriginal.toFixed(2)}`,
          });
        }

        resetForm();
        setDialogOpen(false);
        fetchData();
      } else {
        toast.error("Error al procesar devolución", { description: data.error });
      }
    } catch (error) {
      console.error("Error submitting:", error);
      toast.error("Error al procesar devolución");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedVenta(null);
    setItemsDevolucion([]);
    setMotivo("");
    setMotivoDescripcion("");
    setTipoReembolso("");
    setSearchTerm("");
    setSearchResults([]);
  };

  const handleUsarNota = (nota: NotaCredito) => {
    setSelectedNota(nota);
    setMontoAplicar(nota.montoDisponible.toString());
    setTicketAplicar("");
    setUsarNotaDialogOpen(true);
  };

  const handleAplicarNota = async () => {
    if (!selectedNota) return;

    const monto = parseFloat(montoAplicar);
    if (isNaN(monto) || monto <= 0) {
      toast.error("Ingresa un monto válido");
      return;
    }

    if (monto > selectedNota.montoDisponible) {
      toast.error("El monto excede el saldo disponible");
      return;
    }

    if (!ticketAplicar.trim()) {
      toast.error("Ingresa el número de ticket");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/notas-credito", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedNota.id,
          montoAplicar: monto,
          ticketAplicado: ticketAplicar,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Nota de crédito aplicada exitosamente", {
          description: `Monto aplicado: $${monto.toFixed(2)}`,
        });
        setUsarNotaDialogOpen(false);
        setSelectedNota(null);
        fetchData();
      } else {
        toast.error("Error al aplicar nota", { description: data.error });
      }
    } catch (error) {
      console.error("Error applying nota:", error);
      toast.error("Error al aplicar nota de crédito");
    } finally {
      setSubmitting(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "completada":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Completada</Badge>;
      case "pendiente":
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pendiente</Badge>;
      case "cancelada":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const getNotaEstadoBadge = (estado: string) => {
    switch (estado) {
      case "activa":
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Activa</Badge>;
      case "parcial":
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">Parcial</Badge>;
      case "usada":
        return <Badge variant="secondary">Usada</Badge>;
      case "vencida":
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Vencida</Badge>;
      default:
        return <Badge variant="secondary">{estado}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            Devoluciones y Notas de Crédito
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona devoluciones, reembolsos y notas de crédito
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-nueva-devolucion" onClick={() => resetForm()}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Nueva Devolución
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Procesar Devolución
              </DialogTitle>
              <DialogDescription>
                Busca una venta y selecciona los productos a devolver
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {!selectedVenta ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search-ticket">Buscar Venta por Ticket</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search-ticket"
                        placeholder="Ej: TK-2024-001"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchTicket()}
                        data-testid="input-search-ticket"
                      />
                      <Button
                        onClick={handleSearchTicket}
                        disabled={searching}
                        data-testid="button-search-ticket"
                      >
                        {searching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <Label>Resultados de búsqueda</Label>
                      <ScrollArea className="h-[250px] border rounded-lg">
                        <div className="p-2 space-y-2">
                          {searchResults.map((venta) => (
                            <Card
                              key={venta.id}
                              className="cursor-pointer hover-elevate transition-all"
                              onClick={() => handleSelectVenta(venta)}
                              data-testid={`card-venta-${venta.id}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="font-semibold">{venta.ticketNumero}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(venta.fecha)}
                                      {venta.cliente && ` • ${venta.cliente}`}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-bold">{formatCurrency(venta.total)}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {venta.productos.length} producto(s)
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
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Venta seleccionada</p>
                      <p className="font-semibold">{selectedVenta.ticketNumero}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedVenta.fecha)}
                        {selectedVenta.cliente && ` • ${selectedVenta.cliente}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetForm}
                      data-testid="button-cancel-selection"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cambiar
                    </Button>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Productos a Devolver</Label>
                    <ScrollArea className="h-[200px] border rounded-lg">
                      <div className="p-3 space-y-3">
                        {itemsDevolucion.map((item) => (
                          <div
                            key={item.productoId}
                            className="flex items-center gap-3 pb-3 border-b last:border-0"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {item.productoNombre}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Max: {item.maxCantidad} • {formatCurrency(item.precioUnitario)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateItemCantidad(item.productoId, item.cantidad - 1)}
                                disabled={item.cantidad === 0}
                                data-testid={`button-decrease-${item.productoId}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <div className="w-10 text-center">
                                <span className="font-medium text-sm" data-testid={`text-cantidad-${item.productoId}`}>
                                  {item.cantidad}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => updateItemCantidad(item.productoId, item.cantidad + 1)}
                                disabled={item.cantidad >= item.maxCantidad}
                                data-testid={`button-increase-${item.productoId}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="motivo">Motivo de Devolución</Label>
                      <Select value={motivo} onValueChange={setMotivo}>
                        <SelectTrigger id="motivo" data-testid="select-motivo" className="min-h-[44px]">
                          <SelectValue placeholder="Seleccionar motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="defecto">Defecto</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="cambio_opinion">Cambio de opinión</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tipoReembolso">Tipo de Reembolso</Label>
                      <Select value={tipoReembolso} onValueChange={setTipoReembolso}>
                        <SelectTrigger id="tipoReembolso" data-testid="select-tipo-reembolso" className="min-h-[44px]">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="nota_credito">Nota de crédito</SelectItem>
                          <SelectItem value="cambio_producto">Cambio por producto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {motivo === "otro" && (
                    <div className="space-y-2">
                      <Label htmlFor="motivoDescripcion">Descripción del motivo</Label>
                      <Textarea
                        id="motivoDescripcion"
                        placeholder="Describe el motivo de la devolución..."
                        value={motivoDescripcion}
                        onChange={(e) => setMotivoDescripcion(e.target.value)}
                        data-testid="textarea-motivo-descripcion"
                      />
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Productos seleccionados:</span>
                      <span className="font-medium">{itemsSeleccionados.length}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold">Total a Reembolsar:</span>
                      <span className="text-xl font-bold text-primary" data-testid="text-total-reembolso">
                        {formatCurrency(calcularTotal())}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {selectedVenta && (
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitDevolucion}
                  disabled={submitting || itemsSeleccionados.length === 0}
                  data-testid="button-confirmar-devolucion"
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar Devolución
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 p-3 sm:p-4 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0 pb-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                      Historial de Devoluciones
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {devoluciones.length} devoluciones registradas
                    </CardDescription>
                  </div>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]" data-testid="select-filtro-estado">
                      <SelectValue placeholder="Filtrar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  {devoluciones.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <RotateCcw className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">
                        No hay devoluciones registradas
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden sm:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead># Ticket</TableHead>
                              <TableHead>Productos</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {devoluciones.map((dev) => (
                              <TableRow key={dev.id} data-testid={`row-devolucion-${dev.id}`}>
                                <TableCell className="whitespace-nowrap">
                                  {formatDateTime(dev.fechaDevolucion)}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {dev.ticketOriginal}
                                </TableCell>
                                <TableCell>
                                  <div className="max-w-[200px]">
                                    {dev.productos.slice(0, 2).map((p, i) => (
                                      <p key={i} className="text-sm truncate">
                                        {p.cantidad}x {p.productoNombre}
                                      </p>
                                    ))}
                                    {dev.productos.length > 2 && (
                                      <p className="text-xs text-muted-foreground">
                                        +{dev.productos.length - 2} más
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold text-destructive">
                                  -{formatCurrency(dev.montoTotal)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {tipoReembolsoLabels[dev.tipoReembolso] || dev.tipoReembolso}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {getEstadoBadge(dev.estado)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="sm:hidden space-y-3">
                        {devoluciones.map((dev) => (
                          <Card key={dev.id} className="p-3" data-testid={`card-devolucion-${dev.id}`}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <p className="font-medium text-sm">{dev.ticketOriginal}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(dev.fechaDevolucion)}
                                </p>
                              </div>
                              {getEstadoBadge(dev.estado)}
                            </div>
                            <div className="space-y-1 mb-2">
                              {dev.productos.slice(0, 2).map((p, i) => (
                                <p key={i} className="text-xs truncate">
                                  {p.cantidad}x {p.productoNombre}
                                </p>
                              ))}
                              {dev.productos.length > 2 && (
                                <p className="text-xs text-muted-foreground">
                                  +{dev.productos.length - 2} más
                                </p>
                              )}
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <Badge variant="outline" className="text-xs">
                                {tipoReembolsoLabels[dev.tipoReembolso] || dev.tipoReembolso}
                              </Badge>
                              <span className="font-semibold text-destructive text-sm">
                                -{formatCurrency(dev.montoTotal)}
                              </span>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Notas de Crédito Activas
                  </CardTitle>
                  <CardDescription>
                    {notasCredito.length} notas disponibles
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {notasCredito.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CreditCard className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No hay notas de crédito activas
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {notasCredito.map((nota) => (
                          <Card key={nota.id} data-testid={`card-nota-${nota.id}`}>
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="font-semibold text-sm">{nota.numeroNota}</p>
                                  {nota.cliente && (
                                    <p className="text-xs text-muted-foreground">
                                      {nota.cliente}
                                    </p>
                                  )}
                                </div>
                                {getNotaEstadoBadge(nota.estado)}
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Disponible:</span>
                                  <span className="font-bold text-green-600">
                                    {formatCurrency(nota.montoDisponible)}
                                  </span>
                                </div>
                                {nota.montoDisponible < nota.montoOriginal && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Original:</span>
                                    <span className="text-muted-foreground line-through">
                                      {formatCurrency(nota.montoOriginal)}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  Vence: {formatDate(nota.fechaVencimiento)}
                                </div>
                              </div>

                              <Button
                                size="sm"
                                className="w-full"
                                variant="outline"
                                onClick={() => handleUsarNota(nota)}
                                data-testid={`button-usar-nota-${nota.id}`}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Usar Nota
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={usarNotaDialogOpen} onOpenChange={setUsarNotaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Aplicar Nota de Crédito
            </DialogTitle>
            <DialogDescription>
              {selectedNota?.numeroNota} - Disponible: {selectedNota && formatCurrency(selectedNota.montoDisponible)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ticketAplicar">Número de Ticket</Label>
              <Input
                id="ticketAplicar"
                placeholder="Ej: TK-2024-005"
                value={ticketAplicar}
                onChange={(e) => setTicketAplicar(e.target.value)}
                data-testid="input-ticket-aplicar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="montoAplicar">Monto a Aplicar</Label>
              <Input
                id="montoAplicar"
                type="number"
                step="0.01"
                min="0.01"
                max={selectedNota?.montoDisponible}
                value={montoAplicar}
                onChange={(e) => setMontoAplicar(e.target.value)}
                data-testid="input-monto-aplicar"
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {selectedNota && formatCurrency(selectedNota.montoDisponible)}
              </p>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                El monto se descontará del saldo disponible de la nota de crédito.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setUsarNotaDialogOpen(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button
              onClick={handleAplicarNota}
              disabled={submitting}
              data-testid="button-confirmar-aplicar-nota"
              className="w-full sm:w-auto min-h-[44px]"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
