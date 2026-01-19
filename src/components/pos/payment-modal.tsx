"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Customer } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CreditCard, 
  Banknote, 
  Smartphone, 
  User,
  Delete,
  X,
  Check,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  hasConfiguredTerminal, 
  getDefaultTerminal, 
  shouldShowTerminalLinkPrompt,
  setTerminalLinkPreference,
  processPaymentWithTerminal,
  checkPaymentStatus,
} from "@/lib/services/terminal-service";
import { PaymentIntent, PaymentIntentStatus, TERMINAL_PROVIDERS } from "@/types/printer";
import Link from "next/link";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onComplete: (paymentMethod: string, customerId?: string, amountPaid?: number) => Promise<void>;
  customers?: Customer[];
}

type PaymentMethod = "cash" | "card" | "transfer" | "credit";

const PAYMENT_METHODS = [
  { id: "cash" as PaymentMethod, name: "Efectivo", icon: Banknote, color: "bg-green-500" },
  { id: "card" as PaymentMethod, name: "Tarjeta", icon: CreditCard, color: "bg-blue-500" },
  { id: "transfer" as PaymentMethod, name: "Transferencia", icon: Smartphone, color: "bg-purple-500" },
  { id: "credit" as PaymentMethod, name: "Crédito", icon: User, color: "bg-amber-500" },
];

const QUICK_AMOUNTS = [20, 50, 100, 200, 500, 1000];

const NUMPAD_KEYS = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  [".", "0", "00"],
];

type TerminalState = "idle" | "processing" | "approved" | "rejected" | "error";

