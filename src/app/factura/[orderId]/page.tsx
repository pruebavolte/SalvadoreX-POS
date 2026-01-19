"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Receipt,
  Loader2,
  AlertCircle,
  CheckCircle,
  FileText,
  Building2,
  Mail,
  MapPin,
} from "lucide-react";
import { CATALOGO_REGIMEN_FISCAL, CATALOGO_USO_CFDI } from "@/lib/facturama/types";

interface OrderInfo {
  id: string;
  total: number;
  currency: string;
}

interface BusinessInfo {
  name: string;
}

type PageStatus = "loading" | "available" | "already_invoiced" | "pending" | "not_available" | "error" | "submitted";

export default function PublicInvoiceRequestPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [status, setStatus] = useState<PageStatus>("loading");
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [token, setToken] = useState<string>("");
  const [existingInvoice, setExistingInvoice] = useState<{ uuid?: string; pdfUrl?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [formData, setFormData] = useState({
    rfc: "",
    nombre: "",
    regimenFiscal: "",
    usoCfdi: "",
    domicilioFiscalCp: "",
    email: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    checkInvoiceStatus();
  }, [orderId]);

  const checkInvoiceStatus = async () => {
    try {
      setStatus("loading");
      const res = await fetch(`/api/billing/request/${orderId}`);
      const data = await res.json();

      if (!res.ok) {
        setStatus("not_available");
        setErrorMessage(data.error || "No se puede solicitar factura para esta orden");
        return;
      }

      if (data.status === "already_invoiced") {
        setStatus("already_invoiced");
        setExistingInvoice(data.invoice);
        return;
      }

      if (data.status === "pending") {
        setStatus("pending");
        return;
      }

      setStatus("available");
      setOrder(data.order);
      setBusiness(data.business);
      setToken(data.token);
    } catch (error) {
      setStatus("error");
      setErrorMessage("Error al verificar el estado de la orden");
    }
  };

  const validateRFC = (rfc: string): boolean => {
    const rfcPattern = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
    return rfcPattern.test(rfc.toUpperCase());
  };

  const validateCP = (cp: string): boolean => {
    return /^\d{5}$/.test(cp);
  };

  const validateEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rfc.trim()) {
      newErrors.rfc = "RFC es requerido";
    } else if (!validateRFC(formData.rfc)) {
      newErrors.rfc = "Formato de RFC inválido";
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = "Razón Social / Nombre es requerido";
    }

    if (!formData.regimenFiscal) {
      newErrors.regimenFiscal = "Régimen Fiscal es requerido";
    }

    if (!formData.usoCfdi) {
      newErrors.usoCfdi = "Uso de CFDI es requerido";
    }

    if (!formData.domicilioFiscalCp.trim()) {
      newErrors.domicilioFiscalCp = "Código Postal es requerido";
    } else if (!validateCP(formData.domicilioFiscalCp)) {
      newErrors.domicilioFiscalCp = "Código Postal debe ser de 5 dígitos";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email es requerido";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Email inválido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/billing/request/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          token,
          receptor: {
            rfc: formData.rfc.toUpperCase(),
            nombre: formData.nombre,
            regimenFiscal: formData.regimenFiscal,
            usoCfdi: formData.usoCfdi,
            domicilioFiscalCp: formData.domicilioFiscalCp,
            email: formData.email,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al enviar la solicitud");
      }

      setSubmitSuccess(true);
      setStatus("submitted");
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : "Error al enviar la solicitud",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "MXN") => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(amount);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Verificando información de la orden...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "already_invoiced") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Factura Ya Emitida</h2>
            <p className="text-muted-foreground mb-4">
              Esta orden ya tiene una factura emitida.
            </p>
            {existingInvoice?.uuid && (
              <p className="text-sm text-muted-foreground mb-4 font-mono">
                UUID: {existingInvoice.uuid}
              </p>
            )}
            {existingInvoice?.pdfUrl && (
              <Button asChild>
                <a href={existingInvoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-2" />
                  Descargar PDF
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-yellow-600 dark:text-yellow-400 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Solicitud en Proceso</h2>
            <p className="text-muted-foreground">
              Ya existe una solicitud de factura en proceso para esta orden.
              Recibirás tu factura por correo electrónico pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "not_available" || status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Disponible</h2>
            <p className="text-muted-foreground">
              {errorMessage || "No se puede solicitar factura para esta orden en este momento."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "submitted" || submitSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-semibold mb-2">¡Solicitud Enviada!</h2>
            <p className="text-muted-foreground">
              Tu solicitud de factura ha sido recibida correctamente.
              Recibirás tu CFDI en el correo electrónico proporcionado.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Correo: <strong>{formData.email}</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center pb-2">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Receipt className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Solicitar Factura</CardTitle>
            <CardDescription className="text-sm">
              {business?.name && (
                <span className="font-medium text-foreground">{business.name}</span>
              )}
            </CardDescription>
          </CardHeader>
          
          {order && (
            <div className="px-6 pb-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground">Total de la orden</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(order.total, order.currency)}
                </p>
              </div>
            </div>
          )}

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rfc" className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  RFC <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="rfc"
                  data-testid="input-receptor-rfc"
                  value={formData.rfc}
                  onChange={(e) => {
                    setFormData({ ...formData, rfc: e.target.value.toUpperCase() });
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

              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-sm">
                  Razón Social / Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombre"
                  data-testid="input-receptor-nombre"
                  value={formData.nombre}
                  onChange={(e) => {
                    setFormData({ ...formData, nombre: e.target.value });
                    if (errors.nombre) setErrors({ ...errors, nombre: "" });
                  }}
                  placeholder="Nombre o razón social"
                  className={`min-h-[44px] ${errors.nombre ? "border-destructive" : ""}`}
                />
                {errors.nombre && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.nombre}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="regimenFiscal" className="text-sm">
                  Régimen Fiscal <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.regimenFiscal}
                  onValueChange={(value) => {
                    setFormData({ ...formData, regimenFiscal: value });
                    if (errors.regimenFiscal) setErrors({ ...errors, regimenFiscal: "" });
                  }}
                >
                  <SelectTrigger
                    id="regimenFiscal"
                    data-testid="select-receptor-regimen"
                    className={`min-h-[44px] ${errors.regimenFiscal ? "border-destructive" : ""}`}
                  >
                    <SelectValue placeholder="Seleccione régimen fiscal" />
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

              <div className="space-y-2">
                <Label htmlFor="usoCfdi" className="text-sm">
                  Uso de CFDI <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.usoCfdi}
                  onValueChange={(value) => {
                    setFormData({ ...formData, usoCfdi: value });
                    if (errors.usoCfdi) setErrors({ ...errors, usoCfdi: "" });
                  }}
                >
                  <SelectTrigger
                    id="usoCfdi"
                    data-testid="select-receptor-uso-cfdi"
                    className={`min-h-[44px] ${errors.usoCfdi ? "border-destructive" : ""}`}
                  >
                    <SelectValue placeholder="Seleccione uso de CFDI" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATALOGO_USO_CFDI.map((uso) => (
                      <SelectItem key={uso.value} value={uso.value}>
                        {uso.value} - {uso.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.usoCfdi && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.usoCfdi}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilioFiscalCp" className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Código Postal Fiscal <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="domicilioFiscalCp"
                  data-testid="input-receptor-cp"
                  value={formData.domicilioFiscalCp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setFormData({ ...formData, domicilioFiscalCp: value });
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

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Correo Electrónico <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="input-receptor-email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  placeholder="tu@email.com"
                  className={`min-h-[44px] ${errors.email ? "border-destructive" : ""}`}
                />
                {errors.email && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.email}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Recibirás tu factura en este correo
                </p>
              </div>

              {errors.submit && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {errors.submit}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full min-h-[48px]"
                disabled={submitting}
                data-testid="button-submit-invoice-request"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <Receipt className="h-4 w-4 mr-2" />
                    Solicitar Factura
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Los datos fiscales proporcionados se utilizarán únicamente para la emisión de tu CFDI.
        </p>
      </div>
    </div>
  );
}
