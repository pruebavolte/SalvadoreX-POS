"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  UserCog, 
  Mail, 
  Calendar, 
  Loader2, 
  Search, 
  Users, 
  Store, 
  Plus, 
  Pencil, 
  Trash2,
  Building2,
  MapPin,
  LogIn,
  Package,
  Check,
  X,
  Key,
  Boxes,
  Settings2,
  Settings,
  ChevronDown,
  ChevronRight,
  Crown,
  Sparkles,
  Save,
  Palette,
  Type,
  FormInput,
  Globe,
  FileText,
  Eye,
  EyeOff,
  Copy,
  LayoutDashboard,
  ExternalLink,
  RefreshCw,
  Monitor,
  Smartphone,
  AlertCircle,
  Lock
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import RolesTab, { SCOPE_COLORS } from "@/components/admin/RolesTab";
import PermissionsTab from "@/components/admin/PermissionsTab";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "USER" | "CUSTOMER";
  image?: string | null;
  createdAt: string;
  vertical_id?: string | null;
  vertical_name?: string | null;
  lastLoginDate?: string | null;
  location?: string | null;
}

interface Vertical {
  id: string;
  name: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  icon?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  user_count?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  productType?: string;
  price: number;
  cost?: number;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
  userId: string;
  categoryId?: string;
  categoryName?: string;
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
  product_type?: string;
  suggested_price?: number;
  suggested_cost?: number;
  image_url?: string;
  is_active?: boolean;
  display_order?: number;
  created_at?: string;
  verticals?: { id: string; name: string };
}

interface Module {
  id: string;
  key: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  icon?: string;
  category?: string;
  is_premium?: boolean;
  is_ai_feature?: boolean;
  sort_order?: number;
}

interface RbacPermission {
  id: string;
  key: string;
  action: string;
  module: string;
  description: string | null;
}

interface RbacRole {
  id: string;
  tenant_id: string | null;
  scope: "PLATFORM" | "WHITE_LABEL" | "BUSINESS" | "EMPLOYEE";
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  permissions?: RbacPermission[];
}

const RBAC_SCOPE_LABELS: Record<string, string> = {
  PLATFORM: "Plataforma",
  WHITE_LABEL: "Marca Blanca",
  BUSINESS: "Negocio",
  EMPLOYEE: "Empleado",
};

const PERMISSION_MODULE_NAMES: Record<string, string> = {
  pos: "POS",
  kitchen: "Cocina",
  cash_register: "Corte de Caja",
  queue: "Fila Virtual",
  dashboard: "Dashboard",
  inventory: "Inventario",
  ingredients: "Ingredientes",
  digital_menu: "Menu Digital",
  returns: "Devoluciones",
  customers: "Clientes",
  requests: "Solicitudes",
  reports: "Reportes",
  billing: "Facturación",
  whitelabel: "Marcas Blancas",
  support: "Soporte Remoto",
  settings: "Configuración",
  orders: "Órdenes",
  admin: "Administración",
  products: "Productos",
  categories: "Categorías",
  users: "Usuarios",
  terminals: "Terminales",
  voice: "Órdenes por Voz",
  ai: "Funciones IA",
  platform: "Plataforma",
};

const ACTION_LABELS: Record<string, string> = {
  view: "Ver",
  view_own: "Ver propios",
  view_all: "Ver todos",
  create: "Crear/Agregar",
  edit: "Editar",
  edit_own: "Editar propios",
  edit_all: "Editar todos",
  delete: "Eliminar",
  delete_own: "Eliminar propios",
  delete_all: "Eliminar todos",
  cancel: "Cancelar",
  cancel_own: "Cancelar propios",
  cancel_all: "Cancelar todos",
  manage: "Administrar",
  export: "Exportar",
  import: "Importar",
  print: "Imprimir",
  process: "Procesar",
  refund: "Reembolsar",
  void: "Anular",
  discount: "Aplicar descuento",
  open_drawer: "Abrir cajón",
  close_shift: "Cerrar turno",
  open_shift: "Abrir turno",
  configure: "Configurar",
  assign: "Asignar",
  approve: "Aprobar",
  reject: "Rechazar",
  generate: "Generar",
  send: "Enviar",
  receive: "Recibir",
  transfer: "Transferir",
  adjust: "Ajustar",
  count: "Contar",
  access: "Acceder",
  use: "Usar",
  scan: "Escanear",
  search: "Buscar",
  filter: "Filtrar",
};

interface ModuleCategory {
  name: string;
  name_en: string;
  modules: Module[];
}

interface ModuleComponent {
  key: string;
  type: "textbox" | "button" | "combobox" | "tabs" | "toggle" | "section" | "column" | "label" | "card";
  defaultLabel: string;
  category: string;
}

interface ComponentConfig {
  enabled: boolean;
  customLabel: string | null;
}

const MODULE_COMPONENTS: Record<string, ModuleComponent[]> = {
  "productos": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar productos", category: "filtros" },
    { key: "category_filter", type: "combobox", defaultLabel: "Filtrar por categoría", category: "filtros" },
    { key: "stock_filter", type: "combobox", defaultLabel: "Filtrar por stock", category: "filtros" },
    { key: "channel_filter", type: "combobox", defaultLabel: "Filtrar por canal", category: "filtros" },
    { key: "add_product_btn", type: "button", defaultLabel: "Agregar Producto", category: "acciones" },
    { key: "search_btn", type: "button", defaultLabel: "Buscar", category: "acciones" },
    { key: "clear_btn", type: "button", defaultLabel: "Limpiar", category: "acciones" },
    { key: "sku_column", type: "column", defaultLabel: "SKU", category: "tabla" },
    { key: "name_column", type: "column", defaultLabel: "Producto", category: "tabla" },
    { key: "category_column", type: "column", defaultLabel: "Categoría", category: "tabla" },
    { key: "price_column", type: "column", defaultLabel: "Precio", category: "tabla" },
    { key: "stock_column", type: "column", defaultLabel: "Stock", category: "tabla" },
    { key: "status_column", type: "column", defaultLabel: "Estado", category: "tabla" },
  ],
  "clientes": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar cliente", category: "filtros" },
    { key: "credit_filter", type: "combobox", defaultLabel: "Filtrar por crédito", category: "filtros" },
    { key: "add_customer_btn", type: "button", defaultLabel: "Nuevo Cliente", category: "acciones" },
    { key: "name_column", type: "column", defaultLabel: "Nombre", category: "tabla" },
    { key: "phone_column", type: "column", defaultLabel: "Teléfono", category: "tabla" },
    { key: "email_column", type: "column", defaultLabel: "Correo", category: "tabla" },
    { key: "credit_column", type: "column", defaultLabel: "Saldo Crédito", category: "tabla" },
    { key: "points_column", type: "column", defaultLabel: "Puntos", category: "tabla" },
    { key: "total_customers_card", type: "card", defaultLabel: "Total Clientes", category: "estadísticas" },
    { key: "with_credit_card", type: "card", defaultLabel: "Con Crédito", category: "estadísticas" },
    { key: "total_credit_card", type: "card", defaultLabel: "Saldo Total", category: "estadísticas" },
  ],
  "pos": [
    { key: "search_bar", type: "textbox", defaultLabel: "Buscar producto", category: "búsqueda" },
    { key: "category_tabs", type: "tabs", defaultLabel: "Categorías", category: "navegación" },
    { key: "best_sellers_tab", type: "button", defaultLabel: "Más Vendidos", category: "navegación" },
    { key: "all_products_tab", type: "button", defaultLabel: "Todos", category: "navegación" },
    { key: "cart_section", type: "section", defaultLabel: "Carrito", category: "carrito" },
    { key: "cart_btn", type: "button", defaultLabel: "Carrito", category: "acciones" },
    { key: "pay_btn", type: "button", defaultLabel: "Pagar", category: "acciones" },
    { key: "clear_cart_btn", type: "button", defaultLabel: "Limpiar Carrito", category: "acciones" },
    { key: "voice_order_btn", type: "button", defaultLabel: "Pedido por Voz", category: "ia" },
    { key: "discount_input", type: "textbox", defaultLabel: "Descuento", category: "carrito" },
    { key: "customer_select", type: "combobox", defaultLabel: "Seleccionar Cliente", category: "carrito" },
  ],
  "menu_digital": [
    { key: "add_product_btn", type: "button", defaultLabel: "Agregar Producto", category: "acciones" },
    { key: "digitalize_btn", type: "button", defaultLabel: "Digitalizar Menú", category: "ia" },
    { key: "share_btn", type: "button", defaultLabel: "Compartir Menú", category: "acciones" },
    { key: "select_mode_btn", type: "button", defaultLabel: "Modo Selección", category: "acciones" },
    { key: "view_toggle", type: "toggle", defaultLabel: "Vista Grid/Lista", category: "visualización" },
    { key: "image_size_toggle", type: "toggle", defaultLabel: "Tamaño de Imagen", category: "visualización" },
    { key: "language_selector", type: "combobox", defaultLabel: "Idioma", category: "configuración" },
    { key: "currency_selector", type: "combobox", defaultLabel: "Moneda", category: "configuración" },
    { key: "category_filter", type: "tabs", defaultLabel: "Categorías", category: "filtros" },
    { key: "best_sellers_tab", type: "button", defaultLabel: "Más Vendidos", category: "filtros" },
    { key: "total_items_card", type: "card", defaultLabel: "Total Productos", category: "estadísticas" },
    { key: "categories_card", type: "card", defaultLabel: "Categorías", category: "estadísticas" },
    { key: "avg_price_card", type: "card", defaultLabel: "Precio Promedio", category: "estadísticas" },
  ],
  "inventario": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar en inventario", category: "filtros" },
    { key: "category_filter", type: "combobox", defaultLabel: "Filtrar por categoría", category: "filtros" },
    { key: "stock_filter", type: "combobox", defaultLabel: "Filtrar por stock", category: "filtros" },
    { key: "add_product_btn", type: "button", defaultLabel: "Agregar Producto", category: "acciones" },
    { key: "manage_recipe_btn", type: "button", defaultLabel: "Gestionar Receta", category: "acciones" },
    { key: "total_products_card", type: "card", defaultLabel: "Total Productos", category: "estadísticas" },
    { key: "low_stock_card", type: "card", defaultLabel: "Stock Bajo", category: "estadísticas" },
    { key: "out_of_stock_card", type: "card", defaultLabel: "Agotados", category: "estadísticas" },
    { key: "total_value_card", type: "card", defaultLabel: "Valor Total", category: "estadísticas" },
  ],
  "reportes": [
    { key: "date_filter", type: "combobox", defaultLabel: "Período", category: "filtros" },
    { key: "export_btn", type: "button", defaultLabel: "Exportar", category: "acciones" },
    { key: "sales_tab", type: "tabs", defaultLabel: "Ventas", category: "navegación" },
    { key: "products_tab", type: "tabs", defaultLabel: "Productos", category: "navegación" },
    { key: "payments_tab", type: "tabs", defaultLabel: "Pagos", category: "navegación" },
    { key: "categories_tab", type: "tabs", defaultLabel: "Categorías", category: "navegación" },
    { key: "total_revenue_card", type: "card", defaultLabel: "Ventas Totales", category: "estadísticas" },
    { key: "total_sales_card", type: "card", defaultLabel: "Número de Ventas", category: "estadísticas" },
    { key: "avg_ticket_card", type: "card", defaultLabel: "Ticket Promedio", category: "estadísticas" },
    { key: "sales_chart", type: "section", defaultLabel: "Gráfico de Ventas", category: "gráficos" },
    { key: "products_chart", type: "section", defaultLabel: "Productos Más Vendidos", category: "gráficos" },
  ],
  "facturacion": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar factura", category: "filtros" },
    { key: "status_filter", type: "combobox", defaultLabel: "Estado", category: "filtros" },
    { key: "date_filter", type: "combobox", defaultLabel: "Fecha", category: "filtros" },
    { key: "new_invoice_btn", type: "button", defaultLabel: "Nueva Factura", category: "acciones" },
    { key: "upload_csd_btn", type: "button", defaultLabel: "Subir Certificados", category: "acciones" },
    { key: "invoice_number_column", type: "column", defaultLabel: "Número", category: "tabla" },
    { key: "client_column", type: "column", defaultLabel: "Cliente", category: "tabla" },
    { key: "amount_column", type: "column", defaultLabel: "Monto", category: "tabla" },
    { key: "status_column", type: "column", defaultLabel: "Estado", category: "tabla" },
  ],
  "devoluciones": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar devolución", category: "filtros" },
    { key: "status_filter", type: "combobox", defaultLabel: "Estado", category: "filtros" },
    { key: "new_return_btn", type: "button", defaultLabel: "Nueva Devolución", category: "acciones" },
    { key: "return_number_column", type: "column", defaultLabel: "Número", category: "tabla" },
    { key: "order_column", type: "column", defaultLabel: "Orden Original", category: "tabla" },
    { key: "reason_column", type: "column", defaultLabel: "Motivo", category: "tabla" },
    { key: "amount_column", type: "column", defaultLabel: "Monto", category: "tabla" },
    { key: "total_returns_card", type: "card", defaultLabel: "Total Devoluciones", category: "estadísticas" },
  ],
  "ingredientes": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar ingrediente", category: "filtros" },
    { key: "category_filter", type: "combobox", defaultLabel: "Categoría", category: "filtros" },
    { key: "add_ingredient_btn", type: "button", defaultLabel: "Agregar Ingrediente", category: "acciones" },
    { key: "adjust_stock_btn", type: "button", defaultLabel: "Ajustar Stock", category: "acciones" },
    { key: "name_column", type: "column", defaultLabel: "Nombre", category: "tabla" },
    { key: "stock_column", type: "column", defaultLabel: "Stock", category: "tabla" },
    { key: "unit_column", type: "column", defaultLabel: "Unidad", category: "tabla" },
    { key: "cost_column", type: "column", defaultLabel: "Costo", category: "tabla" },
  ],
  "corte_caja": [
    { key: "current_shift_section", type: "section", defaultLabel: "Turno Actual", category: "información" },
    { key: "open_shift_btn", type: "button", defaultLabel: "Abrir Turno", category: "acciones" },
    { key: "close_shift_btn", type: "button", defaultLabel: "Cerrar Turno", category: "acciones" },
    { key: "add_movement_btn", type: "button", defaultLabel: "Agregar Movimiento", category: "acciones" },
    { key: "initial_cash_input", type: "textbox", defaultLabel: "Efectivo Inicial", category: "formulario" },
    { key: "final_cash_input", type: "textbox", defaultLabel: "Efectivo Final", category: "formulario" },
    { key: "movements_table", type: "section", defaultLabel: "Movimientos", category: "tabla" },
    { key: "summary_section", type: "section", defaultLabel: "Resumen del Turno", category: "información" },
  ],
  "cocina": [
    { key: "pending_orders_section", type: "section", defaultLabel: "Pedidos Pendientes", category: "información" },
    { key: "in_progress_section", type: "section", defaultLabel: "En Preparación", category: "información" },
    { key: "ready_section", type: "section", defaultLabel: "Listos", category: "información" },
    { key: "mark_ready_btn", type: "button", defaultLabel: "Marcar Listo", category: "acciones" },
    { key: "start_cooking_btn", type: "button", defaultLabel: "Iniciar Preparación", category: "acciones" },
    { key: "order_details_section", type: "section", defaultLabel: "Detalles del Pedido", category: "información" },
  ],
  "fila": [
    { key: "queue_display", type: "section", defaultLabel: "Cola de Espera", category: "información" },
    { key: "call_next_btn", type: "button", defaultLabel: "Llamar Siguiente", category: "acciones" },
    { key: "add_to_queue_btn", type: "button", defaultLabel: "Agregar a Cola", category: "acciones" },
    { key: "estimated_time_label", type: "label", defaultLabel: "Tiempo Estimado", category: "información" },
    { key: "position_label", type: "label", defaultLabel: "Posición en Cola", category: "información" },
  ],
  "usuarios": [
    { key: "search_input", type: "textbox", defaultLabel: "Buscar usuario", category: "filtros" },
    { key: "role_filter", type: "combobox", defaultLabel: "Filtrar por rol", category: "filtros" },
    { key: "add_user_btn", type: "button", defaultLabel: "Agregar Usuario", category: "acciones" },
    { key: "name_column", type: "column", defaultLabel: "Nombre", category: "tabla" },
    { key: "email_column", type: "column", defaultLabel: "Correo", category: "tabla" },
    { key: "role_column", type: "column", defaultLabel: "Rol", category: "tabla" },
    { key: "status_column", type: "column", defaultLabel: "Estado", category: "tabla" },
  ],
  "configuracion": [
    { key: "business_name_input", type: "textbox", defaultLabel: "Nombre del Negocio", category: "general" },
    { key: "address_input", type: "textbox", defaultLabel: "Dirección", category: "general" },
    { key: "phone_input", type: "textbox", defaultLabel: "Teléfono", category: "general" },
    { key: "email_input", type: "textbox", defaultLabel: "Correo", category: "general" },
    { key: "save_btn", type: "button", defaultLabel: "Guardar", category: "acciones" },
    { key: "currency_select", type: "combobox", defaultLabel: "Moneda", category: "pos" },
    { key: "auto_drawer_toggle", type: "toggle", defaultLabel: "Abrir Cajón Automático", category: "pos" },
    { key: "print_receipt_toggle", type: "toggle", defaultLabel: "Imprimir Recibo Automático", category: "pos" },
  ],
};

const COMPONENT_TYPE_ICONS: Record<string, string> = {
  textbox: "text-cursor-input",
  button: "square",
  combobox: "list",
  tabs: "folder-open",
  toggle: "toggle-left",
  section: "layout-panel-top",
  column: "columns",
  label: "tag",
  card: "credit-card",
};

const COMPONENT_CATEGORY_LABELS: Record<string, string> = {
  filtros: "Filtros",
  acciones: "Acciones",
  tabla: "Columnas de Tabla",
  búsqueda: "Búsqueda",
  navegación: "Navegación",
  carrito: "Carrito",
  ia: "Inteligencia Artificial",
  visualización: "Visualización",
  configuración: "Configuración",
  estadísticas: "Estadísticas",
  gráficos: "Gráficos",
  información: "Información",
  formulario: "Formulario",
  general: "General",
  pos: "Punto de Venta",
};

// Map module names to MODULE_COMPONENTS keys
const MODULE_NAME_TO_KEY: Record<string, string> = {
  "productos": "productos",
  "clientes": "clientes",
  "pos": "pos",
  "punto de venta": "pos",
  "menú digital": "menu_digital",
  "menu digital": "menu_digital",
  "inventario": "inventario",
  "reportes": "reportes",
  "órdenes": "ordenes",
  "ordenes": "ordenes",
  "devoluciones": "devoluciones",
  "ingredientes": "ingredientes",
  "corte de caja": "corte_caja",
  "corte caja": "corte_caja",
  "cocina": "cocina",
  "pantalla cocina": "cocina",
  "fila virtual": "fila",
  "fila": "fila",
  "usuarios": "usuarios",
  "configuración": "configuracion",
  "configuracion": "configuracion",
  "ajustes": "configuracion",
};

