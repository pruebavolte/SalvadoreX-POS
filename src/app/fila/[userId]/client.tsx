"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Clock, 
  Bell, 
  BellRing,
  CheckCircle2, 
  Loader2,
  Phone,
  Mail,
  User,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QueueEntry {
  id: string;
  queueNumber: number;
  position: number;
  status: string;
  estimatedWaitMinutes: number;
  createdAt: string;
  calledAt: string | null;
}

interface Props {
  userId: string;
}

export default function PublicQueueClient({ userId }: Props) {
  const [step, setStep] = useState<"register" | "waiting" | "called">("register");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [entry, setEntry] = useState<QueueEntry | null>(null);

  useEffect(() => {
    const savedEntryId = localStorage.getItem(`queue_entry_${userId}`);
    if (savedEntryId) {
      checkExistingEntry(savedEntryId);
    }
  }, [userId]);

  useEffect(() => {
    if (entry && entry.status === "waiting") {
      const interval = setInterval(() => {
        refreshStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [entry]);

  const checkExistingEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/queue/status?entryId=${entryId}`);
      const data = await response.json();

      if (data.found && data.entry.status !== "served" && data.entry.status !== "cancelled") {
        setEntry(data.entry);
        setStep(data.entry.status === "called" ? "called" : "waiting");
      } else {
        localStorage.removeItem(`queue_entry_${userId}`);
      }
    } catch (error) {
      console.error("Error checking existing entry:", error);
    }
  };

  const refreshStatus = async () => {
    if (!entry) return;

    try {
      const response = await fetch(`/api/queue/status?entryId=${entry.id}`);
      const data = await response.json();

      if (data.found) {
        setEntry(data.entry);
        
        if (data.entry.status === "called" && step !== "called") {
          setStep("called");
          if (notificationsEnabled && "Notification" in window) {
            new Notification("¡Es tu turno!", {
              body: `Tu número ${data.entry.queueNumber} ha sido llamado. Por favor acércate al mostrador.`,
              icon: "/icon-192.png",
              tag: "queue-called",
              requireInteraction: true,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing status:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }

    setRequestingPermission(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        toast.success("Notificaciones activadas");
      } else {
        toast.error("Permiso de notificaciones denegado");
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Error al solicitar permisos");
    } finally {
      setRequestingPermission(false);
    }
  };

  const handleJoinQueue = async () => {
    if (!customerPhone) {
      toast.error("Por favor ingresa tu número de teléfono");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          customerName,
          customerEmail,
          customerPhone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEntry({
          id: data.entry.id,
          queueNumber: data.queueNumber,
          position: data.position,
          status: "waiting",
          estimatedWaitMinutes: data.estimatedWaitMinutes,
          createdAt: data.entry.created_at,
          calledAt: null,
        });
        localStorage.setItem(`queue_entry_${userId}`, data.entry.id);
        setStep("waiting");
        toast.success(`¡Te uniste a la fila! Tu número es ${data.queueNumber}`);
      } else {
        toast.error(data.error || "Error al unirse a la fila");
      }
    } catch (error) {
      console.error("Error joining queue:", error);
      toast.error("Error al unirse a la fila");
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveQueue = () => {
    localStorage.removeItem(`queue_entry_${userId}`);
    setEntry(null);
    setStep("register");
    toast.info("Has salido de la fila");
  };

  if (step === "called") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950 dark:to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center border-2 border-green-500">
          <CardContent className="pt-8 pb-6">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                <PartyPopper className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-green-600 dark:text-green-400">¡Es tu turno!</h1>
              <p className="text-muted-foreground mt-2">Por favor acércate al mostrador</p>
            </div>

            <div className="p-6 rounded-xl bg-green-100 dark:bg-green-900/50 mb-6">
              <p className="text-sm text-muted-foreground mb-1">Tu número</p>
              <p className="text-6xl font-bold text-green-700 dark:text-green-300">
                {entry?.queueNumber}
              </p>
            </div>

            <Button variant="outline" onClick={handleLeaveQueue} className="w-full">
              Salir de la fila
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Estás en la fila</CardTitle>
            <CardDescription>Te avisaremos cuando sea tu turno</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-muted text-center">
                <p className="text-sm text-muted-foreground mb-1">Tu número</p>
                <p className="text-4xl font-bold text-primary">{entry?.queueNumber}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted text-center">
                <p className="text-sm text-muted-foreground mb-1">Posición</p>
                <p className="text-4xl font-bold">{entry?.position}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
              <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Tiempo estimado de espera</span>
              </div>
              <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
                ~{entry?.estimatedWaitMinutes} min
              </p>
            </div>

            {!notificationsEnabled && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Activa las notificaciones</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      Te avisaremos cuando sea tu turno aunque cierres esta página
                    </p>
                    <Button 
                      size="sm" 
                      onClick={requestNotificationPermission}
                      disabled={requestingPermission}
                      data-testid="button-enable-notifications"
                    >
                      {requestingPermission ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <BellRing className="mr-2 h-4 w-4" />
                      )}
                      Activar notificaciones
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {notificationsEnabled && (
              <div className="flex items-center gap-2 justify-center text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Notificaciones activadas</span>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:text-destructive"
                onClick={handleLeaveQueue}
              >
                Salir de la fila
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-blue-950 dark:to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Fila Virtual</CardTitle>
          <CardDescription>
            Registra tus datos para unirte a la fila y te avisaremos cuando sea tu turno
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  Te notificaremos por tu turno
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Activa las notificaciones para recibir un aviso cuando sea tu turno
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tu nombre (opcional)</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Juan Pérez"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="pl-10"
                  data-testid="input-customer-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">WhatsApp / Teléfono *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="55 1234 5678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="pl-10"
                  required
                  data-testid="input-customer-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="pl-10"
                  data-testid="input-customer-email"
                />
              </div>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg"
            onClick={handleJoinQueue}
            disabled={loading || !customerPhone}
            data-testid="button-join-queue"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Uniéndose a la fila...
              </>
            ) : (
              <>
                <Users className="mr-2 h-5 w-5" />
                Unirse a la fila
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Al unirte aceptas recibir notificaciones sobre tu turno
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
