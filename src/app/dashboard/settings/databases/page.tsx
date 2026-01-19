"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Database, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server,
  Zap,
  Shield,
  AlertTriangle,
  ExternalLink,
  Settings,
  Table2,
  Code2,
  Key,
  Plus,
  ArrowLeftRight,
  BarChart3,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface DatabaseStatus {
  target: "primary" | "secondary";
  name: string;
  configured: boolean;
  connected: boolean;
  url?: string;
  error?: string;
}

interface DatabaseConfig {
  activeDatabase: "primary" | "secondary";
  databases: DatabaseStatus[];
}

interface SupabaseUrls {
  configured: boolean;
  projectRef?: string;
  urls?: {
    dashboard: string;
    tableEditor: string;
    sqlEditor: string;
    apiSettings: string;
  };
  error?: string;
  authRequired?: boolean;
}

interface DiagnosticResult {
  target: "primary" | "secondary";
  configured: boolean;
  connected: boolean;
  projectRef?: string;
  tables: { name: string; rowCount: number }[];
  totalRows: number;
  error?: string;
}

interface DiagnosticsResponse {
  primary: DiagnosticResult;
  secondary: DiagnosticResult;
  activeDatabase: "primary" | "secondary";
}

export default function DatabasesPage() {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false);
  const [linkSecondaryDialogOpen, setLinkSecondaryDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedDbTarget, setSelectedDbTarget] = useState<"primary" | "secondary">("primary");
  
  const [newSupabaseUrl, setNewSupabaseUrl] = useState("");
  const [newAnonKey, setNewAnonKey] = useState("");
  const [newServiceRoleKey, setNewServiceRoleKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  const { data: config, isLoading, refetch } = useQuery<DatabaseConfig>({
    queryKey: ["/api/settings/databases"],
    queryFn: async () => {
      const res = await fetch("/api/settings/databases");
      if (!res.ok) throw new Error("Failed to fetch database config");
      return res.json();
    },
  });

  const { data: diagnostics, isLoading: isDiagnosticsLoading, refetch: refetchDiagnostics } = useQuery<DiagnosticsResponse | null>({
    queryKey: ["/api/settings/databases/diagnose"],
    queryFn: async () => {
      const res = await fetch("/api/settings/databases/diagnose?all=true");
      if (!res.ok) {
        return null;
      }
      return res.json();
    },
  });

  const { data: supabaseUrls, isLoading: isLoadingUrls } = useQuery<SupabaseUrls>({
    queryKey: ["/api/settings/databases/supabase-url", selectedDbTarget],
    queryFn: async () => {
      const res = await fetch(`/api/settings/databases/supabase-url?target=${selectedDbTarget}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          return { configured: false, error: "Debes iniciar sesion para acceder a esta configuracion", authRequired: true };
        }
        return { configured: false, error: data.error || "Error al obtener configuracion de Supabase" };
      }
      return data;
    },
    enabled: supabaseDialogOpen,
  });

  const switchMutation = useMutation({
    mutationFn: async (target: "primary" | "secondary") => {
      const res = await fetch("/api/settings/databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeDatabase: target }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to switch database");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases/diagnose"] });
      toast.success(`Base de datos cambiada a: ${data.activeDatabase === "primary" ? "Principal" : "Secundaria"}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const linkSecondaryMutation = useMutation({
    mutationFn: async (data: { url: string; anonKey: string; serviceRoleKey: string }) => {
      const res = await fetch("/api/settings/databases/link-secondary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to link secondary database");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases/diagnose"] });
      toast.success("Base de datos secundaria vinculada exitosamente");
      setLinkSecondaryDialogOpen(false);
      resetLinkForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const syncDataMutation = useMutation({
    mutationFn: async (direction: "primary-to-secondary" | "secondary-to-primary") => {
      const res = await fetch("/api/settings/databases/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to sync data");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/databases/diagnose"] });
      toast.success(data.message || "Sincronizacion completada");
      setSyncDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetLinkForm = () => {
    setNewSupabaseUrl("");
    setNewAnonKey("");
    setNewServiceRoleKey("");
  };

  const validateAndLinkSecondary = async () => {
    if (!newSupabaseUrl || !newAnonKey || !newServiceRoleKey) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/settings/databases/validate-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newSupabaseUrl,
          anonKey: newAnonKey,
          serviceRoleKey: newServiceRoleKey,
        }),
      });
      
      const result = await res.json();
      
      if (!result.valid) {
        toast.error(`Error de validacion: ${result.error}`);
        setIsValidating(false);
        return;
      }

      linkSecondaryMutation.mutate({
        url: newSupabaseUrl,
        anonKey: newAnonKey,
        serviceRoleKey: newServiceRoleKey,
      });
    } catch (error) {
      toast.error("Error al validar la conexion");
    } finally {
      setIsValidating(false);
    }
  };

  const testConnection = async (target: "primary" | "secondary") => {
    setIsChecking(true);
    try {
      const res = await fetch(`/api/settings/databases/test?target=${target}`);
      const result = await res.json();
      if (result.connected) {
        toast.success(`Conexion a ${target === "primary" ? "Principal" : "Secundaria"} exitosa`);
      } else {
        toast.error(`Error de conexion: ${result.error}`);
      }
      refetch();
    } catch (error) {
      toast.error("Error al probar conexion");
    } finally {
      setIsChecking(false);
    }
  };

  const handleSwitch = (target: "primary" | "secondary") => {
    const db = config?.databases.find(d => d.target === target);
    if (!db?.configured) {
      toast.error(`La base de datos ${target === "primary" ? "principal" : "secundaria"} no esta configurada`);
      return;
    }
    switchMutation.mutate(target);
  };

  const openSupabaseDialog = (target: "primary" | "secondary") => {
    setSelectedDbTarget(target);
    setSupabaseDialogOpen(true);
  };

  const openSupabaseUrl = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const isSecondaryConfigured = config?.databases.find(d => d.target === "secondary")?.configured;

  const activeDbDiagnostics = diagnostics ? diagnostics[diagnostics.activeDatabase] : null;
  const otherDbTarget = diagnostics?.activeDatabase === "primary" ? "secondary" : "primary";
  const otherDbDiagnostics = diagnostics ? diagnostics[otherDbTarget] : null;
  
  const showEmptyWarning = activeDbDiagnostics?.totalRows === 0 && 
    otherDbDiagnostics?.configured && 
    (otherDbDiagnostics?.totalRows || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Bases de Datos Supabase
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra y cambia entre tus bases de datos de Supabase
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setLinkSecondaryDialogOpen(true)}
            data-testid="button-link-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Vincular Supabase Secundario
          </Button>
          {isSecondaryConfigured && (
            <Button
              variant="outline"
              onClick={() => setSyncDialogOpen(true)}
              data-testid="button-sync-data"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Sincronizar Datos
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {showEmptyWarning && (
            <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20" data-testid="card-empty-warning">
              <CardContent className="flex items-start gap-3 py-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Base de datos activa vacia
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    La base de datos activa ({diagnostics?.activeDatabase === "primary" ? "Principal" : "Secundaria"}) 
                    no tiene datos, pero la base {otherDbTarget === "primary" ? "Principal" : "Secundaria"} tiene{" "}
                    {otherDbDiagnostics?.totalRows?.toLocaleString()} registros. 
                    Considera sincronizar los datos o cambiar de base de datos.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Base de Datos Activa</CardTitle>
                  <CardDescription>
                    {config?.activeDatabase === "primary" ? "Principal (Primary)" : "Secundaria (Secondary)"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSupabaseDialog(config?.activeDatabase || "primary")}
                  data-testid="button-open-supabase-config"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Abrir Configuracion
                </Button>
                <Badge 
                  variant={config?.activeDatabase === "primary" ? "default" : "secondary"}
                  className="text-sm"
                  data-testid="badge-active-db"
                >
                  {config?.activeDatabase === "primary" ? "PRIMARY" : "SECONDARY"}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <Card data-testid="card-diagnostics">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Diagnostico de Bases de Datos</CardTitle>
                  <CardDescription>
                    Conteo de tablas y registros en cada base de datos
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchDiagnostics()}
                disabled={isDiagnosticsLoading}
                data-testid="button-refresh-diagnostics"
              >
                <RefreshCw className={`h-4 w-4 ${isDiagnosticsLoading ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {isDiagnosticsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !diagnostics ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    No se pudieron cargar los diagnosticos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    La funcionalidad de diagnosticos no esta disponible en este entorno. 
                    Verifica que tengas acceso a la API de diagnosticos.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {(["primary", "secondary"] as const).map((target) => {
                    const diag = diagnostics[target];
                    const isActive = diagnostics.activeDatabase === target;
                    
                    return (
                      <div 
                        key={target}
                        className={`p-4 rounded-lg border ${isActive ? "border-primary bg-primary/5" : "border-border"}`}
                        data-testid={`diagnostics-${target}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {target === "primary" ? "Principal" : "Secundaria"}
                            </span>
                            {isActive && (
                              <Badge variant="outline" className="text-xs">Activa</Badge>
                            )}
                          </div>
                          {diag?.connected ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : diag?.configured ? (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {!diag?.configured ? (
                          <p className="text-sm text-muted-foreground">No configurada</p>
                        ) : diag.error ? (
                          <p className="text-sm text-destructive">{diag.error}</p>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Total de registros:</span>
                              <span className="font-medium" data-testid={`total-rows-${target}`}>
                                {diag.totalRows?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm mb-3">
                              <span className="text-muted-foreground">Tablas con datos:</span>
                              <span className="font-medium" data-testid={`table-count-${target}`}>
                                {diag.tables?.filter(t => t.rowCount > 0).length || 0}
                              </span>
                            </div>
                            
                            {diag.tables && diag.tables.length > 0 && (
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {diag.tables
                                  .filter(t => t.rowCount > 0)
                                  .sort((a, b) => b.rowCount - a.rowCount)
                                  .slice(0, 5)
                                  .map((table) => (
                                    <div 
                                      key={table.name}
                                      className="flex items-center justify-between text-xs text-muted-foreground"
                                      data-testid={`table-${target}-${table.name}`}
                                    >
                                      <span>{table.name}</span>
                                      <span>{table.rowCount.toLocaleString()}</span>
                                    </div>
                                  ))}
                                {diag.tables.filter(t => t.rowCount > 0).length > 5 && (
                                  <p className="text-xs text-muted-foreground text-center mt-1">
                                    +{diag.tables.filter(t => t.rowCount > 0).length - 5} mas
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {config?.databases.map((db) => (
              <Card 
                key={db.target}
                className={`relative transition-all ${
                  config.activeDatabase === db.target 
                    ? "ring-2 ring-primary ring-offset-2" 
                    : ""
                }`}
                data-testid={`card-database-${db.target}`}
              >
                {config.activeDatabase === db.target && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
                )}
                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      db.configured 
                        ? db.connected 
                          ? "bg-green-100 dark:bg-green-900/30" 
                          : "bg-yellow-100 dark:bg-yellow-900/30"
                        : "bg-muted"
                    }`}>
                      <Database className={`h-5 w-5 ${
                        db.configured 
                          ? db.connected 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-yellow-600 dark:text-yellow-400"
                          : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {db.name}
                        {config.activeDatabase === db.target && (
                          <Badge variant="outline" className="text-xs font-normal">
                            Activa
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        {db.target === "primary" ? "Base principal del sistema" : "Base secundaria opcional"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    {db.configured ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">
                      {db.configured ? "Configurada" : "No configurada"}
                    </span>
                  </div>

                  {db.configured && (
                    <>
                      <div className="flex items-center gap-2">
                        {db.connected ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm">
                          {db.connected ? "Conectada" : "Sin verificar"}
                        </span>
                      </div>

                      {db.url && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Server className="h-3 w-3" />
                          <span className="truncate">{db.url}</span>
                        </div>
                      )}
                    </>
                  )}

                  {db.error && (
                    <div className="p-2 bg-destructive/10 rounded text-xs text-destructive">
                      {db.error}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Usar esta base</span>
                      <Switch
                        checked={config.activeDatabase === db.target}
                        onCheckedChange={() => handleSwitch(db.target)}
                        disabled={
                          !db.configured || 
                          switchMutation.isPending || 
                          config.activeDatabase === db.target
                        }
                        data-testid={`switch-database-${db.target}`}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      {db.configured && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openSupabaseDialog(db.target)}
                            data-testid={`button-config-${db.target}`}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Supabase
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => testConnection(db.target)}
                            disabled={isChecking}
                            data-testid={`button-test-${db.target}`}
                          >
                            <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                            Probar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isSecondaryConfigured && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Base de datos secundaria no configurada</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Para habilitar el soporte multi-base de datos, usa el boton "Vincular Supabase Secundario" 
                  o configura las siguientes variables de entorno:
                </p>
                <div className="bg-muted p-4 rounded-lg text-left text-xs font-mono space-y-1">
                  <div>SUPABASE_URL_2=tu_url_secundaria</div>
                  <div>SUPABASE_ANON_KEY_2=tu_anon_key</div>
                  <div>SUPABASE_SERVICE_ROLE_KEY_2=tu_service_role_key</div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informacion del Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                El cambio de base de datos se aplica a nivel de sesion. 
                Cada marca puede tener su propia configuracion de base de datos.
              </p>
              <p>
                La preferencia se guarda en el navegador y se mantiene entre sesiones.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={supabaseDialogOpen} onOpenChange={setSupabaseDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configuracion de Supabase
            </DialogTitle>
            <DialogDescription>
              Accede directamente a tu proyecto de Supabase para administrar tablas, 
              ejecutar SQL y configurar permisos.
            </DialogDescription>
          </DialogHeader>

          {isLoadingUrls ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : supabaseUrls?.configured && supabaseUrls.urls ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Server className="h-4 w-4" />
                  Proyecto: {supabaseUrls.projectRef}
                </div>
                <p className="text-xs text-muted-foreground">
                  Base de datos {selectedDbTarget === "primary" ? "Principal" : "Secundaria"}
                </p>
              </div>

              <div className="grid gap-2">
                <Button
                  variant="default"
                  className="w-full justify-start"
                  onClick={() => openSupabaseUrl(supabaseUrls.urls!.dashboard)}
                  data-testid="button-open-dashboard"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Panel de Supabase
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openSupabaseUrl(supabaseUrls.urls!.tableEditor)}
                  data-testid="button-open-table-editor"
                >
                  <Table2 className="h-4 w-4 mr-2" />
                  Editor de Tablas
                  <span className="ml-auto text-xs text-muted-foreground">Crear y editar tablas</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openSupabaseUrl(supabaseUrls.urls!.sqlEditor)}
                  data-testid="button-open-sql-editor"
                >
                  <Code2 className="h-4 w-4 mr-2" />
                  Editor SQL
                  <span className="ml-auto text-xs text-muted-foreground">Ejecutar consultas</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => openSupabaseUrl(supabaseUrls.urls!.apiSettings)}
                  data-testid="button-open-api-settings"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Configuracion API
                  <span className="ml-auto text-xs text-muted-foreground">Claves y permisos</span>
                </Button>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Permisos completos
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                      Al abrir Supabase, tendras acceso completo para crear tablas, 
                      editar datos y modificar la configuracion de la base de datos.
                      Asegurate de estar autenticado en Supabase.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                {supabaseUrls?.error || "No se pudo obtener la configuracion de Supabase"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {supabaseUrls?.authRequired 
                  ? "Inicia sesion para acceder a la configuracion de la base de datos."
                  : "Verifica que las variables de entorno esten configuradas correctamente."
                }
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={linkSecondaryDialogOpen} onOpenChange={setLinkSecondaryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Vincular Base de Datos Secundaria
            </DialogTitle>
            <DialogDescription>
              Ingresa las credenciales de tu proyecto de Supabase secundario. 
              La conexion sera validada antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabase-url">URL de Supabase</Label>
              <Input
                id="supabase-url"
                placeholder="https://tu-proyecto.supabase.co"
                value={newSupabaseUrl}
                onChange={(e) => setNewSupabaseUrl(e.target.value)}
                data-testid="input-supabase-url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anon-key">Anon Key (Publica)</Label>
              <Input
                id="anon-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={newAnonKey}
                onChange={(e) => setNewAnonKey(e.target.value)}
                data-testid="input-anon-key"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-role-key">Service Role Key (Privada)</Label>
              <Input
                id="service-role-key"
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={newServiceRoleKey}
                onChange={(e) => setNewServiceRoleKey(e.target.value)}
                data-testid="input-service-role-key"
              />
              <p className="text-xs text-muted-foreground">
                Encuentra estas claves en Project Settings → API en tu dashboard de Supabase.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setLinkSecondaryDialogOpen(false);
                resetLinkForm();
              }}
              data-testid="button-cancel-link"
            >
              Cancelar
            </Button>
            <Button
              onClick={validateAndLinkSecondary}
              disabled={isValidating || linkSecondaryMutation.isPending || !newSupabaseUrl || !newAnonKey || !newServiceRoleKey}
              data-testid="button-confirm-link"
            >
              {(isValidating || linkSecondaryMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isValidating ? "Validando..." : linkSecondaryMutation.isPending ? "Guardando..." : "Validar y Vincular"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Sincronizar Datos
            </DialogTitle>
            <DialogDescription>
              Sincroniza los datos entre tus bases de datos. Esta operacion 
              copiara los datos de una base a la otra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4">
              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => syncDataMutation.mutate("primary-to-secondary")}
                data-testid="button-sync-primary-to-secondary"
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Principal → Secundaria</p>
                    <p className="text-xs text-muted-foreground">
                      Copiar datos de la base principal a la secundaria
                    </p>
                  </div>
                  {syncDataMutation.isPending && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover-elevate"
                onClick={() => syncDataMutation.mutate("secondary-to-primary")}
                data-testid="button-sync-secondary-to-primary"
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <Database className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Secundaria → Principal</p>
                    <p className="text-xs text-muted-foreground">
                      Copiar datos de la base secundaria a la principal
                    </p>
                  </div>
                  {syncDataMutation.isPending && (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Advertencia
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                    Esta operacion puede sobrescribir datos existentes. 
                    Asegurate de tener un respaldo antes de continuar.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSyncDialogOpen(false)}
              data-testid="button-close-sync"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
