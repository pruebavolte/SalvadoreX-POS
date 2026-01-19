"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Link2, 
  Unlink, 
  Settings, 
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  TestTube2,
  Send,
  Zap,
  Globe,
  ChefHat,
  Truck,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { DeliveryPlatform, DELIVERY_PLATFORMS } from "@/types/printer";
import { cn } from "@/lib/utils";
import Link from "next/link";

const PLATFORMS_STORAGE_KEY = "pos_delivery_platforms";

function getPlatforms(): DeliveryPlatform[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PLATFORMS_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return DELIVERY_PLATFORMS.map(p => ({
    ...p,
    apiKey: "",
    storeId: "",
    isConnected: false,
    webhookUrl: "",
    enabled: false,
  }));
}

function savePlatforms(platforms: DeliveryPlatform[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PLATFORMS_STORAGE_KEY, JSON.stringify(platforms));
}

const MAIN_PLATFORMS = ['uber_eats', 'didi_food', 'rappi'];

export default function PlatformsSettingsPage() {
  const [platforms, setPlatforms] = useState<DeliveryPlatform[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<DeliveryPlatform | null>(null);
  const [formData, setFormData] = useState({
    apiKey: "",
    storeId: "",
    enabled: true,
  });
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [sendingTestOrder, setSendingTestOrder] = useState<string | null>(null);

  useEffect(() => {
    setPlatforms(getPlatforms());
  }, []);

  const generateWebhookUrl = (platformId: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const platformPath = platformId === 'uber_eats' ? 'uber-eats' : 
                         platformId === 'didi_food' ? 'didi-food' : 
                         platformId === 'sin_delantal' ? 'sin-delantal' :
                         platformId === 'pedidos_ya' ? 'pedidos-ya' : platformId;
    return `${baseUrl}/api/webhooks/${platformPath}`;
  };

  const handleConnect = (platform: DeliveryPlatform) => {
    setSelectedPlatform(platform);
    setFormData({
      apiKey: platform.apiKey || "",
      storeId: platform.storeId || "",
      enabled: platform.enabled,
    });
    setDialogOpen(true);
  };

  const handleDisconnect = (platformId: string) => {
    const updated = platforms.map(p => 
      p.id === platformId 
        ? { ...p, apiKey: "", storeId: "", isConnected: false, enabled: false }
        : p
    );
    setPlatforms(updated);
    savePlatforms(updated);
    toast.success("Plataforma desconectada");
  };

  const handleSave = async () => {
    if (!selectedPlatform) return;

    setConnecting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));

    const updated = platforms.map(p => 
      p.id === selectedPlatform.id 
        ? { 
            ...p, 
            apiKey: formData.apiKey,
            storeId: formData.storeId,
            isConnected: !!formData.apiKey && !!formData.storeId,
            webhookUrl: generateWebhookUrl(selectedPlatform.id),
            enabled: formData.enabled,
          }
        : p
    );
    
    setPlatforms(updated);
    savePlatforms(updated);
    setConnecting(false);
    setDialogOpen(false);
    
    if (formData.apiKey && formData.storeId) {
      toast.success(`${selectedPlatform.name} conectado exitosamente`);
    } else {
      toast.info("Configuración guardada");
    }
  };

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("URL copiada al portapapeles");
  };

  const handleTestConnection = async (platformId: string) => {
    setTesting(platformId);
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) return;

      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Conexión con ${platform.name} verificada correctamente`, {
        description: "El webhook está listo para recibir pedidos"
      });
    } catch (error) {
      toast.error("Error al verificar conexión");
    } finally {
      setTesting(null);
    }
  };

  const handleSendTestOrder = async (platformId: string) => {
    setSendingTestOrder(platformId);
    
    try {
      const platform = platforms.find(p => p.id === platformId);
      if (!platform) return;

      const webhookUrl = generateWebhookUrl(platformId);
      
      const testOrder = {
        order_id: `TEST-${platformId.toUpperCase()}-${Date.now()}`,
        customer: {
          name: `Cliente Prueba ${platform.name}`,
          phone: "+52 55 1234 5678",
          address: "Calle de Prueba #123, Col. Centro"
        },
        items: [
          { name: "Pizza Grande", quantity: 1, price: 189.00, notes: "Sin cebolla" },
          { name: "Refresco 600ml", quantity: 2, price: 25.00 },
          { name: "Papas Fritas", quantity: 1, price: 45.00 }
        ],
        subtotal: 284.00,
        delivery_fee: 35.00,
        total: 319.00,
        notes: "Pedido de prueba - Favor de ignorar",
        payment_method: "card",
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Order': 'true'
        },
        body: JSON.stringify(testOrder)
      });

      if (response.ok) {
        toast.success(`Pedido de prueba enviado a cocina`, {
          description: `Revisa el módulo de Cocina para ver el pedido de ${platform.name}`,
          action: {
            label: "Ir a Cocina",
            onClick: () => window.location.href = "/dashboard/cocina"
          }
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Error al enviar pedido');
      }
    } catch (error: any) {
      toast.error("Error al enviar pedido de prueba", {
        description: error.message
      });
    } finally {
      setSendingTestOrder(null);
    }
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;
  const mainPlatforms = platforms.filter(p => MAIN_PLATFORMS.includes(p.id));
  const otherPlatforms = platforms.filter(p => !MAIN_PLATFORMS.includes(p.id));

  const PlatformCard = ({ platform }: { platform: DeliveryPlatform }) => (
    <Card 
      className={cn(
        "transition-all",
        platform.isConnected && "border-green-500/50 bg-green-50/30 dark:bg-green-950/10"
      )}
      data-testid={`card-platform-${platform.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div 
              className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0"
              style={{ backgroundColor: platform.color }}
            >
              {platform.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                {platform.name}
                {platform.isConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </CardTitle>
              <CardDescription>
                {platform.isConnected ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">Conectado</span>
                ) : (
                  "No conectado"
                )}
              </CardDescription>
            </div>
          </div>
          {platform.isConnected && (
            <Switch
              checked={platform.enabled}
              onCheckedChange={(enabled) => {
                const updated = platforms.map(p => 
                  p.id === platform.id ? { ...p, enabled } : p
                );
                setPlatforms(updated);
                savePlatforms(updated);
                toast.success(enabled ? `${platform.name} habilitado` : `${platform.name} deshabilitado`);
              }}
              data-testid={`switch-platform-${platform.id}`}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {platform.isConnected && (
          <>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Store ID:</span>
                <span className="font-mono truncate">{platform.storeId}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Webhook:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => copyWebhookUrl(generateWebhookUrl(platform.id))}
                  data-testid={`button-copy-webhook-${platform.id}`}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copiar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTestConnection(platform.id)}
                disabled={testing === platform.id}
                data-testid={`button-test-${platform.id}`}
              >
                {testing === platform.id ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-1" />
                )}
                Probar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendTestOrder(platform.id)}
                disabled={sendingTestOrder === platform.id}
                data-testid={`button-test-order-${platform.id}`}
              >
                {sendingTestOrder === platform.id ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <ChefHat className="h-4 w-4 mr-1" />
                )}
                Pedido
              </Button>
            </div>
          </>
        )}

        <div className="flex gap-2">
          {platform.isConnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleConnect(platform)}
                data-testid={`button-settings-${platform.id}`}
              >
                <Settings className="h-4 w-4 mr-1" />
                Configurar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnect(platform.id)}
                className="text-destructive hover:text-destructive"
                data-testid={`button-disconnect-${platform.id}`}
              >
                <Unlink className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full text-white"
              style={{ backgroundColor: platform.color }}
              onClick={() => handleConnect(platform)}
              data-testid={`button-connect-${platform.id}`}
            >
              <Link2 className="h-4 w-4 mr-1" />
              Conectar {platform.name}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/settings">
              <Button variant="outline" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
                <Globe className="h-7 w-7" />
                Plataformas de Delivery
              </h1>
              <p className="text-muted-foreground mt-1">
                Conecta tu POS con Uber Eats, Didi Food, Rappi y recibe pedidos automáticamente
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-base px-4 py-1.5" data-testid="badge-connected-count">
            {connectedCount} de {platforms.length} conectadas
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="main" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="main" data-testid="tab-main-platforms">
              <Truck className="h-4 w-4 mr-2" />
              Principales
            </TabsTrigger>
            <TabsTrigger value="other" data-testid="tab-other-platforms">
              <Globe className="h-4 w-4 mr-2" />
              Otras
            </TabsTrigger>
          </TabsList>

          {/* Main Platforms */}
          <TabsContent value="main" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mainPlatforms.map((platform) => (
                <PlatformCard key={platform.id} platform={platform} />
              ))}
            </div>

            {/* Test Section */}
            <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-900">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TestTube2 className="h-5 w-5 text-orange-500" />
                  Probar Integraciones
                </CardTitle>
                <CardDescription>
                  Envía pedidos de prueba para verificar que todo funcione correctamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Usa los botones de "Pedido" en cada plataforma conectada para enviar un pedido de prueba 
                  que aparecerá en el módulo de Cocina.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = "/dashboard/cocina"}
                    data-testid="button-go-to-kitchen"
                  >
                    <ChefHat className="h-4 w-4 mr-2" />
                    Ir a Cocina
                  </Button>
                  {mainPlatforms.some(p => p.isConnected) && (
                    <Button
                      onClick={async () => {
                        const connected = mainPlatforms.filter(p => p.isConnected);
                        for (const platform of connected) {
                          await handleSendTestOrder(platform.id);
                          await new Promise(r => setTimeout(r, 500));
                        }
                      }}
                      data-testid="button-test-all"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar a todas
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Other Platforms */}
          <TabsContent value="other" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {otherPlatforms.map((platform) => (
                <PlatformCard key={platform.id} platform={platform} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información Importante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Para conectar tu restaurante con cada plataforma, necesitarás:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Una cuenta activa de comercio en cada plataforma</li>
              <li>Acceso al panel de administración o API del comercio</li>
              <li>Las credenciales API (API Key y Store ID)</li>
            </ul>
            <p>
              Una vez conectado, los pedidos de cada plataforma llegarán 
              automáticamente a tu POS y podrás gestionarlos desde el módulo de Cocina.
            </p>
          </CardContent>
        </Card>

        {/* Configuration Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                  style={{ backgroundColor: selectedPlatform?.color }}
                >
                  {selectedPlatform?.name.charAt(0)}
                </div>
                Conectar {selectedPlatform?.name}
              </DialogTitle>
              <DialogDescription>
                Ingresa las credenciales de tu cuenta de comercio
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>API Key / Token</Label>
                <Input
                  type="password"
                  placeholder="Ingresa tu API Key"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  data-testid="input-api-key"
                />
                <p className="text-xs text-muted-foreground">
                  Encuentra esta clave en el panel de desarrolladores de {selectedPlatform?.name}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Store ID / Restaurant ID</Label>
                <Input
                  placeholder="Ej: 12345-abcde"
                  value={formData.storeId}
                  onChange={(e) => setFormData({ ...formData, storeId: e.target.value })}
                  data-testid="input-store-id"
                />
                <p className="text-xs text-muted-foreground">
                  El identificador único de tu restaurante en la plataforma
                </p>
              </div>

              {selectedPlatform && (
                <div className="space-y-2">
                  <Label>Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generateWebhookUrl(selectedPlatform.id)}
                      readOnly
                      className="flex-1 bg-muted font-mono text-xs"
                      data-testid="input-webhook-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyWebhookUrl(generateWebhookUrl(selectedPlatform.id))}
                      data-testid="button-copy-webhook"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configura esta URL en el panel de {selectedPlatform?.name} para recibir pedidos
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Label>Habilitar integración</Label>
                <Switch
                  checked={formData.enabled}
                  onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
                  data-testid="switch-enabled"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={connecting}
                style={{ backgroundColor: selectedPlatform?.color }}
                className="text-white"
                data-testid="button-save-platform"
              >
                {connecting && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                {connecting ? "Conectando..." : "Guardar y Conectar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
