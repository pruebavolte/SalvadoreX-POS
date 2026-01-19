"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, 
  CreditCard, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Wifi,
  WifiOff,
  RefreshCw,
  Smartphone,
  Zap,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface TerminalConnection {
  id: string;
  provider: string;
  status: string;
  selected_device_id: string | null;
  selected_device_name: string | null;
  connected_at: string;
  live_mode: boolean;
}

interface Device {
  id: string;
  pos_id: number;
  store_id: string;
  external_pos_id: string;
  operating_mode: string;
}

export default function TerminalsSettingsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<TerminalConnection | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [selectingDevice, setSelectingDevice] = useState<string | null>(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "mercadopago") {
      toast.success("Cuenta de Mercado Pago conectada exitosamente");
      window.history.replaceState({}, "", "/dashboard/settings/terminals");
    }

    if (error) {
      const errorMessages: Record<string, string> = {
        missing_params: "Faltan parámetros en la respuesta",
        invalid_state: "Sesión inválida, intenta de nuevo",
        expired: "La sesión expiró, intenta de nuevo",
        not_configured: "Mercado Pago no está configurado",
        token_exchange_failed: "Error al conectar con Mercado Pago",
        save_failed: "Error al guardar la conexión",
      };
      toast.error(errorMessages[error] || `Error: ${error}`);
      window.history.replaceState({}, "", "/dashboard/settings/terminals");
    }

    checkConnection();
  }, [searchParams]);

  const checkConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/terminals/connection");
      const data = await response.json();

      if (data.connected) {
        setConnection(data.connection);
        if (!data.connection.selected_device_id) {
          fetchDevices();
        }
      } else {
        setConnection(null);
      }
    } catch (error) {
      console.error("Error checking connection:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await fetch("/api/oauth/mercadopago/connect");
      const data = await response.json();

      if (data.demo_mode) {
        setDemoMode(true);
        toast.info("Mercado Pago no está configurado. Usando modo demo.");
        setConnecting(false);
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Error al iniciar conexión");
        setConnecting(false);
      }
    } catch (error) {
      console.error("Error connecting:", error);
      toast.error("Error al conectar");
      setConnecting(false);
    }
  };

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const response = await fetch("/api/terminals/devices");
      const data = await response.json();

      if (data.devices) {
        setDevices(data.devices);
        if (data.devices.length > 0) {
          setShowDeviceDialog(true);
        } else {
          toast.info("No se encontraron terminales. Asegúrate de que tu terminal esté encendida y vinculada a tu cuenta de Mercado Pago.");
        }
      } else if (data.needsReconnection) {
        toast.error("Tu conexión ha expirado. Por favor reconecta.");
        setConnection(null);
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Error al obtener terminales");
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleSelectDevice = async (device: Device) => {
    setSelectingDevice(device.id);
    try {
      const response = await fetch("/api/terminals/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: device.id,
          deviceName: `Terminal ${device.pos_id || device.id.slice(-6)}`,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Terminal seleccionada correctamente");
        setShowDeviceDialog(false);
        checkConnection();
      } else {
        toast.error(data.error || "Error al seleccionar terminal");
      }
    } catch (error) {
      console.error("Error selecting device:", error);
      toast.error("Error al seleccionar terminal");
    } finally {
      setSelectingDevice(null);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const response = await fetch("/api/terminals/connection", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Cuenta desconectada");
        setConnection(null);
        setDevices([]);
      } else {
        toast.error("Error al desconectar");
      }
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Error al desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3">
          <Link href="/dashboard/settings">
            <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold truncate">Terminales de Pago</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Conecta tu terminal para cobrar con tarjeta</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b flex items-center gap-2 sm:gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold truncate">Terminales de Pago</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Conecta tu terminal para cobrar con tarjeta</p>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 overflow-auto">
        {!connection ? (
          <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
            <Card className="border-2 border-dashed">
              <CardContent className="p-4 sm:pt-6 sm:p-6">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold">Conecta tu Terminal</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vincula tu terminal de Mercado Pago Point para cobrar con tarjeta directamente desde el punto de venta
                    </p>
                  </div>

                  <Button 
                    size="lg" 
                    className="w-full min-h-[48px] bg-[#009EE3] hover:bg-[#007BB5] text-white"
                    onClick={handleConnect}
                    disabled={connecting}
                    data-testid="button-connect-mercadopago"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-2 h-5 w-5" />
                        Conectar con Mercado Pago
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    Serás redirigido a Mercado Pago para autorizar la conexión
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 sm:space-y-3">
              <h3 className="font-medium text-xs sm:text-sm text-muted-foreground">Cómo funciona</h3>
              <div className="grid gap-2 sm:gap-3">
                <div className="flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">1</div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Haz clic en "Conectar"</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Inicia sesión con tu cuenta de Mercado Pago</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">2</div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Selecciona tu terminal</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Elige cuál Point quieres usar</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 sm:gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">3</div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">¡Listo para cobrar!</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">Los cobros con tarjeta se enviarán automáticamente a tu terminal</p>
                  </div>
                </div>
              </div>
            </div>

            {demoMode && (
              <div className="p-3 sm:p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-amber-800 dark:text-amber-200">Modo Demo</p>
                    <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                      La integración con Mercado Pago no está configurada. Contacta al administrador para habilitarla.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-lg mx-auto space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg">Mercado Pago</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Cuenta conectada</CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1 border-green-500 text-green-600 self-start sm:self-auto flex-shrink-0">
                    <Wifi className="h-3 w-3" />
                    Conectado
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                {connection.selected_device_id ? (
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base truncate">{connection.selected_device_name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Terminal activa</p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 sm:p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2 sm:gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-blue-800 dark:text-blue-200">Selecciona tu terminal</p>
                          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                            Tu cuenta está conectada. Ahora selecciona qué terminal quieres usar.
                          </p>
                        </div>
                      </div>
                    </div>
                    <Button 
                      className="w-full min-h-[44px]" 
                      onClick={fetchDevices}
                      disabled={loadingDevices}
                      data-testid="button-select-terminal"
                    >
                      {loadingDevices ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando terminales...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Buscar mis terminales
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <div className="pt-3 sm:pt-4 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {connection.live_mode ? "Modo producción" : "Modo pruebas"}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive min-h-[44px]"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    data-testid="button-disconnect"
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Desconectar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {connection.selected_device_id && (
              <Card>
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-sm sm:text-base">Cómo cobrar con tarjeta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6 pt-0 sm:pt-0">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs sm:text-sm font-semibold flex-shrink-0">1</div>
                    <p className="text-xs sm:text-sm">Agrega productos al carrito y presiona "Cobrar"</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs sm:text-sm font-semibold flex-shrink-0">2</div>
                    <p className="text-xs sm:text-sm">Selecciona "Tarjeta" como método de pago</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs sm:text-sm font-semibold flex-shrink-0">3</div>
                    <p className="text-xs sm:text-sm">El cobro se enviará automáticamente a tu terminal</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs sm:text-sm font-semibold flex-shrink-0">4</div>
                    <p className="text-xs sm:text-sm">El cliente paga en la terminal y la venta se completa</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <Dialog open={showDeviceDialog} onOpenChange={setShowDeviceDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Selecciona tu terminal</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Elige la terminal Point que usarás para cobrar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[250px] sm:max-h-[300px] overflow-auto">
            {devices.length === 0 ? (
              <div className="text-center py-6 sm:py-8 px-2">
                <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No se encontraron terminales</p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Asegúrate de que tu terminal esté encendida y conectada a internet
                </p>
              </div>
            ) : (
              devices.map((device) => (
                <button
                  key={device.id}
                  className="w-full p-3 sm:p-4 rounded-lg border hover:bg-muted/50 transition-colors flex items-center justify-between text-left min-h-[60px]"
                  onClick={() => handleSelectDevice(device)}
                  disabled={selectingDevice === device.id}
                  data-testid={`button-device-${device.id}`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Smartphone className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">Terminal {device.pos_id || device.id.slice(-6)}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {device.operating_mode === "PDV" ? "Modo integrado" : device.operating_mode}
                      </p>
                    </div>
                  </div>
                  {selectingDevice === device.id ? (
                    <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" className="min-h-[44px] w-full sm:w-auto" onClick={() => setShowDeviceDialog(false)}>
              Cancelar
            </Button>
            <Button variant="outline" className="min-h-[44px] w-full sm:w-auto" onClick={fetchDevices} disabled={loadingDevices}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loadingDevices ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