export function PaymentModal({
  open,
  onOpenChange,
  total,
  onComplete,
  customers = [],
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  // Terminal states
  const [terminalState, setTerminalState] = useState<TerminalState>("idle");
  const [currentIntent, setCurrentIntent] = useState<PaymentIntent | null>(null);
  const [showLinkPrompt, setShowLinkPrompt] = useState(false);
  const [terminalConnected, setTerminalConnected] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false);

  const amountPaid = parseFloat(inputValue) || 0;
  const remaining = Math.max(0, total - amountPaid);
  const change = Math.max(0, amountPaid - total);
  const canComplete = paymentMethod !== "cash" || amountPaid >= total;

  useEffect(() => {
    if (open) {
      setInputValue("");
      setPaymentMethod("cash");
      setCustomerId("");
      setTerminalState("idle");
      setCurrentIntent(null);
      setShowLinkPrompt(false);
      setTerminalConnected(hasConfiguredTerminal());
      isCompletingRef.current = false;
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [open]);

  // Auto-complete sale when payment is approved
  useEffect(() => {
    if (terminalState === "approved" && !isCompletingRef.current) {
      isCompletingRef.current = true;
      
      // Clear any remaining polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      
      // Auto-complete the sale after a short delay to show approval status
      const completeTimer = setTimeout(async () => {
        try {
          setLoading(true);
          await onComplete("card", customerId || undefined, total);
          onOpenChange(false);
        } catch (error) {
          console.error("Error al completar pago automático:", error);
          isCompletingRef.current = false;
        } finally {
          setLoading(false);
        }
      }, 1000);
      
      return () => clearTimeout(completeTimer);
    }
  }, [terminalState, onComplete, customerId, total, onOpenChange]);

  useEffect(() => {
    if (paymentMethod === "card" && !hasConfiguredTerminal() && shouldShowTerminalLinkPrompt()) {
      setShowLinkPrompt(true);
    } else {
      setShowLinkPrompt(false);
    }
  }, [paymentMethod]);

  const handleNumpadPress = useCallback((key: string) => {
    setInputValue((prev) => {
      if (key === "." && prev.includes(".")) return prev;
      
      let candidate: string;
      if (key === "00" && prev === "") {
        candidate = "0";
      } else if (prev === "0" && key !== "." && key !== "00") {
        candidate = key;
      } else {
        candidate = prev + key;
      }
      
      const parts = candidate.split(".");
      if (parts.length === 2 && parts[1].length > 2) return prev;
      if (parts[0].length > 7) return prev;
      
      const numValue = parseFloat(candidate);
      if (isNaN(numValue) || numValue > 9999999.99) return prev;
      
      return candidate;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setInputValue((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInputValue("");
  }, []);

  const handleQuickAmount = useCallback((amount: number) => {
    setInputValue(amount.toString());
  }, []);

  const handleExactAmount = useCallback(() => {
    setInputValue(total.toFixed(2));
  }, [total]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const pollPaymentStatus = useCallback(async (intentId: string) => {
    try {
      const updatedIntent = await checkPaymentStatus(intentId);
      setCurrentIntent(updatedIntent);
      
      if (updatedIntent.status === "approved") {
        stopPolling();
        setTerminalState("approved");
      } else if (updatedIntent.status === "rejected" || updatedIntent.status === "cancelled") {
        stopPolling();
        setTerminalState("rejected");
      } else if (updatedIntent.status === "error") {
        stopPolling();
        setTerminalState("error");
      }
    } catch (error) {
      console.error("Error polling payment status:", error);
    }
  }, [stopPolling]);

  const handleCardPayment = async () => {
    if (!hasConfiguredTerminal()) {
      setShowLinkPrompt(true);
      return;
    }

    setTerminalState("processing");
    setLoading(true);

    try {
      const intent = await processPaymentWithTerminal(total, `sale_${Date.now()}`);
      setCurrentIntent(intent);

      if (intent.status === "approved") {
        setTerminalState("approved");
      } else if (intent.status === "processing") {
        // Clear any existing polling first
        stopPolling();
        // Start new polling
        pollingIntervalRef.current = setInterval(() => pollPaymentStatus(intent.id), 2000);
      } else if (intent.status === "rejected" || intent.status === "cancelled") {
        setTerminalState("rejected");
      } else if (intent.status === "error") {
        setTerminalState("error");
      }
    } catch (error) {
      console.error("Error processing card payment:", error);
      setTerminalState("error");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!canComplete) return;
    
    if (paymentMethod === "card" && hasConfiguredTerminal()) {
      if (terminalState === "idle") {
        await handleCardPayment();
        return;
      }
      
      if (terminalState !== "approved") {
        return;
      }
    }
    
    try {
      setLoading(true);
      await onComplete(
        paymentMethod,
        customerId || undefined,
        paymentMethod === "cash" ? amountPaid : total
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error al completar pago:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkLater = () => {
    setShowLinkPrompt(false);
  };

  const handleNeverAsk = () => {
    setTerminalLinkPreference("never_ask");
    setShowLinkPrompt(false);
  };

  const handleRetryPayment = () => {
    setTerminalState("idle");
    setCurrentIntent(null);
    isCompletingRef.current = false;
    stopPolling();
  };

  const defaultTerminal = getDefaultTerminal();
  const terminalProvider = defaultTerminal 
    ? TERMINAL_PROVIDERS.find(p => p.id === defaultTerminal.provider) 
    : null;

  const getCompleteButtonText = () => {
    if (paymentMethod === "card" && hasConfiguredTerminal()) {
      switch (terminalState) {
        case "idle":
          return "Enviar a Terminal";
        case "processing":
          return "Procesando...";
        case "approved":
          return "Completar Venta";
        case "rejected":
        case "error":
          return "Reintentar";
        default:
          return "Completar Venta";
      }
    }
    return "Completar Venta";
  };

  const getCompleteButtonDisabled = () => {
    if (loading) return true;
    if (paymentMethod === "credit" && !customerId) return true;
    if (paymentMethod === "cash" && !canComplete) return true;
    if (paymentMethod === "card" && hasConfiguredTerminal() && terminalState === "processing") return true;
    return false;
  };

  const handleCompleteClick = () => {
    if (paymentMethod === "card" && hasConfiguredTerminal()) {
      if (terminalState === "rejected" || terminalState === "error") {
        handleRetryPayment();
        return;
      }
    }
    handleComplete();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden" data-testid="payment-modal">
          <div className="flex flex-col md:flex-row h-[85vh] md:h-auto">
            <div className="flex-1 p-6 flex flex-col">
              <DialogHeader className="pb-4">
                <DialogTitle className="text-xl">Procesar Pago</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-primary/10 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total a Pagar</p>
                  <p className="text-3xl font-bold text-primary" data-testid="text-total">
                    ${total.toFixed(2)}
                  </p>
                </div>
                <div className={cn(
                  "rounded-xl p-4 text-center transition-colors",
                  remaining > 0 ? "bg-destructive/10" : "bg-green-500/10"
                )}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {remaining > 0 ? "Falta por Pagar" : "Cambio"}
                  </p>
                  <p className={cn(
                    "text-3xl font-bold",
                    remaining > 0 ? "text-destructive" : "text-green-600"
                  )} data-testid="text-remaining">
                    ${remaining > 0 ? remaining.toFixed(2) : change.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Método de Pago</p>
                <div className="grid grid-cols-4 gap-2">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    const hasTerminal = method.id === "card" && hasConfiguredTerminal();
                    return (
                      <Button
                        key={method.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "h-16 flex-col gap-1 transition-all relative",
                          isSelected && method.color
                        )}
                        onClick={() => {
                          setPaymentMethod(method.id);
                          if (method.id !== "card") {
                            setTerminalState("idle");
                          }
                        }}
                        data-testid={`button-payment-${method.id}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{method.name}</span>
                        {hasTerminal && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -top-1 -right-1 h-4 px-1 text-[10px] bg-green-500 text-white"
                          >
                            <Wifi className="h-2 w-2" />
                          </Badge>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {paymentMethod === "card" && hasConfiguredTerminal() && (
                <div className="mb-4">
                  <div className={cn(
                    "rounded-xl p-4 border-2 transition-all",
                    terminalState === "idle" && "border-blue-200 bg-blue-50 dark:bg-blue-950/20",
                    terminalState === "processing" && "border-amber-200 bg-amber-50 dark:bg-amber-950/20",
                    terminalState === "approved" && "border-green-200 bg-green-50 dark:bg-green-950/20",
                    (terminalState === "rejected" || terminalState === "error") && "border-red-200 bg-red-50 dark:bg-red-950/20"
                  )}>
                    <div className="flex items-center gap-3">
                      <div 
                        className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                        style={{ backgroundColor: terminalProvider?.color || "#666" }}
                      >
                        {defaultTerminal?.provider === "mercadopago" ? "MP" : "C"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{defaultTerminal?.name}</p>
                          {terminalState === "idle" && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200">
                              <Wifi className="h-3 w-3 mr-1" />
                              Lista
                            </Badge>
                          )}
                          {terminalState === "processing" && (
                            <Badge variant="outline" className="text-amber-600 border-amber-200">
                              <Clock className="h-3 w-3 mr-1 animate-pulse" />
                              Esperando pago
                            </Badge>
                          )}
                          {terminalState === "approved" && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Aprobado
                            </Badge>
                          )}
                          {terminalState === "rejected" && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rechazado
                            </Badge>
                          )}
                          {terminalState === "error" && (
                            <Badge variant="outline" className="text-red-600 border-red-200">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {terminalState === "idle" && "El cobro se enviará automáticamente"}
                          {terminalState === "processing" && "Esperando que el cliente pague en la terminal..."}
                          {terminalState === "approved" && "Pago recibido correctamente"}
                          {terminalState === "rejected" && "El pago fue rechazado. Intenta de nuevo."}
                          {terminalState === "error" && "Error de conexión. Verifica la terminal."}
                        </p>
                      </div>
                      {terminalState === "processing" && (
                        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                      )}
                      {terminalState === "approved" && (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      )}
                    </div>
                    
                    {currentIntent?.authorizationCode && terminalState === "approved" && (
                      <div className="mt-3 pt-3 border-t border-green-200">
                        <p className="text-xs text-muted-foreground">
                          Código de autorización: <span className="font-mono font-medium">{currentIntent.authorizationCode}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === "credit" && customers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Cliente</p>
                  <ScrollArea className="h-32 rounded-lg border">
                    <div className="p-2 space-y-1">
                      {customers.map((customer) => (
                        <Button
                          key={customer.id}
                          variant={customerId === customer.id ? "secondary" : "ghost"}
                          className="w-full justify-start h-auto py-2"
                          onClick={() => setCustomerId(customer.id)}
                          data-testid={`button-customer-${customer.id}`}
                        >
                          <div className="text-left">
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Disponible: ${(customer.credit_limit - customer.credit_balance).toFixed(2)}
                            </p>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              <div className="mt-auto pt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  data-testid="button-cancel-payment"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button
                  className={cn(
                    "flex-1 h-12",
                    terminalState === "approved" && "bg-green-600 hover:bg-green-700",
                    (terminalState === "rejected" || terminalState === "error") && "bg-amber-600 hover:bg-amber-700",
                    terminalState === "idle" && paymentMethod === "card" && hasConfiguredTerminal() && "bg-blue-600 hover:bg-blue-700",
                    (terminalState === "idle" && paymentMethod !== "card") && "bg-green-600 hover:bg-green-700"
                  )}
                  onClick={handleCompleteClick}
                  disabled={getCompleteButtonDisabled()}
                  data-testid="button-complete-payment"
                >
                  {loading || terminalState === "processing" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : terminalState === "approved" ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (terminalState === "rejected" || terminalState === "error") ? (
                    <AlertCircle className="h-4 w-4 mr-2" />
                  ) : paymentMethod === "card" && hasConfiguredTerminal() ? (
                    <CreditCard className="h-4 w-4 mr-2" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  {getCompleteButtonText()}
                </Button>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden md:block" />
            <Separator className="md:hidden" />

            <div className="w-full md:w-80 bg-muted/30 p-4 flex flex-col">
              <div className="mb-4">
                <div className="bg-background rounded-xl p-4 text-center border-2 border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Monto Recibido</p>
                  <p className="text-4xl font-bold font-mono" data-testid="text-amount-received">
                    ${inputValue || "0.00"}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Monto Rápido</p>
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="h-10 text-sm font-medium"
                      onClick={() => handleQuickAmount(amount)}
                      data-testid={`button-quick-${amount}`}
                    >
                      ${amount}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  className="w-full mt-2 h-10"
                  onClick={handleExactAmount}
                  data-testid="button-exact-amount"
                >
                  Monto Exacto (${total.toFixed(2)})
                </Button>
              </div>

              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Teclado</p>
                <div className="grid grid-cols-3 gap-2">
                  {NUMPAD_KEYS.flat().map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-12 text-lg font-medium"
                      onClick={() => handleNumpadPress(key)}
                      data-testid={`button-numpad-${key === "." ? "dot" : key}`}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={handleClear}
                    data-testid="button-numpad-clear"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Borrar
                  </Button>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={handleBackspace}
                    data-testid="button-numpad-backspace"
                  >
                    <Delete className="h-4 w-4 mr-1" />
                    <span className="sr-only">Retroceso</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLinkPrompt} onOpenChange={setShowLinkPrompt}>
        <DialogContent className="sm:max-w-md" data-testid="dialog-link-terminal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Enlazar Terminal Bancaria
            </DialogTitle>
            <DialogDescription>
              Conecta tu terminal de Mercado Pago o Clip para cobrar con tarjeta automáticamente desde el POS
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Cobro automático</p>
                <p className="text-xs text-muted-foreground">
                  El monto se envía directamente a tu terminal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Sin errores de captura</p>
                <p className="text-xs text-muted-foreground">
                  Ya no tienes que teclear el monto en la terminal
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Ticket automático</p>
                <p className="text-xs text-muted-foreground">
                  Al aprobarse el pago, se genera el ticket de venta
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="ghost" 
              onClick={handleNeverAsk}
              className="text-muted-foreground"
              data-testid="button-never-ask"
            >
              No volver a preguntar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLinkLater}
              data-testid="button-link-later"
            >
              Después
            </Button>
            <Link href="/dashboard/settings/terminals">
              <Button 
                className="bg-primary"
                data-testid="button-link-now"
              >
                <Settings className="h-4 w-4 mr-2" />
                Enlazar ahora
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
