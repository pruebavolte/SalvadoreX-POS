"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Star,
  Crown,
  Sparkles,
  Package,
  Users,
  Calendar,
  CreditCard,
  BarChart3,
  FolderTree,
  Settings2,
  Layers,
  Save,
  Loader2,
  CheckSquare,
  Square,
  MinusSquare,
  ShoppingBag,
  Box,
  PackageOpen,
  Trash2,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface VerticalCategory {
  id: string;
  name: string;
  display_name: string;
  display_name_en?: string;
  icon?: string;
  sort_order: number;
  verticals?: Vertical[];
}

interface Vertical {
  id: string;
  name: string;
  slug?: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  icon?: string;
  category_id?: string;
  suggested_system_name?: string;
  suggested_domain_prefix?: string;
  popularity_score: number;
  sort_order: number;
  active: boolean;
}

interface VerticalTerminology {
  customer_singular: string;
  customer_plural: string;
  product_singular: string;
  product_plural: string;
  order_singular: string;
  order_plural: string;
  staff_singular: string;
  staff_plural: string;
  appointment_singular: string;
  appointment_plural: string;
}

interface VerticalModuleConfig {
  id: string;
  module_id: string;
  enabled_by_default: boolean;
  is_required: boolean;
  is_recommended: boolean;
  module?: SystemModule;
}

interface SystemModule {
  id: string;
  key: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  icon?: string;
  category: string;
  is_premium: boolean;
  is_ai_feature: boolean;
}

interface VerticalDetail extends Vertical {
  terminology?: VerticalTerminology;
  module_configs?: VerticalModuleConfig[];
  features?: Array<{
    feature_key: string;
    feature_name: string;
    enabled_by_default: boolean;
    is_premium: boolean;
  }>;
}

interface TemplateProduct {
  id: string;
  vertical_id: string;
  source_product_id?: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  category_name?: string;
  product_type: string;
  suggested_price: number;
  suggested_cost: number;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

type CatalogCategory = "products" | "articles" | "packages";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Store: Store,
  Package: Package,
  Users: Users,
  Calendar: Calendar,
  CreditCard: CreditCard,
  BarChart3: BarChart3,
  FolderTree: FolderTree,
  Star: Star,
  Crown: Crown,
  Sparkles: Sparkles,
  Settings2: Settings2,
  Layers: Layers,
};

const DynamicIcon = ({ name, className }: { name?: string; className?: string }) => {
  const IconComponent = name ? iconMap[name] : Store;
  return IconComponent ? <IconComponent className={className} /> : <Store className={className} />;
};

const MODULE_CATEGORIES = ["core", "sales", "operations", "marketing", "ai", "integrations", "compliance"] as const;

