"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Shield, 
  Key,
  Loader2, 
  Plus, 
  Trash2,
  Building2,
  Users,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  slug: string;
  scope: string;
  is_system: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  type: string;
}

interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  status: string;
  tenant?: Tenant;
  role?: Role;
}

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  first_name?: string;
  last_name?: string;
}

interface UserRoleAssignmentProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const SCOPE_COLORS: Record<string, string> = {
  PLATFORM: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  WHITE_LABEL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  BUSINESS: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  EMPLOYEE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const TENANT_TYPE_LABELS: Record<string, string> = {
  PLATFORM: "Plataforma",
  WHITE_LABEL: "Marca Blanca",
  BUSINESS: "Negocio",
  LOCATION: "Ubicación",
};

export default function UserRoleAssignment({ user, isOpen, onClose, onSave }: UserRoleAssignmentProps) {
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedTenantId, setSelectedTenantId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchData();
    }
  }, [isOpen, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [userTenantsRes, rolesRes, tenantsRes] = await Promise.all([
        fetch(`/api/admin/user-tenants?userId=${user.id}`),
        fetch("/api/admin/roles"),
        fetch("/api/admin/tenants?active=true"),
      ]);

      if (userTenantsRes.ok) {
        const data = await userTenantsRes.json();
        setUserTenants(data.userTenants || []);
      }

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        setRoles(data.roles || []);
      }

      if (tenantsRes.ok) {
        const data = await tenantsRes.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedTenantId || !selectedRoleId) {
      toast.error("Selecciona un tenant y un rol");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/user-tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          tenant_id: selectedTenantId,
          role_id: selectedRoleId,
        }),
      });

      if (response.ok) {
        toast.success("Rol asignado correctamente");
        setSelectedTenantId("");
        setSelectedRoleId("");
        setIsAddingNew(false);
        fetchData();
        onSave();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al asignar rol");
      }
    } catch (error) {
      console.error("Error adding assignment:", error);
      toast.error("Error al asignar rol");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAssignment = async (tenantId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta asignación?")) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/user-tenants?userId=${user.id}&tenantId=${tenantId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Asignación eliminada");
        fetchData();
        onSave();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al eliminar asignación");
      }
    } catch (error) {
      console.error("Error removing assignment:", error);
      toast.error("Error al eliminar asignación");
    } finally {
      setSaving(false);
    }
  };

  const userName = user.firstName || user.first_name || user.email.split("@")[0];

  const availableTenants = tenants.filter(
    t => !userTenants.some(ut => ut.tenant_id === t.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Roles de {userName}
          </DialogTitle>
          <DialogDescription>
            Asigna roles y permisos en diferentes tenants para este usuario
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Asignaciones actuales</Label>
              {!isAddingNew && availableTenants.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingNew(true)}
                  data-testid="button-add-role-assignment"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              )}
            </div>

            {isAddingNew && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Tenant</Label>
                    <Select
                      value={selectedTenantId}
                      onValueChange={setSelectedTenantId}
                    >
                      <SelectTrigger data-testid="select-tenant">
                        <SelectValue placeholder="Selecciona un tenant" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTenants.map((tenant) => (
                          <SelectItem key={tenant.id} value={tenant.id}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {tenant.name}
                              <Badge variant="secondary" className="text-xs">
                                {TENANT_TYPE_LABELS[tenant.type] || tenant.type}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <Select
                      value={selectedRoleId}
                      onValueChange={setSelectedRoleId}
                    >
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Selecciona un rol" />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              {role.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsAddingNew(false);
                      setSelectedTenantId("");
                      setSelectedRoleId("");
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddAssignment}
                    disabled={saving || !selectedTenantId || !selectedRoleId}
                    data-testid="button-confirm-add-role"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Asignar
                  </Button>
                </div>
              </div>
            )}

            <ScrollArea className="max-h-[300px]">
              {userTenants.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay roles asignados</p>
                  <p className="text-sm">Agrega un rol para este usuario</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userTenants.map((ut) => (
                    <div
                      key={ut.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                      data-testid={`user-tenant-${ut.tenant_id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {ut.tenant?.name || "Tenant desconocido"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {TENANT_TYPE_LABELS[ut.tenant?.type || ""] || ut.tenant?.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Shield className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{ut.role?.name || "Rol desconocido"}</span>
                          {ut.role && (
                            <Badge 
                              variant="secondary"
                              className={`text-xs ${SCOPE_COLORS[ut.role.scope] || ""}`}
                            >
                              {ut.role.scope}
                            </Badge>
                          )}
                          <Badge 
                            variant={ut.status === "active" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {ut.status}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveAssignment(ut.tenant_id)}
                        disabled={saving}
                        data-testid={`button-remove-${ut.tenant_id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
