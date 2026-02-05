"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  Plus, Globe, ExternalLink, Trash2, Edit2, Check, X, 
  Loader2, Building2, Eye, RefreshCw, Link2, CheckCircle2, AlertCircle, Clock,
  Copy, Settings, Sparkles, LayoutTemplate, ChevronLeft, ChevronRight, ChevronsUpDown,
  Monitor, Smartphone, Tablet, Layout, Palette, Type, Play, ImageIcon, Save, Dices, Wand2, PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

interface StructureConfig {
  layoutId?: string;
  paletteId?: string;
  typographyId?: string;
  animationId?: string;
  videoId?: string;
  imageId?: string;
}

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
  platformWindows?: boolean;
  platformWeb?: boolean;
  platformAndroid?: boolean;
  structureConfig?: StructureConfig | null;
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

interface BrandLayout {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  style_variant: string;
  mood: string;
  usage_count: number;
  sections: Record<string, unknown>[];
}

interface BrandColorPalette {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mood: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  text_secondary_color?: string;
  gradient_start: string | null;
  gradient_end: string | null;
  usage_count: number;
}

interface BrandTypographySet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  heading_font: string;
  body_font: string;
  accent_font: string | null;
  google_fonts_url: string | null;
  usage_count: number;
}

interface BrandAnimationSet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mood: string;
  entrance_animation: Record<string, unknown>;
  hover_animation: Record<string, unknown>;
  transition_duration: string;
  usage_count: number;
}

interface BrandVideoSet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  vertical_slug: string | null;
  videos: string[];
  thumbnail_urls: string[];
  mood: string;
  usage_count: number;
}

interface BrandImageSet {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  vertical_slug: string | null;
  hero_images: string[];
  product_images: string[];
  background_images: string[];
  mood: string;
  usage_count: number;
}

interface ElementIndices {
  layout: number;
  palette: number;
  typography: number;
  animation: number;
  video: number;
  image: number;
}

interface BrandCatalogs {
  layouts: BrandLayout[];
  palettes: BrandColorPalette[];
  typographies: BrandTypographySet[];
  animations: BrandAnimationSet[];
  videos: BrandVideoSet[];
  images: BrandImageSet[];
}