export default function VerticalsAdminPage() {
  const [language] = useState<"es" | "en">("es");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedVertical, setExpandedVertical] = useState<string | null>(null);
  const [expandedModuleCategories, setExpandedModuleCategories] = useState<Set<string>>(new Set(MODULE_CATEGORIES));
  const [selectedModules, setSelectedModules] = useState<Record<string, Set<string>>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("all");
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({});
  const [expandedCatalogSection, setExpandedCatalogSection] = useState(false);
  const [expandedCatalogCategories, setExpandedCatalogCategories] = useState<Set<CatalogCategory>>(new Set(["products", "articles", "packages"]));
  
  const queryClient = useQueryClient();

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/verticals/categories", { includeVerticals: true }],
    queryFn: async () => {
      const res = await fetch("/api/verticals/categories?includeVerticals=true");
      const json = await res.json();
      return json.data as VerticalCategory[];
    },
  });

  const { data: allVerticals, isLoading: verticalsLoading } = useQuery({
    queryKey: ["/api/verticals"],
    queryFn: async () => {
      const res = await fetch("/api/verticals");
      const json = await res.json();
      return json.data as Vertical[];
    },
  });

  const { data: modulesData } = useQuery({
    queryKey: ["/api/verticals/modules"],
    queryFn: async () => {
      const res = await fetch("/api/verticals/modules");
      const json = await res.json();
      return json.data as SystemModule[];
    },
  });

  const { data: verticalDetail, isLoading: detailLoading, isFetching: detailFetching, dataUpdatedAt } = useQuery({
    queryKey: ["/api/verticals", expandedVertical],
    queryFn: async () => {
      if (!expandedVertical) return null;
      const res = await fetch(`/api/verticals?id=${expandedVertical}&details=true`);
      const json = await res.json();
      return json.data as VerticalDetail;
    },
    enabled: !!expandedVertical,
  });

  const { data: templateProducts, isLoading: templateProductsLoading } = useQuery({
    queryKey: ["/api/admin/template-products", expandedVertical],
    queryFn: async () => {
      if (!expandedVertical) return [];
      const res = await fetch(`/api/admin/template-products?verticalId=${expandedVertical}`);
      const json = await res.json();
      return json.templateProducts as TemplateProduct[];
    },
    enabled: !!expandedVertical,
  });

  // Track last sync timestamp to avoid re-syncing with stale data
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<Record<string, number>>({});

  // Synchronize selected modules with server data when vertical detail is loaded
  useEffect(() => {
    if (verticalDetail?.module_configs && expandedVertical && !detailFetching) {
      // Skip sync if:
      // 1. There are unsaved changes
      // 2. We already synced with this data (same dataUpdatedAt)
      // 3. Query is currently fetching (stale data)
      const alreadySynced = lastSyncTimestamp[expandedVertical] === dataUpdatedAt;
      if (hasChanges[expandedVertical] || alreadySynced) {
        return;
      }

      const serverModuleIds = new Set(
        verticalDetail.module_configs.map(mc => mc.module_id)
      );
      
      setSelectedModules(prev => ({ ...prev, [expandedVertical]: serverModuleIds }));
      setLastSyncTimestamp(prev => ({ ...prev, [expandedVertical]: dataUpdatedAt }));
    }
  }, [verticalDetail, expandedVertical, hasChanges, detailFetching, dataUpdatedAt, lastSyncTimestamp]);

  // Group modules by category
  const modulesByCategory = useMemo(() => {
    if (!modulesData) return {};
    return modulesData.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {} as Record<string, SystemModule[]>);
  }, [modulesData]);

  const saveModulesMutation = useMutation({
    mutationFn: async ({ verticalId, moduleIds }: { verticalId: string; moduleIds: string[] }) => {
      const res = await fetch(`/api/verticals/${verticalId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_ids: moduleIds }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(
        language === "es" ? "Módulos guardados" : "Modules saved",
        {
          description: language === "es" 
            ? "La configuración de módulos se guardó correctamente" 
            : "Module configuration saved successfully",
        }
      );
      // Update selectedModules with the saved moduleIds BEFORE setting hasChanges to false
      // This ensures the UI reflects the saved state and prevents stale data overwrite
      const savedModuleIds = new Set(variables.moduleIds);
      setSelectedModules(prev => ({ ...prev, [variables.verticalId]: savedModuleIds }));
      setHasChanges(prev => ({ ...prev, [variables.verticalId]: false }));
      queryClient.invalidateQueries({ queryKey: ["/api/verticals", variables.verticalId] });
    },
    onError: () => {
      toast.error(
        language === "es" ? "Error" : "Error",
        {
          description: language === "es" 
            ? "No se pudo guardar la configuración" 
            : "Could not save configuration",
        }
      );
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/admin/template-products?id=${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      return res.json();
    },
    onSuccess: () => {
      toast.success(
        language === "es" ? "Producto eliminado" : "Product removed",
        {
          description: language === "es" 
            ? "El producto se eliminó del catálogo del giro" 
            : "Product removed from vertical catalog",
        }
      );
      queryClient.invalidateQueries({ queryKey: ["/api/admin/template-products", expandedVertical] });
    },
    onError: () => {
      toast.error(
        language === "es" ? "Error" : "Error",
        {
          description: language === "es" 
            ? "No se pudo eliminar el producto" 
            : "Could not remove product",
        }
      );
    },
  });

  const toggleCatalogCategory = (category: CatalogCategory) => {
    setExpandedCatalogCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleVertical = (verticalId: string) => {
    if (expandedVertical === verticalId) {
      setExpandedVertical(null);
    } else {
      setExpandedVertical(verticalId);
      // Initialize all module categories as expanded
      setExpandedModuleCategories(new Set(MODULE_CATEGORIES));
    }
  };

  const toggleModuleCategory = (category: string) => {
    setExpandedModuleCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const toggleModule = (verticalId: string, moduleId: string) => {
    setSelectedModules(prev => {
      const currentSet = prev[verticalId] || new Set();
      const newSet = new Set(currentSet);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return { ...prev, [verticalId]: newSet };
    });
    setHasChanges(prev => ({ ...prev, [verticalId]: true }));
  };

  const toggleAllInCategory = (verticalId: string, category: string, selectAll: boolean) => {
    const categoryModules = modulesByCategory[category] || [];
    setSelectedModules(prev => {
      const currentSet = new Set(prev[verticalId] || new Set());
      categoryModules.forEach(m => {
        if (selectAll) {
          currentSet.add(m.id);
        } else {
          currentSet.delete(m.id);
        }
      });
      return { ...prev, [verticalId]: currentSet };
    });
    setHasChanges(prev => ({ ...prev, [verticalId]: true }));
  };

  const getCategorySelectionState = (verticalId: string, category: string): "all" | "some" | "none" => {
    const categoryModules = modulesByCategory[category] || [];
    const selected = selectedModules[verticalId] || new Set();
    const selectedCount = categoryModules.filter(m => selected.has(m.id)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === categoryModules.length) return "all";
    return "some";
  };

  const handleSaveModules = (verticalId: string) => {
    const moduleIds = Array.from(selectedModules[verticalId] || new Set());
    saveModulesMutation.mutate({ verticalId, moduleIds });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const filteredVerticals = allVerticals?.filter((v) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      v.display_name.toLowerCase().includes(query) ||
      v.name.toLowerCase().includes(query) ||
      v.description?.toLowerCase().includes(query)
    );
  });

  const popularVerticals = allVerticals
    ?.filter((v) => v.popularity_score >= 80)
    .sort((a, b) => b.popularity_score - a.popularity_score)
    .slice(0, 20);

  const isLoading = categoriesLoading || verticalsLoading;

  const t = {
    title: language === "es" ? "Giros de Negocio" : "Business Verticals",
    subtitle: language === "es" 
      ? "Gestiona los tipos de negocio disponibles en el sistema" 
      : "Manage available business types in the system",
    search: language === "es" ? "Buscar giros de negocio..." : "Search business types...",
    all: language === "es" ? "Todos" : "All",
    popular: language === "es" ? "Populares" : "Popular",
    byCategory: language === "es" ? "Por Categoría" : "By Category",
    modules: language === "es" ? "Módulos" : "Modules",
    totalVerticals: language === "es" ? "giros de negocio" : "business types",
    categories: language === "es" ? "categorías" : "categories",
    moduleCategories: {
      core: language === "es" ? "Básicos" : "Core",
      sales: language === "es" ? "Ventas" : "Sales",
      operations: language === "es" ? "Operaciones" : "Operations",
      marketing: language === "es" ? "Marketing" : "Marketing",
      ai: language === "es" ? "IA" : "AI",
      integrations: language === "es" ? "Integraciones" : "Integrations",
      compliance: language === "es" ? "Cumplimiento" : "Compliance",
    },
    terminology: language === "es" ? "Terminología" : "Terminology",
    suggestedName: language === "es" ? "Nombre sugerido" : "Suggested name",
    suggestedDomain: language === "es" ? "Dominio sugerido" : "Suggested domain",
    enabledModules: language === "es" ? "Módulos habilitados" : "Enabled modules",
    required: language === "es" ? "Requerido" : "Required",
    recommended: language === "es" ? "Recomendado" : "Recommended",
    optional: language === "es" ? "Opcional" : "Optional",
    premium: language === "es" ? "Premium" : "Premium",
    ai: language === "es" ? "IA" : "AI",
    selectModules: language === "es" ? "Seleccionar módulos para este giro" : "Select modules for this vertical",
    saveChanges: language === "es" ? "Guardar cambios" : "Save changes",
    saving: language === "es" ? "Guardando..." : "Saving...",
    selectAll: language === "es" ? "Seleccionar todos" : "Select all",
    deselectAll: language === "es" ? "Deseleccionar todos" : "Deselect all",
    modulesSelected: language === "es" ? "módulos seleccionados" : "modules selected",
    clickToExpand: language === "es" ? "Clic para configurar módulos" : "Click to configure modules",
    catalog: language === "es" ? "Catálogo" : "Catalog",
    catalogDescription: language === "es" ? "Productos, artículos y paquetes predeterminados para este giro" : "Default products, articles and packages for this vertical",
    catalogCategories: {
      products: language === "es" ? "Productos" : "Products",
      articles: language === "es" ? "Artículos / Insumos" : "Articles / Supplies",
      packages: language === "es" ? "Paquetes / Combos" : "Packages / Combos",
    },
    noProducts: language === "es" ? "Sin productos asignados" : "No products assigned",
    noArticles: language === "es" ? "Sin artículos asignados" : "No articles assigned",
    noPackages: language === "es" ? "Sin paquetes asignados" : "No packages assigned",
    removeFromCatalog: language === "es" ? "Quitar del catálogo" : "Remove from catalog",
    price: language === "es" ? "Precio" : "Price",
  };

  // Render module tree for a vertical
  const renderModuleTree = (verticalId: string) => {
    const currentSelected = selectedModules[verticalId] || new Set();
    const totalSelected = currentSelected.size;
    const totalModules = modulesData?.length || 0;

    return (
      <div className="mt-4 border-t pt-4 space-y-4" data-testid={`module-tree-${verticalId}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{t.selectModules}</span>
            <Badge variant="secondary" className="text-xs">
              {totalSelected} / {totalModules} {t.modulesSelected}
            </Badge>
          </div>
          {hasChanges[verticalId] && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveModules(verticalId);
              }}
              disabled={saveModulesMutation.isPending}
              className="min-h-[44px] sm:min-h-0"
              data-testid={`button-save-modules-${verticalId}`}
            >
              {saveModulesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.saving}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t.saveChanges}
                </>
              )}
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {MODULE_CATEGORIES.map((category) => {
            const categoryModules = modulesByCategory[category] || [];
            if (categoryModules.length === 0) return null;

            const selectionState = getCategorySelectionState(verticalId, category);
            const isExpanded = expandedModuleCategories.has(category);
            const selectedInCategory = categoryModules.filter(m => currentSelected.has(m.id)).length;

            return (
              <div key={category} className="border rounded-lg bg-card" data-testid={`category-${category}`}>
                <div
                  className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleModuleCategory(category);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllInCategory(verticalId, category, selectionState !== "all");
                      }}
                      className="flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 -m-2 p-2"
                      data-testid={`checkbox-category-${category}`}
                    >
                      {selectionState === "all" ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : selectionState === "some" ? (
                        <MinusSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                    <span className="font-medium text-sm">
                      {t.moduleCategories[category as keyof typeof t.moduleCategories]}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {selectedInCategory} / {categoryModules.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {categoryModules.map((module) => {
                      const isSelected = currentSelected.has(module.id);
                      return (
                        <div
                          key={module.id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected 
                              ? "bg-primary/10 border border-primary/30" 
                              : "hover:bg-accent/50"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModule(verticalId, module.id);
                          }}
                          data-testid={`module-${module.key || module.id}`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleModule(verticalId, module.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="min-h-[20px] min-w-[20px]"
                            data-testid={`checkbox-module-${module.key || module.id}`}
                          />
                          <DynamicIcon name={module.icon} className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">
                                {language === "es" ? module.name : module.name_en || module.name}
                              </span>
                              {module.is_premium && (
                                <Badge variant="secondary" className="text-xs py-0">
                                  <Crown className="h-3 w-3 mr-1" />
                                  Premium
                                </Badge>
                              )}
                              {module.is_ai_feature && (
                                <Badge variant="secondary" className="text-xs py-0">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  IA
                                </Badge>
                              )}
                            </div>
                            {module.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {language === "es" ? module.description : module.description_en || module.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render catalog section for a vertical
  const renderCatalogSection = (verticalId: string) => {
    const products = templateProducts?.filter(p => p.product_type === "normal" || p.product_type === "recipe") || [];
    const articles = templateProducts?.filter(p => p.product_type === "ingredient" || p.product_type === "supply") || [];
    const packages = templateProducts?.filter(p => p.product_type === "combo" || p.product_type === "package") || [];
    const totalItems = (templateProducts?.length || 0);

    const catalogData: { key: CatalogCategory; label: string; items: TemplateProduct[]; icon: typeof ShoppingBag; emptyMessage: string }[] = [
      { key: "products", label: t.catalogCategories.products, items: products, icon: ShoppingBag, emptyMessage: t.noProducts },
      { key: "articles", label: t.catalogCategories.articles, items: articles, icon: Box, emptyMessage: t.noArticles },
      { key: "packages", label: t.catalogCategories.packages, items: packages, icon: PackageOpen, emptyMessage: t.noPackages },
    ];

    return (
      <div className="mt-4 border-t pt-4 space-y-4" data-testid={`catalog-section-${verticalId}`}>
        <div
          className="flex items-center justify-between cursor-pointer p-2 rounded-lg hover:bg-accent/30 transition-colors"
          onClick={() => setExpandedCatalogSection(!expandedCatalogSection)}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{t.catalog}</span>
            <Badge variant="secondary" className="text-xs">
              {totalItems} {language === "es" ? "elementos" : "items"}
            </Badge>
          </div>
          {expandedCatalogSection ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>

        {expandedCatalogSection && (
          <div className="space-y-2 pl-2">
            <p className="text-xs text-muted-foreground mb-3">{t.catalogDescription}</p>
            
            {catalogData.map(({ key, label, items, icon: Icon, emptyMessage }) => {
              const isExpanded = expandedCatalogCategories.has(key);
              
              return (
                <div key={key} className="border rounded-lg bg-card" data-testid={`catalog-category-${key}`}>
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCatalogCategory(key);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{label}</span>
                      <Badge variant="outline" className="text-xs">
                        {items.length}
                      </Badge>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-1">
                      {templateProductsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : items.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-3 text-center">{emptyMessage}</p>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 p-2 rounded-md bg-accent/20 hover:bg-accent/40 transition-colors"
                            data-testid={`catalog-item-${item.id}`}
                          >
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="h-10 w-10 rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium block truncate">{item.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {item.category_name && (
                                  <span>{item.category_name}</span>
                                )}
                                <span className="text-primary font-medium">
                                  ${item.suggested_price?.toFixed(2) || "0.00"}
                                </span>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTemplateMutation.mutate(item.id);
                              }}
                              disabled={deleteTemplateMutation.isPending}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Expandable Vertical Card
  const renderExpandableVerticalCard = (vertical: Vertical, compact = false, showPopularity = false) => {
    const isExpanded = expandedVertical === vertical.id;
    
    return (
      <div
        key={vertical.id}
        className={`rounded-lg border transition-all ${
          isExpanded
            ? "border-primary bg-primary/5 ring-1 ring-primary"
            : "hover:border-primary/50"
        }`}
        data-testid={`vertical-card-${vertical.slug || vertical.name}`}
      >
        <div
          className={`p-3 cursor-pointer transition-colors ${
            isExpanded ? "" : "hover:bg-accent/50"
          } ${compact ? "py-2" : ""}`}
          onClick={() => toggleVertical(vertical.id)}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-primary/10 ${compact ? "p-1.5" : ""}`}>
              <DynamicIcon name={vertical.icon} className={`text-primary ${compact ? "h-4 w-4" : "h-5 w-5"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-medium ${compact ? "text-sm" : ""}`}>
                  {language === "es" ? vertical.display_name : vertical.display_name_en || vertical.display_name}
                </span>
                {showPopularity && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    {vertical.popularity_score}
                  </Badge>
                )}
              </div>
              {!compact && vertical.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {vertical.description}
                </p>
              )}
              {!isExpanded && (
                <p className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                  <Settings2 className="h-3 w-3" />
                  {t.clickToExpand}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-primary" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-3 pb-3">
            {detailLoading ? (
              <div className="space-y-2 mt-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                {renderModuleTree(vertical.id)}
                {renderCatalogSection(vertical.id)}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Store className="h-5 w-5 sm:h-6 sm:w-6" />
            {t.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
          <span data-testid="total-verticals">
            {allVerticals?.length || 0} {t.totalVerticals}
          </span>
          <span data-testid="total-categories">
            {categoriesData?.length || 0} {t.categories}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
            data-testid="input-search"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3 px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
              <TabsTrigger value="all" data-testid="tab-all" className="text-xs sm:text-sm">{t.all}</TabsTrigger>
              <TabsTrigger value="popular" data-testid="tab-popular" className="text-xs sm:text-sm">{t.popular}</TabsTrigger>
              <TabsTrigger value="categories" data-testid="tab-categories" className="text-xs sm:text-sm">{t.byCategory}</TabsTrigger>
              <TabsTrigger value="modules" data-testid="tab-modules" className="text-xs sm:text-sm">{t.modules}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Tabs value={activeTab}>
              <TabsContent value="all" className="mt-0">
                <ScrollArea className="h-[600px] pr-2 sm:pr-4">
                  <div className="space-y-3">
                    {filteredVerticals?.map((vertical) => renderExpandableVerticalCard(vertical))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="popular" className="mt-0">
                <ScrollArea className="h-[600px] pr-2 sm:pr-4">
                  <div className="space-y-3">
                    {popularVerticals?.map((vertical) => renderExpandableVerticalCard(vertical, false, true))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="categories" className="mt-0">
                <ScrollArea className="h-[600px] pr-2 sm:pr-4">
                  <div className="space-y-2">
                    {categoriesData?.map((category) => (
                      <Collapsible
                        key={category.id}
                        open={expandedCategories.has(category.id)}
                        onOpenChange={() => toggleCategory(category.id)}
                      >
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent/50 transition-colors min-h-[44px]">
                          <div className="flex items-center gap-3">
                            <DynamicIcon name={category.icon} className="h-5 w-5 text-primary" />
                            <span className="font-medium text-sm sm:text-base">
                              {language === "es" ? category.display_name : category.display_name_en || category.display_name}
                            </span>
                            <Badge variant="secondary" className="ml-2">
                              {category.verticals?.length || 0}
                            </Badge>
                          </div>
                          {expandedCategories.has(category.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-4 sm:pl-6 space-y-2 mt-2">
                          {category.verticals?.map((vertical) => renderExpandableVerticalCard(vertical, true))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="modules" className="mt-0">
                <ScrollArea className="h-[600px] pr-2 sm:pr-4">
                  <div className="space-y-6">
                    {MODULE_CATEGORIES.map((category) => {
                      const categoryModules = modulesData?.filter((m) => m.category === category);
                      if (!categoryModules?.length) return null;
                      return (
                        <div key={category}>
                          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
                            {t.moduleCategories[category as keyof typeof t.moduleCategories]}
                            <Badge variant="outline">{categoryModules.length}</Badge>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {categoryModules.map((module) => (
                              <div
                                key={module.id}
                                className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <DynamicIcon name={module.icon} className="h-4 w-4" />
                                    <span className="font-medium text-sm">
                                      {language === "es" ? module.name : module.name_en || module.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {module.is_premium && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Crown className="h-3 w-3 mr-1" />
                                        Premium
                                      </Badge>
                                    )}
                                    {module.is_ai_feature && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        IA
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {module.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {language === "es" ? module.description : module.description_en || module.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
