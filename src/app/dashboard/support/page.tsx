"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Headphones, 
  MonitorUp, 
  ExternalLink, 
  Copy, 
  Check, 
  Users, 
  Shield,
  Smartphone,
  Monitor,
  Globe
} from "lucide-react";
import { toast } from "sonner";

export default function SupportPage() {
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [hostUrl, setHostUrl] = useState("/support/host");
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHostUrl(`${window.location.origin}/support/host`);
    }
  }, []);
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(hostUrl);
    setCopied(true);
    toast.success("Enlace copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleJoinSession = () => {
    if (!sessionCode.trim()) {
      toast.error("Por favor ingresa el código de sesión");
      return;
    }
    router.push(`/support/viewer?code=${sessionCode.trim()}`);
  };
  
  const handleOpenHostPage = () => {
    window.open("/support/host", "_blank");
  };
  
  const handleOpenViewerPage = () => {
    window.open("/support/viewer", "_blank");
  };

  return (
    <div className="w-full min-h-screen p-3 sm:p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
            <Headphones className="w-6 h-6 sm:w-7 sm:h-7 text-primary flex-shrink-0" />
            <span>Soporte Remoto</span>
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
            Proporciona asistencia remota a tus clientes compartiendo pantalla y controlando su cursor
          </p>
        </div>

        <Tabs defaultValue="technician" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger 
              value="technician" 
              data-testid="tab-technician" 
              className="text-xs sm:text-sm py-2 sm:py-3"
            >
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Soy Técnico</span>
              <span className="sm:hidden">Técnico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="client" 
              data-testid="tab-client" 
              className="text-xs sm:text-sm py-2 sm:py-3"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">Soy Cliente</span>
              <span className="sm:hidden">Cliente</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="technician" className="space-y-3 sm:space-y-4 mt-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Unirse a Sesión de Soporte</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Ingresa el código de 6 dígitos que te proporcionó el cliente para ver su pantalla y ayudarlo
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionCode" className="text-xs sm:text-sm">Código de Sesión</Label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      id="sessionCode"
                      placeholder="123456"
                      value={sessionCode}
                      onChange={(e) => setSessionCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="text-lg sm:text-xl md:text-2xl text-center tracking-[0.3em] sm:tracking-[0.5em] font-mono h-12 sm:h-14"
                      maxLength={6}
                      data-testid="input-session-code"
                    />
                    <Button 
                      onClick={handleJoinSession}
                      disabled={sessionCode.length !== 6}
                      data-testid="button-join-session"
                      className="w-full sm:w-auto h-12 sm:h-14 px-6"
                    >
                      Unirse
                    </Button>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={handleOpenViewerPage}
                    className="w-full"
                    data-testid="button-open-viewer"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Abrir Página de Técnico</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Instrucciones para el Cliente</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Comparte estas instrucciones con el cliente que necesita soporte
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                  <p className="text-xs sm:text-sm font-medium">Pasos para el cliente:</p>
                  <ol className="list-decimal list-inside space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li>Visita el enlace de soporte que te enviamos</li>
                    <li>Haz clic en "Iniciar Sesión de Soporte"</li>
                    <li>Comparte el código de 6 dígitos con tu técnico</li>
                    <li>Cuando el técnico se conecte, haz clic en "Compartir Pantalla"</li>
                    <li>Autoriza compartir tu pantalla cuando el navegador te lo pida</li>
                  </ol>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    value={hostUrl} 
                    readOnly 
                    className="flex-1 text-xs sm:text-sm h-10"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto whitespace-nowrap h-10"
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="client" className="space-y-3 sm:space-y-4 mt-4">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span>Solicitar Soporte Remoto</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Comparte tu pantalla con un técnico para recibir ayuda en tiempo real
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 space-y-4">
                <div className="bg-muted p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-3">
                  <p className="text-xs sm:text-sm font-medium">Cómo funciona:</p>
                  <ol className="list-decimal list-inside space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-muted-foreground">
                    <li>Inicia una sesión de soporte</li>
                    <li>Obtendrás un código de 6 dígitos</li>
                    <li>Comparte este código con el técnico por teléfono o chat</li>
                    <li>El técnico podrá ver tu pantalla y guiarte</li>
                  </ol>
                </div>
                
                <Button 
                  onClick={handleOpenHostPage}
                  className="w-full h-12"
                  data-testid="button-start-support"
                >
                  <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  <span>Iniciar Sesión de Soporte</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Compatibilidad</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              El soporte remoto funciona en múltiples plataformas
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">Windows / Mac</p>
                  <p className="text-xs text-muted-foreground truncate">Chrome, Firefox, Edge</p>
                </div>
                <Badge variant="secondary" className="flex-shrink-0 text-xs">Completo</Badge>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                  <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">Android</p>
                  <p className="text-xs text-muted-foreground truncate">Chrome móvil</p>
                </div>
                <Badge variant="outline" className="flex-shrink-0 text-xs">Ver pantalla</Badge>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm sm:text-base truncate">Web App</p>
                  <p className="text-xs text-muted-foreground truncate">Cualquier navegador</p>
                </div>
                <Badge variant="secondary" className="flex-shrink-0 text-xs">Completo</Badge>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs sm:text-sm text-muted-foreground">
                <strong>Nota:</strong> Para control remoto completo del sistema operativo (Windows, Mac, Android), 
                se recomienda usar aplicaciones nativas como TeamViewer o AnyDesk. 
                El soporte web permite ver la pantalla y mostrar un cursor virtual para guiar al usuario.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