export default function MarcasBlancasPage() {
  const [brands, setBrands] = useState<WhiteLabelBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<WhiteLabelBrand | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
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

  // Brand structure state for Estructuras integration
  const [brandStructureIndices, setBrandStructureIndices] = useState<ElementIndices>({
    layout: 0, palette: 0, typography: 0, animation: 0, video: 0, image: 0
  });
  const [catalogs, setCatalogs] = useState<BrandCatalogs>({
    layouts: [], palettes: [], typographies: [], animations: [], videos: [], images: []
  });
  const [catalogsLoading, setCatalogsLoading] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);
  const [generatingElement, setGeneratingElement] = useState<string | null>(null);

  // Manual add dialog state
  const [manualAddType, setManualAddType] = useState<string | null>(null);
  const [manualAddData, setManualAddData] = useState<Record<string, unknown>>({});
  const [savingManualElement, setSavingManualElement] = useState(false);

  // Device preview toggle
  const [devicePreview, setDevicePreview] = useState<"desktop" | "tablet" | "mobile">("desktop");

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    domainType: "subdomain" as "subdomain" | "custom",
    subdomain: "",
    customDomain: "",
    primaryColor: "#3b82f6",
    logoUrl: "",
    platformWindows: true,
    platformWeb: true,
    platformAndroid: true,
  });

  const [dnsInstructions, setDnsInstructions] = useState<{
    type: string;
    name: string;
    value: string;
    ttl: number;
    fullDomain: string;
  } | null>(null);
  const [showDnsDialog, setShowDnsDialog] = useState(false);

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

  useEffect(() => {
    fetchBrands();
  }, []);

  // Fetch verticals when page loads
  const fetchVerticals = async () => {
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

  useEffect(() => {
    fetchVerticals();
  }, []);

  // Sync brands with verticals
  useEffect(() => {
    const syncBrandsWithVerticals = async () => {
      // Evitar bucles y esperar a que los datos estén cargados
      if (verticalsLoading || loading || verticals.length === 0) return;
      
      const missingVerticals = verticals.filter(v => 
        !brands.some(b => 
          (b.businessType && v.name && b.businessType.toLowerCase() === v.name.toLowerCase()) || 
          (b.name && v.display_name && b.name.toLowerCase() === v.display_name.toLowerCase())
        )
      );

      if (missingVerticals.length > 0) {
        console.log(`[MarcasBlancas] Sincronizando ${missingVerticals.length} marcas faltantes`);
        
        for (const v of missingVerticals) {
          if (!v.display_name || !v.name) continue;
          
          try {
            const subdomain = v.slug || v.name.toLowerCase().replace(/_/g, "-");
            const payload = {
              name: v.display_name,
              businessType: v.name,
              domain: `${subdomain}.negocio.international`,
              primaryColor: "#3b82f6",
              logoUrl: "",
              platformWindows: true,
              platformWeb: true,
              platformAndroid: true
            };

            const res = await fetch("/api/white-labels", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });

            if (res.ok) {
              console.log(`[MarcasBlancas] Marca creada para: ${v.display_name}`);
            }
          } catch (err) {
            console.error(`[MarcasBlancas] Error de sincronización ${v.name}:`, err);
          }
        }
        // Solo recargar marcas si hubo cambios
        fetchBrands();
      }
    };

    if (brands.length >= 0 && verticals.length > 0) {
      syncBrandsWithVerticals();
    }
  }, [brands.length, verticals.length, loading, verticalsLoading]);

  // Check for Figma template when business type changes
  useEffect(() => {
    const normalizedType = formData.businessType.trim().toLowerCase();
    const templateUrl = FIGMA_TEMPLATES[normalizedType];
    setSelectedFigmaTemplate(templateUrl || null);
  }, [formData.businessType]);

  // Fetch catalogs when brand is selected
  useEffect(() => {
    if (selectedBrand) {
      fetchCatalogs();
    }
  }, [selectedBrand?.id]);

  const fetchCatalogs = async () => {
    try {
      setCatalogsLoading(true);
      const response = await fetch("/api/brand-structures?type=all");
      if (response.ok) {
        const data = await response.json();
        const fetchedCatalogs = {
          layouts: data.layouts || [],
          palettes: data.palettes || [],
          typographies: data.typography || [],
          animations: data.animations || [],
          videos: data.videos || [],
          images: data.images || []
        };
        setCatalogs(fetchedCatalogs);
        
        // Hydrate indices from brand's structureConfig if available
        if (selectedBrand?.structureConfig) {
          const config = selectedBrand.structureConfig;
          const layoutIdx = config.layoutId ? fetchedCatalogs.layouts.findIndex((l: BrandLayout) => l.id === config.layoutId) : -1;
          const paletteIdx = config.paletteId ? fetchedCatalogs.palettes.findIndex((p: BrandColorPalette) => p.id === config.paletteId) : -1;
          const typoIdx = config.typographyId ? fetchedCatalogs.typographies.findIndex((t: BrandTypographySet) => t.id === config.typographyId) : -1;
          const animIdx = config.animationId ? fetchedCatalogs.animations.findIndex((a: BrandAnimationSet) => a.id === config.animationId) : -1;
          const videoIdx = config.videoId ? fetchedCatalogs.videos.findIndex((v: BrandVideoSet) => v.id === config.videoId) : -1;
          const imageIdx = config.imageId ? fetchedCatalogs.images.findIndex((i: BrandImageSet) => i.id === config.imageId) : -1;
          
          setBrandStructureIndices({
            layout: layoutIdx >= 0 ? layoutIdx : 0,
            palette: paletteIdx >= 0 ? paletteIdx : 0,
            typography: typoIdx >= 0 ? typoIdx : 0,
            animation: animIdx >= 0 ? animIdx : 0,
            video: videoIdx >= 0 ? videoIdx : 0,
            image: imageIdx >= 0 ? imageIdx : 0
          });
        } else {
          setBrandStructureIndices({ layout: 0, palette: 0, typography: 0, animation: 0, video: 0, image: 0 });
        }
      }
    } catch (error) {
      console.error("Error fetching catalogs:", error);
      toast.error("Error al cargar los catálogos");
    } finally {
      setCatalogsLoading(false);
    }
  };

  // Reset indices when selecting a different brand (sandbox behavior)
  const handleSelectBrand = (brand: WhiteLabelBrand) => {
    setSelectedBrand(brand);
    // Indices will be reset via the useEffect that watches selectedBrand?.id
  };

  const navigateElement = (elementType: keyof ElementIndices, direction: "prev" | "next") => {
    const arrays: Record<keyof ElementIndices, unknown[]> = {
      layout: catalogs.layouts,
      palette: catalogs.palettes,
      typography: catalogs.typographies,
      animation: catalogs.animations,
      video: catalogs.videos,
      image: catalogs.images
    };
    const arr = arrays[elementType];
    if (arr.length === 0) return;
    let newIndex = brandStructureIndices[elementType];
    if (direction === "prev") {
      newIndex = newIndex > 0 ? newIndex - 1 : arr.length - 1;
    } else {
      newIndex = newIndex < arr.length - 1 ? newIndex + 1 : 0;
    }
    setBrandStructureIndices(prev => ({ ...prev, [elementType]: newIndex }));
  };

  // AI Redesign - randomize all element indices
  const handleAIRedesign = () => {
    if (catalogs.layouts.length === 0) {
      toast.error("No hay catálogos disponibles");
      return;
    }
    setBrandStructureIndices({
      layout: Math.floor(Math.random() * catalogs.layouts.length),
      palette: catalogs.palettes.length > 0 ? Math.floor(Math.random() * catalogs.palettes.length) : 0,
      typography: catalogs.typographies.length > 0 ? Math.floor(Math.random() * catalogs.typographies.length) : 0,
      animation: catalogs.animations.length > 0 ? Math.floor(Math.random() * catalogs.animations.length) : 0,
      video: catalogs.videos.length > 0 ? Math.floor(Math.random() * catalogs.videos.length) : 0,
      image: catalogs.images.length > 0 ? Math.floor(Math.random() * catalogs.images.length) : 0,
    });
    toast.success("Nueva combinación generada");
  };

  const handleGenerateElement = async (elementType: "layout" | "palette" | "typography" | "animation" | "video" | "image") => {
    if (!selectedBrand) return;
    
    try {
      setGeneratingElement(elementType);
      
      const response = await fetch("/api/brand-structures/create-element", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: elementType,
          businessType: selectedBrand.businessType || "general"
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al generar elemento");
      }
      
      const data = await response.json();
      const newElement = data.element;
      
      const catalogKey = elementType === "typography" ? "typographies" : `${elementType}s` as keyof BrandCatalogs;
      const newIndex = catalogs[catalogKey].length;
      
      setCatalogs(prev => ({
        ...prev,
        [catalogKey]: [...prev[catalogKey], newElement]
      }));
      
      setBrandStructureIndices(prev => ({
        ...prev,
        [elementType]: newIndex
      }));
      
      toast.success(`Nuevo elemento creado: ${newElement.name}`);
    } catch (error) {
      console.error("Error generating element:", error);
      toast.error(error instanceof Error ? error.message : "Error al generar elemento");
    } finally {
      setGeneratingElement(null);
    }
  };

  const handleManualAddSubmit = async () => {
    if (!manualAddType || !manualAddData.name) {
      toast.error("El nombre es requerido");
      return;
    }

    try {
      setSavingManualElement(true);

      const response = await fetch("/api/brand-structures/create-element-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: manualAddType,
          data: manualAddData
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear elemento");
      }

      const data = await response.json();
      const newElement = data.element;

      const catalogKey = manualAddType === "typography" ? "typographies" : `${manualAddType}s` as keyof BrandCatalogs;
      const newIndex = catalogs[catalogKey].length;

      setCatalogs(prev => ({
        ...prev,
        [catalogKey]: [...prev[catalogKey], newElement]
      }));

      setBrandStructureIndices(prev => ({
        ...prev,
        [manualAddType]: newIndex
      }));

      toast.success(`Elemento creado: ${newElement.name}`);
      setManualAddType(null);
      setManualAddData({});
    } catch (error) {
      console.error("Error creating manual element:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear elemento");
    } finally {
      setSavingManualElement(false);
    }
  };

  const getManualAddDialogTitle = () => {
    switch (manualAddType) {
      case "layout": return "Agregar Estructura";
      case "palette": return "Agregar Paleta de Colores";
      case "typography": return "Agregar Tipografía";
      case "animation": return "Agregar Animación";
      case "image": return "Agregar Set de Imágenes";
      case "video": return "Agregar Set de Videos";
      default: return "Agregar Elemento";
    }
  };

  const currentLayout = catalogs.layouts[brandStructureIndices.layout];
  const currentPalette = catalogs.palettes[brandStructureIndices.palette];
  const currentTypo = catalogs.typographies[brandStructureIndices.typography];
  const currentAnim = catalogs.animations[brandStructureIndices.animation];
  const currentVideo = catalogs.videos[brandStructureIndices.video];
  const currentImage = catalogs.images[brandStructureIndices.image];
  const canShowStructurePreview = catalogs.layouts.length > 0 && currentLayout && currentPalette && currentTypo;

  const handleSaveStructure = async () => {
    if (!selectedBrand) return;
    try {
      setSavingStructure(true);
      
      const structureConfig: StructureConfig = {
        layoutId: currentLayout?.id,
        paletteId: currentPalette?.id,
        typographyId: currentTypo?.id,
        animationId: currentAnim?.id,
        videoId: currentVideo?.id,
        imageId: currentImage?.id,
      };
      
      const response = await fetch(`/api/white-labels/${selectedBrand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structureConfig }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al guardar estructura");
      }
      
      const data = await response.json();
      
      // Update the brand in the local state with the new structureConfig
      setBrands(prev => prev.map(b => 
        b.id === selectedBrand.id 
          ? { ...b, structureConfig: data.brand.structureConfig }
          : b
      ));
      setSelectedBrand(prev => prev ? { ...prev, structureConfig: data.brand.structureConfig } : null);
      
      toast.success("Estructura aplicada exitosamente");
    } catch (error) {
      console.error("Error saving structure:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar estructura");
    } finally {
      setSavingStructure(false);
    }
  };

  const getLayoutPreviewHtml = (layoutStyle: string, p: BrandColorPalette, t: BrandTypographySet, heroImage: string, productImages: string[], animDuration: string) => {
    const baseProducts = `
      <div class="products-grid">
        <div class="product-card">
          <img src="${productImages[0] || 'https://images.pexels.com/photos/1775043/pexels-photo-1775043.jpeg'}" alt="Producto 1" class="product-img">
          <div class="product-info"><div class="product-name">Producto Premium</div><div class="product-price">$99.00</div></div>
        </div>
        <div class="product-card">
          <img src="${productImages[1] || 'https://images.pexels.com/photos/1556679/pexels-photo-1556679.jpeg'}" alt="Producto 2" class="product-img">
          <div class="product-info"><div class="product-name">Producto Especial</div><div class="product-price">$149.00</div></div>
        </div>
        <div class="product-card">
          <img src="${productImages[2] || 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg'}" alt="Producto 3" class="product-img">
          <div class="product-info"><div class="product-name">Producto Artesanal</div><div class="product-price">$79.00</div></div>
        </div>
      </div>`;
    const features = `
      <div class="features">
        <div class="feature"><div class="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div><h3>Calidad Premium</h3><p>Los mejores ingredientes</p></div>
        <div class="feature"><div class="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg></div><h3>Hecho con Amor</h3><p>Dedicacion artesanal</p></div>
        <div class="feature"><div class="feature-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div><h3>Entrega Rapida</h3><p>A tu puerta en minutos</p></div>
      </div>`;
    switch (layoutStyle) {
      case "classic": case "split":
        return `<section class="hero hero-split"><div class="hero-text"><h1>${selectedBrand?.name || "Tu Marca"}</h1><p>Descubre nuestra seleccion premium</p><button class="btn-primary">Ver Menu</button></div><div class="hero-image" style="background-image: url('${heroImage}')"></div></section><section class="section section-alt"><h2>Nuestros Productos</h2>${baseProducts}</section><section class="section">${features}</section>`;
      case "cards": case "grid":
        return `<section class="hero hero-mini"><h1>${selectedBrand?.name || "Tu Marca"}</h1><p>Productos artesanales de calidad</p></section><section class="section"><h2>Catalogo</h2>${baseProducts}</section><section class="section section-alt">${features}</section>`;
      case "parallax": case "scroll":
        return `<section class="hero hero-parallax" style="background-image: url('${heroImage}')"><div class="hero-overlay"><h1>${selectedBrand?.name || "Tu Marca"}</h1><p>Una experiencia unica</p></div></section><section class="section">${baseProducts}</section><section class="section">${features}</section>`;
      case "video": case "cinematic":
        return `<section class="hero hero-video"><div class="video-placeholder" style="background-image: url('${heroImage}')"><div class="play-button"><svg width="48" height="48" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg></div></div><div class="hero-content"><h1>${selectedBrand?.name || "Tu Marca"}</h1><p>Mira nuestra historia</p><button class="btn-primary">Explorar</button></div></section><section class="section section-alt"><h2>Productos</h2>${baseProducts}</section>`;
      case "minimal": case "smooth":
        return `<section class="hero hero-minimal"><h1>${selectedBrand?.name || "Tu Marca"}</h1><div class="minimal-line"></div><p>Simplicidad y elegancia</p></section><section class="section">${baseProducts}</section><section class="section section-alt">${features}</section>`;
      default:
        return `<section class="hero"><div class="hero-bg" style="background-image: url('${heroImage}')"></div><div class="hero-content"><h1>Bienvenido a ${selectedBrand?.name || "Tu Marca"}</h1><p>Descubre nuestra seleccion premium de productos artesanales</p><button class="btn-primary">Ver Menu</button></div></section><section class="section section-alt"><h2>Nuestros Productos</h2>${baseProducts}</section><section class="section"><h2>Por Que Elegirnos</h2>${features}</section>`;
    }
  };

  const structurePreviewHtml = useMemo(() => {
    if (!canShowStructurePreview || !currentPalette || !currentTypo || !currentLayout) return "";
    const p = currentPalette;
    const t = currentTypo;
    const l = currentLayout;
    const img = currentImage;
    const a = currentAnim;
    const heroImage = img?.hero_images?.[0] || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg";
    const productImages = img?.product_images || [];
    const animDuration = a?.transition_duration || "0.3s";
    const fontsUrl = t.google_fonts_url || `https://fonts.googleapis.com/css2?family=${t.heading_font.replace(/ /g, '+')}:wght@400;600;700&family=${t.body_font.replace(/ /g, '+')}:wght@400;500&display=swap`;
    const layoutContent = getLayoutPreviewHtml(l.style_variant, p, t, heroImage, productImages, animDuration);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="${fontsUrl}" rel="stylesheet"><style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: '${t.body_font}', sans-serif; background: ${p.background_color}; color: ${p.text_color}; overflow-x: hidden; }
h1, h2, h3 { font-family: '${t.heading_font}', serif; }
.hero { min-height: 50vh; background: linear-gradient(135deg, ${p.gradient_start || p.primary_color}, ${p.gradient_end || p.secondary_color}); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; animation: fadeIn ${animDuration} ease-out; }
.hero-bg { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0.3; }
.hero-content { position: relative; z-index: 1; text-align: center; padding: 2rem; color: white; }
.hero h1 { font-size: clamp(1.5rem, 4vw, 2.5rem); margin-bottom: 0.5rem; text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
.hero p { font-size: clamp(0.8rem, 2vw, 1rem); opacity: 0.9; max-width: 400px; margin: 0 auto 1rem; }
.hero-split { display: grid; grid-template-columns: 1fr 1fr; min-height: 45vh; background: ${p.background_color}; }
.hero-split .hero-text { display: flex; flex-direction: column; justify-content: center; padding: 1.5rem; color: ${p.text_color}; }
.hero-split .hero-text h1 { text-shadow: none; color: ${p.primary_color}; }
.hero-split .hero-text p { color: ${p.text_color}; opacity: 0.8; }
.hero-split .hero-image { background-size: cover; background-position: center; }
.hero-mini { min-height: 25vh; text-align: center; padding: 2rem 1rem; }
.hero-parallax { min-height: 50vh; background-size: cover; background-position: center; background-attachment: fixed; }
.hero-overlay { background: rgba(0,0,0,0.5); height: 100%; min-height: 50vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; }
.hero-video { display: grid; grid-template-columns: 1.5fr 1fr; min-height: 40vh; background: ${p.surface_color}; }
.video-placeholder { background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; }
.play-button { width: 60px; height: 60px; background: ${p.primary_color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.hero-video .hero-content { padding: 1.5rem; display: flex; flex-direction: column; justify-content: center; color: ${p.text_color}; }
.hero-video .hero-content h1 { text-shadow: none; color: ${p.primary_color}; }
.hero-minimal { min-height: 35vh; background: ${p.background_color}; color: ${p.text_color}; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.minimal-line { width: 60px; height: 2px; background: ${p.primary_color}; margin: 0.75rem 0; }
.section { padding: 2rem 1rem; max-width: 1000px; margin: 0 auto; }
.section-alt { background: ${p.surface_color}; }
.section h2 { text-align: center; margin-bottom: 1.5rem; color: ${p.primary_color}; }
.products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
.product-card { background: ${p.surface_color}; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.product-img { width: 100%; height: 100px; object-fit: cover; }
.product-info { padding: 0.75rem; }
.product-name { font-weight: 600; font-size: 0.85rem; margin-bottom: 0.25rem; }
.product-price { color: ${p.primary_color}; font-weight: 700; }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.5rem; padding: 1.5rem 0; }
.feature { text-align: center; padding: 1rem; }
.feature-icon { width: 50px; height: 50px; background: ${p.primary_color}20; color: ${p.primary_color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.75rem; }
.feature h3 { font-size: 0.9rem; margin-bottom: 0.25rem; }
.feature p { font-size: 0.75rem; opacity: 0.7; }
.btn-primary { background: ${p.primary_color}; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 0.9rem; cursor: pointer; font-weight: 600; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style></head><body>${layoutContent}</body></html>`;
  }, [canShowStructurePreview, currentLayout, currentPalette, currentTypo, currentAnim, currentImage, selectedBrand?.name]);

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
        platformWindows: formData.platformWindows,
        platformWeb: formData.platformWeb,
        platformAndroid: formData.platformAndroid,
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
          platformWindows: formData.platformWindows,
          platformWeb: formData.platformWeb,
          platformAndroid: formData.platformAndroid,
        }),
      });

      if (response.ok) {
        toast.success("Los cambios han sido guardados.");
        setEditDialogOpen(false);
        fetchBrands();
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
      platformWindows: true,
      platformWeb: true,
      platformAndroid: true,
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
      platformWindows: brand.platformWindows !== false,
      platformWeb: brand.platformWeb !== false,
      platformAndroid: brand.platformAndroid !== false,
    });
    setEditDialogOpen(true);
  };

  const getPreviewUrl = (brand: WhiteLabelBrand) => {
    const slug = (brand.slug || "").split("-").slice(0, -1).join("-") || (brand.name || "brand").toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `/landing/${slug}`;
  };

  const getPosUrl = (brand: WhiteLabelBrand) => {
    return `/preview/${brand.id}`;
  };

  // Get preview width based on device
  const getPreviewWidth = () => {
    switch (devicePreview) {
      case "mobile": return "375px";
      case "tablet": return "768px";
      default: return "100%";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden" data-testid="marcas-blancas-page">
      {/* LEFT SIDEBAR - Brand List */}
      <div className="w-72 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Marcas Blancas
          </h2>
          <Button 
            onClick={() => { resetForm(); setCreateDialogOpen(true); }}
            className="w-full mt-3"
            data-testid="button-create-brand"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Marca
          </Button>
        </div>
        <ScrollArea className="flex-1">
          {brands.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay marcas creadas</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  onClick={() => handleSelectBrand(brand)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-all
                    ${selectedBrand?.id === brand.id 
                      ? "bg-accent border border-primary/20" 
                      : "hover-elevate border border-transparent"
                    }
                  `}
                  data-testid={`brand-item-${brand.id}`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: brand.primaryColor || "#3b82f6" }}
                    />
                    <span className="font-medium text-sm truncate flex-1">
                      {brand.name}
                    </span>
                    <Badge 
                      variant={brand.status === "active" ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {brand.status === "active" ? (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      ) : (
                        <Clock className="h-2.5 w-2.5" />
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {brand.domain}
                    </span>
                  </div>
                  {selectedBrand?.id === brand.id && (
                    <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2 text-[10px] flex-1"
                        onClick={(e) => { e.stopPropagation(); openEditDialog(brand); }}
                        data-testid="button-edit-brand"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2 text-[10px] flex-1"
                        onClick={(e) => { e.stopPropagation(); window.open(getPreviewUrl(brand), "_blank"); }}
                        data-testid="button-open-landing"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                      {brand.status === "pending" && brand.domain.endsWith(".negocio.international") && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-6 px-2 text-[10px] flex-1"
                          onClick={(e) => { e.stopPropagation(); showDnsForBrand(brand); }}
                          data-testid="button-dns-config"
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
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
      </div>

      {/* CENTER - Large Preview */}
      <div className="flex-1 flex flex-col bg-muted/30">
        <div className="p-3 border-b bg-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Vista Previa</span>
            {selectedBrand && (
              <Badge variant="outline" className="text-[10px]">
                {selectedBrand.name}
              </Badge>
            )}
          </div>
          <ToggleGroup 
            type="single" 
            value={devicePreview} 
            onValueChange={(value) => value && setDevicePreview(value as typeof devicePreview)}
            className="h-8"
            data-testid="toggle-device-preview"
          >
            <ToggleGroupItem value="desktop" className="h-8 px-3" data-testid="toggle-desktop">
              <Monitor className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="tablet" className="h-8 px-3" data-testid="toggle-tablet">
              <Tablet className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="mobile" className="h-8 px-3" data-testid="toggle-mobile">
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          {selectedBrand ? (
            catalogsLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : canShowStructurePreview ? (
              <div 
                className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300"
                style={{ 
                  width: getPreviewWidth(), 
                  height: devicePreview === "mobile" ? "667px" : devicePreview === "tablet" ? "100%" : "100%",
                  maxHeight: "100%"
                }}
              >
                <iframe
                  srcDoc={structurePreviewHtml}
                  className="w-full h-full border-0"
                  title="Structure Preview"
                  data-testid="iframe-structure-preview"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <Layout className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm">No hay estructuras disponibles</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-4" 
                  onClick={fetchCatalogs}
                  data-testid="btn-retry-catalogs"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Reintentar
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Building2 className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-sm">Selecciona una marca para ver la vista previa</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR - Controls */}
      <div className="w-80 border-l flex flex-col bg-card">
        <div className="p-4 border-b">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Laboratorio Visual
          </h3>
          {selectedBrand && (
            <p className="text-xs text-muted-foreground mt-1">
              Editando: {selectedBrand.name}
            </p>
          )}
        </div>
        
        {selectedBrand ? (
          <>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {catalogsLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mb-2" />
                    <p className="text-xs">Cargando catálogos...</p>
                  </div>
                ) : catalogs.layouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <Layout className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs text-center">No hay catálogos disponibles</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2" 
                      onClick={fetchCatalogs}
                      data-testid="btn-retry-catalogs-controls"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Reintentar
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Layout Control */}
                    {currentLayout && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-layout">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Layout className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-medium">Estructura</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("layout")}
                              disabled={generatingElement === "layout"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-layout"
                            >
                              {generatingElement === "layout" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("layout"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-layout"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("layout", "prev")} data-testid="nav-layout-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.layout + 1}/{catalogs.layouts.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("layout", "next")} data-testid="nav-layout-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentLayout.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{currentLayout.description}</p>
                      </div>
                    )}

                    {/* Palette Control */}
                    {currentPalette && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-palette">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Palette className="h-3.5 w-3.5 text-pink-500" />
                            <span className="text-xs font-medium">Paleta</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("palette")}
                              disabled={generatingElement === "palette"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-palette"
                            >
                              {generatingElement === "palette" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("palette"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-palette"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("palette", "prev")} data-testid="nav-palette-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.palette + 1}/{catalogs.palettes.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("palette", "next")} data-testid="nav-palette-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentPalette.name}</p>
                        <div className="flex gap-1 mt-2">
                          {[currentPalette.primary_color, currentPalette.secondary_color, currentPalette.accent_color, currentPalette.background_color, currentPalette.surface_color].map((c, i) => (
                            <div key={i} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Typography Control */}
                    {currentTypo && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-typography">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Type className="h-3.5 w-3.5 text-purple-500" />
                            <span className="text-xs font-medium">Tipografía</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("typography")}
                              disabled={generatingElement === "typography"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-typography"
                            >
                              {generatingElement === "typography" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("typography"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-typography"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("typography", "prev")} data-testid="nav-typography-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.typography + 1}/{catalogs.typographies.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("typography", "next")} data-testid="nav-typography-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentTypo.name}</p>
                        <p className="text-[10px] text-muted-foreground">{currentTypo.heading_font} / {currentTypo.body_font}</p>
                      </div>
                    )}

                    {/* Images Control */}
                    {currentImage && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-image">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <ImageIcon className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-xs font-medium">Imágenes</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("image")}
                              disabled={generatingElement === "image"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-image"
                            >
                              {generatingElement === "image" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("image"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-image"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("image", "prev")} data-testid="nav-image-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.image + 1}/{catalogs.images.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("image", "next")} data-testid="nav-image-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentImage.name}</p>
                        {currentImage.hero_images?.[0] && (
                          <div className="mt-2 aspect-video rounded overflow-hidden w-full">
                            <img src={currentImage.hero_images[0]} alt="Hero" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video Control */}
                    {currentVideo && catalogs.videos.length > 0 && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-video">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Play className="h-3.5 w-3.5 text-red-500" />
                            <span className="text-xs font-medium">Videos</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("video")}
                              disabled={generatingElement === "video"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-video"
                            >
                              {generatingElement === "video" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("video"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-video"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("video", "prev")} data-testid="nav-video-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.video + 1}/{catalogs.videos.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("video", "next")} data-testid="nav-video-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentVideo.name}</p>
                        {currentVideo.thumbnail_urls?.[0] && (
                          <div className="mt-2 aspect-video rounded overflow-hidden w-full">
                            <img src={currentVideo.thumbnail_urls[0]} alt="Video" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Animation Control */}
                    {currentAnim && (
                      <div className="p-3 rounded-lg border bg-card" data-testid="control-animation">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span className="text-xs font-medium">Animaciones</span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-primary" 
                              onClick={() => handleGenerateElement("animation")}
                              disabled={generatingElement === "animation"}
                              title="Generar nuevo con IA"
                              data-testid="btn-ai-generate-animation"
                            >
                              {generatingElement === "animation" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-5 w-5 text-muted-foreground" 
                              onClick={() => { setManualAddType("animation"); setManualAddData({}); }}
                              title="Agregar manualmente"
                              data-testid="btn-manual-add-animation"
                            >
                              <PenLine className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("animation", "prev")} data-testid="nav-animation-prev">
                              <ChevronLeft className="h-3 w-3" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground w-10 text-center">{brandStructureIndices.animation + 1}/{catalogs.animations.length}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => navigateElement("animation", "next")} data-testid="nav-animation-next">
                              <ChevronRight className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{currentAnim.name}</p>
                        <Badge variant="outline" className="text-[9px] mt-1">{currentAnim.mood}</Badge>
                      </div>
                    )}
                  </>
                )}
              </div>
            </ScrollArea>
            
            <div className="p-3 border-t space-y-2">
              <Button 
                onClick={handleAIRedesign}
                variant="outline"
                className="w-full"
                disabled={catalogsLoading || catalogs.layouts.length === 0}
                data-testid="button-ai-redesign"
              >
                <Dices className="h-4 w-4 mr-2" />
                IA Rediseñar
              </Button>
              <Button 
                onClick={handleSaveStructure}
                className="w-full"
                disabled={savingStructure || !canShowStructurePreview}
                data-testid="button-apply-structure"
              >
                {savingStructure ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Aplicar a la Marca
              </Button>
              <p className="text-[10px] text-center text-muted-foreground">
                Los cambios no se guardan hasta que presiones Aplicar
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground">
            <Sparkles className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm text-center">Selecciona una marca para personalizar su diseño</p>
          </div>
        )}
      </div>

      {/* Create Brand Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { setCreateDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 ? "Crear Nueva Marca Blanca" : "Elige un Estilo de Diseño"}
            </DialogTitle>
            <DialogDescription>
              {wizardStep === 1 
                ? "Configura los datos básicos de tu nueva marca" 
                : "La IA ha generado estos estilos basados en tu tipo de negocio"
              }
            </DialogDescription>
          </DialogHeader>

          {wizardStep === 1 ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Negocio <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Mi Negocio"
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
                                  data-testid="button-create-vertical"
                                >
                                  Crear: &quot;{formData.businessType}&quot;
                                </button>
                              )}
                            </CommandEmpty>
                            <CommandGroup heading="Giros existentes">
                              {verticals
                                .filter(v => (v.display_name || "").toLowerCase().includes((formData.businessType || "").toLowerCase()))
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
                  La IA usará esto para generar estilos de diseño adecuados
                </p>
              </div>

              {selectedFigmaTemplate && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="use-figma"
                      checked={useFigmaTemplate}
                      onCheckedChange={(checked) => setUseFigmaTemplate(checked === true)}
                      data-testid="checkbox-use-figma"
                    />
                    <Label htmlFor="use-figma" className="text-sm font-medium cursor-pointer">
                      Usar plantilla Figma pre-diseñada
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Tenemos una plantilla lista para {formData.businessType}
                  </p>
                </div>
              )}

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
                  <Label htmlFor="subdomain">Subdominio <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="subdomain"
                      value={formData.subdomain}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") 
                      }))}
                      placeholder="minegocio"
                      className="flex-1"
                      data-testid="input-subdomain"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      .negocio.international
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="customDomain">Dominio Personalizado <span className="text-destructive">*</span></Label>
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
                <Label>Plataformas</Label>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="platform-web"
                      checked={formData.platformWeb}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, platformWeb: checked === true }))}
                    />
                    <Label htmlFor="platform-web" className="text-sm cursor-pointer">Web</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="platform-windows"
                      checked={formData.platformWindows}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, platformWindows: checked === true }))}
                    />
                    <Label htmlFor="platform-windows" className="text-sm cursor-pointer">Windows</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="platform-android"
                      checked={formData.platformAndroid}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, platformAndroid: checked === true }))}
                    />
                    <Label htmlFor="platform-android" className="text-sm cursor-pointer">Android</Label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleHistoryBack}
                    disabled={historyIndex <= 0}
                    data-testid="button-history-back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Versión {historyIndex + 1} de {designHistory.length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleHistoryForward}
                    disabled={historyIndex >= designHistory.length - 1}
                    data-testid="button-history-forward"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRegeneratePreviews}
                  disabled={isRegenerating}
                  data-testid="button-regenerate-previews"
                >
                  {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Rediseñar
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stylePreviews.map((preview, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedStyle(preview)}
                    className={`
                      border rounded-lg overflow-hidden cursor-pointer transition-all
                      ${selectedStyle === preview ? "ring-2 ring-primary border-primary" : "hover-elevate"}
                    `}
                    data-testid={`style-preview-${index}`}
                  >
                    <div 
                      className="h-32 bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${preview.thumbnailImage})`,
                        backgroundColor: preview.colorPalette.primary 
                      }}
                    />
                    <div className="p-3">
                      <h4 className="font-medium text-sm">{preview.styleName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{preview.description}</p>
                      <div className="flex gap-1 mt-2">
                        {Object.values(preview.colorPalette).slice(0, 4).map((color, i) => (
                          <div key={i} className="w-5 h-5 rounded border" style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            {wizardStep === 2 && (
              <Button variant="outline" onClick={() => setWizardStep(1)} data-testid="button-wizard-back">
                Atrás
              </Button>
            )}
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
              Cancelar
            </Button>
            {wizardStep === 1 ? (
              useFigmaTemplate ? (
                <Button 
                  onClick={handleCreateBrand}
                  disabled={!formData.name.trim() || !formData.businessType.trim() || (formData.domainType === "subdomain" ? !formData.subdomain : !formData.customDomain) || isCreatingBrand}
                  data-testid="button-create-with-figma"
                >
                  {isCreatingBrand ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Crear con Figma
                </Button>
              ) : (
                <Button 
                  onClick={handleGeneratePreviews}
                  disabled={!formData.name.trim() || !formData.businessType.trim() || (formData.domainType === "subdomain" ? !formData.subdomain : !formData.customDomain) || isLoadingPreviews}
                  data-testid="button-generate-previews"
                >
                  {isLoadingPreviews ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Generar Estilos
                </Button>
              )
            ) : (
              <Button 
                onClick={handleCreateBrand}
                disabled={!selectedStyle || isCreatingBrand}
                data-testid="button-create-brand-final"
              >
                {isCreatingBrand ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Crear Marca
              </Button>
            )}
          </DialogFooter>
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
                              .filter(v => (v.display_name || "").toLowerCase().includes((formData.businessType || "").toLowerCase()))
                              .slice(0, 10)
                              .map((vertical) => (
                                <CommandItem
                                  key={vertical.id}
                                  value={vertical.display_name || ""}
                                  onSelect={() => {
                                    setFormData(prev => ({ ...prev, businessType: vertical.display_name || "" }));
                                    setEditBusinessTypeOpen(false);
                                  }}
                                  data-testid={`option-edit-vertical-${vertical.id}`}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${formData.businessType === vertical.display_name ? "opacity-100" : "opacity-0"}`} />
                                  {vertical.display_name || "Sin nombre"}
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

      {/* Manual Add Element Dialog */}
      <Dialog open={!!manualAddType} onOpenChange={(open) => { if (!open) { setManualAddType(null); setManualAddData({}); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PenLine className="h-5 w-5" />
              {getManualAddDialogTitle()}
            </DialogTitle>
            <DialogDescription>
              Crea un nuevo elemento manualmente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-name">Nombre <span className="text-destructive">*</span></Label>
              <Input
                id="manual-name"
                value={(manualAddData.name as string) || ""}
                onChange={(e) => setManualAddData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Mi elemento personalizado"
                data-testid="input-manual-name"
              />
            </div>

            {manualAddType === "layout" && (
              <>
                <div className="space-y-2">
                  <Label>Variante de estilo</Label>
                  <Select
                    value={(manualAddData.style_variant as string) || "minimal"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, style_variant: value }))}
                  >
                    <SelectTrigger data-testid="select-layout-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                      <SelectItem value="parallax">Parallax</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="editorial">Editorial</SelectItem>
                      <SelectItem value="magazine">Magazine</SelectItem>
                      <SelectItem value="storytelling">Storytelling</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={(manualAddData.mood as string) || "modern"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, mood: value }))}
                  >
                    <SelectTrigger data-testid="select-layout-mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="artisan">Artisan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {manualAddType === "palette" && (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primario</Label>
                    <Input
                      id="primary-color"
                      type="color"
                      value={(manualAddData.primary_color as string) || "#3b82f6"}
                      onChange={(e) => setManualAddData(prev => ({ ...prev, primary_color: e.target.value }))}
                      className="h-10 cursor-pointer"
                      data-testid="input-primary-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secundario</Label>
                    <Input
                      id="secondary-color"
                      type="color"
                      value={(manualAddData.secondary_color as string) || "#8b5cf6"}
                      onChange={(e) => setManualAddData(prev => ({ ...prev, secondary_color: e.target.value }))}
                      className="h-10 cursor-pointer"
                      data-testid="input-secondary-color"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Acento</Label>
                    <Input
                      id="accent-color"
                      type="color"
                      value={(manualAddData.accent_color as string) || "#22c55e"}
                      onChange={(e) => setManualAddData(prev => ({ ...prev, accent_color: e.target.value }))}
                      className="h-10 cursor-pointer"
                      data-testid="input-accent-color"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={(manualAddData.mood as string) || "modern"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, mood: value }))}
                  >
                    <SelectTrigger data-testid="select-palette-mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="cool">Cool</SelectItem>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                      <SelectItem value="muted">Muted</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {manualAddType === "typography" && (
              <>
                <div className="space-y-2">
                  <Label>Fuente de encabezados</Label>
                  <Select
                    value={(manualAddData.heading_font as string) || "Montserrat"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, heading_font: value }))}
                  >
                    <SelectTrigger data-testid="select-heading-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                      <SelectItem value="Oswald">Oswald</SelectItem>
                      <SelectItem value="Bebas Neue">Bebas Neue</SelectItem>
                      <SelectItem value="Lora">Lora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fuente de cuerpo</Label>
                  <Select
                    value={(manualAddData.body_font as string) || "Open Sans"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, body_font: value }))}
                  >
                    <SelectTrigger data-testid="select-body-font">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Source Sans Pro">Source Sans Pro</SelectItem>
                      <SelectItem value="Nunito">Nunito</SelectItem>
                      <SelectItem value="Lora">Lora</SelectItem>
                      <SelectItem value="Merriweather">Merriweather</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {manualAddType === "animation" && (
              <>
                <div className="space-y-2">
                  <Label>Animación de entrada</Label>
                  <Select
                    value={(manualAddData.entrance_animation as string) || "fade-in"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, entrance_animation: value }))}
                  >
                    <SelectTrigger data-testid="select-entrance-animation">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade-in">Fade In</SelectItem>
                      <SelectItem value="slide-up">Slide Up</SelectItem>
                      <SelectItem value="scale-in">Scale In</SelectItem>
                      <SelectItem value="bounce">Bounce</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transition-duration">Duración de transición</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="transition-duration"
                      type="number"
                      min="100"
                      max="2000"
                      step="100"
                      value={parseInt((manualAddData.transition_duration as string)?.replace("s", "") || "300", 10) * 1000 || 300}
                      onChange={(e) => setManualAddData(prev => ({ ...prev, transition_duration: `${parseInt(e.target.value) / 1000}s` }))}
                      className="flex-1"
                      data-testid="input-transition-duration"
                    />
                    <span className="text-sm text-muted-foreground">ms</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={(manualAddData.mood as string) || "smooth"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, mood: value }))}
                  >
                    <SelectTrigger data-testid="select-animation-mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subtle">Subtle</SelectItem>
                      <SelectItem value="dynamic">Dynamic</SelectItem>
                      <SelectItem value="playful">Playful</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {manualAddType === "image" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="hero-image-url">URL de imagen hero</Label>
                  <Input
                    id="hero-image-url"
                    type="url"
                    value={(manualAddData.hero_image_url as string) || ""}
                    onChange={(e) => setManualAddData(prev => ({ ...prev, hero_image_url: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    data-testid="input-hero-image-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={(manualAddData.mood as string) || "professional"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, mood: value }))}
                  >
                    <SelectTrigger data-testid="select-image-mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="urban">Urban</SelectItem>
                      <SelectItem value="luxury">Luxury</SelectItem>
                      <SelectItem value="warm">Warm</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                      <SelectItem value="vibrant">Vibrant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {manualAddType === "video" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="video-url">URL del video</Label>
                  <Input
                    id="video-url"
                    type="url"
                    value={(manualAddData.video_url as string) || ""}
                    onChange={(e) => setManualAddData(prev => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://example.com/video.mp4"
                    data-testid="input-video-url"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mood</Label>
                  <Select
                    value={(manualAddData.mood as string) || "cinematic"}
                    onValueChange={(value) => setManualAddData(prev => ({ ...prev, mood: value }))}
                  >
                    <SelectTrigger data-testid="select-video-mood">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cinematic">Cinematic</SelectItem>
                      <SelectItem value="dynamic">Dynamic</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="artistic">Artistic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setManualAddType(null); setManualAddData({}); }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleManualAddSubmit}
              disabled={!manualAddData.name || savingManualElement}
              data-testid="button-submit-manual-element"
            >
              {savingManualElement ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Crear Elemento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
