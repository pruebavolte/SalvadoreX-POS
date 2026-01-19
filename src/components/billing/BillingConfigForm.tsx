"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Save, Loader2, AlertCircle, CheckCircle, Database } from "lucide-react";
import { toast } from "sonner";
import { CATALOGO_REGIMEN_FISCAL } from "@/lib/facturama/types";

interface BillingConfig {
  id?: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  domicilioFiscalCp: string;
  facturamaUser?: string;
  csdUploaded: boolean;
  enabled: boolean;
  allowPublicInvoicing: boolean;
}

interface BillingConfigFormProps {
  onConfigSaved?: (config: BillingConfig) => void;
}

export function BillingConfigForm({ onConfigSaved }: BillingConfigFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [config, setConfig] = useState<BillingConfig>({
    rfc: "",
    razonSocial: "",
    regimenFiscal: "",
    domicilioFiscalCp: "",
    facturamaUser: "",
    csdUploaded: false,
    enabled: false,
    allowPublicInvoicing: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setFetching(true);
      const res = await fetch("/api/billing/config");
      if (res.ok) {
        const data = await res.json();
        if (data.migrationRequired) {
          setMigrationRequired(true);
          return;
        }
        if (data.config) {
          setConfig({
            id: data.config.id,
            rfc: data.config.rfc || "",
            razonSocial: data.config.razonSocial || "",
            regimenFiscal: data.config.regimenFiscal || "",
            domicilioFiscalCp: data.config.domicilioFiscalCp || "",
            facturamaUser: data.config.facturamaUser || "",
            csdUploaded: data.config.csdUploaded || false,
            enabled: data.config.enabled || false,
            allowPublicInvoicing: data.config.allowPublicInvoicing ?? true,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching billing config:", error);
    } finally {
      setFetching(false);
    }
  };

  const validateRFC = (rfc: string): boolean => {
    const rfcPattern = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
    return rfcPattern.test(rfc.toUpperCase());
  };

  const validateCP = (cp: string): boolean => {
    return /^\d{5}$/.test(cp);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!config.rfc.trim()) {
      newErrors.rfc = "RFC es requerido";
    } else if (!validateRFC(config.rfc)) {
      newErrors.rfc = "Formato de RFC inválido (12-13 caracteres alfanuméricos)";
    }

    if (!config.razonSocial.trim()) {
      newErrors.razonSocial = "Razón Social es requerida";
    }

    if (!config.regimenFiscal) {
      newErrors.regimenFiscal = "Régimen Fiscal es requerido";
    }

    if (!config.domicilioFiscalCp.trim()) {
      newErrors.domicilioFiscalCp = "Código Postal es requerido";
    } else if (!validateCP(config.domicilioFiscalCp)) {
      newErrors.domicilioFiscalCp = "Código Postal debe ser de 5 dígitos";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Por favor corrija los errores en el formulario");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfc: config.rfc.toUpperCase(),
          razonSocial: config.razonSocial,
          regimenFiscal: config.regimenFiscal,
          domicilioFiscalCp: config.domicilioFiscalCp,
          facturamaUser: config.facturamaUser,
          enabled: config.enabled,
          allowPublicInvoicing: config.allowPublicInvoicing,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al guardar la configuración");
      }

      const data = await res.json();
      toast.success(data.message || "Configuración guardada correctamente");
      
      if (data.config) {
        setConfig(prev => ({
          ...prev,
          id: data.config.id,
          csdUploaded: data.config.csdUploaded,
        }));
      }
      
      onConfigSaved?.(config);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar la configuración");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (migrationRequired) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
            <Database className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Configurar Base de Datos</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              El modulo de facturacion requiere configurar tablas adicionales en la base de datos.
              Por favor ejecuta la migracion <code className="bg-muted px-1.5 py-0.5 rounded text-xs">027_billing_invoicing.sql</code> en Supabase.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => fetchConfig()}
            data-testid="button-retry-config"
            className="min-h-[44px]"
          >
            <Loader2 className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
          Datos Fiscales
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Configure los datos fiscales de su negocio para la emisión de CFDI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="rfc" className="text-sm">
              RFC <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rfc"
              data-testid="input-rfc"
              value={config.rfc}
              onChange={(e) => {
                setConfig({ ...config, rfc: e.target.value.toUpperCase() });
                if (errors.rfc) setErrors({ ...errors, rfc: "" });
              }}
              placeholder="Ej: XAXX010101000"
              className={`min-h-[44px] ${errors.rfc ? "border-destructive" : ""}`}
              maxLength={13}
            />
            {errors.rfc && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.rfc}
              </p>
            )}
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="domicilioFiscalCp" className="text-sm">
              Código Postal Fiscal <span className="text-destructive">*</span>
            </Label>
            <Input
              id="domicilioFiscalCp"
              data-testid="input-cp"
              value={config.domicilioFiscalCp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                setConfig({ ...config, domicilioFiscalCp: value });
                if (errors.domicilioFiscalCp) setErrors({ ...errors, domicilioFiscalCp: "" });
              }}
              placeholder="Ej: 01000"
              className={`min-h-[44px] ${errors.domicilioFiscalCp ? "border-destructive" : ""}`}
              maxLength={5}
            />
            {errors.domicilioFiscalCp && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.domicilioFiscalCp}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="razonSocial" className="text-sm">
            Razón Social <span className="text-destructive">*</span>
          </Label>
          <Input
            id="razonSocial"
            data-testid="input-razon-social"
            value={config.razonSocial}
            onChange={(e) => {
              setConfig({ ...config, razonSocial: e.target.value });
              if (errors.razonSocial) setErrors({ ...errors, razonSocial: "" });
            }}
            placeholder="Ej: MI EMPRESA SA DE CV"
            className={`min-h-[44px] ${errors.razonSocial ? "border-destructive" : ""}`}
          />
          {errors.razonSocial && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.razonSocial}
            </p>
          )}
        </div>

        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor="regimenFiscal" className="text-sm">
            Régimen Fiscal <span className="text-destructive">*</span>
          </Label>
          <Select
            value={config.regimenFiscal}
            onValueChange={(value) => {
              setConfig({ ...config, regimenFiscal: value });
              if (errors.regimenFiscal) setErrors({ ...errors, regimenFiscal: "" });
            }}
          >
            <SelectTrigger
              id="regimenFiscal"
              data-testid="select-regimen-fiscal"
              className={`min-h-[44px] ${errors.regimenFiscal ? "border-destructive" : ""}`}
            >
              <SelectValue placeholder="Seleccione un régimen fiscal" />
            </SelectTrigger>
            <SelectContent>
              {CATALOGO_REGIMEN_FISCAL.map((regimen) => (
                <SelectItem key={regimen.value} value={regimen.value}>
                  {regimen.value} - {regimen.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.regimenFiscal && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors.regimenFiscal}
            </p>
          )}
        </div>

        <Separator className="my-4" />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="enableInvoicing" className="text-sm">
                Habilitar Facturación Electrónica
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Active esta opción para emitir CFDI desde el sistema
              </p>
            </div>
            <Switch
              id="enableInvoicing"
              data-testid="switch-enable-invoicing"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              className="flex-shrink-0"
            />
          </div>

          <Separator />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 min-w-0 flex-1">
              <Label htmlFor="allowPublicInvoicing" className="text-sm">
                Permitir Solicitudes Públicas
              </Label>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Permite que los clientes soliciten su factura mediante QR
              </p>
            </div>
            <Switch
              id="allowPublicInvoicing"
              data-testid="switch-allow-public"
              checked={config.allowPublicInvoicing}
              onCheckedChange={(checked) => setConfig({ ...config, allowPublicInvoicing: checked })}
              className="flex-shrink-0"
            />
          </div>
        </div>

        {config.csdUploaded && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">
              Certificados CSD cargados correctamente
            </span>
          </div>
        )}

        <Separator className="my-4" />

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            data-testid="button-save-config"
            className="min-h-[44px] w-full sm:w-auto"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
