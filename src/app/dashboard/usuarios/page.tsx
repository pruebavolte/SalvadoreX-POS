"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  Shield,
  Key,
  UserPlus,
  Settings,
  Search,
  Loader2,
  Pencil,
  Lock,
  UserX,
  UserCheck,
  ShoppingCart,
  Package,
  BarChart3,
  Cog,
  ChefHat,
  Boxes,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string;
}

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Record<string, boolean>;
  editable: boolean;
}

const rolColors: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  CAJERO: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  COCINA: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  ALMACEN: "bg-green-500/10 text-green-600 border-green-500/20",
  MESERO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
};

const rolIcons: Record<string, typeof Shield> = {
  ADMIN: Shield,
  CAJERO: Wallet,
  COCINA: ChefHat,
  ALMACEN: Boxes,
  MESERO: Users,
};

const permisosModulos = [
  {
    modulo: "POS",
    icon: ShoppingCart,
    permisos: [
      { key: "pos_ver", label: "Ver POS" },
      { key: "pos_cobrar", label: "Cobrar ventas" },
      { key: "pos_descuentos", label: "Aplicar descuentos" },
      { key: "pos_cancelar", label: "Cancelar ventas" },
    ],
  },
  {
    modulo: "Productos",
    icon: Package,
    permisos: [
      { key: "productos_ver", label: "Ver productos" },
      { key: "productos_crear", label: "Crear productos" },
      { key: "productos_editar", label: "Editar productos" },
      { key: "productos_eliminar", label: "Eliminar productos" },
    ],
  },
  {
    modulo: "Clientes",
    icon: Users,
    permisos: [
      { key: "clientes_ver", label: "Ver clientes" },
      { key: "clientes_crear", label: "Crear clientes" },
      { key: "clientes_editar", label: "Editar clientes" },
    ],
  },
  {
    modulo: "Reportes",
    icon: BarChart3,
    permisos: [
      { key: "reportes_ver", label: "Ver reportes" },
      { key: "reportes_exportar", label: "Exportar reportes" },
    ],
  },
  {
    modulo: "Configuración",
    icon: Cog,
    permisos: [
      { key: "configuracion_ver", label: "Ver configuración" },
      { key: "configuracion_modificar", label: "Modificar configuración" },
    ],
  },
  {
    modulo: "Usuarios",
    icon: Users,
    permisos: [
      { key: "usuarios_ver", label: "Ver usuarios" },
      { key: "usuarios_crear", label: "Crear usuarios" },
      { key: "usuarios_modificar", label: "Modificar usuarios" },
    ],
  },
  {
    modulo: "Cocina",
    icon: ChefHat,
    permisos: [{ key: "cocina_ver", label: "Ver pantalla de cocina" }],
  },
  {
    modulo: "Inventario",
    icon: Boxes,
    permisos: [
      { key: "inventario_ver", label: "Ver inventario" },
      { key: "inventario_modificar", label: "Modificar inventario" },
    ],
  },
  {
    modulo: "Caja",
    icon: Wallet,
    permisos: [
      { key: "caja_ver", label: "Ver caja" },
      { key: "caja_corte", label: "Realizar corte de caja" },
    ],
  },
];

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroRol, setFiltroRol] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null);
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null);

  const [formNombre, setFormNombre] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRol, setFormRol] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formConfirmPassword, setFormConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/usuarios"),
        fetch("/api/roles"),
      ]);

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();

      if (usersData.success) {
        setUsuarios(usersData.data);
      }
      if (rolesData.success) {
        setRoles(rolesData.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsuarios = usuarios.filter((user) => {
    const matchSearch =
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRol = filtroRol === "todos" || user.rol === filtroRol;
    const matchEstado =
      filtroEstado === "todos" ||
      (filtroEstado === "activos" ? user.activo : !user.activo);
    return matchSearch && matchRol && matchEstado;
  });

  const handleOpenUserDialog = (user?: Usuario) => {
    if (user) {
      setSelectedUser(user);
      setFormNombre(user.nombre);
      setFormEmail(user.email);
      setFormRol(user.rol);
    } else {
      setSelectedUser(null);
      setFormNombre("");
      setFormEmail("");
      setFormRol("");
    }
    setFormPassword("");
    setUserDialogOpen(true);
  };

  const handleOpenPasswordDialog = (user: Usuario) => {
    setSelectedUser(user);
    setFormPassword("");
    setFormConfirmPassword("");
    setPasswordDialogOpen(true);
  };

  const handleSubmitUser = async () => {
    if (!formNombre || !formEmail || !formRol) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    if (!selectedUser && !formPassword) {
      toast.error("La contraseña es requerida para nuevos usuarios");
      return;
    }

    setSubmitting(true);
    try {
      const method = selectedUser ? "PATCH" : "POST";
      const body = selectedUser
        ? { id: selectedUser.id, nombre: formNombre, email: formEmail, rol: formRol }
        : { nombre: formNombre, email: formEmail, rol: formRol, password: formPassword };

      const response = await fetch("/api/usuarios", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(selectedUser ? "Usuario actualizado" : "Usuario creado");
        setUserDialogOpen(false);
        fetchData();
      } else {
        toast.error(data.error || "Error al guardar usuario");
      }
    } catch (error) {
      console.error("Error saving user:", error);
      toast.error("Error al guardar usuario");
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formPassword || formPassword.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (formPassword !== formConfirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser?.id, password: formPassword }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Contraseña actualizada");
        setPasswordDialogOpen(false);
      } else {
        toast.error(data.error || "Error al cambiar contraseña");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast.error("Error al cambiar contraseña");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUserStatus = async (user: Usuario) => {
    try {
      const response = await fetch("/api/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, activo: !user.activo }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(user.activo ? "Usuario desactivado" : "Usuario activado");
        fetchData();
      } else {
        toast.error(data.error || "Error al cambiar estado");
      }
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast.error("Error al cambiar estado del usuario");
    }
  };

  const handleTogglePermiso = async (rol: Rol, permisoKey: string) => {
    try {
      const newPermisos = {
        ...rol.permisos,
        [permisoKey]: !rol.permisos[permisoKey],
      };

      const response = await fetch("/api/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rol.id, permisos: newPermisos }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Permiso actualizado");
        fetchData();
      } else {
        toast.error(data.error || "Error al actualizar permiso");
      }
    } catch (error) {
      console.error("Error updating permission:", error);
      toast.error("Error al actualizar permiso");
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRolBadge = (rol: string) => {
    const colorClass = rolColors[rol] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
    return <Badge className={colorClass}>{rol}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2" data-testid="text-page-title">
            <Users className="h-5 w-5" />
            Usuarios y Permisos
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona usuarios, roles y permisos del sistema
          </p>
        </div>
        <Button onClick={() => handleOpenUserDialog()} data-testid="button-nuevo-usuario">
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <Tabs defaultValue="usuarios" className="flex-1 flex flex-col">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="usuarios" data-testid="tab-usuarios">
              <Users className="h-4 w-4 mr-2" />
              Usuarios
            </TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles y Permisos
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="usuarios" className="flex-1 p-4 mt-0">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-usuarios"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Select value={filtroRol} onValueChange={setFiltroRol}>
                    <SelectTrigger className="w-[140px]" data-testid="select-filtro-rol">
                      <SelectValue placeholder="Rol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los roles</SelectItem>
                      {roles.map((rol) => (
                        <SelectItem key={rol.id} value={rol.nombre}>
                          {rol.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-[140px]" data-testid="select-filtro-estado">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="activos">Activos</SelectItem>
                      <SelectItem value="inactivos">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsuarios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No se encontraron usuarios
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsuarios.map((user) => (
                        <TableRow key={user.id} data-testid={`row-usuario-${user.id}`}>
                          <TableCell className="font-medium" data-testid={`text-nombre-${user.id}`}>
                            {user.nombre}
                          </TableCell>
                          <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
                          <TableCell>{getRolBadge(user.rol)}</TableCell>
                          <TableCell>
                            {user.activo ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                Activo
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-600 border-red-500/20">
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDateTime(user.ultimoAcceso)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenUserDialog(user)}
                                title="Editar usuario"
                                data-testid={`button-edit-${user.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenPasswordDialog(user)}
                                title="Cambiar contraseña"
                                data-testid={`button-password-${user.id}`}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleUserStatus(user)}
                                title={user.activo ? "Desactivar usuario" : "Activar usuario"}
                                data-testid={`button-toggle-${user.id}`}
                              >
                                {user.activo ? (
                                  <UserX className="h-4 w-4 text-red-500" />
                                ) : (
                                  <UserCheck className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="flex-1 p-4 mt-0 overflow-auto">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Roles del Sistema
              </h3>
              <div className="grid gap-3">
                {roles.map((rol) => {
                  const IconComponent = rolIcons[rol.nombre] || Shield;
                  const colorClass = rolColors[rol.nombre] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
                  const isSelected = selectedRol?.id === rol.id;

                  return (
                    <Card
                      key={rol.id}
                      className={`cursor-pointer transition-all hover-elevate ${
                        isSelected ? "ring-2 ring-primary" : ""
                      }`}
                      onClick={() => setSelectedRol(isSelected ? null : rol)}
                      data-testid={`card-rol-${rol.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{rol.nombre}</span>
                              {!rol.editable && (
                                <Badge variant="outline" className="text-xs">
                                  Sistema
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {rol.descripcion}
                            </p>
                          </div>
                          <Settings className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Key className="h-4 w-4" />
                Permisos por Módulo
                {selectedRol && (
                  <Badge className={rolColors[selectedRol.nombre]}>{selectedRol.nombre}</Badge>
                )}
              </h3>

              {selectedRol ? (
                <Card>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Accordion type="multiple" className="w-full" defaultValue={permisosModulos.map(m => m.modulo)}>
                        {permisosModulos.map((modulo) => {
                          const IconComponent = modulo.icon;
                          const permisosActivos = modulo.permisos.filter(
                            (p) => selectedRol.permisos[p.key]
                          ).length;

                          return (
                            <AccordionItem key={modulo.modulo} value={modulo.modulo}>
                              <AccordionTrigger className="px-4 hover:no-underline" data-testid={`accordion-${modulo.modulo}`}>
                                <div className="flex items-center gap-3">
                                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                                  <span>{modulo.modulo}</span>
                                  <Badge variant="secondary" className="ml-2">
                                    {permisosActivos}/{modulo.permisos.length}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3">
                                  {modulo.permisos.map((permiso) => (
                                    <div
                                      key={permiso.key}
                                      className="flex items-center justify-between py-2"
                                    >
                                      <Label
                                        htmlFor={`${selectedRol.id}-${permiso.key}`}
                                        className="text-sm font-normal cursor-pointer"
                                      >
                                        {permiso.label}
                                      </Label>
                                      <Switch
                                        id={`${selectedRol.id}-${permiso.key}`}
                                        checked={selectedRol.permisos[permiso.key] || false}
                                        onCheckedChange={() =>
                                          handleTogglePermiso(selectedRol, permiso.key)
                                        }
                                        disabled={!selectedRol.editable && selectedRol.nombre === "ADMIN"}
                                        data-testid={`switch-${permiso.key}`}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecciona un rol para ver y editar sus permisos</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedUser ? <Pencil className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              {selectedUser ? "Editar Usuario" : "Nuevo Usuario"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser
                ? "Modifica los datos del usuario"
                : "Crea un nuevo usuario en el sistema"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ej: Juan García"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                data-testid="input-nombre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej: juan@empresa.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select value={formRol} onValueChange={setFormRol}>
                <SelectTrigger id="rol" data-testid="select-rol">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((rol) => (
                    <SelectItem key={rol.id} value={rol.nombre}>
                      {rol.nombre} - {rol.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  data-testid="input-password"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitUser} disabled={submitting} data-testid="button-submit-user">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {selectedUser ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </DialogTitle>
            <DialogDescription>
              Establece una nueva contraseña para {selectedUser?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repetir contraseña"
                value={formConfirmPassword}
                onChange={(e) => setFormConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword} disabled={submitting} data-testid="button-change-password">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
