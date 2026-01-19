"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Globe, ExternalLink, Trash2, Edit2, Check, X, 
  Loader2, Building2, Eye, RefreshCw, Link2, CheckCircle2, AlertCircle, Clock,
  Copy, Settings, Sparkles, LayoutTemplate, ChevronLeft, ChevronRight, ChevronsUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";

interface Vertical {
  id: string;
  name: string;
  display_name: string;
  slug: string;
}

const FIGMA_TEMPLATES: Record<string, string> = {
  "taquería": "https://love-lock-70139849.figma.site/?site=taqueria",
  "taqueria": "https://love-lock-70139849.figma.site/?site=taqueria",
};

interface WhiteLabelBrand {
  id: string;
  name: string;
  slug: string;
  type: string;
  domainType: "subdomain" | "custom";
  domain: string;
  primaryColor: string;
  logoUrl: string;
  businessType: string;
  status: "active" | "pending" | "inactive";
  designProvider?: "motiff" | "figma";
  createdAt: string;
}

interface DesignPreview {
  styleVariant: "modern" | "classic" | "luxury";
  styleName: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  thumbnailImage: string;
  layoutVariant: string;
}

export default function MarcasBlancasPage() {
  const [brands, setBrands] = useState<WhiteLabelBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<WhiteLabelBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [selectedDesignProvider, setSelectedDesignProvider] = useState<"motiff" | "figma">("motiff");
  const [redesigning, setRedesigning] = useState(false);
  const [previewView, setPreviewView] = useState<"landing" | "pos">("landing");
  
  // Wizard state for brand creation with style previews
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [stylePreviews, setStylePreviews] = useState<DesignPreview[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<DesignPreview | null>(null);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  
  // Design history state for browsing previous regenerations
  const [designHistory, setDesignHistory] = useState<DesignPreview[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Verticals/business type autocomplete state
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [verticalsLoading, setVerticalsLoading] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const [editBusinessTypeOpen, setEditBusinessTypeOpen] = useState(false);
  
  // Figma template state
  const [selectedFigmaTemplate, setSelectedFigmaTemplate] = useState<string | null>(null);
  const [useFigmaTemplate, setUseFigmaTemplate] = useState(false);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    domainType: "subdomain" as "subdomain" | "custom",
    subdomain: "",
    customDomain: "",
    primaryColor: "#3b82f6",
    logoUrl: "",
  });

  const [dnsInstructions, setDnsInstructions] = useState<{
    type: string;
    name: string;
    value: string;
    ttl: number;
    fullDomain: string;
  } | null>(null);
  const [showDnsDialog, setShowDnsDialog] = useState(false);

  // Fetch brands from API
  useEffect(() => {
    fetchBrands();
  }, []);

  // Fetch verticals when dialog opens
  const fetchVerticals = async () => {
    if (verticals.length > 0) return;
    try {
      setVerticalsLoading(true);
      const response = await fetch("/api/verticals");
      if (response.ok) {
        const data = await response.json();
        setVerticals(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching verticals:", error);
    } finally {
      setVerticalsLoading(false);
    }
  };

  // Check for Figma template when business type changes
  useEffect(() => {
    const normalizedType = formData.businessType.trim().toLowerCase();
    const templateUrl = FIGMA_TEMPLATES[normalizedType];
    setSelectedFigmaTemplate(templateUrl || null);
  }, [formData.businessType]);

  // Upsert vertical before creating brand if needed
  const ensureVerticalExists = async (businessType: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verticals/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: businessType.trim() }),
      });
      return response.ok;
    } catch (error) {
      console.error("Error upserting vertical:", error);
      return false;
    }
  };

  const fetchBrands = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/white-labels");
      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || []);
        if (data.brands?.length > 0 && !selectedBrand) {
          setSelectedBrand(data.brands[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching brands:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = async () => {
    if (!selectedStyle && !useFigmaTemplate) {
      toast.error("Por favor selecciona un estilo de diseño");
      return;
    }

    try {
      setIsCreatingBrand(true);
      
      // Ensure the vertical exists (upsert)
      await ensureVerticalExists(formData.businessType);
      
      const domain = formData.domainType === "subdomain" 
        ? `${formData.subdomain}.negocio.international`
        : formData.customDomain;

      // Build request body based on whether using Figma template or Motiff style
      const requestBody: Record<string, unknown> = {
        name: formData.name,
        businessType: formData.businessType.trim(),
        domain,
        domainType: formData.domainType,
        logoUrl: formData.logoUrl,
      };

      if (useFigmaTemplate && selectedFigmaTemplate) {
        // Using Figma template
        requestBody.designProvider = "figma";
        requestBody.figmaTemplateUrl = selectedFigmaTemplate;
        requestBody.primaryColor = formData.primaryColor || "#3b82f6";
      } else if (selectedStyle) {
        // Using Motiff style
        requestBody.designProvider = "motiff";
        requestBody.primaryColor = selectedStyle.colorPalette.primary;
        requestBody.selectedStyle = {
          styleVariant: selectedStyle.styleVariant,
          layoutVariant: selectedStyle.layoutVariant,
          colorPalette: selectedStyle.colorPalette,
        };
      }

      const response = await fetch("/api/white-labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.dns) {
          if (data.dns.success) {
            toast.success(data.dns.message || `${formData.name} ha sido creada exitosamente.`);
          } else if (formData.domainType === "subdomain") {
            toast.warning(`Marca creada, pero hubo un problema con el DNS: ${data.dns.error}`);
          } else {
            toast.success(`${formData.name} ha sido creada. Configura el DNS manualmente.`);
          }
        } else {
          toast.success(`${formData.name} ha sido creada exitosamente.`);
        }
        
        setCreateDialogOpen(false);
        resetForm();
        fetchBrands();
        if (data.brand) {
          setSelectedBrand(data.brand);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "No se pudo crear la marca blanca");
      }
    } catch (error) {
      toast.error("Error al crear la marca blanca");
    } finally {
      setIsCreatingBrand(false);
    }
  };

  const handleUpdateBrand = async () => {
    if (!selectedBrand) return;
    
    try {
      // Ensure the vertical exists (upsert)
      await ensureVerticalExists(formData.businessType);
      
      const domain = formData.domainType === "subdomain" 
        ? `${formData.subdomain}.negocio.international`
        : formData.customDomain;

      const response = await fetch(`/api/white-labels/${selectedBrand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          businessType: formData.businessType.trim(),
          domain,
          domainType: formData.domainType,
          primaryColor: formData.primaryColor,
          logoUrl: formData.logoUrl,
        }),
      });

      if (response.ok) {
        toast.success("Los cambios han sido guardados.");
        setEditDialogOpen(false);
        fetchBrands();
        setPreviewKey(prev => prev + 1);
      } else {
        const err = await response.json();
        toast.error(err.error || "No se pudo actualizar");
      }
    } catch (error) {
      toast.error("Error al actualizar");
    }
  };

  const handleDeleteBrand = async (brand: WhiteLabelBrand) => {
    if (!confirm(`¿Estás seguro de eliminar "${brand.name}"?`)) return;
    
    try {
      const response = await fetch(`/api/white-labels/${brand.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${brand.name} ha sido eliminada.`);
        if (selectedBrand?.id === brand.id) {
          setSelectedBrand(null);
        }
        fetchBrands();
      } else {
        toast.error("No se pudo eliminar la marca");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      businessType: "",
      domainType: "subdomain",
      subdomain: "",
      customDomain: "",
      primaryColor: "#3b82f6",
      logoUrl: "",
    });
    setWizardStep(1);
    setStylePreviews([]);
    setSelectedStyle(null);
    setIsLoadingPreviews(false);
    setIsCreatingBrand(false);
    setDesignHistory([]);
    setHistoryIndex(-1);
    setIsRegenerating(false);
    setBusinessTypeOpen(false);
    setEditBusinessTypeOpen(false);
    setSelectedFigmaTemplate(null);
    setUseFigmaTemplate(false);
  };

  const handleGeneratePreviews = async () => {
    if (!formData.businessType.trim()) {
      toast.error("Por favor ingresa el giro de negocio");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Por favor ingresa el nombre del negocio");
      return;
    }
    if (formData.domainType === "subdomain" && !formData.subdomain.trim()) {
      toast.error("Por favor ingresa el subdominio");
      return;
    }
    if (formData.domainType === "custom" && !formData.customDomain.trim()) {
      toast.error("Por favor ingresa el dominio personalizado");
      return;
    }

    try {
      setIsLoadingPreviews(true);
      const response = await fetch("/api/white-labels/preview-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessType: formData.businessType.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPreviews = data.previews || [];
        setStylePreviews(newPreviews);
        // Add to history if this is the first set
        setDesignHistory([newPreviews]);
        setHistoryIndex(0);
        setSelectedStyle(null);
        setWizardStep(2);
      } else {
        const error = await response.json();
        toast.error(error.error || "No se pudieron generar las vistas previas");
      }
    } catch (error) {
      toast.error("Error al generar vistas previas");
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  // Regenerate previews with new variations (Rediseñar)
  const handleRegeneratePreviews = async () => {
    try {
      setIsRegenerating(true);
      const response = await fetch("/api/white-labels/preview-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          businessType: formData.businessType.trim(),
          regenerate: true 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newPreviews = data.previews || [];
        setStylePreviews(newPreviews);
        // Add to history after current position (discard any "future" history)
        const newHistory = [...designHistory.slice(0, historyIndex + 1), newPreviews];
        setDesignHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setSelectedStyle(null);
        toast.success("Nuevos estilos generados");
      } else {
        const error = await response.json();
        toast.error(error.error || "No se pudieron regenerar los estilos");
      }
    } catch (error) {
      toast.error("Error al regenerar estilos");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Navigate to previous design in history
  const handleHistoryBack = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setStylePreviews(designHistory[newIndex]);
      setSelectedStyle(null);
    }
  };

  // Navigate to next design in history
  const handleHistoryForward = () => {
    if (historyIndex < designHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setStylePreviews(designHistory[newIndex]);
      setSelectedStyle(null);
    }
  };

  const fetchDnsInstructions = async (subdomain: string) => {
    try {
      const response = await fetch(`/api/dns-instructions?subdomain=${subdomain}`);
      if (response.ok) {
        const data = await response.json();
        setDnsInstructions(data);
        setShowDnsDialog(true);
      }
    } catch (error) {
      console.error("Error fetching DNS instructions:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  const showDnsForBrand = (brand: WhiteLabelBrand) => {
    const isSubdomain = brand.domain.endsWith(".negocio.international");
    if (isSubdomain) {
      const subdomain = brand.domain.replace(".negocio.international", "");
      fetchDnsInstructions(subdomain);
    }
  };

  const openEditDialog = (brand: WhiteLabelBrand) => {
    const isSubdomain = brand.domain.endsWith(".negocio.international");
    setFormData({
      name: brand.name,
      businessType: brand.businessType || "",
      domainType: isSubdomain ? "subdomain" : "custom",
      subdomain: isSubdomain ? brand.domain.replace(".negocio.international", "") : "",
      customDomain: isSubdomain ? "" : brand.domain,
      primaryColor: brand.primaryColor || "#3b82f6",
      logoUrl: brand.logoUrl || "",
    });
    setEditDialogOpen(true);
  };

  const getPreviewUrl = (brand: WhiteLabelBrand) => {
    // Generate landing page slug from brand name
    const slug = brand.slug.split("-").slice(0, -1).join("-") || brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `/landing/${slug}`;
  };

  const getPosUrl = (brand: WhiteLabelBrand) => {
    return `/preview/${brand.id}`;
  };

  // Update design provider when brand changes
  useEffect(() => {
    if (selectedBrand) {
      setSelectedDesignProvider(selectedBrand.designProvider || "motiff");
    }
  }, [selectedBrand]);

  const handleDesignProviderChange = async (provider: "motiff" | "figma") => {
    const previousProvider = selectedDesignProvider;
    setSelectedDesignProvider(provider);
    if (!selectedBrand) return;
    
    try {
      const response = await fetch(`/api/white-labels/${selectedBrand.id}/design-provider`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designProvider: provider }),
      });
      
      if (response.ok) {
        setSelectedBrand({ ...selectedBrand, designProvider: provider });
        setBrands(brands.map(b => b.id === selectedBrand.id ? { ...b, designProvider: provider } : b));
        toast.success(`Diseño cambiado a ${provider === "motiff" ? "Motiff" : "Figma"}`);
      } else {
        setSelectedDesignProvider(previousProvider);
        toast.error("No se pudo cambiar el proveedor de diseño");
      }
    } catch (error) {
      setSelectedDesignProvider(previousProvider);
      toast.error("Error al guardar la configuración");
    }
  };

  const handleRedesign = async () => {
    if (!selectedBrand) return;
    
    if (!selectedBrand.businessType) {
      toast.error("El giro de negocio es requerido para generar la landing page");
      return;
    }
    
    try {
      setRedesigning(true);
      toast.info("Generando nuevo diseño de landing page...");
      
      // First save the design provider preference
      await fetch(`/api/white-labels/${selectedBrand.id}/design-provider`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designProvider: selectedDesignProvider }),
      });
      
      // Then regenerate the landing page
      const response = await fetch("/api/landing-pages/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: selectedBrand.id,
          businessName: selectedBrand.name,
          businessType: selectedBrand.businessType,
          designProvider: selectedDesignProvider,
        }),
      });

      if (response.ok) {
        toast.success(`Landing page rediseñada exitosamente con ${selectedDesignProvider === "motiff" ? "Motiff" : "Figma"}`);
        setPreviewKey(prev => prev + 1);
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "No se pudo rediseñar la landing page");
      }
    } catch (error) {
      toast.error("Error de conexión al rediseñar");
    } finally {
      setRedesigning(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Left Panel - Brand List */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Marcas Blancas
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Gestiona tus negocios white-label
                </CardDescription>
              </div>
              <Button 
                size="sm" 
                onClick={() => { resetForm(); setCreateDialogOpen(true); }}
                data-testid="button-create-brand"
              >
                <Plus className="h-4 w-4 mr-1" />
                Nueva
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No hay marcas blancas</p>
                  <p className="text-xs mt-1">Crea tu primera marca</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      onClick={() => setSelectedBrand(brand)}
                      className={`
                        p-3 rounded-lg border cursor-pointer transition-all
                        ${selectedBrand?.id === brand.id 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border hover-elevate"
                        }
                      `}
                      data-testid={`brand-item-${brand.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: brand.primaryColor || "#3b82f6" }}
                            />
                            <span className="font-medium text-sm truncate">
                              {brand.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <span className="text-xs text-muted-foreground truncate">
                              {brand.domain}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant={brand.status === "active" ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {brand.status === "active" ? (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                DNS Activo
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <Clock className="h-2.5 w-2.5" />
                                Pendiente
                              </span>
                            )}
                          </Badge>
                        </div>
                      </div>
                      {selectedBrand?.id === brand.id && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs flex-1"
                            onClick={(e) => { e.stopPropagation(); openEditDialog(brand); }}
                            data-testid="button-edit-brand"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          {brand.status === "pending" && brand.domain.endsWith(".negocio.international") && (
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 text-xs flex-1"
                              onClick={(e) => { e.stopPropagation(); showDnsForBrand(brand); }}
                              data-testid="button-dns-config"
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              DNS
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs flex-1"
                            onClick={(e) => { e.stopPropagation(); window.open(getPosUrl(brand), "_blank"); }}
                            data-testid="button-open-pos"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            POS
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs flex-1"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              window.open(getPreviewUrl(brand), "_blank"); 
                            }}
                            data-testid="button-open-landing"
                          >
                            <LayoutTemplate className="h-3 w-3 mr-1" />
                            Landing
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={(e) => { e.stopPropagation(); handleDeleteBrand(brand); }}
                            data-testid="button-delete-brand"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Preview */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0 pb-3 border-b">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa
                {selectedBrand && (
                  <span className="text-muted-foreground font-normal">
                    — {selectedBrand.name}
                  </span>
                )}
              </CardTitle>
              {selectedBrand && (
                <div className="flex items-center gap-2 mt-1">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{selectedBrand.domain}</span>
                </div>
              )}
            </div>
            {selectedBrand && (
              <div className="flex items-center gap-2">
                <ToggleGroup 
                  type="single" 
                  value={previewView} 
                  onValueChange={(value) => value && setPreviewView(value as "landing" | "pos")}
                  className="h-8"
                  data-testid="toggle-preview-view"
                >
                  <ToggleGroupItem value="landing" className="h-8 px-3 text-xs" data-testid="toggle-landing">
                    <LayoutTemplate className="h-3.5 w-3.5 mr-1" />
                    Landing
                  </ToggleGroupItem>
                  <ToggleGroupItem value="pos" className="h-8 px-3 text-xs" data-testid="toggle-pos">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    POS
                  </ToggleGroupItem>
                </ToggleGroup>
                <Select 
                  value={selectedDesignProvider} 
                  onValueChange={(value: "motiff" | "figma") => handleDesignProviderChange(value)}
                >
                  <SelectTrigger className="w-[130px] h-8" data-testid="select-design-provider">
                    <SelectValue placeholder="Diseño" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motiff">Motiff</SelectItem>
                    <SelectItem value="figma">Figma</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={handleRedesign}
                  disabled={redesigning}
                  data-testid="button-redesign-landing"
                  title="Regenerar landing page con nuevo diseño"
                >
                  {redesigning ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Re-diseñar
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setPreviewKey(prev => prev + 1)}
                  data-testid="button-refresh-preview"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Recargar
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(previewView === "landing" ? getPreviewUrl(selectedBrand) : getPosUrl(selectedBrand), "_blank")}
                  data-testid="button-fullscreen-preview"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Pantalla Completa
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {selectedBrand ? (
            <iframe
              key={`${selectedBrand.id}-${previewKey}-${previewView}`}
              src={previewView === "landing" ? getPreviewUrl(selectedBrand) : getPosUrl(selectedBrand)}
              className="w-full h-full border-0"
              title={`Preview of ${selectedBrand.name}`}
              data-testid="iframe-preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <Eye className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Selecciona una marca blanca para ver la vista previa</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Brand Dialog - 2-Step Wizard */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { 
        setCreateDialogOpen(open); 
        if (!open) resetForm(); 
      }}>
        <DialogContent className={wizardStep === 2 ? "sm:max-w-4xl" : "sm:max-w-md"}>
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 ? "Nueva Marca Blanca" : "Selecciona un Estilo de Diseño"}
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 
                ? "Paso 1 de 2: Ingresa los datos de tu negocio" 
                : "Paso 2 de 2: Elige el estilo visual para tu landing page"
              }
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 ? (
            <>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Negocio</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Mi Barbería Express"
                    data-testid="input-brand-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Giro de Negocio <span className="text-destructive">*</span></Label>
                  <Popover open={businessTypeOpen} onOpenChange={(open) => { setBusinessTypeOpen(open); if (open) fetchVerticals(); }}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={businessTypeOpen}
                        className="w-full justify-between font-normal"
                        data-testid="combobox-business-type"
                      >
                        {formData.businessType || "Selecciona o escribe un giro..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Buscar o crear giro..." 
                          value={formData.businessType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                          data-testid="input-business-type-search"
                        />
                        <CommandList>
                          {verticalsLoading ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>
                                {formData.businessType.trim() && (
                                  <button
                                    className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                                    onClick={() => { setBusinessTypeOpen(false); }}
                                    data-testid="button-create-new-vertical"
                                  >
                                    Crear: &quot;{formData.businessType}&quot;
                                  </button>
                                )}
                              </CommandEmpty>
                              <CommandGroup heading="Giros existentes">
                                {verticals
                                  .filter(v => v.display_name.toLowerCase().includes(formData.businessType.toLowerCase()))
                                  .slice(0, 10)
                                  .map((vertical) => (
                                    <CommandItem
                                      key={vertical.id}
                                      value={vertical.display_name}
                                      onSelect={() => {
                                        setFormData(prev => ({ ...prev, businessType: vertical.display_name }));
                                        setBusinessTypeOpen(false);
                                      }}
                                      data-testid={`option-vertical-${vertical.id}`}
                                    >
                                      <Check className={`mr-2 h-4 w-4 ${formData.businessType === vertical.display_name ? "opacity-100" : "opacity-0"}`} />
                                      {vertical.display_name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Obligatorio. Define el tipo de negocio para generar estilos personalizados
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Tipo de Dominio</Label>
                  <Select
                    value={formData.domainType}
                    onValueChange={(value: "subdomain" | "custom") => 
                      setFormData(prev => ({ ...prev, domainType: value }))
                    }
                  >
                    <SelectTrigger data-testid="select-domain-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subdomain">Subdominio de negocio.international</SelectItem>
                      <SelectItem value="custom">Dominio personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.domainType === "subdomain" ? (
                  <div className="space-y-2">
                    <Label htmlFor="subdomain">Subdominio</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="subdomain"
                        value={formData.subdomain}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") 
                        }))}
                        placeholder="farmacias"
                        className="flex-1"
                        data-testid="input-subdomain"
                      />
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        .negocio.international
                      </span>
                    </div>
                    {formData.subdomain && (
                      <p className="text-xs text-muted-foreground">
                        URL: https://{formData.subdomain}.negocio.international
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">Dominio Personalizado</Label>
                    <Input
                      id="customDomain"
                      value={formData.customDomain}
                      onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                      placeholder="www.minegocio.com"
                      data-testid="input-custom-domain"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">URL del Logo (opcional)</Label>
                  <Input
                    id="logoUrl"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://example.com/logo.png"
                    data-testid="input-logo-url"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleGeneratePreviews}
                  disabled={!formData.name.trim() || !formData.businessType.trim() || (formData.domainType === "subdomain" ? !formData.subdomain : !formData.customDomain) || isLoadingPreviews}
                  data-testid="button-ver-estilos"
                >
                  {isLoadingPreviews ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Ver Estilos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="py-4">
                {/* Figma Template Preview Section */}
                {selectedFigmaTemplate && (
                  <div className="mb-6 space-y-3" data-testid="section-figma-preview">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Vista Previa de Plantilla Figma</h3>
                      {useFigmaTemplate && (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Seleccionada
                        </Badge>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        src={selectedFigmaTemplate}
                        className="w-full h-[300px] border-0"
                        title="Figma Template Preview"
                        data-testid="iframe-figma-template"
                      />
                    </div>
                    <Button
                      onClick={() => {
                        setUseFigmaTemplate(!useFigmaTemplate);
                        if (!useFigmaTemplate) {
                          setSelectedStyle(null);
                        }
                      }}
                      variant={useFigmaTemplate ? "default" : "outline"}
                      className="w-full"
                      data-testid="button-use-figma-template"
                    >
                      {useFigmaTemplate ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Plantilla Seleccionada
                        </>
                      ) : (
                        "Usar Esta Plantilla"
                      )}
                    </Button>
                  </div>
                )}

                {/* Redesign controls with history navigation */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleHistoryBack}
                      disabled={historyIndex <= 0 || isRegenerating}
                      data-testid="button-history-back"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                      {historyIndex + 1} / {designHistory.length}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleHistoryForward}
                      disabled={historyIndex >= designHistory.length - 1 || isRegenerating}
                      data-testid="button-history-forward"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={handleRegeneratePreviews}
                    disabled={isRegenerating}
                    data-testid="button-redesign"
                  >
                    {isRegenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Rediseñar
                      </>
                    )}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stylePreviews.map((preview) => (
                    <div
                      key={preview.styleVariant}
                      onClick={() => setSelectedStyle(preview)}
                      className={`
                        relative rounded-lg border-2 cursor-pointer transition-all overflow-hidden
                        ${selectedStyle?.styleVariant === preview.styleVariant 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border hover-elevate"
                        }
                      `}
                      data-testid={`card-style-${preview.styleVariant}`}
                    >
                      {selectedStyle?.styleVariant === preview.styleVariant && (
                        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="h-4 w-4" />
                        </div>
                      )}
                      <div 
                        className="h-32 bg-cover bg-center relative"
                        style={{ backgroundImage: `url(${preview.thumbnailImage})` }}
                      >
                        <div 
                          className="absolute inset-0 flex flex-col justify-end p-3"
                          style={{ 
                            background: `linear-gradient(to top, ${preview.colorPalette.background}ee, transparent)` 
                          }}
                        >
                          <h4 
                            className="font-semibold text-sm truncate"
                            style={{ color: preview.colorPalette.text }}
                          >
                            {preview.heroTitle}
                          </h4>
                          <p 
                            className="text-xs truncate opacity-80"
                            style={{ color: preview.colorPalette.text }}
                          >
                            {preview.heroSubtitle}
                          </p>
                        </div>
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{preview.styleName}</span>
                          <div className="flex gap-1">
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: preview.colorPalette.primary }}
                              title="Color primario"
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: preview.colorPalette.secondary }}
                              title="Color secundario"
                            />
                            <div 
                              className="w-4 h-4 rounded-full border"
                              style={{ backgroundColor: preview.colorPalette.accent }}
                              title="Color de acento"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {preview.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setWizardStep(1)}>
                  Atrás
                </Button>
                <Button 
                  onClick={handleCreateBrand}
                  disabled={(!selectedStyle && !useFigmaTemplate) || isCreatingBrand}
                  data-testid="button-crear-marca"
                >
                  {isCreatingBrand ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    "Crear Marca"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Marca Blanca</DialogTitle>
            <DialogDescription>
              Modifica la configuración de {selectedBrand?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del Negocio</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Mi Negocio"
                data-testid="input-edit-name"
              />
            </div>

            <div className="space-y-2">
              <Label>Giro de Negocio <span className="text-destructive">*</span></Label>
              <Popover open={editBusinessTypeOpen} onOpenChange={(open) => { setEditBusinessTypeOpen(open); if (open) fetchVerticals(); }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editBusinessTypeOpen}
                    className="w-full justify-between font-normal"
                    data-testid="combobox-edit-business-type"
                  >
                    {formData.businessType || "Selecciona o escribe un giro..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar o crear giro..." 
                      value={formData.businessType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                      data-testid="input-edit-business-type-search"
                    />
                    <CommandList>
                      {verticalsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          <CommandEmpty>
                            {formData.businessType.trim() && (
                              <button
                                className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                                onClick={() => { setEditBusinessTypeOpen(false); }}
                                data-testid="button-create-edit-vertical"
                              >
                                Crear: &quot;{formData.businessType}&quot;
                              </button>
                            )}
                          </CommandEmpty>
                          <CommandGroup heading="Giros existentes">
                            {verticals
                              .filter(v => v.display_name.toLowerCase().includes(formData.businessType.toLowerCase()))
                              .slice(0, 10)
                              .map((vertical) => (
                                <CommandItem
                                  key={vertical.id}
                                  value={vertical.display_name}
                                  onSelect={() => {
                                    setFormData(prev => ({ ...prev, businessType: vertical.display_name }));
                                    setEditBusinessTypeOpen(false);
                                  }}
                                  data-testid={`option-edit-vertical-${vertical.id}`}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.businessType === vertical.display_name ? "opacity-100" : "opacity-0"}`} />
                                  {vertical.display_name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Obligatorio. Modifica el giro para regenerar la landing page
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Tipo de Dominio</Label>
              <Select
                value={formData.domainType}
                onValueChange={(value: "subdomain" | "custom") => 
                  setFormData(prev => ({ ...prev, domainType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subdomain">Subdominio de negocio.international</SelectItem>
                  <SelectItem value="custom">Dominio personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.domainType === "subdomain" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-subdomain">Subdominio</Label>
                <div className="flex gap-2 items-center">
                  <Input
                    id="edit-subdomain"
                    value={formData.subdomain}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") 
                    }))}
                    placeholder="farmacias"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    .negocio.international
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-customDomain">Dominio Personalizado</Label>
                <Input
                  id="edit-customDomain"
                  value={formData.customDomain}
                  onChange={(e) => setFormData(prev => ({ ...prev, customDomain: e.target.value }))}
                  placeholder="www.minegocio.com"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-primaryColor">Color Principal</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  id="edit-primaryColor"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-9 p-1 cursor-pointer"
                />
                <Input
                  value={formData.primaryColor}
                  onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-logoUrl">URL del Logo (opcional)</Label>
              <Input
                id="edit-logoUrl"
                value={formData.logoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, logoUrl: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateBrand}
              disabled={!formData.name.trim() || !formData.businessType.trim() || (formData.domainType === "subdomain" ? !formData.subdomain : !formData.customDomain)}
              data-testid="button-submit-edit"
            >
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DNS Instructions Dialog */}
      <Dialog open={showDnsDialog} onOpenChange={setShowDnsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración DNS Manual
            </DialogTitle>
            <DialogDescription>
              Crea este registro CNAME en tu panel de GoDaddy para activar el subdominio
            </DialogDescription>
          </DialogHeader>
          {dnsInstructions && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tipo de registro:</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{dnsInstructions.type}</Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Nombre/Host:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-sm font-mono">
                      {dnsInstructions.name}
                    </code>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(dnsInstructions.name)}
                      data-testid="button-copy-name"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Valor/Apunta a:</span>
                  <div className="flex items-center gap-2">
                    <code className="bg-background px-2 py-1 rounded text-xs font-mono max-w-[200px] truncate" title={dnsInstructions.value}>
                      {dnsInstructions.value}
                    </code>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(dnsInstructions.value)}
                      data-testid="button-copy-value"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">TTL:</span>
                  <span className="text-sm">{dnsInstructions.ttl} segundos</span>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Pasos en GoDaddy:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Inicia sesión en tu cuenta de GoDaddy</li>
                  <li>Ve a <strong>Mis productos</strong> → <strong>DNS</strong></li>
                  <li>Haz clic en <strong>Agregar registro</strong></li>
                  <li>Selecciona tipo <strong>CNAME</strong></li>
                  <li>Copia los valores de arriba</li>
                  <li>Guarda el registro</li>
                </ol>
              </div>

              <div className="text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3 inline mr-1" />
                Los cambios de DNS pueden tardar hasta 48 horas en propagarse, aunque normalmente son más rápidos.
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDnsDialog(false)}>
              Cerrar
            </Button>
            <Button 
              onClick={() => window.open("https://dcc.godaddy.com/manage/negocio.international/dns", "_blank")}
              data-testid="button-open-godaddy"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir GoDaddy DNS
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
