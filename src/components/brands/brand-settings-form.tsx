"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Save, Palette, Package, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useBrands, useVerticals } from "@/hooks/use-brands";
import { useUser } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

export function BrandSettingsForm() {
  const { user } = useUser();
  const userEmail = user?.emailAddresses[0]?.emailAddress;

  // Fetch user's brands and verticals
  const { brands, isLoading, updateBrand, createBrand, isUpdating, isCreating } = useBrands();
  const { verticals, isLoading: isLoadingVerticals } = useVerticals();

  // State for brand settings
  const [brandId, setBrandId] = useState<string>("");
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [verticalId, setVerticalId] = useState("");
  const [plan, setPlan] = useState<"free" | "pro" | "enterprise">("free");
  const [primaryColor, setPrimaryColor] = useState("#FF6B35");
  const [secondaryColor, setSecondaryColor] = useState("#004E89");
  const [logoUrl, setLogoUrl] = useState("");

  // Module states
  const [modules, setModules] = useState({
    pos: true,
    inventory: true,
    digital_menu: true,
    ingredients: true,
    voice_ordering: true,
    ai_features: true,
    analytics: true,
    loyalty_program: false,
    reports: true,
  });

  // Load brand data if exists
  useEffect(() => {
    if (brands && !Array.isArray(brands)) {
      // Single brand
      const brand = brands;
      setBrandId(brand.id);
      setBrandName(brand.name);
      setBrandSlug(brand.slug);
      setBrandDescription(brand.description || "");
      setVerticalId(brand.vertical_id || "");
      setPlan(brand.plan);
      setPrimaryColor(brand.branding?.primaryColor || "#FF6B35");
      setSecondaryColor(brand.branding?.secondaryColor || "#004E89");
      setLogoUrl(brand.branding?.logo || "");
      setModules((brand.enabled_modules as typeof modules) || modules);
    } else if (Array.isArray(brands) && brands.length > 0) {
      // Multiple brands - use first one or let user select
      const brand = brands[0];
      setBrandId(brand.id);
      setBrandName(brand.name);
      setBrandSlug(brand.slug);
      setBrandDescription(brand.description || "");
      setVerticalId(brand.vertical_id || "");
      setPlan(brand.plan);
      setPrimaryColor(brand.branding?.primaryColor || "#FF6B35");
      setSecondaryColor(brand.branding?.secondaryColor || "#004E89");
      setLogoUrl(brand.branding?.logo || "");
      setModules((brand.enabled_modules as typeof modules) || modules);
    }
  }, [brands]);

  const handleSaveBrand = async () => {
    try {
      const brandData = {
        name: brandName,
        slug: brandSlug,
        description: brandDescription,
        owner_email: userEmail || "",
        vertical_id: verticalId,
        plan,
        branding: {
          primaryColor,
          secondaryColor,
          logo: logoUrl,
        },
        enabled_modules: modules,
      };

      if (brandId) {
        // Update existing brand
        await updateBrand.mutateAsync({
          id: brandId,
          updates: brandData,
        });
      } else {
        // Create new brand
        await createBrand.mutateAsync(brandData);
      }
    } catch (error) {
      console.error("Error saving brand:", error);
    }
  };

  const toggleModule = (moduleName: string) => {
    setModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName as keyof typeof prev],
    }));
  };

  const getVerticalInfo = () => {
    if (!verticalId || isLoadingVerticals) return null;
    return verticals.find((v) => v.id === verticalId);
  };

  const selectedVertical = getVerticalInfo();

  if (isLoading || isLoadingVerticals) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Brand Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Información de la Marca
          </CardTitle>
          <CardDescription>
            Configure los datos básicos de su marca y negocio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brandName">Nombre de la Marca</Label>
              <Input
                id="brandName"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ej: Mi Restaurante POS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandSlug">Slug (URL amigable)</Label>
              <Input
                id="brandSlug"
                value={brandSlug}
                onChange={(e) => setBrandSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                placeholder="Ej: mi-restaurante-pos"
              />
              <p className="text-xs text-muted-foreground">
                Se usará en URLs: /brands/{brandSlug}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandDescription">Descripción</Label>
            <Textarea
              id="brandDescription"
              value={brandDescription}
              onChange={(e) => setBrandDescription(e.target.value)}
              placeholder="Describe brevemente tu negocio..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan">Plan</Label>
            <Select value={plan} onValueChange={(value: any) => setPlan(value)}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">
                  Free - Características básicas
                </SelectItem>
                <SelectItem value="pro">
                  Pro - Todas las características
                </SelectItem>
                <SelectItem value="enterprise">
                  Enterprise - Personalización completa
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Business Vertical */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Vertical del Negocio
          </CardTitle>
          <CardDescription>
            Seleccione el tipo de negocio para pre-configurar módulos y características
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vertical">Tipo de Negocio</Label>
            <Select value={verticalId} onValueChange={setVerticalId}>
              <SelectTrigger id="vertical">
                <SelectValue placeholder="Selecciona un tipo de negocio" />
              </SelectTrigger>
              <SelectContent>
                {verticals.map((vertical) => (
                  <SelectItem key={vertical.id} value={vertical.id}>
                    {vertical.display_name} - {vertical.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVertical && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <h4 className="font-semibold mb-2">{selectedVertical.display_name}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {selectedVertical.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedVertical.default_modules &&
                  Object.entries(selectedVertical.default_modules)
                    .filter(([_, enabled]) => enabled)
                    .map(([moduleName]) => (
                      <Badge key={moduleName} variant="secondary">
                        {moduleName.replace(/_/g, " ")}
                      </Badge>
                    ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Personalice los colores y logo de su marca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Color Primario</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#FF6B35"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Color Secundario</Label>
              <div className="flex gap-2">
                <Input
                  id="secondaryColor"
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#004E89"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">URL del Logo</Label>
            <Input
              id="logoUrl"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Sube tu logo a Supabase Storage u otro servicio y pega la URL aquí
            </p>
          </div>

          {logoUrl && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <p className="text-sm font-medium mb-2">Vista Previa del Logo:</p>
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-24 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}

          <div
            className="rounded-lg p-4"
            style={{
              background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
            }}
          >
            <p className="text-white font-semibold">Vista Previa de Colores</p>
            <p className="text-white/80 text-sm">
              Así se verán tus colores primario y secundario
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modules Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Módulos Habilitados
          </CardTitle>
          <CardDescription>
            Activa o desactiva funcionalidades según tu plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(modules).map(([moduleName, isEnabled]) => (
              <div key={moduleName} className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={moduleName} className="capitalize">
                    {moduleName.replace(/_/g, " ")}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {getModuleDescription(moduleName)}
                  </p>
                </div>
                <Switch
                  id={moduleName}
                  checked={isEnabled}
                  onCheckedChange={() => toggleModule(moduleName)}
                  disabled={moduleName === "pos" || moduleName === "inventory"} // Core modules
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            * Los módulos POS e Inventario son obligatorios y no se pueden desactivar
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSaveBrand}
          disabled={isUpdating || isCreating || !brandName || !brandSlug}
        >
          {(isUpdating || isCreating) && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          <Save className="h-4 w-4 mr-2" />
          {brandId ? "Guardar Cambios" : "Crear Marca"}
        </Button>
      </div>

      {!userEmail && (
        <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            ⚠️ No se pudo obtener tu email. Por favor inicia sesión nuevamente.
          </p>
        </div>
      )}
    </div>
  );
}

function getModuleDescription(moduleName: string): string {
  const descriptions: Record<string, string> = {
    pos: "Sistema de punto de venta para procesar ventas",
    inventory: "Gestión de inventario y stock de productos",
    digital_menu: "Menú digital público para clientes",
    ingredients: "Control de ingredientes y recetas",
    voice_ordering: "Órdenes por voz con IA",
    ai_features: "Digitalización de menús con IA",
    analytics: "Análisis y métricas de negocio",
    loyalty_program: "Programa de puntos y lealtad",
    reports: "Reportes avanzados de ventas",
  };

  return descriptions[moduleName] || "Funcionalidad adicional";
}
