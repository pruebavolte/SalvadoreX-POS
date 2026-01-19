// Types for Multi-Brand & White Label System

export interface Vertical {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  default_modules: ModuleConfig;
  default_settings: VerticalSettings;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModuleConfig {
  pos?: boolean;
  inventory?: boolean;
  customers?: boolean;
  reports?: boolean;
  digital_menu?: boolean;
  ingredients?: boolean;
  returns?: boolean;
  voice_ordering?: boolean;
  ai_features?: boolean;
  [key: string]: boolean | undefined;
}

export interface VerticalSettings {
  tax_rate?: number;
  currency?: string;
  language?: string;
  time_zone?: string;
  features?: {
    [key: string]: boolean | string | number;
  };
}

export interface BrandBranding {
  logo_url?: string;
  logo_dark_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_css?: string;
  custom_domain?: string;
  custom_domain_verified?: boolean;
}

export interface BrandSettings {
  currency?: string;
  language?: string;
  time_zone?: string;
  features?: {
    [key: string]: boolean | string | number;
  };
  integrations?: {
    stripe?: boolean;
    mercadopago?: boolean;
    whatsapp?: boolean;
    [key: string]: boolean | undefined;
  };
}

export type BrandPlan = 'free' | 'starter' | 'pro' | 'enterprise' | 'custom';
export type SubscriptionStatus = 'active' | 'trialing' | 'suspended' | 'cancelled';

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  branding: BrandBranding;
  owner_email: string;
  owner_name?: string;
  support_email?: string;
  support_phone?: string;
  vertical_id?: string;
  vertical?: Vertical;
  plan: BrandPlan;
  max_restaurants: number;
  max_users_per_restaurant: number;
  subscription_status: SubscriptionStatus;
  trial_ends_at?: string;
  enabled_modules: ModuleConfig;
  settings: BrandSettings;
  total_restaurants: number;
  total_sales: number;
  total_transactions: number;
  active: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Restaurant {
  id: string;
  brand_id: string;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  settings: BrandSettings;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BrandModule {
  id: string;
  brand_id: string;
  module_key: string;
  enabled: boolean;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BrandOnboarding {
  id: string;
  brand_id: string;
  steps_completed: string[];
  current_step: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BrandConfig {
  brand: Brand;
  vertical?: Vertical;
  modules: ModuleConfig;
  settings: BrandSettings;
}

// API Request/Response types
export interface CreateBrandRequest {
  name: string;
  slug: string;
  description?: string;
  owner_email: string;
  owner_name?: string;
  vertical_id?: string;
  plan?: BrandPlan;
  branding?: Partial<BrandBranding>;
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  branding?: Partial<BrandBranding>;
  settings?: Partial<BrandSettings>;
  enabled_modules?: Partial<ModuleConfig>;
}

export interface CreateRestaurantRequest {
  brand_id: string;
  name: string;
  slug: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Module definitions
export const AVAILABLE_MODULES = {
  pos: {
    key: 'pos',
    name: 'Punto de Venta',
    description: 'Sistema completo de punto de venta',
    icon: 'ShoppingCart',
    required: true,
  },
  inventory: {
    key: 'inventory',
    name: 'Inventario',
    description: 'Gestión de productos y stock',
    icon: 'Package',
    required: true,
  },
  customers: {
    key: 'customers',
    name: 'Clientes',
    description: 'Gestión de clientes y créditos',
    icon: 'Users',
    required: false,
  },
  reports: {
    key: 'reports',
    name: 'Reportes',
    description: 'Análisis y reportes de ventas',
    icon: 'BarChart3',
    required: true,
  },
  digital_menu: {
    key: 'digital_menu',
    name: 'Menú Digital',
    description: 'Menú digital compartible con QR',
    icon: 'ChefHat',
    required: false,
  },
  ingredients: {
    key: 'ingredients',
    name: 'Ingredientes',
    description: 'Control de ingredientes y recetas',
    icon: 'Soup',
    required: false,
  },
  returns: {
    key: 'returns',
    name: 'Devoluciones',
    description: 'Gestión de devoluciones de productos',
    icon: 'PackageX',
    required: false,
  },
  voice_ordering: {
    key: 'voice_ordering',
    name: 'Órdenes por Voz',
    description: 'Asistente de IA para ordenar por voz',
    icon: 'Mic',
    required: false,
  },
  ai_features: {
    key: 'ai_features',
    name: 'Funciones de IA',
    description: 'Menú digital con IA, generación de imágenes, etc.',
    icon: 'Sparkles',
    required: false,
  },
} as const;

export type ModuleKey = keyof typeof AVAILABLE_MODULES;