// Helper function to get MODULE_COMPONENTS key from module
const getModuleComponentsKey = (module: Module): string => {
  // First try the module's key field
  if (module.key && MODULE_COMPONENTS[module.key]) {
    return module.key;
  }
  
  // Then try normalized name mapping
  const normalizedName = module.name.toLowerCase().trim();
  if (MODULE_NAME_TO_KEY[normalizedName] && MODULE_COMPONENTS[MODULE_NAME_TO_KEY[normalizedName]]) {
    return MODULE_NAME_TO_KEY[normalizedName];
  }
  
  // Try generating key from name (remove accents, replace spaces with underscores)
  const generatedKey = normalizedName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "_"); // Replace spaces with underscores
  
  if (MODULE_COMPONENTS[generatedKey]) {
    return generatedKey;
  }
  
  // Fallback to module id
  return module.id;
};

const DynamicIcon = ({ name, className = "" }: { name?: string; className?: string }) => {
  if (!name) return <Boxes className={className} />;
  const pascalName = name
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
  const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascalName];
  return IconComponent ? <IconComponent className={className} /> : <Boxes className={className} />;
};

export default function AdminManagementPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [users, setUsers] = useState<User[]>([]);
  const [verticals, setVerticals] = useState<Vertical[]>([]);
  const [loading, setLoading] = useState(true);
  const [verticalsLoading, setVerticalsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [verticalSearchTerm, setVerticalSearchTerm] = useState("");
  const [showVerticalDropdown, setShowVerticalDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "USER" | "CUSTOMER">("USER");
  const [selectedVerticalId, setSelectedVerticalId] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isVerticalDialogOpen, setIsVerticalDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  
  // Estados para edición de branding de marca blanca
  const [editUserBranding, setEditUserBranding] = useState({
    tenantId: "",
    customDomain: "",
    platformName: "",
    logoUrl: "",
    primaryColor: "#3b82f6",
  });
  const [loadingUserBranding, setLoadingUserBranding] = useState(false);
  const [isWhiteLabelUser, setIsWhiteLabelUser] = useState(false);
  
  // Estados para edición de email y contraseña
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [savingUserCredentials, setSavingUserCredentials] = useState(false);
  
  const [editingVertical, setEditingVertical] = useState<Vertical | null>(null);
  const [newVerticalName, setNewVerticalName] = useState("");
  const [newVerticalDisplayName, setNewVerticalDisplayName] = useState("");
  const [newVerticalDescription, setNewVerticalDescription] = useState("");
  const [newVerticalIcon, setNewVerticalIcon] = useState("store");
  const [savingVertical, setSavingVertical] = useState(false);

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [templateProducts, setTemplateProducts] = useState<TemplateProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVerticalIds, setSelectedVerticalIds] = useState<string[]>([]);
  const [expandedPermissionModules, setExpandedPermissionModules] = useState<Set<string>>(new Set());
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [templateVerticalSearchTerm, setTemplateVerticalSearchTerm] = useState("");
  const [savingTemplates, setSavingTemplates] = useState(false);
  
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    barcode: "",
    sku: "",
    price: 0,
    cost: 0,
    description: "",
    category_name: "",
    stock: 0,
    min_stock: 10,
    max_stock: 500,
    image_url: "",
    unit: "Pieza",
    active: true,
    available_in_pos: true,
    available_in_digital_menu: false,
    track_inventory: true,
  });

  // Module assignment states
  const [expandedVerticalId, setExpandedVerticalId] = useState<string | null>(null);
  const [allModules, setAllModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<Record<string, Set<string>>>({});
  const [originalModules, setOriginalModules] = useState<Record<string, Set<string>>>({});
  const [modulesLoading, setModulesLoading] = useState(false);
  const [verticalModulesLoading, setVerticalModulesLoading] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Template products per vertical states
  const [verticalInnerTab, setVerticalInnerTab] = useState<Record<string, string>>({});
  const [verticalTemplateProducts, setVerticalTemplateProducts] = useState<Record<string, TemplateProduct[]>>({});
  const [verticalTemplatesLoading, setVerticalTemplatesLoading] = useState(false);
  const [isAddTemplateDialogOpen, setIsAddTemplateDialogOpen] = useState(false);
  const [templateAddMode, setTemplateAddMode] = useState<"create" | "catalog">("catalog");
  const [selectedCatalogProducts, setSelectedCatalogProducts] = useState<Set<string>>(new Set());
  const [catalogSearchTerm, setCatalogSearchTerm] = useState("");
  const [debouncedCatalogTerm, setDebouncedCatalogTerm] = useState("");
  const [showCatalogResults, setShowCatalogResults] = useState(false);
  const [catalogTotalResults, setCatalogTotalResults] = useState(0);
  const [catalogCurrentPage, setCatalogCurrentPage] = useState(1);
  const [catalogLimit, setCatalogLimit] = useState(100); // Lower limit for better pagination UX
  const lastSearchTermRef = useRef(""); // Track last searched term to detect new searches
  const fetchAbortControllerRef = useRef<AbortController | null>(null); // AbortController for fetchAllProducts
  const fetchRequestIdRef = useRef(0); // Request ID counter to prevent stale updates
  const [newTemplateProduct, setNewTemplateProduct] = useState({
    name: "",
    description: "",
    sku: "",
    barcode: "",
    category_name: "",
    product_type: "normal",
    suggested_price: 0,
    suggested_cost: 0,
    image_url: "",
  });
  const [savingTemplateProduct, setSavingTemplateProduct] = useState(false);
  
  // Category expansion states for "Add all products from category" feature
  const [expandedProductCategories, setExpandedProductCategories] = useState<Set<string>>(new Set());
  const [categoryProducts, setCategoryProducts] = useState<Record<string, Product[]>>({});
  const [categoryProductsLoading, setCategoryProductsLoading] = useState<Set<string>>(new Set());
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState<Set<string>>(new Set());

  // UI Configuration states (terminology and custom fields)
  const [verticalUIConfig, setVerticalUIConfig] = useState<Record<string, {
    terminology: Record<string, string>;
    entity_fields: Array<{
      id?: string;
      entity_type: string;
      field_key: string;
      field_label: string;
      field_type: string;
      required?: boolean;
      show_in_list?: boolean;
      show_in_form?: boolean;
      show_in_detail?: boolean;
    }>;
  }>>({});
  const [uiConfigLoading, setUiConfigLoading] = useState(false);
  const [savingUIConfig, setSavingUIConfig] = useState(false);
  const [newCustomField, setNewCustomField] = useState({
    entity_type: "product",
    field_key: "",
    field_label: "",
    field_type: "text",
    required: false,
    show_in_list: true,
    show_in_form: true,
    show_in_detail: true,
  });

  // Module component configuration states
  const [expandedModuleForConfig, setExpandedModuleForConfig] = useState<string | null>(null);
  const [componentConfigs, setComponentConfigs] = useState<Record<string, Record<string, ComponentConfig>>>({});
  const [editingComponentLabel, setEditingComponentLabel] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");

  // Create user states
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [rbacRoles, setRbacRoles] = useState<RbacRole[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [allPermissions, setAllPermissions] = useState<Array<{ id: string; key: string; module: string; action: string; description: string | null }>>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Array<{ id: string; key: string; module: string; action: string; description: string | null }>>>({});
  const [newUserData, setNewUserData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    roleId: "custom",
    verticalId: "",
    customDomain: "",
    platformName: "",
    logoUrl: "",
    primaryColor: "#3b82f6",
    selectedPermissions: [] as string[],
  });
  const [detectedDnsProvider, setDetectedDnsProvider] = useState<string | null>(null);
  const [dnsInstructions, setDnsInstructions] = useState<string | null>(null);
  const [lookingUpDns, setLookingUpDns] = useState(false);
  const [domainVerified, setDomainVerified] = useState(false);
  const [cnameTarget, setCnameTarget] = useState<string | null>(null);
  const [linkingDomain, setLinkingDomain] = useState(false);
  
  const [showGoDaddyAuth, setShowGoDaddyAuth] = useState(false);
  const [godaddyApiKey, setGodaddyApiKey] = useState("");
  const [godaddyApiSecret, setGodaddyApiSecret] = useState("");
  const [configuringGoDaddy, setConfiguringGoDaddy] = useState(false);
  const [godaddyVerified, setGodaddyVerified] = useState(false);
  const [godaddyDomainInfo, setGodaddyDomainInfo] = useState<{
    status?: string;
    expirationDate?: string;
    hasExistingCname?: boolean;
    existingCnameTarget?: string;
    isAlreadyLinked?: boolean;
  } | null>(null);

  const getComponentConfigKey = (verticalId: string, moduleKey: string) => `${verticalId}_${moduleKey}`;
  
  const getComponentConfig = (verticalId: string, moduleKey: string, componentKey: string): ComponentConfig => {
    const configKey = getComponentConfigKey(verticalId, moduleKey);
    const moduleConfigs = componentConfigs[configKey] || {};
    return moduleConfigs[componentKey] || { enabled: true, customLabel: null };
  };

  const setComponentConfig = (verticalId: string, moduleKey: string, componentKey: string, config: Partial<ComponentConfig>) => {
    const configKey = getComponentConfigKey(verticalId, moduleKey);
    setComponentConfigs(prev => ({
      ...prev,
      [configKey]: {
        ...prev[configKey],
        [componentKey]: {
          ...getComponentConfig(verticalId, moduleKey, componentKey),
          ...config
        }
      }
    }));
  };

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModuleForConfig(prev => prev === moduleId ? null : moduleId);
  };

  const startEditingLabel = (componentId: string, currentLabel: string) => {
    setEditingComponentLabel(componentId);
    setEditingLabelValue(currentLabel);
  };

  const cancelEditingLabel = () => {
    setEditingComponentLabel(null);
    setEditingLabelValue("");
  };

  const saveEditingLabel = (verticalId: string, moduleKey: string, componentKey: string) => {
    const trimmedValue = editingLabelValue.trim();
    if (trimmedValue) {
      const defaultLabel = MODULE_COMPONENTS[moduleKey]?.find(c => c.key === componentKey)?.defaultLabel || "";
      setComponentConfig(verticalId, moduleKey, componentKey, {
        customLabel: trimmedValue !== defaultLabel ? trimmedValue : null
      });
    }
    cancelEditingLabel();
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, verticalId: string, moduleKey: string, componentKey: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveEditingLabel(verticalId, moduleKey, componentKey);
    } else if (e.key === "Escape") {
      cancelEditingLabel();
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchVerticals();
    fetchRbacRoles();
    fetchAllPermissions();
  }, []);

  useEffect(() => {
    if (activeTab === "templates") {
      fetchAllProducts();
      fetchTemplateProducts();
    }
  }, [activeTab]);

  // Debounce the catalog search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCatalogTerm(catalogSearchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [catalogSearchTerm]);

  // Fetch products when debounced term or page changes
  useEffect(() => {
    if (!debouncedCatalogTerm.trim()) {
      // Cancel any in-flight request
      if (fetchAbortControllerRef.current) {
        fetchAbortControllerRef.current.abort();
      }
      // Increment request ID to invalidate any pending responses
      fetchRequestIdRef.current += 1;
      
      // Clear loading state since we cancelled the request
      setProductsLoading(false);
      
      // Now safe to clear state
      setAllProducts([]);
      setCatalogTotalResults(0);
      setCatalogCurrentPage(1);
      lastSearchTermRef.current = "";
      return;
    }

    // Check if this is a new search term (not just pagination)
    const isNewSearch = lastSearchTermRef.current !== debouncedCatalogTerm;
    
    if (isNewSearch) {
      // New search: reset to page 1 first, then fetch
      lastSearchTermRef.current = debouncedCatalogTerm;
      if (catalogCurrentPage !== 1) {
        // Setting page to 1 will trigger this effect again, which will then fetch
        setCatalogCurrentPage(1);
        return;
      }
      // If already on page 1, fetch directly
      fetchAllProducts(debouncedCatalogTerm, 1);
    } else {
      // Same search, just page navigation
      fetchAllProducts(debouncedCatalogTerm, catalogCurrentPage);
    }
  }, [debouncedCatalogTerm, catalogCurrentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");

      if (!response.ok) {
        throw new Error("Error al obtener usuarios");
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchVerticals = async () => {
    try {
      setVerticalsLoading(true);
      const response = await fetch("/api/verticals?active=false");

      if (!response.ok) {
        throw new Error("Error al obtener giros de negocio");
      }

      const data = await response.json();
      setVerticals(data.data || []);
    } catch (error) {
      console.error("Error fetching verticals:", error);
      toast.error("Error al cargar los giros de negocio");
    } finally {
      setVerticalsLoading(false);
    }
  };

  const fetchRbacRoles = async () => {
    try {
      const response = await fetch("/api/admin/roles");
      if (response.ok) {
        const data = await response.json();
        setRbacRoles(data.roles || []);
      }
    } catch (error) {
      console.error("Error fetching RBAC roles:", error);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const response = await fetch("/api/admin/permissions");
      if (response.ok) {
        const data = await response.json();
        setAllPermissions(data.permissions || []);
        setGroupedPermissions(data.grouped || {});
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
    }
  };

  const handleRoleSelect = (roleId: string) => {
    const selectedRole = rbacRoles.find(r => r.id === roleId);
    const rolePermissionIds = selectedRole?.permissions?.map(p => p.id) || [];
    setNewUserData(prev => ({ 
      ...prev, 
      roleId, 
      selectedPermissions: rolePermissionIds 
    }));
  };

  const togglePermission = (permissionId: string) => {
    setNewUserData(prev => {
      const isSelected = prev.selectedPermissions.includes(permissionId);
      return {
        ...prev,
        selectedPermissions: isSelected
          ? prev.selectedPermissions.filter(id => id !== permissionId)
          : [...prev.selectedPermissions, permissionId]
      };
    });
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms = groupedPermissions[module] || [];
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => newUserData.selectedPermissions.includes(id));
    
    setNewUserData(prev => {
      if (allSelected) {
        return {
          ...prev,
          selectedPermissions: prev.selectedPermissions.filter(id => !modulePermIds.includes(id))
        };
      } else {
        const newPerms = new Set([...prev.selectedPermissions, ...modulePermIds]);
        return {
          ...prev,
          selectedPermissions: Array.from(newPerms)
        };
      }
    });
  };

  const getModuleCheckState = (module: string): "all" | "some" | "none" => {
    const modulePerms = groupedPermissions[module] || [];
    if (modulePerms.length === 0) return "none";
    const modulePermIds = modulePerms.map(p => p.id);
    const selectedCount = modulePermIds.filter(id => newUserData.selectedPermissions.includes(id)).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === modulePerms.length) return "all";
    return "some";
  };

  const getActionLabel = (action: string): string => {
    return ACTION_LABELS[action] || action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const togglePermissionModule = (module: string) => {
    setExpandedPermissionModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(module)) {
        newSet.delete(module);
      } else {
        newSet.add(module);
      }
      return newSet;
    });
  };

  const lookupDnsProvider = async (domain: string): Promise<{ verified: boolean; providerName: string; cnameTarget: string; instructions: string } | null> => {
    if (!domain || domain.length < 4 || !domain.includes(".")) {
      setDetectedDnsProvider(null);
      setDnsInstructions(null);
      setDomainVerified(false);
      setCnameTarget(null);
      return null;
    }
    
    setLookingUpDns(true);
    try {
      const response = await fetch("/api/admin/dns-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setDetectedDnsProvider(data.providerName);
        setDnsInstructions(data.cnameInstructions);
        setDomainVerified(data.verified);
        setCnameTarget(data.cnameTarget);
        return {
          verified: data.verified,
          providerName: data.providerName,
          cnameTarget: data.cnameTarget,
          instructions: data.cnameInstructions
        };
      } else {
        setDetectedDnsProvider("No detectado");
        setDnsInstructions(null);
        return null;
      }
    } catch (error) {
      console.error("DNS lookup error:", error);
      setDetectedDnsProvider("Error al detectar");
      return null;
    } finally {
      setLookingUpDns(false);
    }
  };

  const handleDomainChange = (domain: string) => {
    setNewUserData(prev => ({ ...prev, customDomain: domain }));
    setDetectedDnsProvider(null);
    setDomainVerified(false);
  };

  const handleDomainBlur = () => {
    if (newUserData.customDomain) {
      lookupDnsProvider(newUserData.customDomain);
    }
  };

  const handleLinkDomain = async () => {
    if (!newUserData.customDomain) {
      toast.error("Por favor ingresa un dominio");
      return;
    }
    
    setLinkingDomain(true);
    try {
      const result = await lookupDnsProvider(newUserData.customDomain);
      
      if (result?.verified) {
        toast.success(`Dominio ${newUserData.customDomain} verificado y enlazado correctamente`);
      } else {
        if (result?.providerName?.toLowerCase().includes("godaddy")) {
          setShowGoDaddyAuth(true);
          toast.info("GoDaddy detectado. Puedes configurar el DNS automáticamente.", { duration: 5000 });
        } else {
          toast.info(
            `Para enlazar ${newUserData.customDomain}, configura un registro CNAME apuntando a ${result?.cnameTarget || "systeminternational.app"}`,
            { duration: 8000 }
          );
        }
      }
    } catch (error) {
      toast.error("Error al verificar el dominio");
    } finally {
      setLinkingDomain(false);
    }
  };

  const handleVerifyGoDaddy = async () => {
    if (!newUserData.customDomain || !godaddyApiKey || !godaddyApiSecret) {
      toast.error("Por favor ingresa el dominio y las credenciales de GoDaddy");
      return;
    }

    setConfiguringGoDaddy(true);
    try {
      const response = await fetch("/api/admin/godaddy-dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newUserData.customDomain,
          apiKey: godaddyApiKey,
          apiSecret: godaddyApiSecret,
          action: "verify",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setGodaddyVerified(true);
        setGodaddyDomainInfo({
          status: data.status,
          expirationDate: data.expirationDate,
          hasExistingCname: data.hasExistingCname,
          existingCnameTarget: data.existingCnameTarget,
          isAlreadyLinked: data.isAlreadyLinked,
        });

        if (data.isAlreadyLinked) {
          setDomainVerified(true);
          toast.success("¡El dominio ya está configurado correctamente!");
        } else {
          toast.success("Dominio verificado en GoDaddy. Puedes configurar el DNS ahora.");
        }
      } else {
        toast.error(data.error || "Error al verificar el dominio");
      }
    } catch (error) {
      toast.error("Error al conectar con GoDaddy");
    } finally {
      setConfiguringGoDaddy(false);
    }
  };

  const handleConfigureGoDaddy = async () => {
    if (!newUserData.customDomain || !godaddyApiKey || !godaddyApiSecret) {
      toast.error("Por favor ingresa el dominio y las credenciales de GoDaddy");
      return;
    }

    setConfiguringGoDaddy(true);
    try {
      const response = await fetch("/api/admin/godaddy-dns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: newUserData.customDomain,
          apiKey: godaddyApiKey,
          apiSecret: godaddyApiSecret,
          action: "configure",
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDomainVerified(true);
        setGodaddyDomainInfo(prev => ({ ...prev, isAlreadyLinked: true }));
        toast.success("¡DNS configurado correctamente! El registro CNAME apunta a systeminternational.app");
      } else {
        toast.error(data.error || "Error al configurar el DNS");
      }
    } catch (error) {
      toast.error("Error al conectar con GoDaddy");
    } finally {
      setConfiguringGoDaddy(false);
    }
  };

  const resetGoDaddyState = () => {
    setShowGoDaddyAuth(false);
    setGodaddyApiKey("");
    setGodaddyApiSecret("");
    setGodaddyVerified(false);
    setGodaddyDomainInfo(null);
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.firstName || !newUserData.lastName) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (!newUserData.roleId) {
      toast.error("Por favor selecciona un rol");
      return;
    }

    setCreatingUser(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newUserData.email,
          firstName: newUserData.firstName,
          lastName: newUserData.lastName,
          roleId: newUserData.roleId === "custom" ? null : newUserData.roleId,
          customPermissions: newUserData.selectedPermissions,
          verticalId: newUserData.verticalId && newUserData.verticalId !== "none" ? newUserData.verticalId : null,
          customDomain: newUserData.customDomain || null,
          branding: {
            platform_name: newUserData.platformName || null,
            logo_url: newUserData.logoUrl || null,
            primary_color: newUserData.primaryColor || "#3b82f6",
          },
        }),
      });

      if (response.ok) {
        toast.success("Usuario creado correctamente");
        setIsCreateUserDialogOpen(false);
        setNewUserData({
          email: "",
          firstName: "",
          lastName: "",
          roleId: "",
          verticalId: "",
          customDomain: "",
          platformName: "",
          logoUrl: "",
          primaryColor: "#3b82f6",
          selectedPermissions: [],
        });
        setDetectedDnsProvider(null);
        fetchUsers();
      } else {
        const data = await response.json();
        toast.error(data.error || "Error al crear usuario");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error("Error al crear usuario");
    } finally {
      setCreatingUser(false);
    }
  };

  const fetchAllProducts = async (searchTerm: string = "", page: number = 1) => {
    // Cancel previous request
    if (fetchAbortControllerRef.current) {
      fetchAbortControllerRef.current.abort();
    }
    
    // Create new controller and increment request ID
    const controller = new AbortController();
    fetchAbortControllerRef.current = controller;
    fetchRequestIdRef.current += 1;
    const currentRequestId = fetchRequestIdRef.current;
    
    try {
      setProductsLoading(true);
      const offset = (page - 1) * catalogLimit;
      const params = new URLSearchParams();
      if (searchTerm.trim()) {
        params.append("term", searchTerm.trim());
      }
      params.append("limit", catalogLimit.toString());
      params.append("offset", offset.toString());
      
      const response = await fetch(`/api/admin/all-products?${params.toString()}`, {
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Error al obtener productos");
      }

      const data = await response.json();
      
      // Only update state if this is still the latest request
      if (currentRequestId === fetchRequestIdRef.current) {
        setAllProducts(data.products || []);
        setCatalogTotalResults(data.total || 0);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Request was cancelled, don't modify loading state
        return;
      }
      console.error("Error fetching products:", error);
      toast.error("Error al cargar los productos");
    } finally {
      // Only set loading to false if this is still the latest request
      if (currentRequestId === fetchRequestIdRef.current) {
        setProductsLoading(false);
      }
    }
  };

  const fetchTemplateProducts = async () => {
    try {
      setTemplatesLoading(true);
      const response = await fetch("/api/admin/template-products");

      if (!response.ok) {
        throw new Error("Error al obtener productos plantilla");
      }

      const data = await response.json();
      setTemplateProducts(data.templateProducts || []);
    } catch (error) {
      console.error("Error fetching template products:", error);
      toast.error("Error al cargar los productos plantilla");
    } finally {
      setTemplatesLoading(false);
    }
  };

  // Fetch all available modules
  const fetchAllModules = async () => {
    try {
      setModulesLoading(true);
      const response = await fetch("/api/verticals/modules");
      if (!response.ok) throw new Error("Error al obtener módulos");
      const result = await response.json();
      setAllModules(result.data || []);
    } catch (error) {
      console.error("Error fetching modules:", error);
      toast.error("Error al cargar los módulos");
    } finally {
      setModulesLoading(false);
    }
  };

  // Fetch modules assigned to a specific vertical
  const fetchVerticalModules = async (verticalId: string) => {
    try {
      setVerticalModulesLoading(true);
      const response = await fetch(`/api/verticals/${verticalId}/modules`);
      if (!response.ok) throw new Error("Error al obtener módulos del vertical");
      const result = await response.json();
      // API returns { success: true, data: [{ module_id, module: {...} }, ...] }
      const assignedModuleIds = new Set<string>(
        (result.data || []).map((config: { module_id: string }) => config.module_id)
      );
      setSelectedModules(prev => ({ ...prev, [verticalId]: assignedModuleIds }));
      setOriginalModules(prev => ({ ...prev, [verticalId]: new Set(assignedModuleIds) }));
    } catch (error) {
      console.error("Error fetching vertical modules:", error);
      toast.error("Error al cargar los módulos del giro");
    } finally {
      setVerticalModulesLoading(false);
    }
  };

  // Toggle vertical expansion
  const toggleVerticalExpansion = async (verticalId: string) => {
    if (expandedVerticalId === verticalId) {
      setExpandedVerticalId(null);
      return;
    }
    
    setExpandedVerticalId(verticalId);
    
    // Fetch modules if not already loaded
    if (allModules.length === 0) {
      await fetchAllModules();
    }
    
    // Fetch vertical-specific modules if not already loaded
    if (!selectedModules[verticalId]) {
      await fetchVerticalModules(verticalId);
    }
  };

  // Toggle module selection - auto-expands components when selected
  const toggleModuleSelection = (verticalId: string, moduleId: string, moduleKey?: string) => {
    setSelectedModules(prev => {
      const current = prev[verticalId] || new Set();
      const updated = new Set(current);
      const wasSelected = updated.has(moduleId);
      
      if (wasSelected) {
        updated.delete(moduleId);
        // Collapse components when deselecting
        if (moduleKey) {
          setExpandedModuleForConfig(prev => 
            prev === `${verticalId}_${moduleKey}` ? null : prev
          );
        }
      } else {
        updated.add(moduleId);
        // Auto-expand components when selecting
        if (moduleKey) {
          setExpandedModuleForConfig(`${verticalId}_${moduleKey}`);
        }
      }
      return { ...prev, [verticalId]: updated };
    });
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => {
      const updated = new Set(prev);
      if (updated.has(categoryName)) {
        updated.delete(categoryName);
      } else {
        updated.add(categoryName);
      }
      return updated;
    });
  };

  // Check if modules have changed
  const hasModuleChanges = (verticalId: string) => {
    const current = selectedModules[verticalId];
    const original = originalModules[verticalId];
    if (!current || !original) return false;
    if (current.size !== original.size) return true;
    for (const id of current) {
      if (!original.has(id)) return true;
    }
    return false;
  };

  // Save module changes for a vertical
  const saveModuleChanges = async (verticalId: string) => {
    try {
      setSavingModules(true);
      const moduleIds = Array.from(selectedModules[verticalId] || []);
      
      const response = await fetch(`/api/verticals/${verticalId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module_ids: moduleIds }),
      });
      
      if (!response.ok) throw new Error("Error al guardar módulos");
      
      setOriginalModules(prev => ({ ...prev, [verticalId]: new Set(moduleIds) }));
      toast.success("Módulos guardados correctamente");
    } catch (error) {
      console.error("Error saving modules:", error);
      toast.error("Error al guardar los módulos");
    } finally {
      setSavingModules(false);
    }
  };

  // Fetch template products for a specific vertical
  const fetchVerticalTemplateProducts = async (verticalId: string) => {
    try {
      setVerticalTemplatesLoading(true);
      const response = await fetch(`/api/admin/template-products?verticalId=${verticalId}`);
      if (!response.ok) throw new Error("Error al obtener productos plantilla");
      const data = await response.json();
      setVerticalTemplateProducts(prev => ({ 
        ...prev, 
        [verticalId]: data.templateProducts || [] 
      }));
    } catch (error) {
      console.error("Error fetching vertical template products:", error);
      toast.error("Error al cargar los productos plantilla del giro");
    } finally {
      setVerticalTemplatesLoading(false);
    }
  };

  // Switch inner tab and load data if needed
  const switchVerticalInnerTab = async (verticalId: string, tab: string) => {
    setVerticalInnerTab(prev => ({ ...prev, [verticalId]: tab }));
    
    if (tab === "templates" && !verticalTemplateProducts[verticalId]) {
      await fetchVerticalTemplateProducts(verticalId);
    }
    
    if (tab === "ui-config" && !verticalUIConfig[verticalId]) {
      await fetchVerticalUIConfig(verticalId);
    }
  };

  // Save new template product for a vertical
  const saveNewTemplateProduct = async (verticalId: string) => {
    if (!newTemplateProduct.name.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }

    try {
      setSavingTemplateProduct(true);
      const response = await fetch("/api/admin/template-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_direct",
          ...newTemplateProduct,
          vertical_id: verticalId,
        }),
      });

      if (!response.ok) throw new Error("Error al crear producto plantilla");

      const data = await response.json();
      
      // Add new product to local state
      setVerticalTemplateProducts(prev => ({
        ...prev,
        [verticalId]: [...(prev[verticalId] || []), data.templateProduct],
      }));

      // Reset form
      setNewTemplateProduct({
        name: "",
        description: "",
        sku: "",
        barcode: "",
        category_name: "",
        product_type: "normal",
        suggested_price: 0,
        suggested_cost: 0,
        image_url: "",
      });
      setIsAddTemplateDialogOpen(false);
      toast.success("Producto plantilla creado correctamente");
    } catch (error) {
      console.error("Error saving template product:", error);
      toast.error("Error al crear el producto plantilla");
    } finally {
      setSavingTemplateProduct(false);
    }
  };

  // Delete template product
  const deleteTemplateProduct = async (verticalId: string, templateId: string) => {
    try {
      const response = await fetch(`/api/admin/template-products?id=${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar producto plantilla");

      // Remove from local state
      setVerticalTemplateProducts(prev => ({
        ...prev,
        [verticalId]: (prev[verticalId] || []).filter(p => p.id !== templateId),
      }));

      toast.success("Producto plantilla eliminado");
    } catch (error) {
      console.error("Error deleting template product:", error);
      toast.error("Error al eliminar el producto plantilla");
    }
  };

  // Fetch all products from a specific category
  const fetchCategoryProducts = async (categoryId: string, categoryName: string) => {
    if (categoryProducts[categoryId]) return; // Already loaded
    
    try {
      setCategoryProductsLoading(prev => new Set([...prev, categoryId]));
      
      const response = await fetch(`/api/admin/all-products?categoryId=${categoryId}&limit=500&offset=0`);
      
      if (!response.ok) {
        throw new Error("Error al obtener productos de la categoría");
      }
      
      const data = await response.json();
      setCategoryProducts(prev => ({
        ...prev,
        [categoryId]: data.products || [],
      }));
    } catch (error) {
      console.error("Error fetching category products:", error);
      toast.error(`Error al cargar productos de "${categoryName}"`);
    } finally {
      setCategoryProductsLoading(prev => {
        const next = new Set(prev);
        next.delete(categoryId);
        return next;
      });
    }
  };

  // Toggle category expansion for a product
  const toggleProductCategoryExpansion = async (productId: string, categoryId: string, categoryName: string, verticalId: string) => {
    const key = `${productId}-${categoryId}`;
    const isCurrentlyExpanded = expandedProductCategories.has(key);
    
    setExpandedProductCategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    
    // If expanding, fetch products and auto-select all
    if (!isCurrentlyExpanded && categoryId) {
      // If products not yet loaded, fetch them
      if (!categoryProducts[categoryId]) {
        try {
          setCategoryProductsLoading(prev => new Set([...prev, categoryId]));
          
          const response = await fetch(`/api/admin/all-products?categoryId=${categoryId}&limit=500&offset=0`);
          
          if (!response.ok) {
            throw new Error("Error al obtener productos de la categoría");
          }
          
          const data = await response.json();
          const products = data.products || [];
          
          setCategoryProducts(prev => ({
            ...prev,
            [categoryId]: products,
          }));
          
          // Auto-select all products from this category (excluding already added ones)
          const existingTemplateIds = new Set(
            (verticalTemplateProducts[verticalId] || [])
              .map(t => t.source_product_id)
              .filter(Boolean)
          );
          
          const productIdsToSelect = products
            .filter((p: any) => !existingTemplateIds.has(p.id))
            .map((p: any) => p.id);
          
          setSelectedCatalogProducts(prev => {
            const next = new Set(prev);
            productIdsToSelect.forEach((id: string) => next.add(id));
            return next;
          });
          
          setCategoryProductsLoading(prev => {
            const next = new Set(prev);
            next.delete(categoryId);
            return next;
          });
        } catch (error) {
          console.error("Error fetching category products:", error);
          toast.error(`Error al cargar productos de "${categoryName}"`);
          setCategoryProductsLoading(prev => {
            const next = new Set(prev);
            next.delete(categoryId);
            return next;
          });
        }
      } else {
        // Products already loaded, just auto-select all
        const existingTemplateIds = new Set(
          (verticalTemplateProducts[verticalId] || [])
            .map(t => t.source_product_id)
            .filter(Boolean)
        );
        
        const productIdsToSelect = categoryProducts[categoryId]
          .filter((p: any) => !existingTemplateIds.has(p.id))
          .map((p: any) => p.id);
        
        setSelectedCatalogProducts(prev => {
          const next = new Set(prev);
          productIdsToSelect.forEach((id: string) => next.add(id));
          return next;
        });
      }
    } else if (isCurrentlyExpanded) {
      // If collapsing, deselect all products from this category
      const categoryProductIds = new Set(
        (categoryProducts[categoryId] || []).map((p: any) => p.id)
      );
      
      setSelectedCatalogProducts(prev => {
        const next = new Set(prev);
        categoryProductIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  // Toggle selection for category products
  const toggleCategoryProductSelection = (productId: string) => {
    setSelectedCategoryProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
    // Also add to the main selection
    setSelectedCatalogProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Toggle product selection from catalog
  const toggleCatalogProductSelection = (product: any) => {
    setSelectedCatalogProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(product.id)) {
        newSet.delete(product.id);
      } else {
        newSet.add(product.id);
      }
      return newSet;
    });
  };

  // Add selected catalog products as templates
  const addCatalogProductsAsTemplates = async (verticalId: string) => {
    if (selectedCatalogProducts.size === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }

    try {
      setSavingTemplateProduct(true);
      const productsToAdd = allProducts.filter(p => selectedCatalogProducts.has(p.id));

      for (const product of productsToAdd) {
        const response = await fetch("/api/admin/template-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: product.id,
            verticalIds: [verticalId],
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Error al agregar producto");
        }
      }

      // Reload template products for this vertical
      await fetchVerticalTemplateProducts(verticalId);

      // Refresh catalog search to update available products
      // Reset to page 1 and refresh
      setCatalogCurrentPage(1);
      if (catalogSearchTerm.trim()) {
        await fetchAllProducts(catalogSearchTerm, 1);
      }

      // Reset selection only (keep search term so user can continue adding)
      setSelectedCatalogProducts(new Set());
      toast.success(`${productsToAdd.length} producto(s) agregado(s) como plantilla`);
    } catch (error) {
      console.error("Error adding catalog products as templates:", error);
      toast.error("Error al agregar productos del catálogo");
    } finally {
      setSavingTemplateProduct(false);
    }
  };

  // Fetch UI config for a vertical
  const fetchVerticalUIConfig = async (verticalId: string) => {
    if (verticalUIConfig[verticalId]) return; // Already loaded
    
    try {
      setUiConfigLoading(true);
      const response = await fetch(`/api/admin/vertical-ui-config?verticalId=${verticalId}`);
      
      if (!response.ok) {
        throw new Error("Error al obtener configuración UI");
      }
      
      const data = await response.json();
      setVerticalUIConfig(prev => ({
        ...prev,
        [verticalId]: {
          terminology: data.data?.terminology || {},
          entity_fields: data.data?.entity_fields || [],
        }
      }));
      
      // Hydrate componentConfigs state from component_overrides
      const componentOverrides = data.data?.component_overrides || [];
      if (componentOverrides.length > 0) {
        setComponentConfigs(prev => {
          const newConfigs = { ...prev };
          componentOverrides.forEach((override: { module_key: string; component_key: string; enabled: boolean; custom_label?: string | null }) => {
            const configKey = getComponentConfigKey(verticalId, override.module_key);
            if (!newConfigs[configKey]) {
              newConfigs[configKey] = {};
            }
            newConfigs[configKey][override.component_key] = {
              enabled: override.enabled,
              customLabel: override.custom_label || null,
            };
          });
          return newConfigs;
        });
      }
    } catch (error) {
      console.error("Error fetching UI config:", error);
      toast.error("Error al cargar configuración UI");
    } finally {
      setUiConfigLoading(false);
    }
  };

  // Save UI config for a vertical
  const saveVerticalUIConfig = async (verticalId: string) => {
    const config = verticalUIConfig[verticalId];
    if (!config) return;
    
    const componentOverrides: Array<{
      module_key: string;
      component_key: string;
      enabled: boolean;
      custom_label: string | null;
    }> = [];
    
    Object.entries(componentConfigs).forEach(([key, configs]) => {
      if (key.startsWith(`${verticalId}_`)) {
        const moduleKey = key.replace(`${verticalId}_`, "");
        Object.entries(configs).forEach(([componentKey, config]) => {
          componentOverrides.push({
            module_key: moduleKey,
            component_key: componentKey,
            enabled: config.enabled,
            custom_label: config.customLabel,
          });
        });
      }
    });
    
    try {
      setSavingUIConfig(true);
      const response = await fetch(`/api/admin/vertical-ui-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical_id: verticalId,
          terminology: config.terminology,
          entity_fields: config.entity_fields,
          component_overrides: componentOverrides,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        if (data.migrationRequired) {
          toast.error("Las tablas de configuración no existen. Ejecute las migraciones primero.");
        } else if (data.details && Array.isArray(data.details)) {
          toast.error(`Error: ${data.error || "Error al guardar"}\n${data.details.slice(0, 3).join(", ")}`);
        } else {
          toast.error(data.error || "Error al guardar configuración UI");
        }
        return;
      }
      
      toast.success("Configuración UI guardada correctamente");
    } catch (error) {
      console.error("Error saving UI config:", error);
      toast.error("Error al guardar configuración UI");
    } finally {
      setSavingUIConfig(false);
    }
  };

  // Update terminology for a vertical
  const updateTerminology = (verticalId: string, key: string, value: string) => {
    setVerticalUIConfig(prev => ({
      ...prev,
      [verticalId]: {
        ...prev[verticalId],
        terminology: {
          ...prev[verticalId]?.terminology,
          [key]: value,
        }
      }
    }));
  };

  // Add custom field to a vertical
  const addCustomField = (verticalId: string) => {
    if (!newCustomField.field_key || !newCustomField.field_label) {
      toast.error("El campo clave y etiqueta son requeridos");
      return;
    }
    
    setVerticalUIConfig(prev => ({
      ...prev,
      [verticalId]: {
        ...prev[verticalId],
        entity_fields: [
          ...(prev[verticalId]?.entity_fields || []),
          { ...newCustomField }
        ]
      }
    }));
    
    setNewCustomField({
      entity_type: "product",
      field_key: "",
      field_label: "",
      field_type: "text",
      required: false,
      show_in_list: true,
      show_in_form: true,
      show_in_detail: true,
    });
    
    toast.success("Campo personalizado agregado");
  };

  // Remove custom field from a vertical
  const removeCustomField = (verticalId: string, fieldKey: string, entityType: string) => {
    setVerticalUIConfig(prev => ({
      ...prev,
      [verticalId]: {
        ...prev[verticalId],
        entity_fields: (prev[verticalId]?.entity_fields || []).filter(
          f => !(f.field_key === fieldKey && f.entity_type === entityType)
        )
      }
    }));
    toast.success("Campo eliminado");
  };

  // Group modules by category
  const groupedModules = allModules.reduce((acc, module) => {
    const category = module.category || "general";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(module);
    return acc;
  }, {} as Record<string, Module[]>);

  // Category translations
  const categoryTranslations: Record<string, { es: string; en: string }> = {
    general: { es: "General", en: "General" },
    catalog: { es: "Catálogo", en: "Catalog" },
    sales: { es: "Ventas", en: "Sales" },
    inventory: { es: "Inventario", en: "Inventory" },
    finance: { es: "Finanzas", en: "Finance" },
    reports: { es: "Reportes", en: "Reports" },
    customers: { es: "Clientes", en: "Customers" },
    ai: { es: "Inteligencia Artificial", en: "Artificial Intelligence" },
    integrations: { es: "Integraciones", en: "Integrations" },
    settings: { es: "Configuración", en: "Settings" },
  };

  const handleUpdateRole = async (email: string, newRole: "ADMIN" | "USER" | "CUSTOMER") => {
    try {
      setUpdating(true);
      const response = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role: newRole }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el rol");
      }

      toast.success(data.message);
      await fetchUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast.error(error.message || "Error al actualizar el rol");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateUserVertical = async (userId: string, verticalId: string) => {
    try {
      setUpdating(true);
      const response = await fetch("/api/admin/update-user-vertical", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, verticalId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el giro de negocio");
      }

      toast.success("Giro de negocio actualizado");
      await fetchUsers();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Error updating user vertical:", error);
      toast.error(error.message || "Error al actualizar el giro de negocio");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateUserCredentials = async (userId: string, email: string, password?: string) => {
    try {
      setSavingUserCredentials(true);
      const response = await fetch("/api/admin/update-user-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, email, password: password || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar credenciales");
      }

      toast.success("Credenciales actualizadas correctamente");
      await fetchUsers();
    } catch (error: any) {
      console.error("Error updating user credentials:", error);
      toast.error(error.message || "Error al actualizar credenciales");
      throw error;
    } finally {
      setSavingUserCredentials(false);
    }
  };

  const loadUserBranding = async (userId: string) => {
    try {
      setLoadingUserBranding(true);
      const response = await fetch(`/api/admin/user-branding?userId=${userId}`);
      const data = await response.json();

      if (response.ok) {
        setIsWhiteLabelUser(data.isWhiteLabel);
        if (data.isWhiteLabel && data.branding) {
          setEditUserBranding({
            tenantId: data.tenantId || "",
            customDomain: data.branding.customDomain || "",
            platformName: data.branding.platformName || "",
            logoUrl: data.branding.logoUrl || "",
            primaryColor: data.branding.primaryColor || "#3b82f6",
          });
        } else {
          setEditUserBranding({
            tenantId: "",
            customDomain: "",
            platformName: "",
            logoUrl: "",
            primaryColor: "#3b82f6",
          });
        }
      }
    } catch (error) {
      console.error("Error loading user branding:", error);
      setIsWhiteLabelUser(false);
    } finally {
      setLoadingUserBranding(false);
    }
  };

  const handleSaveUserBranding = async () => {
    if (!editUserBranding.tenantId) return;

    try {
      setUpdating(true);
      const response = await fetch("/api/admin/user-branding", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantId: editUserBranding.tenantId,
          platformName: editUserBranding.platformName,
          logoUrl: editUserBranding.logoUrl,
          primaryColor: editUserBranding.primaryColor,
          customDomain: editUserBranding.customDomain,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar branding");
      }

      toast.success("Branding actualizado correctamente");
    } catch (error: any) {
      console.error("Error updating branding:", error);
      toast.error(error.message || "Error al actualizar branding");
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveVertical = async () => {
    if (!newVerticalName.trim() || !newVerticalDisplayName.trim()) {
      toast.error("Nombre y nombre de visualización son requeridos");
      return;
    }

    try {
      setSavingVertical(true);
      const url = editingVertical ? "/api/verticals" : "/api/verticals";
      const method = editingVertical ? "PATCH" : "POST";
      
      const body = editingVertical 
        ? {
            id: editingVertical.id,
            name: newVerticalName,
            display_name: newVerticalDisplayName,
            description: newVerticalDescription,
            icon: newVerticalIcon,
          }
        : {
            name: newVerticalName,
            display_name: newVerticalDisplayName,
            description: newVerticalDescription,
            icon: newVerticalIcon,
          };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al guardar el giro de negocio");
      }

      toast.success(editingVertical ? "Giro actualizado" : "Giro creado exitosamente");
      await fetchVerticals();
      resetVerticalForm();
      setIsVerticalDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving vertical:", error);
      toast.error(error.message || "Error al guardar el giro de negocio");
    } finally {
      setSavingVertical(false);
    }
  };

  const handleDeleteVertical = async (verticalId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este giro de negocio?")) {
      return;
    }

    try {
      const response = await fetch(`/api/verticals?id=${verticalId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el giro de negocio");
      }

      toast.success("Giro de negocio eliminado");
      await fetchVerticals();
    } catch (error: any) {
      console.error("Error deleting vertical:", error);
      toast.error(error.message || "Error al eliminar el giro de negocio");
    }
  };

  const resetVerticalForm = () => {
    setEditingVertical(null);
    setNewVerticalName("");
    setNewVerticalDisplayName("");
    setNewVerticalDescription("");
    setNewVerticalIcon("store");
  };

  const openEditVertical = (vertical: Vertical) => {
    setEditingVertical(vertical);
    setNewVerticalName(vertical.name);
    setNewVerticalDisplayName(vertical.display_name);
    setNewVerticalDescription(vertical.description || "");
    setNewVerticalIcon(vertical.icon || "store");
    setIsVerticalDialogOpen(true);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    const assignedVerticals = templateProducts
      .filter(tp => tp.source_product_id === product.id)
      .map(tp => tp.vertical_id);
    setSelectedVerticalIds(assignedVerticals);
  };

  const handleVerticalToggle = (verticalId: string) => {
    setSelectedVerticalIds(prev => {
      if (prev.includes(verticalId)) {
        return prev.filter(id => id !== verticalId);
      } else {
        return [...prev, verticalId];
      }
    });
  };

  const handleSaveTemplateAssignments = async () => {
    if (!selectedProduct) return;

    try {
      setSavingTemplates(true);
      
      const currentAssignments = templateProducts
        .filter(tp => tp.source_product_id === selectedProduct.id)
        .map(tp => tp.vertical_id);

      const toAdd = selectedVerticalIds.filter(id => !currentAssignments.includes(id));
      const toRemove = currentAssignments.filter(id => !selectedVerticalIds.includes(id));

      if (toAdd.length > 0) {
        const addResponse = await fetch("/api/admin/template-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProduct.id,
            verticalIds: toAdd,
            action: "add"
          }),
        });

        if (!addResponse.ok) {
          const data = await addResponse.json();
          throw new Error(data.error || "Error al agregar asignaciones");
        }
      }

      if (toRemove.length > 0) {
        const removeResponse = await fetch("/api/admin/template-products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProduct.id,
            verticalIds: toRemove,
            action: "remove"
          }),
        });

        if (!removeResponse.ok) {
          const data = await removeResponse.json();
          throw new Error(data.error || "Error al remover asignaciones");
        }
      }

      toast.success("Asignaciones actualizadas correctamente");
      await fetchTemplateProducts();
    } catch (error: any) {
      console.error("Error saving template assignments:", error);
      toast.error(error.message || "Error al guardar las asignaciones");
    } finally {
      setSavingTemplates(false);
    }
  };

  const getProductAssignmentCount = (productId: string) => {
    return templateProducts.filter(tp => tp.source_product_id === productId).length;
  };

  const resetNewProductForm = () => {
    setNewProduct({
      name: "",
      barcode: "",
      sku: "",
      price: 0,
      cost: 0,
      description: "",
      category_name: "",
      stock: 0,
      min_stock: 10,
      max_stock: 500,
      image_url: "",
      unit: "Pieza",
      active: true,
      available_in_pos: true,
      available_in_digital_menu: false,
      track_inventory: true,
    });
  };

  const handleSaveNewProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error("El nombre del producto es requerido");
      return;
    }

    try {
      setSavingNewProduct(true);
      
      const productData = {
        name: newProduct.name,
        barcode: newProduct.barcode || null,
        sku: newProduct.sku || `SKU-${Date.now()}`,
        price: newProduct.price,
        cost: newProduct.cost,
        description: newProduct.description || null,
        category_name: newProduct.category_name || null,
        unit: newProduct.unit || "Pieza",
        stock: newProduct.stock,
        min_stock: newProduct.min_stock,
        max_stock: newProduct.max_stock,
        image_url: newProduct.image_url || null,
        active: newProduct.active,
        available_in_pos: newProduct.available_in_pos,
        available_in_digital_menu: newProduct.available_in_digital_menu,
        track_inventory: newProduct.track_inventory,
        product_type: "normal",
      };

      const response = await fetch("/api/admin/create-template-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al crear el producto");
      }

      toast.success("Producto creado correctamente");
      setIsAddProductDialogOpen(false);
      resetNewProductForm();
      await fetchAllProducts();
    } catch (error: any) {
      console.error("Error creating product:", error);
      toast.error(error.message || "Error al crear el producto");
    } finally {
      setSavingNewProduct(false);
    }
  };

  const filteredTemplateVerticals = verticals.filter((vertical) => {
    if (!vertical.active) return false;
    const searchLower = templateVerticalSearchTerm.toLowerCase();
    return (
      vertical.name.toLowerCase().includes(searchLower) ||
      vertical.display_name.toLowerCase().includes(searchLower) ||
      (vertical.description || "").toLowerCase().includes(searchLower)
    );
  });

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower)
    );
  });

  // Build parent-child map from ALL users (not just filtered) to track ancestry
  const allUsersByCreator = new Map<string | null, User[]>();
  const allUsersById = new Map<string, User>();
  users.forEach((user) => {
    allUsersById.set(user.id, user);
    const creatorId = (user as any).createdById || null;
    if (!allUsersByCreator.has(creatorId)) {
      allUsersByCreator.set(creatorId, []);
    }
    allUsersByCreator.get(creatorId)!.push(user);
  });

  // Build map for filtered users only (for rendering)
  const filteredUsersByCreator = new Map<string | null, User[]>();
  const filteredUserIds = new Set(filteredUsers.map(u => u.id));
  filteredUsers.forEach((user) => {
    const creatorId = (user as any).createdById || null;
    if (!filteredUsersByCreator.has(creatorId)) {
      filteredUsersByCreator.set(creatorId, []);
    }
    filteredUsersByCreator.get(creatorId)!.push(user);
  });

  const rootUsers = filteredUsersByCreator.get(null) || [];
  
  // Function to sort users hierarchically with recursive multi-level support
  type HierarchicalUser = User & { isChild: boolean; creatorName: string | null; depth: number };
  
  const sortHierarchically = (userList: User[]): HierarchicalUser[] => {
    const result: HierarchicalUser[] = [];
    const processedIds = new Set<string>();
    
    // Helper to get a safe display name for a user
    const getDisplayName = (u: User): string => {
      const firstName = u.firstName || '';
      const lastName = u.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return fullName || u.email;
    };
    
    // Calculate true depth by traversing ancestor chain in ALL users
    const calculateDepth = (user: User): number => {
      let depth = 0;
      let currentId = (user as any).createdById;
      while (currentId) {
        depth++;
        const parent = allUsersById.get(currentId);
        if (!parent) break;
        currentId = (parent as any).createdById;
      }
      return depth;
    };
    
    // Get creator name chain
    const getCreatorName = (user: User): string | null => {
      const storedName = (user as any).createdByName;
      if (storedName) return storedName;
      
      const creatorId = (user as any).createdById;
      if (!creatorId) return null;
      
      const creator = allUsersById.get(creatorId);
      if (creator) return getDisplayName(creator);
      
      return null;
    };
    
    // Recursive function to add a user and all their filtered descendants
    const addUserWithDescendants = (user: User) => {
      if (processedIds.has(user.id)) return;
      if (!filteredUserIds.has(user.id)) return; // Only add if in filtered list
      
      const depth = calculateDepth(user);
      const creatorName = getCreatorName(user);
      
      result.push({ 
        ...user, 
        isChild: depth > 0, 
        creatorName: depth > 0 ? creatorName : null,
        depth 
      });
      processedIds.add(user.id);
      
      // Recursively add all filtered children
      const children = filteredUsersByCreator.get(user.id) || [];
      for (const child of children) {
        addUserWithDescendants(child);
      }
    };
    
    // First pass: add root users (no creator) and their descendants
    for (const user of userList) {
      const creatorId = (user as any).createdById;
      if (!creatorId) {
        addUserWithDescendants(user);
      }
    }
    
    // Second pass: add orphaned users (whose parent is not in the filtered list)
    // These are users who have a parent but that parent didn't match the filter
    for (const user of userList) {
      if (!processedIds.has(user.id)) {
        const depth = calculateDepth(user);
        const creatorName = getCreatorName(user);
        result.push({ 
          ...user, 
          isChild: depth > 0, 
          creatorName: depth > 0 ? creatorName : null,
          depth
        });
        processedIds.add(user.id);
        
        // Also add any descendants of this orphaned user
        const children = filteredUsersByCreator.get(user.id) || [];
        for (const child of children) {
          addUserWithDescendants(child);
        }
      }
    }
    
    return result;
  };
  
  const hierarchicalUsers = sortHierarchically(filteredUsers);
  
  const toggleUserExpanded = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredVerticals = verticals.filter((vertical) => {
    const searchLower = verticalSearchTerm.toLowerCase();
    return (
      vertical.name.toLowerCase().includes(searchLower) ||
      vertical.display_name.toLowerCase().includes(searchLower) ||
      (vertical.description || "").toLowerCase().includes(searchLower)
    );
  });

  const filteredProducts = allProducts.filter((product) => {
    const searchLower = productSearchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      (product.sku || "").toLowerCase().includes(searchLower) ||
      (product.categoryName || "").toLowerCase().includes(searchLower)
    );
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const userCount = users.filter((u) => u.role === "USER").length;
  const customerCount = users.filter((u) => u.role === "CUSTOMER").length;
  const activeVerticalsCount = verticals.filter((v) => v.active).length;

  if (loading && verticalsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" data-testid="text-admin-title">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Panel de Administración
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestiona usuarios, giros de negocio y productos plantilla
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="users" className="flex items-center gap-2" data-testid="tab-users">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuarios</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2" data-testid="tab-roles">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2" data-testid="tab-permissions">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Permisos</span>
            </TabsTrigger>
            <TabsTrigger value="verticals" className="flex items-center gap-2" data-testid="tab-verticals">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Giros</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2" data-testid="tab-templates">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Plantillas</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-total-users">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{users.length}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-admins">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Administradores
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{adminCount}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-users">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserCog className="h-4 w-4" />
                    Usuarios
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{userCount}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-customers">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Clientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{customerCount}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Buscar Usuarios</CardTitle>
                <CardDescription>
                  Busca por nombre o correo electrónico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Lista de Usuarios</CardTitle>
                  <CardDescription>
                    {filteredUsers.length} usuario{filteredUsers.length !== 1 && "s"} encontrado
                    {filteredUsers.length !== 1 && "s"}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsCreateUserDialogOpen(true)}
                  data-testid="button-add-user"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Usuario
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {hierarchicalUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No se encontraron usuarios
                    </div>
                  ) : (
                    hierarchicalUsers.map((user) => {
                      const indentLevel = user.depth || 0;
                      const marginLeft = indentLevel > 0 ? `${indentLevel * 1.5}rem` : undefined;
                      // Deeper nesting gets darker borders
                      const borderOpacity = Math.min(20 + indentLevel * 15, 80);
                      const bgOpacity = Math.min(10 + indentLevel * 10, 50);
                      return (
                        <div 
                          key={user.id} 
                          className={user.isChild ? "border-l-2 pl-3" : ""}
                          style={{ 
                            marginLeft,
                            borderColor: user.isChild ? `hsl(var(--primary) / ${borderOpacity}%)` : undefined 
                          }}
                        >
                          <div
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg hover-elevate transition-all`}
                            style={{ 
                              backgroundColor: user.isChild ? `hsl(var(--muted) / ${bgOpacity}%)` : undefined 
                            }}
                            data-testid={`user-row-${user.id}`}
                          >
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <Avatar>
                                  <AvatarImage src={user.image || undefined} />
                                  <AvatarFallback>
                                    {(user.firstName || user.email)[0]}
                                    {(user.lastName || user.email)[1] || user.email[1]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold truncate">
                                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                                    </span>
                                    {user.isChild && user.creatorName && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Users className="h-3 w-3 mr-1" />
                                        Creado por: {user.creatorName}
                                      </Badge>
                                    )}
                                    {user.depth > 1 && (
                                      <Badge variant="outline" className="text-xs opacity-60">
                                        Nivel {user.depth}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1">
                                    <span className="flex items-center gap-1 truncate">
                                      <Mail className="h-3 w-3 shrink-0" />
                                      <span className="truncate">{user.email}</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3 shrink-0" />
                                      {new Date(user.createdAt).toLocaleDateString("es-ES", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric"
                                      })}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2">
                                    {user.lastLoginDate ? (
                                      <span className="flex items-center gap-1">
                                        <LogIn className="h-3 w-3 shrink-0" />
                                        Último acceso: {new Date(user.lastLoginDate).toLocaleDateString("es-ES", {
                                          year: "numeric",
                                          month: "short",
                                          day: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-xs">
                                        <LogIn className="h-3 w-3 shrink-0" />
                                        Sin último acceso registrado
                                      </span>
                                    )}
                                    {user.location && (
                                      <span className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate text-xs">{user.location}</span>
                                      </span>
                                    )}
                                  </div>
                                  {user.vertical_name && (
                                    <div className="mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        <Store className="h-3 w-3 mr-1" />
                                        {user.vertical_name}
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 sm:shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                                <Badge
                                  variant={user.role === "ADMIN" ? "default" : user.role === "CUSTOMER" ? "outline" : "secondary"}
                                  data-testid={`badge-role-${user.id}`}
                                  className="text-xs sm:text-sm"
                                >
                                  {user.role === "ADMIN" ? "Admin" : user.role === "CUSTOMER" ? "Cliente" : "Usuario"}
                                </Badge>
                                <Dialog open={isDialogOpen && selectedUser?.id === user.id} onOpenChange={setIsDialogOpen}>
                                  <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role);
                                  setSelectedVerticalId(user.vertical_id || "");
                                  setEditUserEmail(user.email);
                                  setEditUserPassword("");
                                  setShowPassword(false);
                                  setPasswordChanged(false);
                                  setIsDialogOpen(true);
                                  loadUserBranding(user.id);
                                }}
                                data-testid={`button-edit-user-${user.id}`}
                                className="min-h-[44px] min-w-[44px]"
                              >
                                <Pencil className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Editar</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className={isWhiteLabelUser ? "max-w-6xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
                              <DialogHeader>
                                <DialogTitle>Editar Usuario</DialogTitle>
                                <DialogDescription>
                                  Modifica el rol y giro de negocio de {user.firstName} {user.lastName}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Correo Electrónico</Label>
                                  <Input 
                                    value={editUserEmail} 
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    data-testid="input-edit-user-email"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Nueva Contraseña</Label>
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <Input 
                                        type={showPassword ? "text" : "password"}
                                        value={editUserPassword}
                                        onChange={(e) => {
                                          setEditUserPassword(e.target.value);
                                          setPasswordChanged(true);
                                        }}
                                        placeholder="Dejar vacío para no cambiar"
                                        data-testid="input-edit-user-password"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => setShowPassword(!showPassword)}
                                      data-testid="button-toggle-password"
                                    >
                                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    {editUserPassword && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                          navigator.clipboard.writeText(editUserPassword);
                                          toast.success("Contraseña copiada");
                                        }}
                                        data-testid="button-copy-password"
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Si escribes una nueva contraseña, el usuario deberá usarla para iniciar sesión.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <Label>Fecha de Registro</Label>
                                  <Input 
                                    value={new Date(user.createdAt).toLocaleDateString("es-ES", {
                                      weekday: "long",
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })} 
                                    disabled 
                                  />
                                </div>
                                {user.lastLoginDate && (
                                  <div className="space-y-2">
                                    <Label>Último Acceso</Label>
                                    <Input 
                                      value={new Date(user.lastLoginDate).toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })} 
                                      disabled 
                                    />
                                  </div>
                                )}
                                {user.location && (
                                  <div className="space-y-2">
                                    <Label>Ubicación</Label>
                                    <Input 
                                      value={user.location} 
                                      disabled 
                                    />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <Label>Rol</Label>
                                  <Select
                                    value={selectedRole}
                                    onValueChange={(value: "ADMIN" | "USER" | "CUSTOMER") => setSelectedRole(value)}
                                  >
                                    <SelectTrigger data-testid="select-new-role">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ADMIN">Administrador</SelectItem>
                                      <SelectItem value="USER">Usuario</SelectItem>
                                      <SelectItem value="CUSTOMER">Cliente (Solo Menú)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Giro de Negocio</Label>
                                  <Select
                                    value={selectedVerticalId}
                                    onValueChange={setSelectedVerticalId}
                                  >
                                    <SelectTrigger data-testid="select-vertical">
                                      <SelectValue placeholder="Seleccionar giro..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Sin asignar</SelectItem>
                                      {verticals.filter(v => v.active).map((vertical) => (
                                        <SelectItem key={vertical.id} value={vertical.id}>
                                          {vertical.display_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {loadingUserBranding ? (
                                  <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-sm text-muted-foreground">Cargando datos de marca blanca...</span>
                                  </div>
                                ) : isWhiteLabelUser && (
                                  <div className="space-y-4 pt-4 border-t">
                                    <div className="flex items-center gap-2">
                                      <Globe className="h-4 w-4 text-primary" />
                                      <span className="font-medium text-sm">Configuración de Marca Blanca</span>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      <div className="space-y-4">
                                        <div className="space-y-2">
                                          <Label>Nombre de la Plataforma</Label>
                                          <Input
                                            value={editUserBranding.platformName}
                                            onChange={(e) => setEditUserBranding(prev => ({ ...prev, platformName: e.target.value }))}
                                            placeholder="Nombre que verán los usuarios"
                                            data-testid="input-edit-platform-name"
                                          />
                                        </div>

                                        <div className="space-y-2">
                                          <Label>Dominio Personalizado</Label>
                                          <Input
                                            value={editUserBranding.customDomain}
                                            onChange={(e) => setEditUserBranding(prev => ({ ...prev, customDomain: e.target.value }))}
                                            placeholder="ejemplo.com"
                                            data-testid="input-edit-custom-domain"
                                          />
                                          <p className="text-xs text-muted-foreground">
                                            Configura registros A apuntando a 34.111.179.208
                                          </p>
                                        </div>

                                        <div className="space-y-2">
                                          <Label>URL del Logo</Label>
                                          <Input
                                            value={editUserBranding.logoUrl}
                                            onChange={(e) => setEditUserBranding(prev => ({ ...prev, logoUrl: e.target.value }))}
                                            placeholder="https://ejemplo.com/logo.png"
                                            data-testid="input-edit-logo-url"
                                          />
                                        </div>

                                        <div className="space-y-2">
                                          <Label>Color Primario</Label>
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="color"
                                              value={editUserBranding.primaryColor}
                                              onChange={(e) => setEditUserBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                                              className="w-12 h-9 rounded border cursor-pointer"
                                              data-testid="input-edit-primary-color"
                                            />
                                            <Input
                                              value={editUserBranding.primaryColor}
                                              onChange={(e) => setEditUserBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                                              placeholder="#3b82f6"
                                              className="flex-1"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        {/* Botón Vista Previa Completa */}
                                        <Button
                                          variant="outline"
                                          className="w-full"
                                          onClick={() => {
                                            if (editUserBranding.tenantId) {
                                              window.open(`/preview/${editUserBranding.tenantId}`, '_blank');
                                            }
                                          }}
                                          disabled={!editUserBranding.tenantId}
                                          data-testid="button-open-full-preview"
                                        >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          Ver Vista Previa Completa
                                        </Button>
                                        
                                        <Tabs defaultValue="design" className="w-full">
                                          <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger value="design" className="text-xs">
                                              <Eye className="h-3.5 w-3.5 mr-1.5" />
                                              Vista Previa Diseño
                                            </TabsTrigger>
                                            <TabsTrigger value="live" className="text-xs">
                                              <Globe className="h-3.5 w-3.5 mr-1.5" />
                                              Vista en Vivo
                                            </TabsTrigger>
                                          </TabsList>
                                          
                                          <TabsContent value="design" className="mt-3">
                                            <div className="border rounded-lg overflow-hidden bg-background shadow-lg">
                                              <div 
                                                className="h-12 flex items-center justify-between px-4"
                                                style={{ backgroundColor: editUserBranding.primaryColor }}
                                              >
                                                <div className="flex items-center gap-3">
                                                  {editUserBranding.logoUrl ? (
                                                    <img 
                                                      src={editUserBranding.logoUrl} 
                                                      alt="Logo" 
                                                      className="h-8 w-auto object-contain bg-white/20 rounded p-1"
                                                      onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                      }}
                                                    />
                                                  ) : (
                                                    <div className="h-8 w-8 bg-white/20 rounded flex items-center justify-center">
                                                      <Building2 className="h-5 w-5 text-white" />
                                                    </div>
                                                  )}
                                                  <span className="font-semibold text-white text-sm">
                                                    {editUserBranding.platformName || "Mi Plataforma"}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <div className="h-6 w-6 rounded-full bg-white/20" />
                                                </div>
                                              </div>
                                              
                                              <div className="flex">
                                                <div 
                                                  className="w-48 min-h-[280px] p-3 border-r"
                                                  style={{ backgroundColor: `${editUserBranding.primaryColor}10` }}
                                                >
                                                  <div className="space-y-1">
                                                    <div 
                                                      className="flex items-center gap-2 px-3 py-2 rounded-md text-white text-xs font-medium"
                                                      style={{ backgroundColor: editUserBranding.primaryColor }}
                                                    >
                                                      <LayoutDashboard className="h-3.5 w-3.5" />
                                                      Dashboard
                                                    </div>
                                                    {["Productos", "Ventas", "Clientes", "Inventario", "Reportes"].map((item, i) => (
                                                      <div 
                                                        key={i}
                                                        className="flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-muted/50 cursor-pointer transition-colors"
                                                      >
                                                        <div className="h-3.5 w-3.5 rounded bg-muted" />
                                                        {item}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                                
                                                <div className="flex-1 p-4 bg-muted/30">
                                                  <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                                      <div>
                                                        <h3 className="font-semibold text-sm">Dashboard</h3>
                                                        <p className="text-xs text-muted-foreground">
                                                          Bienvenido a {editUserBranding.platformName || "tu plataforma"}
                                                        </p>
                                                      </div>
                                                      <Button 
                                                        size="sm" 
                                                        className="h-7 text-xs text-white"
                                                        style={{ backgroundColor: editUserBranding.primaryColor }}
                                                      >
                                                        <Plus className="h-3 w-3 mr-1" />
                                                        Nueva Venta
                                                      </Button>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-3 gap-2">
                                                      {[
                                                        { label: "Ventas Hoy", value: "$12,450" },
                                                        { label: "Productos", value: "156" },
                                                        { label: "Clientes", value: "89" }
                                                      ].map((stat, i) => (
                                                        <div key={i} className="bg-background rounded-md p-2 border">
                                                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                                                          <p 
                                                            className="text-sm font-bold"
                                                            style={{ color: i === 0 ? editUserBranding.primaryColor : undefined }}
                                                          >
                                                            {stat.value}
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                    
                                                    <div className="bg-background rounded-md p-2 border">
                                                      <p className="text-xs font-medium mb-2">Últimas Ventas</p>
                                                      <div className="space-y-1">
                                                        {[1, 2, 3].map((_, i) => (
                                                          <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                                                            <div className="flex items-center gap-2">
                                                              <div className="h-6 w-6 rounded bg-muted" />
                                                              <div>
                                                                <p className="text-[10px] font-medium">Venta #{1000 + i}</p>
                                                                <p className="text-[9px] text-muted-foreground">Hace {i + 1} min</p>
                                                              </div>
                                                            </div>
                                                            <span 
                                                              className="text-[10px] font-semibold"
                                                              style={{ color: editUserBranding.primaryColor }}
                                                            >
                                                              ${(Math.random() * 500 + 50).toFixed(0)}
                                                            </span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div 
                                                className="h-6 flex items-center justify-center text-[10px] text-white/80 border-t"
                                                style={{ backgroundColor: editUserBranding.primaryColor }}
                                              >
                                                {editUserBranding.customDomain ? `https://${editUserBranding.customDomain}` : "https://tu-dominio.com"}
                                              </div>
                                            </div>
                                          </TabsContent>
                                          
                                          <TabsContent value="live" className="mt-3">
                                            <div className="space-y-3">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex-1 min-w-[200px]">
                                                  <div className="flex items-center gap-1 bg-muted rounded-md px-2 py-1">
                                                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span className="text-xs text-muted-foreground">https://</span>
                                                    <span className="text-xs font-medium truncate">
                                                      {editUserBranding.customDomain || "dominio-no-configurado"}
                                                    </span>
                                                  </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-7 text-xs"
                                                    onClick={() => {
                                                      const iframe = document.getElementById('live-preview-iframe') as HTMLIFrameElement;
                                                      if (iframe) {
                                                        iframe.src = iframe.src;
                                                      }
                                                    }}
                                                    data-testid="button-refresh-iframe"
                                                  >
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                  </Button>
                                                  {editUserBranding.customDomain && (
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      className="h-7 text-xs"
                                                      onClick={() => {
                                                        const domain = editUserBranding.customDomain.replace(/^https?:\/\//, '').replace(/^www\./, '');
                                                        window.open(`https://${domain}`, '_blank');
                                                      }}
                                                      data-testid="button-open-in-new-tab"
                                                    >
                                                      <ExternalLink className="h-3.5 w-3.5" />
                                                    </Button>
                                                  )}
                                                </div>
                                              </div>
                                              
                                              <div className="border rounded-lg overflow-hidden bg-muted/30 relative">
                                                {editUserBranding.customDomain ? (
                                                  <>
                                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-[10px] text-muted-foreground border">
                                                      <Monitor className="h-3 w-3" />
                                                      Vista en vivo
                                                    </div>
                                                    <iframe
                                                      id="live-preview-iframe"
                                                      src={`https://${editUserBranding.customDomain.replace(/^https?:\/\//, '').replace(/^www\./, '')}`}
                                                      className="w-full h-[380px] bg-white"
                                                      title="Vista en vivo del sitio"
                                                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                                      data-testid="iframe-live-preview"
                                                    />
                                                  </>
                                                ) : (
                                                  <div className="h-[380px] flex flex-col items-center justify-center text-muted-foreground">
                                                    <AlertCircle className="h-12 w-12 mb-3 opacity-50" />
                                                    <p className="text-sm font-medium">Sin dominio configurado</p>
                                                    <p className="text-xs mt-1 text-center px-4">
                                                      Ingresa un dominio personalizado en el campo de arriba para ver la vista en vivo
                                                    </p>
                                                  </div>
                                                )}
                                              </div>
                                              
                                              <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                                                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                                <div className="text-xs text-amber-700 dark:text-amber-400">
                                                  <p className="font-medium">Nota sobre la vista en vivo:</p>
                                                  <p className="mt-0.5">Algunos sitios bloquean la incrustación en iframes por seguridad. Si no se muestra, usa el botón para abrir en nueva pestaña.</p>
                                                </div>
                                              </div>
                                            </div>
                                          </TabsContent>
                                        </Tabs>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <DialogFooter className="gap-2 flex-col sm:flex-row">
                                <Button
                                  variant="outline"
                                  onClick={() => setIsDialogOpen(false)}
                                  disabled={updating}
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  onClick={async () => {
                                    try {
                                      // Update credentials (email and/or password)
                                      if (editUserEmail !== user.email || editUserPassword) {
                                        await handleUpdateUserCredentials(
                                          user.id, 
                                          editUserEmail, 
                                          editUserPassword || undefined
                                        );
                                      }
                                      if (selectedRole !== user.role) {
                                        await handleUpdateRole(editUserEmail, selectedRole);
                                      }
                                      if (selectedVerticalId !== (user.vertical_id || "")) {
                                        await handleUpdateUserVertical(user.id, selectedVerticalId === "none" ? "" : selectedVerticalId);
                                      }
                                      if (isWhiteLabelUser && editUserBranding.tenantId) {
                                        await handleSaveUserBranding();
                                      }
                                      await fetchUsers();
                                      setIsDialogOpen(false);
                                    } catch (error) {
                                      console.error("Error saving changes:", error);
                                    }
                                  }}
                                  disabled={updating || loadingUserBranding || savingUserCredentials}
                                  data-testid="button-update-user"
                                  className="w-full sm:w-auto min-h-[44px]"
                                >
                                  {updating ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Actualizando...
                                    </>
                                  ) : (
                                    "Guardar Cambios"
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roles" className="space-y-4 sm:space-y-6">
            <RolesTab />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 sm:space-y-6">
            <PermissionsTab />
          </TabsContent>

          <TabsContent value="verticals" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card data-testid="card-total-verticals">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Total Giros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{verticals.length}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-active-verticals">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{activeVerticalsCount}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-inactive-verticals">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Inactivos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-muted-foreground">{verticals.length - activeVerticalsCount}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Giros de Negocio</CardTitle>
                  <CardDescription>
                    Administra los tipos de negocio y haz clic en cada uno para configurar sus módulos
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Dialog open={isVerticalDialogOpen} onOpenChange={(open) => {
                    setIsVerticalDialogOpen(open);
                    if (!open) resetVerticalForm();
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        className="w-full sm:w-auto min-h-[44px]"
                        data-testid="button-add-vertical"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Giro
                      </Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingVertical ? "Editar Giro de Negocio" : "Nuevo Giro de Negocio"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingVertical 
                          ? "Modifica los datos del giro de negocio"
                          : "Crea un nuevo tipo de negocio para la plataforma"
                        }
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="vertical-name">Nombre (ID interno)</Label>
                        <Input
                          id="vertical-name"
                          placeholder="ej: restaurante, farmacia, tienda_ropa"
                          value={newVerticalName}
                          onChange={(e) => setNewVerticalName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                          data-testid="input-vertical-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vertical-display-name">Nombre de Visualización</Label>
                        <Input
                          id="vertical-display-name"
                          placeholder="ej: Restaurante, Farmacia, Tienda de Ropa"
                          value={newVerticalDisplayName}
                          onChange={(e) => setNewVerticalDisplayName(e.target.value)}
                          data-testid="input-vertical-display-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vertical-description">Descripción (opcional)</Label>
                        <Input
                          id="vertical-description"
                          placeholder="Describe el tipo de negocio..."
                          value={newVerticalDescription}
                          onChange={(e) => setNewVerticalDescription(e.target.value)}
                          data-testid="input-vertical-description"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vertical-icon">Icono</Label>
                        <Select value={newVerticalIcon} onValueChange={setNewVerticalIcon}>
                          <SelectTrigger data-testid="select-vertical-icon">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="store">Tienda</SelectItem>
                            <SelectItem value="utensils">Restaurante</SelectItem>
                            <SelectItem value="pill">Farmacia</SelectItem>
                            <SelectItem value="shirt">Ropa</SelectItem>
                            <SelectItem value="car">Automotriz</SelectItem>
                            <SelectItem value="scissors">Salón/Barbería</SelectItem>
                            <SelectItem value="coffee">Cafetería</SelectItem>
                            <SelectItem value="wrench">Servicios</SelectItem>
                            <SelectItem value="building">Oficina</SelectItem>
                            <SelectItem value="heart">Salud</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter className="gap-2 flex-col sm:flex-row">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsVerticalDialogOpen(false);
                          resetVerticalForm();
                        }}
                        disabled={savingVertical}
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveVertical}
                        disabled={savingVertical || !newVerticalName.trim() || !newVerticalDisplayName.trim()}
                        data-testid="button-save-vertical"
                        className="w-full sm:w-auto min-h-[44px]"
                      >
                        {savingVertical ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          editingVertical ? "Actualizar" : "Crear Giro"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar giros de negocio..."
                    value={verticalSearchTerm}
                    onChange={(e) => setVerticalSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-verticals"
                  />
                </div>

                {verticalsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : filteredVerticals.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Store className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No se encontraron giros de negocio</p>
                    <p className="text-sm mt-2">Crea el primero con el botón "Nuevo Giro"</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredVerticals.map((vertical) => {
                      const isExpanded = expandedVerticalId === vertical.id;
                      const currentModules = selectedModules[vertical.id] || new Set();
                      const hasChanges = hasModuleChanges(vertical.id);
                      
                      return (
                        <div
                          key={vertical.id}
                          className={`border rounded-lg transition-all ${
                            isExpanded 
                              ? "border-primary bg-primary/5 ring-1 ring-primary" 
                              : "hover-elevate"
                          }`}
                          data-testid={`vertical-row-${vertical.id}`}
                        >
                          {/* Vertical header - clickable to expand */}
                          <div
                            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 cursor-pointer ${
                              !isExpanded ? "hover:bg-accent/30" : ""
                            }`}
                            onClick={() => toggleVerticalExpansion(vertical.id)}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <DynamicIcon name={vertical.icon} className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate flex items-center gap-2 flex-wrap">
                                  {vertical.display_name}
                                  <Badge 
                                    variant={vertical.active ? "default" : "outline"}
                                    className="text-xs"
                                  >
                                    {vertical.active ? "Activo" : "Inactivo"}
                                  </Badge>
                                  {currentModules.size > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Boxes className="h-3 w-3 mr-1" />
                                      {currentModules.size} módulos
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {vertical.description || `ID: ${vertical.name}`}
                                </div>
                                {!isExpanded && (
                                  <div className="text-xs text-primary/70 mt-1 flex items-center gap-1">
                                    <Settings2 className="h-3 w-3" />
                                    Clic para configurar módulos
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditVertical(vertical);
                                }}
                                data-testid={`button-edit-vertical-${vertical.id}`}
                                className="min-h-[44px] min-w-[44px]"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVertical(vertical.id);
                                }}
                                data-testid={`button-delete-vertical-${vertical.id}`}
                                className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-primary" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {/* Expanded content with tabs */}
                          {isExpanded && (
                            <div className="px-4 pb-4 border-t">
                              <Tabs 
                                value={verticalInnerTab[vertical.id] || "modules"} 
                                onValueChange={(value) => switchVerticalInnerTab(vertical.id, value)}
                                className="mt-4"
                              >
                                <TabsList className="grid w-full grid-cols-3">
                                  <TabsTrigger value="modules" className="flex items-center gap-2" data-testid={`tab-modules-${vertical.id}`}>
                                    <Boxes className="h-4 w-4" />
                                    Módulos
                                    {currentModules.size > 0 && (
                                      <Badge variant="secondary" className="text-xs ml-1">
                                        {currentModules.size}
                                      </Badge>
                                    )}
                                  </TabsTrigger>
                                  <TabsTrigger value="templates" className="flex items-center gap-2" data-testid={`tab-templates-${vertical.id}`}>
                                    <Package className="h-4 w-4" />
                                    Plantillas
                                    {(verticalTemplateProducts[vertical.id]?.length || 0) > 0 && (
                                      <Badge variant="secondary" className="text-xs ml-1">
                                        {verticalTemplateProducts[vertical.id]?.length}
                                      </Badge>
                                    )}
                                  </TabsTrigger>
                                  <TabsTrigger value="ui-config" className="flex items-center gap-2" data-testid={`tab-ui-config-${vertical.id}`}>
                                    <Palette className="h-4 w-4" />
                                    Config UI
                                  </TabsTrigger>
                                </TabsList>

                                {/* Modules Tab */}
                                <TabsContent value="modules" className="mt-4">
                                  {(modulesLoading || verticalModulesLoading) ? (
                                    <div className="space-y-2">
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {/* Header with save button */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm text-muted-foreground">
                                            Selecciona los módulos que estarán disponibles para este giro
                                          </span>
                                        </div>
                                        {hasChanges && (
                                          <Button
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              saveModuleChanges(vertical.id);
                                            }}
                                            disabled={savingModules}
                                            data-testid={`button-save-modules-${vertical.id}`}
                                            className="min-h-[36px]"
                                          >
                                            {savingModules ? (
                                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            ) : (
                                              <Save className="h-4 w-4 mr-2" />
                                            )}
                                            Guardar
                                          </Button>
                                        )}
                                      </div>
                                      
                                      {/* Module categories */}
                                      <div className="space-y-2">
                                        {Object.entries(groupedModules).map(([category, modules]) => {
                                          const categoryExpanded = expandedCategories.has(category);
                                          const categoryLabel = categoryTranslations[category]?.es || category;
                                          const selectedInCategory = modules.filter(m => currentModules.has(m.id)).length;
                                          
                                          return (
                                            <div key={category} className="border rounded-lg bg-card">
                                              <div
                                                className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/30 transition-colors"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleCategoryExpansion(category);
                                                }}
                                              >
                                                <div className="flex items-center gap-3">
                                                  <Boxes className="h-4 w-4 text-primary" />
                                                  <span className="font-medium text-sm">{categoryLabel}</span>
                                                  <Badge variant="outline" className="text-xs">
                                                    {selectedInCategory}/{modules.length}
                                                  </Badge>
                                                </div>
                                                {categoryExpanded ? (
                                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                              </div>
                                              
                                              {categoryExpanded && (
                                                <div className="px-3 pb-3 space-y-1">
                                                  {modules.map((module) => {
                                                    const isSelected = currentModules.has(module.id);
                                                    const moduleKey = getModuleComponentsKey(module);
                                                    const moduleComponents = MODULE_COMPONENTS[moduleKey] || [];
                                                    const isModuleExpanded = expandedModuleForConfig === `${vertical.id}_${moduleKey}`;
                                                    const hasComponents = moduleComponents.length > 0;
                                                    
                                                    const componentsByCategory = moduleComponents.reduce((acc, comp) => {
                                                      if (!acc[comp.category]) acc[comp.category] = [];
                                                      acc[comp.category].push(comp);
                                                      return acc;
                                                    }, {} as Record<string, ModuleComponent[]>);
                                                    
                                                    return (
                                                      <div key={module.id} className="space-y-1">
                                                        <div
                                                          className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                                            isSelected 
                                                              ? "bg-primary/10 border border-primary/30" 
                                                              : "hover:bg-accent/50"
                                                          }`}
                                                          data-testid={`module-${moduleKey}`}
                                                        >
                                                          <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleModuleSelection(vertical.id, module.id, moduleKey)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="min-h-[20px] min-w-[20px] cursor-pointer"
                                                          />
                                                          <DynamicIcon name={module.icon} className="h-4 w-4 shrink-0" />
                                                          <div 
                                                            className="flex-1 min-w-0 cursor-pointer"
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (hasComponents && isSelected) {
                                                                toggleModuleExpansion(`${vertical.id}_${moduleKey}`);
                                                              }
                                                            }}
                                                          >
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              <span className="text-sm font-medium">{module.name}</span>
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
                                                              {hasComponents && isSelected && (
                                                                <Badge variant="outline" className="text-xs py-0">
                                                                  {moduleComponents.length} componentes
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            {module.description && (
                                                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                                {module.description}
                                                              </p>
                                                            )}
                                                          </div>
                                                          {hasComponents && isSelected && (
                                                            <Button
                                                              size="icon"
                                                              variant="ghost"
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleModuleExpansion(`${vertical.id}_${moduleKey}`);
                                                              }}
                                                              data-testid={`button-expand-module-${moduleKey}`}
                                                            >
                                                              {isModuleExpanded ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                              ) : (
                                                                <Settings className="h-4 w-4" />
                                                              )}
                                                            </Button>
                                                          )}
                                                        </div>
                                                        
                                                        {isModuleExpanded && hasComponents && (
                                                          <div className="ml-8 p-3 border rounded-lg bg-muted/30 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                              <span className="text-xs font-medium text-muted-foreground">
                                                                Configurar componentes de UI
                                                              </span>
                                                            </div>
                                                            
                                                            {Object.entries(componentsByCategory).map(([categoryKey, components]) => (
                                                              <div key={categoryKey} className="space-y-2">
                                                                <div className="flex items-center gap-2">
                                                                  <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                                                                    {COMPONENT_CATEGORY_LABELS[categoryKey] || categoryKey}
                                                                  </span>
                                                                  <div className="flex-1 h-px bg-border" />
                                                                </div>
                                                                
                                                                <div className="space-y-1">
                                                                  {components.map((comp) => {
                                                                    const config = getComponentConfig(vertical.id, moduleKey, comp.key);
                                                                    const displayLabel = config.customLabel || comp.defaultLabel;
                                                                    const componentId = `${vertical.id}_${moduleKey}_${comp.key}`;
                                                                    const isEditing = editingComponentLabel === componentId;
                                                                    
                                                                    return (
                                                                      <div
                                                                        key={comp.key}
                                                                        className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                                                                          config.enabled ? "bg-background" : "bg-muted/50 opacity-60"
                                                                        }`}
                                                                        data-testid={`component-${comp.key}`}
                                                                      >
                                                                        <Checkbox
                                                                          checked={config.enabled}
                                                                          onCheckedChange={(checked) => {
                                                                            setComponentConfig(vertical.id, moduleKey, comp.key, {
                                                                              enabled: !!checked
                                                                            });
                                                                          }}
                                                                          className="min-h-[16px] min-w-[16px]"
                                                                          data-testid={`checkbox-component-${comp.key}`}
                                                                        />
                                                                        
                                                                        <DynamicIcon 
                                                                          name={COMPONENT_TYPE_ICONS[comp.type]} 
                                                                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground" 
                                                                        />
                                                                        
                                                                        <div className="flex-1 min-w-0">
                                                                          {isEditing ? (
                                                                            <Input
                                                                              value={editingLabelValue}
                                                                              onChange={(e) => setEditingLabelValue(e.target.value)}
                                                                              onBlur={() => saveEditingLabel(vertical.id, moduleKey, comp.key)}
                                                                              onKeyDown={(e) => handleLabelKeyDown(e, vertical.id, moduleKey, comp.key)}
                                                                              className="h-6 text-xs py-0 px-1"
                                                                              autoFocus
                                                                              data-testid={`input-label-${comp.key}`}
                                                                            />
                                                                          ) : (
                                                                            <span
                                                                              className="text-xs cursor-pointer hover:text-primary transition-colors"
                                                                              onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                startEditingLabel(componentId, displayLabel);
                                                                              }}
                                                                              data-testid={`label-${comp.key}`}
                                                                            >
                                                                              {displayLabel}
                                                                              {config.customLabel && (
                                                                                <span className="text-muted-foreground ml-1">(modificado)</span>
                                                                              )}
                                                                            </span>
                                                                          )}
                                                                        </div>
                                                                        
                                                                        <Badge variant="outline" className="text-xs py-0 shrink-0">
                                                                          {comp.type}
                                                                        </Badge>
                                                                      </div>
                                                                    );
                                                                  })}
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        )}
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
                                  )}
                                </TabsContent>

                                {/* Template Products Tab */}
                                <TabsContent value="templates" className="mt-4">
                                  {verticalTemplatesLoading ? (
                                    <div className="space-y-2">
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                    </div>
                                  ) : (
                                    <div className="space-y-4">
                                      {/* Header */}
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                          Productos que se copiarán a nuevos negocios de este giro
                                        </span>
                                        <Dialog open={isAddTemplateDialogOpen && expandedVerticalId === vertical.id} onOpenChange={setIsAddTemplateDialogOpen}>
                                          <DialogTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setIsAddTemplateDialogOpen(true);
                                              }}
                                              data-testid={`button-create-new-template-${vertical.id}`}
                                              className="min-h-[36px]"
                                            >
                                              <Plus className="h-4 w-4 mr-2" />
                                              Crear Nuevo
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent className="max-w-lg" onClick={(e) => e.stopPropagation()}>
                                            <DialogHeader>
                                              <DialogTitle>Crear Producto Plantilla</DialogTitle>
                                              <DialogDescription>
                                                Crea un nuevo producto que se copiará a nuevos negocios de "{vertical.display_name}"
                                              </DialogDescription>
                                            </DialogHeader>
                                            
                                            <div className="grid gap-4 py-4">
                                              <div className="space-y-2">
                                                <Label htmlFor="template-name">Nombre *</Label>
                                                <Input
                                                  id="template-name"
                                                  value={newTemplateProduct.name}
                                                  onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, name: e.target.value }))}
                                                  placeholder="Nombre del producto"
                                                  data-testid="input-template-name"
                                                />
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="template-description">Descripción</Label>
                                                <Input
                                                  id="template-description"
                                                  value={newTemplateProduct.description}
                                                  onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, description: e.target.value }))}
                                                  placeholder="Descripción del producto"
                                                  data-testid="input-template-description"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label htmlFor="template-sku">SKU</Label>
                                                  <Input
                                                    id="template-sku"
                                                    value={newTemplateProduct.sku}
                                                    onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, sku: e.target.value }))}
                                                    placeholder="SKU"
                                                    data-testid="input-template-sku"
                                                  />
                                                </div>
                                                <div className="space-y-2">
                                                  <Label htmlFor="template-barcode">Código de Barras</Label>
                                                  <Input
                                                    id="template-barcode"
                                                    value={newTemplateProduct.barcode}
                                                    onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, barcode: e.target.value }))}
                                                    placeholder="Código"
                                                    data-testid="input-template-barcode"
                                                  />
                                                </div>
                                              </div>
                                              <div className="space-y-2">
                                                <Label htmlFor="template-category">Categoría</Label>
                                                <Input
                                                  id="template-category"
                                                  value={newTemplateProduct.category_name}
                                                  onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, category_name: e.target.value }))}
                                                  placeholder="Ej: Bebidas, Alimentos, etc."
                                                  data-testid="input-template-category"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label htmlFor="template-price">Precio Sugerido</Label>
                                                  <Input
                                                    id="template-price"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={newTemplateProduct.suggested_price}
                                                    onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, suggested_price: parseFloat(e.target.value) || 0 }))}
                                                    placeholder="0.00"
                                                    data-testid="input-template-price"
                                                  />
                                                </div>
                                                <div className="space-y-2">
                                                  <Label htmlFor="template-cost">Costo Sugerido</Label>
                                                  <Input
                                                    id="template-cost"
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={newTemplateProduct.suggested_cost}
                                                    onChange={(e) => setNewTemplateProduct(prev => ({ ...prev, suggested_cost: parseFloat(e.target.value) || 0 }))}
                                                    placeholder="0.00"
                                                    data-testid="input-template-cost"
                                                  />
                                                </div>
                                              </div>
                                            </div>

                                            <DialogFooter>
                                              <Button
                                                variant="outline"
                                                onClick={() => {
                                                  setIsAddTemplateDialogOpen(false);
                                                  setNewTemplateProduct({
                                                    name: "",
                                                    description: "",
                                                    sku: "",
                                                    barcode: "",
                                                    category_name: "",
                                                    product_type: "normal",
                                                    suggested_price: 0,
                                                    suggested_cost: 0,
                                                    image_url: "",
                                                  });
                                                }}
                                              >
                                                Cancelar
                                              </Button>
                                              <Button
                                                onClick={() => saveNewTemplateProduct(vertical.id)}
                                                disabled={savingTemplateProduct}
                                                data-testid="button-save-template"
                                              >
                                                {savingTemplateProduct ? (
                                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                ) : (
                                                  <Save className="h-4 w-4 mr-2" />
                                                )}
                                                Crear Plantilla
                                              </Button>
                                            </DialogFooter>
                                          </DialogContent>
                                        </Dialog>
                                      </div>

                                      {/* Inline catalog search */}
                                      <div className="space-y-3">
                                        <div className="relative">
                                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                          <Input
                                            placeholder="Buscar en catálogo por nombre, SKU o código de barras..."
                                            value={catalogSearchTerm}
                                            onChange={(e) => {
                                              setCatalogSearchTerm(e.target.value);
                                              if (e.target.value.trim() && !showCatalogResults) {
                                                setShowCatalogResults(true);
                                              }
                                            }}
                                            onFocus={() => {
                                              if (catalogSearchTerm.trim()) {
                                                setShowCatalogResults(true);
                                              }
                                            }}
                                            onKeyDown={async (e) => {
                                              if (e.key === 'Enter' && catalogSearchTerm.trim()) {
                                                e.preventDefault();
                                                // API already filtered products, use them directly
                                                const existingTemplateIds = new Set(
                                                  (verticalTemplateProducts[vertical.id] || [])
                                                    .map(t => t.source_product_id)
                                                    .filter(Boolean)
                                                );
                                                const availableProducts = allProducts.filter(p => !existingTemplateIds.has(p.id));
                                                
                                                if (availableProducts.length === 1) {
                                                  // Single result found - add it immediately using the existing helper
                                                  const product = availableProducts[0];
                                                  setSelectedCatalogProducts(new Set([product.id]));
                                                  // Use setTimeout to ensure state is updated before calling the function
                                                  setTimeout(() => {
                                                    addCatalogProductsAsTemplates(vertical.id);
                                                  }, 0);
                                                } else if (availableProducts.length > 1) {
                                                  // Multiple results - show them and provide feedback
                                                  setShowCatalogResults(true);
                                                  toast.info(`Se encontraron ${availableProducts.length} productos. Selecciona los que deseas agregar.`);
                                                } else if (availableProducts.length === 0 && allProducts.length > 0) {
                                                  // All matching products are already added
                                                  toast.info("Todos los productos encontrados ya están agregados como plantillas");
                                                  setShowCatalogResults(false);
                                                } else {
                                                  // No products found
                                                  toast.error("No se encontraron productos con ese criterio de búsqueda");
                                                }
                                              }
                                            }}
                                            className="pl-10"
                                            data-testid={`input-catalog-search-${vertical.id}`}
                                            autoComplete="off"
                                            autoFocus={expandedVerticalId === vertical.id && verticalInnerTab[vertical.id] === "templates"}
                                          />
                                        </div>

                                        {/* Catalog results - collapsible */}
                                        {showCatalogResults && catalogSearchTerm.trim() && (
                                          <div className="border rounded-lg bg-card">
                                            <div className="flex items-center justify-between p-3 border-b">
                                              <div className="flex items-center gap-2">
                                                <Package className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">
                                                  Resultados del Catálogo
                                                </span>
                                                {selectedCatalogProducts.size > 0 && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    {selectedCatalogProducts.size} seleccionado{selectedCatalogProducts.size !== 1 ? 's' : ''}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2">
                                                {selectedCatalogProducts.size > 0 && (
                                                  <Button
                                                    size="sm"
                                                    onClick={() => addCatalogProductsAsTemplates(vertical.id)}
                                                    disabled={savingTemplateProduct}
                                                    data-testid={`button-add-catalog-products-${vertical.id}`}
                                                  >
                                                    {savingTemplateProduct ? (
                                                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                    ) : (
                                                      <Plus className="h-4 w-4 mr-2" />
                                                    )}
                                                    Agregar ({selectedCatalogProducts.size})
                                                  </Button>
                                                )}
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    setShowCatalogResults(false);
                                                    setSelectedCatalogProducts(new Set());
                                                  }}
                                                  data-testid={`button-close-catalog-${vertical.id}`}
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </div>

                                            {/* Pagination info and controls */}
                                            {catalogTotalResults > 0 && (
                                              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                                                <span className="text-xs text-muted-foreground">
                                                  {(() => {
                                                    const start = (catalogCurrentPage - 1) * catalogLimit + 1;
                                                    const end = Math.min(catalogCurrentPage * catalogLimit, catalogTotalResults);
                                                    return `Mostrando ${start}-${end} de ${catalogTotalResults} resultado${catalogTotalResults !== 1 ? 's' : ''}`;
                                                  })()}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setCatalogCurrentPage(p => p - 1)}
                                                    disabled={catalogCurrentPage === 1 || productsLoading}
                                                    data-testid="button-catalog-prev-page"
                                                  >
                                                    <LucideIcons.ChevronLeft className="h-4 w-4" />
                                                  </Button>
                                                  <span className="text-xs font-medium px-2">
                                                    Página {catalogCurrentPage} de {Math.ceil(catalogTotalResults / catalogLimit)}
                                                  </span>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setCatalogCurrentPage(p => p + 1)}
                                                    disabled={catalogCurrentPage >= Math.ceil(catalogTotalResults / catalogLimit) || productsLoading}
                                                    data-testid="button-catalog-next-page"
                                                  >
                                                    <LucideIcons.ChevronRight className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            )}

                                            <ScrollArea className="max-h-[400px]">
                                              <div className="p-3 space-y-2">
                                                {productsLoading ? (
                                                  <div className="flex items-center justify-center py-8">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                  </div>
                                                ) : (() => {
                                                  // API already filtered products, no need to filter client-side
                                                  const existingTemplateIds = new Set(
                                                    (verticalTemplateProducts[vertical.id] || [])
                                                      .map(t => t.source_product_id)
                                                      .filter(Boolean)
                                                  );

                                                  if (allProducts.length === 0) {
                                                    return (
                                                      <div className="text-center py-8 text-muted-foreground">
                                                        <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                                                        <p className="text-sm">No se encontraron productos</p>
                                                      </div>
                                                    );
                                                  }

                                                  return allProducts.map(product => {
                                                    const isSelected = selectedCatalogProducts.has(product.id);
                                                    const isAlreadyAdded = existingTemplateIds.has(product.id);
                                                    const categoryKey = `${product.id}-${product.categoryId}`;
                                                    const isCategoryExpanded = product.categoryId && expandedProductCategories.has(categoryKey);
                                                    const isCategoryLoading = product.categoryId && categoryProductsLoading.has(product.categoryId);
                                                    const categoryProds = product.categoryId ? (categoryProducts[product.categoryId] || []) : [];
                                                    
                                                    return (
                                                      <div key={product.id} className="space-y-2">
                                                        <div
                                                          className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                                                            isAlreadyAdded
                                                              ? "bg-muted/50 opacity-60"
                                                              : isSelected
                                                              ? "border-primary bg-primary/10"
                                                              : "hover-elevate"
                                                          }`}
                                                          data-testid={`catalog-product-${product.id}`}
                                                        >
                                                          {/* Checkbox on the left */}
                                                          <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={(checked) => {
                                                              if (!isAlreadyAdded) {
                                                                if (checked) {
                                                                  setSelectedCatalogProducts(prev => new Set([...prev, product.id]));
                                                                } else {
                                                                  setSelectedCatalogProducts(prev => {
                                                                    const next = new Set(prev);
                                                                    next.delete(product.id);
                                                                    return next;
                                                                  });
                                                                }
                                                              }
                                                            }}
                                                            disabled={isAlreadyAdded}
                                                            className="shrink-0"
                                                            data-testid={`checkbox-product-${product.id}`}
                                                          />
                                                          {product.imageUrl ? (
                                                            <img 
                                                              src={product.imageUrl} 
                                                              alt={product.name}
                                                              className="h-12 w-12 rounded-lg object-cover shrink-0"
                                                            />
                                                          ) : (
                                                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                              <Package className="h-6 w-6 text-primary" />
                                                            </div>
                                                          )}
                                                          <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                              <span className="font-medium text-sm">{product.name}</span>
                                                              {isAlreadyAdded && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                  <Check className="h-3 w-3 mr-1" />
                                                                  Ya agregado
                                                                </Badge>
                                                              )}
                                                              {isSelected && !isAlreadyAdded && (
                                                                <Badge variant="default" className="text-xs">
                                                                  Seleccionado
                                                                </Badge>
                                                              )}
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                              <span>${product.price.toFixed(2)}</span>
                                                              {product.sku && <span>SKU: {product.sku}</span>}
                                                              {product.barcode && <span>CB: {product.barcode}</span>}
                                                            </div>
                                                            
                                                            {/* Category expansion checkbox */}
                                                            {product.categoryId && product.categoryName && (
                                                              <div 
                                                                className="flex items-center gap-2 mt-2 cursor-pointer"
                                                                onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  toggleProductCategoryExpansion(product.id, product.categoryId!, product.categoryName!, vertical.id);
                                                                }}
                                                              >
                                                                <Checkbox
                                                                  checked={isCategoryExpanded || false}
                                                                  onCheckedChange={() => toggleProductCategoryExpansion(product.id, product.categoryId!, product.categoryName!, vertical.id)}
                                                                  onClick={(e) => e.stopPropagation()}
                                                                  className="shrink-0"
                                                                  data-testid={`checkbox-category-expand-${product.id}`}
                                                                />
                                                                <span className="text-xs text-primary font-medium">
                                                                  Agregar todos los productos de "{product.categoryName}"
                                                                </span>
                                                                {isCategoryLoading && (
                                                                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                                                )}
                                                                {isCategoryExpanded ? (
                                                                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                                                                ) : (
                                                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                                )}
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                        
                                                        {/* Expanded category products */}
                                                        {isCategoryExpanded && (
                                                          <div className="ml-6 pl-4 border-l-2 border-primary/30 space-y-1">
                                                            {isCategoryLoading ? (
                                                              <div className="flex items-center gap-2 py-2 text-muted-foreground">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                <span className="text-xs">Cargando productos de la categoría...</span>
                                                              </div>
                                                            ) : categoryProds.length === 0 ? (
                                                              <div className="py-2 text-xs text-muted-foreground">
                                                                No hay más productos en esta categoría
                                                              </div>
                                                            ) : (
                                                              categoryProds.map(catProduct => {
                                                                const catProdSelected = selectedCatalogProducts.has(catProduct.id);
                                                                const catProdAlreadyAdded = existingTemplateIds.has(catProduct.id);
                                                                
                                                                return (
                                                                  <div
                                                                    key={catProduct.id}
                                                                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                                                                      catProdAlreadyAdded
                                                                        ? "bg-muted/30 opacity-60"
                                                                        : catProdSelected
                                                                        ? "bg-primary/10 border border-primary/30"
                                                                        : "hover:bg-accent/50"
                                                                    }`}
                                                                    data-testid={`category-product-${catProduct.id}`}
                                                                  >
                                                                    <Checkbox
                                                                      checked={catProdSelected}
                                                                      onCheckedChange={(checked) => {
                                                                        if (!catProdAlreadyAdded) {
                                                                          toggleCategoryProductSelection(catProduct.id);
                                                                        }
                                                                      }}
                                                                      disabled={catProdAlreadyAdded}
                                                                      className="shrink-0"
                                                                      data-testid={`checkbox-cat-product-${catProduct.id}`}
                                                                    />
                                                                    {catProduct.imageUrl ? (
                                                                      <img 
                                                                        src={catProduct.imageUrl} 
                                                                        alt={catProduct.name}
                                                                        className="h-8 w-8 rounded object-cover shrink-0"
                                                                      />
                                                                    ) : (
                                                                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                                        <Package className="h-4 w-4 text-primary" />
                                                                      </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                      <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium truncate">{catProduct.name}</span>
                                                                        {catProdAlreadyAdded && (
                                                                          <Badge variant="secondary" className="text-xs py-0">
                                                                            <Check className="h-2 w-2 mr-1" />
                                                                            Agregado
                                                                          </Badge>
                                                                        )}
                                                                      </div>
                                                                      <div className="text-xs text-muted-foreground">
                                                                        ${catProduct.price.toFixed(2)}
                                                                        {catProduct.sku && <span className="ml-2">SKU: {catProduct.sku}</span>}
                                                                      </div>
                                                                    </div>
                                                                  </div>
                                                                );
                                                              })
                                                            )}
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  });
                                                })()}
                                              </div>
                                            </ScrollArea>
                                          </div>
                                        )}
                                      </div>

                                      {/* Template products list */}
                                      {(verticalTemplateProducts[vertical.id]?.length || 0) === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground border rounded-lg bg-card">
                                          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                          <p className="font-medium">Sin productos plantilla</p>
                                          <p className="text-sm mt-1">
                                            Los nuevos negocios de este giro comenzarán sin productos precargados
                                          </p>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-4"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setIsAddTemplateDialogOpen(true);
                                            }}
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Agregar primer producto
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-2">
                                          {verticalTemplateProducts[vertical.id]?.map((template) => (
                                            <div
                                              key={template.id}
                                              className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors"
                                              data-testid={`template-product-${template.id}`}
                                            >
                                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                {template.image_url ? (
                                                  <img 
                                                    src={template.image_url} 
                                                    alt={template.name}
                                                    className="h-10 w-10 rounded-lg object-cover"
                                                  />
                                                ) : (
                                                  <Package className="h-5 w-5 text-primary" />
                                                )}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                  <span className="font-medium text-sm truncate">{template.name}</span>
                                                  {template.category_name && (
                                                    <Badge variant="outline" className="text-xs">
                                                      {template.category_name}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                                  {template.suggested_price !== undefined && template.suggested_price > 0 && (
                                                    <span>${template.suggested_price.toFixed(2)}</span>
                                                  )}
                                                  {template.sku && (
                                                    <span>SKU: {template.sku}</span>
                                                  )}
                                                </div>
                                              </div>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  deleteTemplateProduct(vertical.id, template.id);
                                                }}
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                data-testid={`button-delete-template-${template.id}`}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </TabsContent>

                                {/* UI Configuration Tab */}
                                <TabsContent value="ui-config" className="mt-4">
                                  {uiConfigLoading ? (
                                    <div className="space-y-2">
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                      <Skeleton className="h-8 w-full" />
                                    </div>
                                  ) : (
                                    <div className="space-y-6">
                                      {/* Header with save button */}
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">
                                          Personaliza la terminología y campos para este giro de negocio
                                        </span>
                                        <Button
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            saveVerticalUIConfig(vertical.id);
                                          }}
                                          disabled={savingUIConfig}
                                          data-testid={`button-save-ui-config-${vertical.id}`}
                                          className="min-h-[36px]"
                                        >
                                          {savingUIConfig ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                          ) : (
                                            <Save className="h-4 w-4 mr-2" />
                                          )}
                                          Guardar
                                        </Button>
                                      </div>

                                      {/* Terminology Section */}
                                      <div className="border rounded-lg p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                          <Type className="h-4 w-4 text-primary" />
                                          <span className="font-medium">Terminología</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Personaliza cómo se llaman las entidades en tu sistema (ej: "Cliente" → "Paciente" para clínicas)
                                        </p>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          {/* Customer terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-customer-singular-${vertical.id}`}>Cliente (singular)</Label>
                                            <Input
                                              id={`term-customer-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.customer_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "customer_singular", e.target.value)}
                                              placeholder="Cliente"
                                              data-testid={`input-term-customer-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-customer-plural-${vertical.id}`}>Cliente (plural)</Label>
                                            <Input
                                              id={`term-customer-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.customer_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "customer_plural", e.target.value)}
                                              placeholder="Clientes"
                                              data-testid={`input-term-customer-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Product terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-product-singular-${vertical.id}`}>Producto (singular)</Label>
                                            <Input
                                              id={`term-product-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.product_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "product_singular", e.target.value)}
                                              placeholder="Producto"
                                              data-testid={`input-term-product-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-product-plural-${vertical.id}`}>Producto (plural)</Label>
                                            <Input
                                              id={`term-product-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.product_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "product_plural", e.target.value)}
                                              placeholder="Productos"
                                              data-testid={`input-term-product-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Order terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-order-singular-${vertical.id}`}>Orden (singular)</Label>
                                            <Input
                                              id={`term-order-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.order_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "order_singular", e.target.value)}
                                              placeholder="Orden"
                                              data-testid={`input-term-order-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-order-plural-${vertical.id}`}>Orden (plural)</Label>
                                            <Input
                                              id={`term-order-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.order_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "order_plural", e.target.value)}
                                              placeholder="Órdenes"
                                              data-testid={`input-term-order-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Category terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-category-singular-${vertical.id}`}>Categoría (singular)</Label>
                                            <Input
                                              id={`term-category-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.category_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "category_singular", e.target.value)}
                                              placeholder="Categoría"
                                              data-testid={`input-term-category-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-category-plural-${vertical.id}`}>Categoría (plural)</Label>
                                            <Input
                                              id={`term-category-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.category_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "category_plural", e.target.value)}
                                              placeholder="Categorías"
                                              data-testid={`input-term-category-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Staff terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-staff-singular-${vertical.id}`}>Personal (singular)</Label>
                                            <Input
                                              id={`term-staff-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.staff_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "staff_singular", e.target.value)}
                                              placeholder="Empleado"
                                              data-testid={`input-term-staff-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-staff-plural-${vertical.id}`}>Personal (plural)</Label>
                                            <Input
                                              id={`term-staff-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.staff_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "staff_plural", e.target.value)}
                                              placeholder="Empleados"
                                              data-testid={`input-term-staff-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Sale terms */}
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-sale-singular-${vertical.id}`}>Venta (singular)</Label>
                                            <Input
                                              id={`term-sale-singular-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.sale_singular || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "sale_singular", e.target.value)}
                                              placeholder="Venta"
                                              data-testid={`input-term-sale-singular-${vertical.id}`}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label htmlFor={`term-sale-plural-${vertical.id}`}>Venta (plural)</Label>
                                            <Input
                                              id={`term-sale-plural-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.sale_plural || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "sale_plural", e.target.value)}
                                              placeholder="Ventas"
                                              data-testid={`input-term-sale-plural-${vertical.id}`}
                                            />
                                          </div>

                                          {/* Inventory label */}
                                          <div className="space-y-2 sm:col-span-2">
                                            <Label htmlFor={`term-inventory-label-${vertical.id}`}>Etiqueta de Inventario</Label>
                                            <Input
                                              id={`term-inventory-label-${vertical.id}`}
                                              value={verticalUIConfig[vertical.id]?.terminology?.inventory_label || ""}
                                              onChange={(e) => updateTerminology(vertical.id, "inventory_label", e.target.value)}
                                              placeholder="Inventario"
                                              data-testid={`input-term-inventory-label-${vertical.id}`}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Custom Fields Section */}
                                      <div className="border rounded-lg p-4 space-y-4">
                                        <div className="flex items-center gap-2">
                                          <FormInput className="h-4 w-4 text-primary" />
                                          <span className="font-medium">Campos Personalizados</span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          Agrega campos específicos para productos, clientes, etc. (ej: fecha de vencimiento para farmacias)
                                        </p>

                                        {/* Existing custom fields */}
                                        {(verticalUIConfig[vertical.id]?.entity_fields || []).length > 0 && (
                                          <div className="space-y-2">
                                            {verticalUIConfig[vertical.id]?.entity_fields.map((field, idx) => (
                                              <div
                                                key={`${field.entity_type}-${field.field_key}-${idx}`}
                                                className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                                                data-testid={`custom-field-${field.field_key}`}
                                              >
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-sm">{field.field_label}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                      {field.entity_type}
                                                    </Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                      {field.field_type}
                                                    </Badge>
                                                    {field.required && (
                                                      <Badge variant="destructive" className="text-xs">
                                                        Requerido
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                                    <span>Clave: {field.field_key}</span>
                                                    {field.show_in_list && <span>• Lista</span>}
                                                    {field.show_in_form && <span>• Formulario</span>}
                                                    {field.show_in_detail && <span>• Detalle</span>}
                                                  </div>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeCustomField(vertical.id, field.field_key, field.entity_type);
                                                  }}
                                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  data-testid={`button-delete-field-${field.field_key}`}
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Add new custom field form */}
                                        <div className="border-t pt-4 space-y-4">
                                          <span className="text-sm font-medium">Agregar nuevo campo</span>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                              <Label htmlFor={`new-field-entity-${vertical.id}`}>Tipo de Entidad</Label>
                                              <Select
                                                value={newCustomField.entity_type}
                                                onValueChange={(value) => setNewCustomField(prev => ({ ...prev, entity_type: value }))}
                                              >
                                                <SelectTrigger id={`new-field-entity-${vertical.id}`} data-testid={`select-field-entity-${vertical.id}`}>
                                                  <SelectValue placeholder="Seleccionar entidad" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="product">Producto</SelectItem>
                                                  <SelectItem value="customer">Cliente</SelectItem>
                                                  <SelectItem value="order">Orden</SelectItem>
                                                  <SelectItem value="inventory">Inventario</SelectItem>
                                                  <SelectItem value="staff">Personal</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor={`new-field-type-${vertical.id}`}>Tipo de Campo</Label>
                                              <Select
                                                value={newCustomField.field_type}
                                                onValueChange={(value) => setNewCustomField(prev => ({ ...prev, field_type: value }))}
                                              >
                                                <SelectTrigger id={`new-field-type-${vertical.id}`} data-testid={`select-field-type-${vertical.id}`}>
                                                  <SelectValue placeholder="Tipo de campo" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="text">Texto</SelectItem>
                                                  <SelectItem value="number">Número</SelectItem>
                                                  <SelectItem value="date">Fecha</SelectItem>
                                                  <SelectItem value="datetime">Fecha y Hora</SelectItem>
                                                  <SelectItem value="select">Selección</SelectItem>
                                                  <SelectItem value="checkbox">Casilla</SelectItem>
                                                  <SelectItem value="textarea">Texto Largo</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor={`new-field-key-${vertical.id}`}>Clave del Campo</Label>
                                              <Input
                                                id={`new-field-key-${vertical.id}`}
                                                value={newCustomField.field_key}
                                                onChange={(e) => setNewCustomField(prev => ({ ...prev, field_key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                                                placeholder="ej: expiration_date"
                                                data-testid={`input-field-key-${vertical.id}`}
                                              />
                                            </div>
                                            <div className="space-y-2">
                                              <Label htmlFor={`new-field-label-${vertical.id}`}>Etiqueta</Label>
                                              <Input
                                                id={`new-field-label-${vertical.id}`}
                                                value={newCustomField.field_label}
                                                onChange={(e) => setNewCustomField(prev => ({ ...prev, field_label: e.target.value }))}
                                                placeholder="ej: Fecha de Vencimiento"
                                                data-testid={`input-field-label-${vertical.id}`}
                                              />
                                            </div>
                                          </div>

                                          {/* Field options */}
                                          <div className="flex flex-wrap items-center gap-4">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <Checkbox
                                                checked={newCustomField.required}
                                                onCheckedChange={(checked) => setNewCustomField(prev => ({ ...prev, required: !!checked }))}
                                                data-testid={`checkbox-field-required-${vertical.id}`}
                                              />
                                              <span className="text-sm">Requerido</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <Checkbox
                                                checked={newCustomField.show_in_list}
                                                onCheckedChange={(checked) => setNewCustomField(prev => ({ ...prev, show_in_list: !!checked }))}
                                                data-testid={`checkbox-field-show-list-${vertical.id}`}
                                              />
                                              <span className="text-sm">Mostrar en lista</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <Checkbox
                                                checked={newCustomField.show_in_form}
                                                onCheckedChange={(checked) => setNewCustomField(prev => ({ ...prev, show_in_form: !!checked }))}
                                                data-testid={`checkbox-field-show-form-${vertical.id}`}
                                              />
                                              <span className="text-sm">Mostrar en formulario</span>
                                            </label>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <Checkbox
                                                checked={newCustomField.show_in_detail}
                                                onCheckedChange={(checked) => setNewCustomField(prev => ({ ...prev, show_in_detail: !!checked }))}
                                                data-testid={`checkbox-field-show-detail-${vertical.id}`}
                                              />
                                              <span className="text-sm">Mostrar en detalle</span>
                                            </label>
                                          </div>

                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              addCustomField(vertical.id);
                                            }}
                                            data-testid={`button-add-custom-field-${vertical.id}`}
                                            className="min-h-[36px]"
                                          >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Agregar Campo
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </TabsContent>
                              </Tabs>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card data-testid="card-total-products">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Total Productos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allProducts.length}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-template-products">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Check className="h-4 w-4" />
                    Asignaciones
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{templateProducts.length}</div>
                </CardContent>
              </Card>
              <Card data-testid="card-verticals-with-templates">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Giros con Plantillas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {new Set(templateProducts.map(tp => tp.vertical_id)).size}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Productos del Sistema
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsAddProductDialogOpen(true)}
                      className="min-h-[36px]"
                      data-testid="button-add-product"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Artículo
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Selecciona un producto para asignarlo a giros de negocio
                  </CardDescription>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar productos..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-products"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {productsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                      <Package className="h-12 w-12 mb-4 opacity-50" />
                      <p>No se encontraron productos</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-full px-6 pb-6">
                      <div className="space-y-2">
                        {filteredProducts.map((product) => {
                          const assignmentCount = getProductAssignmentCount(product.id);
                          const isSelected = selectedProduct?.id === product.id;
                          
                          return (
                            <div
                              key={product.id}
                              onClick={() => handleSelectProduct(product)}
                              className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                                isSelected 
                                  ? "border-primary bg-primary/5" 
                                  : "hover-elevate"
                              }`}
                              data-testid={`product-item-${product.id}`}
                            >
                              {product.imageUrl ? (
                                <img 
                                  src={product.imageUrl} 
                                  alt={product.name}
                                  className="h-10 w-10 rounded-md object-cover shrink-0"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{product.name}</div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {product.categoryName || "Sin categoría"} • ${product.price.toFixed(2)}
                                </div>
                              </div>
                              {assignmentCount > 0 && (
                                <Badge variant="secondary" className="shrink-0">
                                  {assignmentCount} giro{assignmentCount !== 1 && "s"}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              <Card className="h-[600px] flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Asignar a Giros de Negocio
                  </CardTitle>
                  <CardDescription>
                    {selectedProduct 
                      ? `Selecciona los giros para "${selectedProduct.name}"`
                      : "Selecciona un producto de la lista"
                    }
                  </CardDescription>
                  {selectedProduct && (
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar giros de negocio..."
                        value={templateVerticalSearchTerm}
                        onChange={(e) => setTemplateVerticalSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-template-verticals"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden p-0">
                  {!selectedProduct ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                      <Store className="h-12 w-12 mb-4 opacity-50" />
                      <p>Selecciona un producto para ver las opciones</p>
                    </div>
                  ) : verticalsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : filteredTemplateVerticals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6">
                      <Store className="h-12 w-12 mb-4 opacity-50" />
                      <p>{templateVerticalSearchTerm ? "No se encontraron giros" : "No hay giros de negocio activos"}</p>
                      {!templateVerticalSearchTerm && <p className="text-sm mt-2">Crea uno en la pestaña "Giros"</p>}
                    </div>
                  ) : (
                    <div className="flex flex-col h-full">
                      <ScrollArea className="flex-1 px-6">
                        <div className="space-y-2 pb-4">
                          {filteredTemplateVerticals.map((vertical) => {
                            const isChecked = selectedVerticalIds.includes(vertical.id);
                            
                            return (
                              <div
                                key={vertical.id}
                                className="flex items-center gap-3 p-3 border rounded-lg hover-elevate transition-all"
                                data-testid={`vertical-checkbox-${vertical.id}`}
                              >
                                <Checkbox
                                  id={`vertical-${vertical.id}`}
                                  checked={isChecked}
                                  onCheckedChange={() => handleVerticalToggle(vertical.id)}
                                  data-testid={`checkbox-vertical-${vertical.id}`}
                                />
                                <label 
                                  htmlFor={`vertical-${vertical.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium">{vertical.display_name}</div>
                                  {vertical.description && (
                                    <div className="text-sm text-muted-foreground truncate">
                                      {vertical.description}
                                    </div>
                                  )}
                                </label>
                                {isChecked && (
                                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                      <div className="p-6 pt-4 border-t">
                        <Button
                          onClick={handleSaveTemplateAssignments}
                          disabled={savingTemplates}
                          className="w-full min-h-[44px]"
                          data-testid="button-save-templates"
                        >
                          {savingTemplates ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Guardar Asignaciones ({selectedVerticalIds.length} seleccionado{selectedVerticalIds.length !== 1 && "s"})
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Artículo</DialogTitle>
            <DialogDescription>
              Complete los datos del nuevo producto para agregarlo al sistema
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="product-name">Nombre del Producto *</Label>
                <Input
                  id="product-name"
                  placeholder="Nombre del producto"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-name"
                />
              </div>
              
              <div>
                <Label htmlFor="product-sku">SKU</Label>
                <Input
                  id="product-sku"
                  placeholder="SKU-000001"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-sku"
                />
              </div>
              
              <div>
                <Label htmlFor="product-barcode">Código de Barras</Label>
                <Input
                  id="product-barcode"
                  placeholder="7890123456789"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, barcode: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-barcode"
                />
              </div>
              
              <div>
                <Label htmlFor="product-category">Categoría</Label>
                <Input
                  id="product-category"
                  placeholder="Ej: Abarrotes, Bebidas"
                  value={newProduct.category_name}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, category_name: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-category"
                />
              </div>
              
              <div>
                <Label htmlFor="product-unit">Unidad de Medida</Label>
                <Select 
                  value={newProduct.unit} 
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, unit: value }))}
                >
                  <SelectTrigger className="mt-1" data-testid="select-new-product-unit">
                    <SelectValue placeholder="Selecciona unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pieza">Pieza</SelectItem>
                    <SelectItem value="Kg">Kilogramo</SelectItem>
                    <SelectItem value="Lt">Litro</SelectItem>
                    <SelectItem value="Caja">Caja</SelectItem>
                    <SelectItem value="Paquete">Paquete</SelectItem>
                    <SelectItem value="Docena">Docena</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="product-image">URL de Imagen</Label>
                <Input
                  id="product-image"
                  placeholder="https://..."
                  value={newProduct.image_url}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, image_url: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-image"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="product-description">Descripción</Label>
                <Input
                  id="product-description"
                  placeholder="Descripción del producto"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                  className="mt-1"
                  data-testid="input-new-product-description"
                />
              </div>
              
              <div>
                <Label htmlFor="product-price">Precio de Venta *</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newProduct.price || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                  data-testid="input-new-product-price"
                />
              </div>
              
              <div>
                <Label htmlFor="product-cost">Costo</Label>
                <Input
                  id="product-cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newProduct.cost || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  className="mt-1"
                  data-testid="input-new-product-cost"
                />
              </div>
              
              <div>
                <Label htmlFor="product-stock">Stock Inicial</Label>
                <Input
                  id="product-stock"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newProduct.stock || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                  data-testid="input-new-product-stock"
                />
              </div>
              
              <div>
                <Label htmlFor="product-min-stock">Stock Mínimo</Label>
                <Input
                  id="product-min-stock"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={newProduct.min_stock || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, min_stock: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                  data-testid="input-new-product-min-stock"
                />
              </div>
              
              <div>
                <Label htmlFor="product-max-stock">Stock Máximo</Label>
                <Input
                  id="product-max-stock"
                  type="number"
                  min="0"
                  placeholder="500"
                  value={newProduct.max_stock || ""}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, max_stock: parseInt(e.target.value) || 0 }))}
                  className="mt-1"
                  data-testid="input-new-product-max-stock"
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3">Visibilidad del Producto</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Punto de Venta (POS)
                    </div>
                    <div className="text-xs text-muted-foreground">Disponible para ventas en mostrador</div>
                  </div>
                  <Checkbox
                    checked={newProduct.available_in_pos}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, available_in_pos: checked === true }))}
                    data-testid="checkbox-new-product-pos"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Menú Digital / Venta en Línea
                    </div>
                    <div className="text-xs text-muted-foreground">Visible en el menú digital para clientes</div>
                  </div>
                  <Checkbox
                    checked={newProduct.available_in_digital_menu}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, available_in_digital_menu: checked === true }))}
                    data-testid="checkbox-new-product-digital"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Control de Inventario
                    </div>
                    <div className="text-xs text-muted-foreground">Controlar stock (desactivar para servicios)</div>
                  </div>
                  <Checkbox
                    checked={newProduct.track_inventory}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, track_inventory: checked === true }))}
                    data-testid="checkbox-new-product-inventory"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium text-sm">Activo</div>
                    <div className="text-xs text-muted-foreground">Producto disponible para la venta</div>
                  </div>
                  <Checkbox
                    checked={newProduct.active}
                    onCheckedChange={(checked) => setNewProduct(prev => ({ ...prev, active: checked === true }))}
                    data-testid="checkbox-new-product-active"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsAddProductDialogOpen(false);
                resetNewProductForm();
              }}
              className="w-full sm:w-auto min-h-[44px]"
              data-testid="button-cancel-new-product"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveNewProduct}
              disabled={savingNewProduct || !newProduct.name.trim()}
              className="w-full sm:w-auto min-h-[44px]"
              data-testid="button-save-new-product"
            >
              {savingNewProduct ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Producto
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateUserDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setNewUserData({
            email: "",
            firstName: "",
            lastName: "",
            roleId: "custom",
            verticalId: "",
            customDomain: "",
            platformName: "",
            logoUrl: "",
            primaryColor: "#3b82f6",
            selectedPermissions: [],
          });
          setVerticalSearchTerm("");
          setShowVerticalDropdown(false);
        }
        setIsCreateUserDialogOpen(open);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario y asígnale un rol y permisos personalizados
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-user-email"
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                  data-testid="input-new-user-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-firstname">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-user-firstname"
                  placeholder="Juan"
                  value={newUserData.firstName}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, firstName: e.target.value }))}
                  data-testid="input-new-user-firstname"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-lastname">
                  Apellido <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new-user-lastname"
                  placeholder="Pérez"
                  value={newUserData.lastName}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, lastName: e.target.value }))}
                  data-testid="input-new-user-lastname"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <Label>Rol <span className="text-destructive">*</span></Label>
              </div>
              <Select
                value={newUserData.roleId}
                onValueChange={(value) => {
                  if (value === "custom") {
                    setNewUserData(prev => ({ ...prev, roleId: "custom", selectedPermissions: [] }));
                  } else {
                    handleRoleSelect(value);
                  }
                }}
              >
                <SelectTrigger data-testid="select-role">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      <span>Personalizado</span>
                    </div>
                  </SelectItem>
                  {rbacRoles.filter(r => r.is_system).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3" />
                        Roles del Sistema
                      </div>
                      {rbacRoles.filter(role => role.is_system && role.id).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            <Badge variant="secondary" className={`text-xs ${SCOPE_COLORS[role.scope] || ""}`}>
                              {role.permissions?.length || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {rbacRoles.filter(r => !r.is_system).length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Pencil className="h-3 w-3" />
                        Roles Personalizados
                      </div>
                      {rbacRoles.filter(role => !role.is_system && role.id).map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          <div className="flex items-center gap-2">
                            <span>{role.name}</span>
                            <Badge variant="secondary" className={`text-xs ${SCOPE_COLORS[role.scope] || ""}`}>
                              {role.permissions?.length || 0}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              {newUserData.roleId && newUserData.roleId !== "custom" && (
                <p className="text-xs text-muted-foreground">
                  {rbacRoles.find(r => r.id === newUserData.roleId)?.description || "Sin descripción"}
                </p>
              )}
              {newUserData.roleId === "custom" && (
                <p className="text-xs text-muted-foreground">
                  Selecciona los permisos manualmente en el panel de la derecha
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    <Label>Permisos por Módulo</Label>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {newUserData.selectedPermissions.length} seleccionados
                  </Badge>
                </div>
                <ScrollArea className="h-[300px] border rounded-lg p-2" data-testid="scroll-permissions-selector">
                  {!newUserData.roleId ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Shield className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm">Selecciona un rol para ver y editar los permisos</p>
                    </div>
                  ) : Object.keys(groupedPermissions).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 mb-2 animate-spin opacity-50" />
                      <p className="text-sm">Cargando permisos...</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(groupedPermissions).map(([module, perms]) => {
                        const checkState = getModuleCheckState(module);
                        const moduleName = PERMISSION_MODULE_NAMES[module] || module.replace(/_/g, " ");
                        const isExpanded = expandedPermissionModules.has(module);
                        const selectedCount = perms.filter(p => newUserData.selectedPermissions.includes(p.id)).length;
                        
                        return (
                          <Collapsible 
                            key={module} 
                            open={isExpanded} 
                            onOpenChange={() => togglePermissionModule(module)}
                            data-testid={`permissions-module-${module}`}
                          >
                            <div className="flex items-center gap-2 p-2.5 rounded-lg hover-elevate cursor-pointer border-b">
                              <Checkbox
                                checked={checkState === "all"}
                                onCheckedChange={() => toggleModulePermissions(module)}
                                onClick={(e) => e.stopPropagation()}
                                data-testid={`checkbox-module-${module}`}
                              />
                              <CollapsibleTrigger asChild>
                                <div className="flex items-center gap-2 flex-1 cursor-pointer">
                                  <span className="font-medium text-sm flex-1">{moduleName}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {selectedCount}/{perms.length}
                                  </Badge>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              </CollapsibleTrigger>
                            </div>
                            <CollapsibleContent>
                              <div className="pl-6 py-1 space-y-0.5 bg-muted/20 rounded-b-lg">
                                {perms.map((perm) => {
                                  const actionKey = perm.action.toLowerCase().replace(/\s+/g, "_");
                                  const actionLabel = getActionLabel(actionKey);
                                  
                                  return (
                                    <label
                                      key={perm.id}
                                      className="flex items-center gap-2 p-2 rounded hover-elevate cursor-pointer"
                                      data-testid={`permission-checkbox-${perm.key}`}
                                    >
                                      <Checkbox
                                        checked={newUserData.selectedPermissions.includes(perm.id)}
                                        onCheckedChange={() => togglePermission(perm.id)}
                                        data-testid={`checkbox-${perm.key}`}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm truncate block">
                                          {actionLabel !== actionKey ? actionLabel : perm.action}
                                        </span>
                                        {perm.description && (
                                          <span className="text-xs text-muted-foreground truncate block">
                                            {perm.description}
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-user-vertical">
                Giro de Negocio (Opcional)
              </Label>
              <div className="relative">
                <Input
                  id="new-user-vertical"
                  placeholder="Busca un giro de negocio..."
                  value={verticalSearchTerm}
                  onChange={(e) => {
                    setVerticalSearchTerm(e.target.value);
                    setShowVerticalDropdown(true);
                  }}
                  onFocus={() => setShowVerticalDropdown(true)}
                  onBlur={() => setTimeout(() => setShowVerticalDropdown(false), 200)}
                  data-testid="input-search-vertical"
                  autoComplete="off"
                />
                {showVerticalDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 border rounded-lg bg-background shadow-lg z-50 max-h-48 overflow-y-auto">
                    <div 
                      className="p-2 cursor-pointer hover-elevate text-sm"
                      onClick={() => {
                        setNewUserData(prev => ({ ...prev, verticalId: "" }));
                        setVerticalSearchTerm("");
                        setShowVerticalDropdown(false);
                      }}
                      data-testid="vertical-option-none"
                    >
                      Sin giro de negocio
                    </div>
                    {verticals
                      .filter(v => v.active && v.id && (v.display_name || v.name).toLowerCase().includes(verticalSearchTerm.toLowerCase()))
                      .map((vertical) => (
                        <div
                          key={vertical.id}
                          className="p-2 cursor-pointer hover-elevate text-sm border-t"
                          onClick={() => {
                            setNewUserData(prev => ({ ...prev, verticalId: vertical.id }));
                            setVerticalSearchTerm(vertical.display_name || vertical.name);
                            setShowVerticalDropdown(false);
                          }}
                          data-testid={`vertical-option-${vertical.id}`}
                        >
                          {vertical.display_name || vertical.name}
                        </div>
                      ))}
                    {verticals.filter(v => v.active && v.id && (v.display_name || v.name).toLowerCase().includes(verticalSearchTerm.toLowerCase())).length === 0 && verticalSearchTerm && (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Sin resultados
                      </div>
                    )}
                  </div>
                )}
              </div>
              {newUserData.verticalId && (
                <p className="text-xs text-muted-foreground">
                  Seleccionado: {verticals.find(v => v.id === newUserData.verticalId)?.display_name || ""}
                </p>
              )}
            </div>

            {(() => {
              const selectedRbacRole = rbacRoles.find(r => r.id === newUserData.roleId);
              const isWhiteLabelRole = selectedRbacRole?.scope === "WHITE_LABEL";
              
              if (!isWhiteLabelRole) return null;
              
              return (
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <h4 className="font-medium">Configuración de Dominio Personalizado</h4>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-user-domain">Dominio</Label>
                    <div className="relative">
                      <Input
                        id="new-user-domain"
                        placeholder="miempresa.com"
                        value={newUserData.customDomain}
                        onChange={(e) => handleDomainChange(e.target.value)}
                        onBlur={handleDomainBlur}
                        data-testid="input-new-user-domain"
                      />
                      {lookingUpDns && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ingresa el dominio y presiona Tab o haz clic fuera para detectar el proveedor DNS
                    </p>
                  </div>
                  
                  {detectedDnsProvider && (
                    <div className={`flex items-center gap-2 p-3 border rounded-lg ${domainVerified ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" : "bg-background"}`}>
                      {domainVerified ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Shield className="h-4 w-4 text-blue-600" />
                      )}
                      <div className="flex-1">
                        <span className="text-sm">
                          Proveedor DNS: <strong>{detectedDnsProvider}</strong>
                        </span>
                        {domainVerified && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                            Verificado
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Instrucciones de configuración DNS */}
                  {newUserData.customDomain && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <h5 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                        <Globe className="h-4 w-4" />
                        Configuración de DNS Requerida
                      </h5>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                        Para que <strong>{newUserData.customDomain}</strong> funcione como marca blanca, el cliente debe configurar estos registros DNS:
                      </p>
                      <div className="bg-white dark:bg-gray-950 rounded border p-3 text-xs font-mono space-y-2">
                        <div className="grid grid-cols-3 gap-2 pb-2 border-b font-semibold text-gray-700 dark:text-gray-300">
                          <span>Tipo</span>
                          <span>Host</span>
                          <span>Apunta a</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-blue-600 font-semibold">A</span>
                          <span>@</span>
                          <span className="text-primary font-semibold">34.111.179.208</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-blue-600 font-semibold">A</span>
                          <span>www</span>
                          <span className="text-primary font-semibold">34.111.179.208</span>
                        </div>
                      </div>
                      <div className="mt-3 p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-800 dark:text-amber-200">
                        <strong>Importante:</strong> También debes agregar este dominio en Replit Deployments → Settings → Link a domain para obtener el código TXT de verificación.
                      </div>
                    </div>
                  )}

                  {/* Sección de Personalización de Marca */}
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="h-5 w-5 text-primary" />
                      <h4 className="font-medium">Personalización de Marca</h4>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="platform-name">Nombre de la Plataforma</Label>
                        <Input
                          id="platform-name"
                          placeholder="Ej: Mi Sistema POS"
                          value={newUserData.platformName}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, platformName: e.target.value }))}
                          data-testid="input-platform-name"
                        />
                        <p className="text-xs text-muted-foreground">
                          Este nombre aparecerá en el encabezado y login de la plataforma
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="logo-url">URL del Logotipo</Label>
                        <Input
                          id="logo-url"
                          placeholder="https://ejemplo.com/logo.png"
                          value={newUserData.logoUrl}
                          onChange={(e) => setNewUserData(prev => ({ ...prev, logoUrl: e.target.value }))}
                          data-testid="input-logo-url"
                        />
                        <p className="text-xs text-muted-foreground">
                          URL de la imagen del logo (PNG o SVG recomendado, fondo transparente)
                        </p>
                        {newUserData.logoUrl && (
                          <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                            <img 
                              src={newUserData.logoUrl} 
                              alt="Logo preview" 
                              className="max-h-12 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="primary-color">Color Principal</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="primary-color"
                            value={newUserData.primaryColor}
                            onChange={(e) => setNewUserData(prev => ({ ...prev, primaryColor: e.target.value }))}
                            className="w-12 h-10 rounded border cursor-pointer"
                            data-testid="input-primary-color"
                          />
                          <Input
                            value={newUserData.primaryColor}
                            onChange={(e) => setNewUserData(prev => ({ ...prev, primaryColor: e.target.value }))}
                            placeholder="#3b82f6"
                            className="flex-1"
                            data-testid="input-primary-color-hex"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Color principal para botones, enlaces y elementos destacados
                        </p>
                        <div 
                          className="mt-2 p-3 rounded-lg text-white text-center text-sm font-medium"
                          style={{ backgroundColor: newUserData.primaryColor }}
                        >
                          Vista previa del color
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateUserDialogOpen(false);
                setNewUserData({
                  email: "",
                  firstName: "",
                  lastName: "",
                  roleId: "",
                  verticalId: "",
                  customDomain: "",
                  platformName: "",
                  logoUrl: "",
                  primaryColor: "#3b82f6",
                  selectedPermissions: [],
                });
                setDetectedDnsProvider(null);
              }}
              className="w-full sm:w-auto"
              data-testid="button-cancel-create-user"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={creatingUser || !newUserData.email || !newUserData.firstName || !newUserData.lastName || !newUserData.roleId}
              className="w-full sm:w-auto"
              data-testid="button-submit-create-user"
            >
              {creatingUser ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Usuario
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
