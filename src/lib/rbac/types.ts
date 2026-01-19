export type TenantType = 'PLATFORM' | 'WHITE_LABEL' | 'BUSINESS' | 'LOCATION';
export type TenantScope = 'PLATFORM' | 'WHITE_LABEL' | 'BUSINESS' | 'EMPLOYEE';
export type UserTenantStatus = 'active' | 'suspended' | 'invited' | 'pending';

export interface Tenant {
  id: string;
  parent_id: string | null;
  type: TenantType;
  name: string;
  slug: string;
  description: string | null;
  path: string | null;
  brand_id: string | null;
  restaurant_id: string | null;
  settings: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: string;
  tenant_id: string;
  hostname: string;
  is_primary: boolean;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  tenant_id: string | null;
  scope: TenantScope;
  name: string;
  slug: string;
  description: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  key: string;
  module: string;
  action: string;
  description: string | null;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role_id: string;
  permission_id: string;
  created_at: string;
}

export interface UserTenant {
  id: string;
  user_id: string;
  tenant_id: string;
  role_id: string;
  status: UserTenantStatus;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserTenantWithDetails extends UserTenant {
  tenant?: Tenant;
  role?: Role;
  permissions?: Permission[];
}

export interface UserPermissions {
  userId: string;
  tenantId: string;
  role: Role;
  permissions: string[];
  modules: string[];
}

export const SYSTEM_ROLE_IDS = {
  PLATFORM_OWNER: '00000000-0000-0000-0000-000000000010',
  WHITELABEL_OWNER: '00000000-0000-0000-0000-000000000020',
  BUSINESS_OWNER: '00000000-0000-0000-0000-000000000030',
  EMPLOYEE: '00000000-0000-0000-0000-000000000040',
  CASHIER: '00000000-0000-0000-0000-000000000041',
  INVENTORY_MANAGER: '00000000-0000-0000-0000-000000000042',
  KITCHEN_STAFF: '00000000-0000-0000-0000-000000000043',
} as const;

export const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export const MODULE_NAMES: Record<string, string> = {
  pos: 'Punto de Venta',
  products: 'Productos',
  inventory: 'Inventario',
  categories: 'Categorías',
  customers: 'Clientes',
  orders: 'Órdenes',
  reports: 'Reportes',
  digital_menu: 'Menú Digital',
  ingredients: 'Ingredientes',
  returns: 'Devoluciones',
  settings: 'Configuración',
  users: 'Usuarios',
  terminals: 'Terminales',
  voice: 'Órdenes por Voz',
  ai: 'Funciones IA',
  queue: 'Fila Virtual',
  whitelabel: 'Marca Blanca',
  platform: 'Plataforma',
};
