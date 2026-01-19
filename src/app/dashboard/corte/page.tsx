"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  Clock,
  CreditCard,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
  Calculator,
  TrendingUp,
  TrendingDown,
  Play,
  StopCircle,
  Loader2,
  RefreshCw,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Turno {
  id: string;
  userId: string;
  startedAt: string;
  closedAt: string | null;
  initialCash: number;
  countedCash: number | null;
  status: "active" | "closed";
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesCredit: number;
  totalWithdrawals: number;
  totalDeposits: number;
  expectedCash: number;
  difference: number | null;
  notes: string | null;
}

interface Movimiento {
  id: string;
  turnoId: string;
  userId: string;
  type: "withdrawal" | "deposit";
  amount: number;
  concept: string;
  createdAt: string;
}

interface CorteReport {
  turnoId: string;
  startedAt: string;
  closedAt: string;
  initialCash: number;
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesCredit: number;
  totalSales: number;
  totalWithdrawals: number;
  totalDeposits: number;
  expectedCash: number;
  countedCash: number;
  difference: number;
  notes: string | null;
}

export default function CorteCajaPage() {
  const [loading, setLoading] = useState(true);
  const [activeTurno, setActiveTurno] = useState<Turno | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [showIniciarDialog, setShowIniciarDialog] = useState(false);
  const [showMovimientoDialog, setShowMovimientoDialog] = useState(false);
  const [showCorteDialog, setShowCorteDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [corteReport, setCorteReport] = useState<CorteReport | null>(null);
  const [movimientoType, setMovimientoType] = useState<"withdrawal" | "deposit">("withdrawal");
  const [initialCash, setInitialCash] = useState("");
  const [movimientoAmount, setMovimientoAmount] = useState("");
  const [movimientoConcept, setMovimientoConcept] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [corteNotes, setCorteNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTurno = useCallback(async () => {
    try {
      const response = await fetch("/api/caja/turno");
      const data = await response.json();
      
      if (data.hasActiveTurno) {
        setActiveTurno(data.activeTurno);
      } else {
        setActiveTurno(null);
      }
    } catch (error) {
      console.error("Error fetching turno:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMovimientos = useCallback(async () => {
    try {
      const response = await fetch("/api/caja/movimientos");
      const data = await response.json();
      setMovimientos(data.movimientos || []);
    } catch (error) {
      console.error("Error fetching movimientos:", error);
    }
  }, []);

  useEffect(() => {
    fetchTurno();
    fetchMovimientos();

    const interval = setInterval(() => {
      if (activeTurno) {
        fetchTurno();
        fetchMovimientos();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchTurno, fetchMovimientos, activeTurno]);

  const handleIniciarTurno = async () => {
    const amount = parseFloat(initialCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("Ingrese un monto válido para el fondo inicial");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/caja/turno", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initialCash: amount }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Turno iniciado exitosamente");
        setShowIniciarDialog(false);
        setInitialCash("");
        fetchTurno();
      } else {
        toast.error(data.error || "Error al iniciar turno");
      }
    } catch (error) {
      console.error("Error starting turno:", error);
      toast.error("Error al iniciar turno");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgregarMovimiento = async () => {
    const amount = parseFloat(movimientoAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Ingrese un monto válido");
      return;
    }

    if (!movimientoConcept.trim()) {
      toast.error("Ingrese un concepto para el movimiento");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/caja/movimientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: movimientoType,
          amount,
          concept: movimientoConcept.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(movimientoType === "withdrawal" ? "Retiro registrado" : "Depósito registrado");
        setShowMovimientoDialog(false);
        setMovimientoAmount("");
        setMovimientoConcept("");
        fetchTurno();
        fetchMovimientos();
      } else {
        toast.error(data.error || "Error al registrar movimiento");
      }
    } catch (error) {
      console.error("Error adding movimiento:", error);
      toast.error("Error al registrar movimiento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRealizarCorte = async () => {
    const amount = parseFloat(countedCash);
    if (isNaN(amount) || amount < 0) {
      toast.error("Ingrese el efectivo contado");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/caja/turno", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countedCash: amount,
          notes: corteNotes.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Corte realizado exitosamente");
        setShowCorteDialog(false);
        setCountedCash("");
        setCorteNotes("");
        setCorteReport(data.report);
        setShowReportDialog(true);
        setActiveTurno(null);
        fetchTurno();
        fetchMovimientos();
      } else {
        toast.error(data.error || "Error al realizar corte");
      }
    } catch (error) {
      console.error("Error making corte:", error);
      toast.error("Error al realizar corte");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMovimientoDialog = (type: "withdrawal" | "deposit") => {
    setMovimientoType(type);
    setMovimientoAmount("");
    setMovimientoConcept("");
    setShowMovimientoDialog(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-page-title">Corte de Caja</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Gestiona arqueos y cierres de turno</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { fetchTurno(); fetchMovimientos(); }}
            data-testid="button-refresh"
            className="min-h-[44px] min-w-[44px]"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {activeTurno && (
            <Badge variant="outline" className="text-green-600 border-green-600 text-xs sm:text-sm">
              <Clock className="mr-1 h-3 w-3" />
              <span className="hidden sm:inline">Turno activo desde</span>
              <span className="sm:hidden">Activo</span> {formatTime(activeTurno.startedAt)}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 overflow-auto">
        <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {!activeTurno ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-8 sm:py-12 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <Wallet className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base sm:text-lg font-medium mb-2">No hay turno activo</h3>
                <p className="text-muted-foreground mb-6 text-sm sm:text-base px-4">
                  Inicia un nuevo turno para comenzar a registrar ventas y movimientos
                </p>
                <Button
                  size="lg"
                  onClick={() => setShowIniciarDialog(true)}
                  data-testid="button-iniciar-turno"
                  className="min-h-[48px]"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Turno
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Fondo Inicial</p>
                        <p className="text-2xl font-bold" data-testid="text-initial-cash">
                          {formatCurrency(activeTurno.initialCash)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ventas Efectivo</p>
                        <p className="text-2xl font-bold" data-testid="text-sales-cash">
                          {formatCurrency(activeTurno.salesCash)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                        <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Ventas Tarjeta</p>
                        <p className="text-2xl font-bold" data-testid="text-sales-card">
                          {formatCurrency(activeTurno.salesCard)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Efectivo Esperado</p>
                        <p className="text-2xl font-bold" data-testid="text-expected-cash">
                          {formatCurrency(activeTurno.expectedCash)}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                        <Calculator className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumen del Turno</CardTitle>
                    <CardDescription>Detalle de ventas y movimientos</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Fondo inicial</span>
                        <span className="font-medium">{formatCurrency(activeTurno.initialCash)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Ventas en efectivo</span>
                        <span className="font-medium text-green-600">+{formatCurrency(activeTurno.salesCash)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Ventas en tarjeta</span>
                        <span className="font-medium">{formatCurrency(activeTurno.salesCard)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Ventas en transferencia</span>
                        <span className="font-medium">{formatCurrency(activeTurno.salesTransfer)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Ventas a crédito</span>
                        <span className="font-medium">{formatCurrency(activeTurno.salesCredit)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Depósitos en caja</span>
                        <span className="font-medium text-green-600">+{formatCurrency(activeTurno.totalDeposits)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b">
                        <span className="text-muted-foreground">Retiros de caja</span>
                        <span className="font-medium text-red-600">-{formatCurrency(activeTurno.totalWithdrawals)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center py-2">
                        <span className="font-semibold">Efectivo esperado</span>
                        <span className="font-bold text-lg">{formatCurrency(activeTurno.expectedCash)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0 pb-4 gap-2">
                    <div>
                      <CardTitle className="text-base sm:text-lg">Movimientos de Caja</CardTitle>
                      <CardDescription className="text-sm">Retiros y depósitos del turno</CardDescription>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMovimientoDialog("deposit")}
                        data-testid="button-add-deposit"
                        className="flex-1 sm:flex-none min-h-[44px]"
                      >
                        <Plus className="sm:mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Depósito</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openMovimientoDialog("withdrawal")}
                        data-testid="button-add-withdrawal"
                        className="flex-1 sm:flex-none min-h-[44px]"
                      >
                        <Minus className="sm:mr-1 h-4 w-4" />
                        <span className="hidden sm:inline">Retiro</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {movimientos.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center mb-3">
                          <Receipt className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground text-sm">Sin movimientos registrados</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {movimientos.map((mov) => (
                          <div
                            key={mov.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                            data-testid={`movimiento-${mov.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                mov.type === "deposit" 
                                  ? "bg-green-100 dark:bg-green-900" 
                                  : "bg-red-100 dark:bg-red-900"
                              }`}>
                                {mov.type === "deposit" ? (
                                  <ArrowDownCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                ) : (
                                  <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{mov.concept}</p>
                                <p className="text-xs text-muted-foreground">{formatTime(mov.createdAt)}</p>
                              </div>
                            </div>
                            <span className={`font-medium ${
                              mov.type === "deposit" ? "text-green-600" : "text-red-600"
                            }`}>
                              {mov.type === "deposit" ? "+" : "-"}{formatCurrency(mov.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary">
                <CardContent className="py-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <StopCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Realizar Corte de Caja</h3>
                        <p className="text-sm text-muted-foreground">
                          Cierra el turno actual y genera el reporte
                        </p>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      onClick={() => setShowCorteDialog(true)}
                      data-testid="button-realizar-corte"
                    >
                      <Calculator className="mr-2 h-5 w-5" />
                      Realizar Corte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Dialog open={showIniciarDialog} onOpenChange={setShowIniciarDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Nuevo Turno</DialogTitle>
            <DialogDescription>
              Ingresa el fondo inicial de caja para comenzar el turno
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="initialCash">Fondo Inicial (MXN)</Label>
              <Input
                id="initialCash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={initialCash}
                onChange={(e) => setInitialCash(e.target.value)}
                data-testid="input-initial-cash"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowIniciarDialog(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button 
              onClick={handleIniciarTurno} 
              disabled={isSubmitting}
              data-testid="button-confirm-iniciar"
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Iniciar Turno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showMovimientoDialog} onOpenChange={setShowMovimientoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {movimientoType === "withdrawal" ? "Agregar Retiro" : "Agregar Depósito"}
            </DialogTitle>
            <DialogDescription>
              {movimientoType === "withdrawal" 
                ? "Registra un retiro de efectivo de la caja (ej: pago a proveedor)"
                : "Registra un depósito de efectivo en la caja (ej: cambio extra)"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="concept">Concepto</Label>
              <Input
                id="concept"
                placeholder={movimientoType === "withdrawal" ? "Pago a proveedor" : "Cambio extra"}
                value={movimientoConcept}
                onChange={(e) => setMovimientoConcept(e.target.value)}
                data-testid="input-movimiento-concept"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Monto (MXN)</Label>
              <Input
                id="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={movimientoAmount}
                onChange={(e) => setMovimientoAmount(e.target.value)}
                data-testid="input-movimiento-amount"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowMovimientoDialog(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button 
              onClick={handleAgregarMovimiento} 
              disabled={isSubmitting}
              data-testid="button-confirm-movimiento"
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCorteDialog} onOpenChange={setShowCorteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Confirmar Corte de Caja
            </DialogTitle>
            <DialogDescription>
              Esta acción cerrará el turno actual. Ingresa el efectivo contado en caja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Efectivo esperado en caja:</p>
              <p className="text-2xl font-bold">{formatCurrency(activeTurno?.expectedCash || 0)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="countedCash">Efectivo Contado (MXN)</Label>
              <Input
                id="countedCash"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                data-testid="input-counted-cash"
              />
            </div>
            {countedCash && activeTurno && (
              <div className={`p-4 rounded-lg ${
                parseFloat(countedCash) >= activeTurno.expectedCash 
                  ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
              }`}>
                <div className="flex items-center gap-2">
                  {parseFloat(countedCash) >= activeTurno.expectedCash ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    parseFloat(countedCash) >= activeTurno.expectedCash 
                      ? "text-green-700 dark:text-green-300"
                      : "text-red-700 dark:text-red-300"
                  }`}>
                    {parseFloat(countedCash) >= activeTurno.expectedCash ? "Sobrante" : "Faltante"}:{" "}
                    {formatCurrency(Math.abs(parseFloat(countedCash) - activeTurno.expectedCash))}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input
                id="notes"
                placeholder="Observaciones del corte..."
                value={corteNotes}
                onChange={(e) => setCorteNotes(e.target.value)}
                data-testid="input-corte-notes"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowCorteDialog(false)} className="w-full sm:w-auto min-h-[44px]">
              Cancelar
            </Button>
            <Button 
              onClick={handleRealizarCorte} 
              disabled={isSubmitting || !countedCash}
              data-testid="button-confirm-corte"
              className="w-full sm:w-auto min-h-[44px]"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar Corte
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Corte de Caja Completado
            </DialogTitle>
            <DialogDescription>
              Reporte del turno cerrado
            </DialogDescription>
          </DialogHeader>
          {corteReport && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Inicio del turno</p>
                  <p className="font-medium text-sm sm:text-base">{formatDateTime(corteReport.startedAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cierre del turno</p>
                  <p className="font-medium text-sm sm:text-base">{formatDateTime(corteReport.closedAt)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fondo inicial</span>
                  <span>{formatCurrency(corteReport.initialCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas en efectivo</span>
                  <span className="text-green-600">+{formatCurrency(corteReport.salesCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas en tarjeta</span>
                  <span>{formatCurrency(corteReport.salesCard)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas en transferencia</span>
                  <span>{formatCurrency(corteReport.salesTransfer)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ventas a crédito</span>
                  <span>{formatCurrency(corteReport.salesCredit)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Total ventas</span>
                  <span>{formatCurrency(corteReport.totalSales)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Depósitos</span>
                  <span className="text-green-600">+{formatCurrency(corteReport.totalDeposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retiros</span>
                  <span className="text-red-600">-{formatCurrency(corteReport.totalWithdrawals)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Efectivo esperado</span>
                  <span className="font-medium">{formatCurrency(corteReport.expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Efectivo contado</span>
                  <span className="font-medium">{formatCurrency(corteReport.countedCash)}</span>
                </div>
                <div className={`flex justify-between p-2 rounded-lg ${
                  corteReport.difference >= 0 
                    ? "bg-green-50 dark:bg-green-950/30" 
                    : "bg-red-50 dark:bg-red-950/30"
                }`}>
                  <span className="font-semibold">
                    {corteReport.difference >= 0 ? "Sobrante" : "Faltante"}
                  </span>
                  <span className={`font-bold ${
                    corteReport.difference >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatCurrency(Math.abs(corteReport.difference))}
                  </span>
                </div>
              </div>

              {corteReport.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{corteReport.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowReportDialog(false)} data-testid="button-close-report">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
