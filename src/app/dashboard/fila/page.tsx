"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Users, 
  Clock, 
  Play,
  CheckCircle2, 
  Loader2,
  QrCode,
  RefreshCw,
  ChevronRight,
  X,
  User,
  Phone,
  Timer,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface QueueEntry {
  id: string;
  queue_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  status: string;
  position: number;
  created_at: string;
  estimated_wait_minutes: number | null;
}

interface QueueStats {
  waiting: number;
  averageWaitMinutes: number;
  totalServedToday: number;
}

export default function QueueDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [stats, setStats] = useState<QueueStats>({ waiting: 0, averageWaitMinutes: 3, totalServedToday: 0 });
  const [callingNext, setCallingNext] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentCalled, setCurrentCalled] = useState<QueueEntry | null>(null);
  const [completingService, setCompletingService] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const response = await fetch("/api/queue?status=all");
      const data = await response.json();

      if (data.entries) {
        setEntries(data.entries);
        setStats(data.stats);
        
        const called = data.entries.find((e: QueueEntry) => e.status === "called");
        if (called) {
          setCurrentCalled(called);
        }
      }
    } catch (error) {
      console.error("Error fetching queue:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/current-user");
        const data = await response.json();
        if (data.user) {
          setUserId(data.user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
    fetchQueue();

    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleCallNext = async () => {
    setCallingNext(true);
    try {
      const response = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "next" }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCalled(data.called);
        toast.success(`Turno ${data.called.queue_number} llamado`);
        fetchQueue();
      } else {
        toast.error(data.error || "Error al llamar siguiente");
      }
    } catch (error) {
      console.error("Error calling next:", error);
      toast.error("Error al llamar siguiente");
    } finally {
      setCallingNext(false);
    }
  };

  const handleCompleteService = async () => {
    if (!currentCalled) return;

    setCompletingService(true);
    try {
      const response = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", entryId: currentCalled.id }),
      });

      const data = await response.json();

      if (data.success) {
        setCurrentCalled(null);
        toast.success("Cliente atendido");
        fetchQueue();
      } else {
        toast.error(data.error || "Error al completar atención");
      }
    } catch (error) {
      console.error("Error completing service:", error);
      toast.error("Error al completar atención");
    } finally {
      setCompletingService(false);
    }
  };

  const handleCancelEntry = async (entryId: string) => {
    try {
      const response = await fetch("/api/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", entryId }),
      });

      const data = await response.json();

      if (data.success) {
        if (currentCalled?.id === entryId) {
          setCurrentCalled(null);
        }
        toast.success("Cliente removido de la fila");
        fetchQueue();
      } else {
        toast.error(data.error || "Error al remover cliente");
      }
    } catch (error) {
      console.error("Error canceling entry:", error);
      toast.error("Error al remover cliente");
    }
  };

  const getQueueUrl = () => {
    if (typeof window === "undefined" || !userId) return "";
    return `${window.location.origin}/fila/${userId}`;
  };

  const waitingEntries = entries.filter(e => e.status === "waiting");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fila Virtual</h1>
          <p className="text-sm text-muted-foreground">Gestiona la fila de espera de tus clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchQueue} data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowQRDialog(true)} data-testid="button-show-qr">
            <QrCode className="mr-2 h-4 w-4" />
            Compartir QR
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">En espera</p>
                    <p className="text-3xl font-bold">{stats.waiting}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tiempo promedio</p>
                    <p className="text-3xl font-bold">{stats.averageWaitMinutes} <span className="text-lg font-normal text-muted-foreground">min</span></p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                    <Timer className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Atendidos hoy</p>
                    <p className="text-3xl font-bold">{stats.totalServedToday}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {currentCalled && (
            <Card className="border-2 border-green-500 bg-green-50 dark:bg-green-950/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {currentCalled.queue_number}
                      </span>
                    </div>
                    <div>
                      <CardTitle className="text-green-700 dark:text-green-300">
                        Atendiendo turno #{currentCalled.queue_number}
                      </CardTitle>
                      <CardDescription>
                        {currentCalled.customer_name || "Cliente"} • {currentCalled.customer_phone || "Sin teléfono"}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleCompleteService}
                    disabled={completingService}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-complete-service"
                  >
                    {completingService ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Terminé de atender
                  </Button>
                </div>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 gap-2">
              <div>
                <CardTitle>Fila de espera</CardTitle>
                <CardDescription>
                  {waitingEntries.length === 0 
                    ? "No hay clientes esperando" 
                    : `${waitingEntries.length} cliente${waitingEntries.length > 1 ? "s" : ""} en espera`
                  }
                </CardDescription>
              </div>
              <Button
                size="lg"
                onClick={handleCallNext}
                disabled={callingNext || waitingEntries.length === 0}
                data-testid="button-call-next"
              >
                {callingNext ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Play className="mr-2 h-5 w-5" />
                )}
                Siguiente
              </Button>
            </CardHeader>
            <CardContent>
              {waitingEntries.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No hay clientes en la fila</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Comparte el código QR para que los clientes se unan
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowQRDialog(true)}
                  >
                    <QrCode className="mr-2 h-4 w-4" />
                    Ver código QR
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {waitingEntries.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`p-4 rounded-lg border flex items-center justify-between ${
                        index === 0 ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" : ""
                      }`}
                      data-testid={`queue-entry-${entry.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          index === 0 
                            ? "bg-blue-100 dark:bg-blue-900" 
                            : "bg-muted"
                        }`}>
                          <span className={`text-lg font-bold ${
                            index === 0 
                              ? "text-blue-600 dark:text-blue-400" 
                              : "text-muted-foreground"
                          }`}>
                            {entry.queue_number}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{entry.customer_name || "Cliente"}</p>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs">Siguiente</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {entry.customer_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {entry.customer_phone}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              ~{entry.estimated_wait_minutes || (entry.position * stats.averageWaitMinutes)} min
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCancelEntry(entry.id)}
                        data-testid={`button-cancel-${entry.id}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR de la Fila</DialogTitle>
            <DialogDescription>
              Los clientes pueden escanear este código para unirse a la fila virtual
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="p-4 bg-white rounded-xl">
              <QRCodeSVG 
                value={getQueueUrl()} 
                size={200}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-muted-foreground text-center break-all max-w-full">
              {getQueueUrl()}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(getQueueUrl());
                toast.success("Enlace copiado");
              }}
            >
              Copiar enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
