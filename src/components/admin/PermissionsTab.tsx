"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Key,
  Loader2,
  Search,
  ShoppingCart,
  Package,
  ClipboardList,
  Users,
  BarChart3,
  Settings,
  Smartphone,
  Mic,
  Sparkles,
  Clock,
  Building2,
  Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
}

const MODULE_NAMES: Record<string, string> = {
  pos: "Punto de Venta",
  products: "Productos",
  inventory: "Inventario",
  categories: "Categorías",
  customers: "Clientes",
  orders: "Órdenes",
  reports: "Reportes",
  digital_menu: "Menú Digital",
  ingredients: "Ingredientes",
  returns: "Devoluciones",
  settings: "Configuración",
  users: "Usuarios",
  terminals: "Terminales",
  voice: "Órdenes por Voz",
  ai: "Funciones IA",
  queue: "Fila Virtual",
  whitelabel: "Marca Blanca",
  platform: "Plataforma",
};

const MODULE_ICONS: Record<string, any> = {
  pos: ShoppingCart,
  products: Package,
  inventory: ClipboardList,
  categories: ClipboardList,
  customers: Users,
  orders: ClipboardList,
  reports: BarChart3,
  digital_menu: Smartphone,
  ingredients: Package,
  returns: ClipboardList,
  settings: Settings,
  users: Users,
  terminals: Smartphone,
  voice: Mic,
  ai: Sparkles,
  queue: Clock,
  whitelabel: Building2,
  platform: Globe,
};

export default function PermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const response = await fetch("/api/admin/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
        setGroupedPermissions(data.grouped || {});
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = Object.entries(groupedPermissions).reduce(
    (acc, [module, perms]) => {
      const filtered = perms.filter(
        (p) =>
          p.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        acc[module] = filtered;
      }
      return acc;
    },
    {} as Record<string, Permission[]>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Permisos del Sistema</CardTitle>
          </div>
          <CardDescription>
            Visualiza todos los permisos disponibles en el sistema organizados por módulo
          </CardDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar permisos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-permissions"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-350px)]">
            <div className="px-6 pb-6">
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(filteredGroups).map(([module, perms]) => {
                  const ModuleIcon = MODULE_ICONS[module] || Key;

                  return (
                    <AccordionItem key={module} value={module}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{MODULE_NAMES[module] || module}</span>
                          <Badge variant="secondary" className="ml-auto mr-2">
                            {perms.length}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3 pl-10">
                          {perms.map((perm) => (
                            <div
                              key={perm.id}
                              className="p-3 border rounded-lg bg-card/50"
                              data-testid={`permission-${perm.key}`}
                            >
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{perm.action}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {perm.key}
                                    </Badge>
                                  </div>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {Object.keys(filteredGroups).length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Key className="h-12 w-12 mb-4 opacity-50" />
                  <p>No se encontraron permisos</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
