"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Shield, 
  Key,
  Loader2, 
  Search, 
  Plus, 
  Pencil, 
  Check,
  Lock,
  Users,
  ShoppingCart,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  Smartphone,
  Mic,
  Sparkles,
  Clock,
  Building2,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
}

interface Role {
  id: string;
  tenant_id: string | null;
  scope: "PLATFORM" | "WHITE_LABEL" | "BUSINESS" | "EMPLOYEE";
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  permissions: Permission[];
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

export const SCOPE_LABELS: Record<string, string> = {
  PLATFORM: "Plataforma",
  WHITE_LABEL: "Marca Blanca",
  BUSINESS: "Negocio",
  EMPLOYEE: "Empleado",
};

export const SCOPE_COLORS: Record<string, string> = {
  PLATFORM: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  WHITE_LABEL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  BUSINESS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EMPLOYEE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function RolesTab() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newRole, setNewRole] = useState({
    name: "",
    slug: "",
    scope: "EMPLOYEE" as Role["scope"],
    description: "",
  });

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles");
      if (response.ok) {
        const data = await response.json();
        setRoles(data.roles || []);
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Error al cargar roles");
    } finally {
      setLoading(false);
    }
  };

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
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    setSelectedPermissions(new Set(role.permissions.map(p => p.id)));
  };

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleToggleModule = (module: string) => {
    const modulePermissions = groupedPermissions[module] || [];
    const allSelected = modulePermissions.every(p => selectedPermissions.has(p.id));
    
    const newSelected = new Set(selectedPermissions);
    modulePermissions.forEach(p => {
      if (allSelected) {
        newSelected.delete(p.id);
      } else {
        newSelected.add(p.id);
      }
    });
    setSelectedPermissions(newSelected);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    if (selectedRole.is_system) {
      toast.error("No se pueden modificar los permisos de roles del sistema");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          permission_ids: Array.from(selectedPermissions),
        }),
      });

      if (response.ok) {
        toast.success("Permisos actualizados correctamente");
        fetchRoles();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al actualizar permisos");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Error al guardar permisos");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name || !newRole.slug || !newRole.scope) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRole,
          permission_ids: Array.from(selectedPermissions),
        }),
      });

      if (response.ok) {
        toast.success("Rol creado correctamente");
        setIsCreateDialogOpen(false);
        setNewRole({ name: "", slug: "", scope: "EMPLOYEE", description: "" });
        setSelectedPermissions(new Set());
        fetchRoles();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al crear rol");
      }
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error("Error al crear rol");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const systemRoles = filteredRoles.filter(r => r.is_system);
  const customRoles = filteredRoles.filter(r => !r.is_system);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5">
        <Card className="h-[calc(100vh-250px)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Roles</CardTitle>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedPermissions(new Set());
                  setIsCreateDialogOpen(true);
                }}
                data-testid="button-create-role"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Rol
              </Button>
            </div>
            <CardDescription>
              Gestiona los roles y permisos del sistema
            </CardDescription>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-roles"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full px-6 pb-6">
              {systemRoles.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Roles del Sistema
                  </h3>
                  <div className="space-y-2">
                    {systemRoles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        isSelected={selectedRole?.id === role.id}
                        onSelect={() => handleSelectRole(role)}
                      />
                    ))}
                  </div>
                </div>
              )}
              
              {customRoles.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Roles Personalizados
                  </h3>
                  <div className="space-y-2">
                    {customRoles.map((role) => (
                      <RoleCard
                        key={role.id}
                        role={role}
                        isSelected={selectedRole?.id === role.id}
                        onSelect={() => handleSelectRole(role)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filteredRoles.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Shield className="h-12 w-12 mb-4 opacity-50" />
                  <p>No se encontraron roles</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-7">
        <Card className="h-[calc(100vh-250px)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <CardTitle>Permisos</CardTitle>
              </div>
              {selectedRole && !selectedRole.is_system && (
                <Button
                  size="sm"
                  onClick={handleSavePermissions}
                  disabled={saving}
                  data-testid="button-save-permissions"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Guardar Cambios
                </Button>
              )}
            </div>
            <CardDescription>
              {selectedRole 
                ? `Permisos asignados a "${selectedRole.name}"${selectedRole.is_system ? " (Solo lectura)" : ""}`
                : "Selecciona un rol para ver y editar sus permisos"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            {!selectedRole ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                <Key className="h-12 w-12 mb-4 opacity-50" />
                <p>Selecciona un rol para ver sus permisos</p>
              </div>
            ) : (
              <ScrollArea className="h-full px-6 pb-6">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedPermissions).map(([module, perms]) => {
                    const ModuleIcon = MODULE_ICONS[module] || Key;
                    const modulePermsSelected = perms.filter(p => selectedPermissions.has(p.id)).length;
                    const allSelected = modulePermsSelected === perms.length;
                    const someSelected = modulePermsSelected > 0 && !allSelected;

                    return (
                      <AccordionItem key={module} value={module}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={allSelected}
                              ref={(el) => {
                                if (el) {
                                  (el as any).indeterminate = someSelected;
                                }
                              }}
                              onCheckedChange={() => !selectedRole.is_system && handleToggleModule(module)}
                              disabled={selectedRole.is_system}
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`checkbox-module-${module}`}
                            />
                            <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{MODULE_NAMES[module] || module}</span>
                            <Badge variant="secondary" className="ml-auto mr-2">
                              {modulePermsSelected}/{perms.length}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-10">
                            {perms.map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center gap-2 p-2 rounded-lg hover-elevate"
                              >
                                <Checkbox
                                  id={perm.id}
                                  checked={selectedPermissions.has(perm.id)}
                                  onCheckedChange={() => !selectedRole.is_system && handleTogglePermission(perm.id)}
                                  disabled={selectedRole.is_system}
                                  data-testid={`checkbox-permission-${perm.key}`}
                                />
                                <label
                                  htmlFor={perm.id}
                                  className="flex-1 cursor-pointer text-sm"
                                >
                                  <span className="font-medium">{perm.action}</span>
                                  {perm.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {perm.description}
                                    </p>
                                  )}
                                </label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Rol</DialogTitle>
            <DialogDescription>
              Define un nuevo rol personalizado con los permisos que necesites
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role-name">Nombre del Rol *</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                placeholder="Ej: Supervisor de Ventas"
                data-testid="input-role-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-slug">Identificador (slug) *</Label>
              <Input
                id="role-slug"
                value={newRole.slug}
                onChange={(e) => setNewRole({ ...newRole, slug: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                placeholder="Ej: supervisor_ventas"
                data-testid="input-role-slug"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-scope">Nivel *</Label>
              <Select
                value={newRole.scope}
                onValueChange={(value: Role["scope"]) => setNewRole({ ...newRole, scope: value })}
              >
                <SelectTrigger data-testid="select-role-scope">
                  <SelectValue placeholder="Selecciona un nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE">Empleado</SelectItem>
                  <SelectItem value="BUSINESS">Dueño de Negocio</SelectItem>
                  <SelectItem value="WHITE_LABEL">Marca Blanca</SelectItem>
                  <SelectItem value="PLATFORM">Plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-description">Descripción</Label>
              <Input
                id="role-description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Descripción opcional del rol"
                data-testid="input-role-description"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              data-testid="button-cancel-create-role"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateRole}
              disabled={saving || !newRole.name || !newRole.slug}
              data-testid="button-confirm-create-role"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Crear Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RoleCard({ role, isSelected, onSelect }: { role: Role; isSelected: boolean; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 border rounded-lg cursor-pointer transition-all hover-elevate ${
        isSelected ? "border-primary bg-primary/5" : ""
      }`}
      data-testid={`role-card-${role.slug}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium truncate">{role.name}</span>
            {role.is_system && (
              <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge 
              variant="secondary" 
              className={`text-xs ${SCOPE_COLORS[role.scope] || ""}`}
            >
              {SCOPE_LABELS[role.scope] || role.scope}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {role.permissions.length} permisos
            </span>
          </div>
          {role.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {role.description}
            </p>
          )}
        </div>
        {isSelected && (
          <Check className="h-5 w-5 text-primary shrink-0" />
        )}
      </div>
    </div>
  );
}
