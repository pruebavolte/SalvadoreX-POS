// Database types for Supabase schema

export type ProductType = "inventory" | "menu_digital";
export type Currency = "MXN" | "USD" | "BRL" | "EUR" | "JPY";

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category_id: string;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  max_stock: number;
  image_url?: string;
  active: boolean;
  product_type: ProductType; // OBSOLETO: usar available_in_pos y available_in_digital_menu
  currency: Currency;
  user_id?: string; // ID del usuario/restaurante dueño del producto
  // Sistema unificado multi-canal
  available_in_pos: boolean; // Disponible en punto de venta mostrador
  available_in_digital_menu: boolean; // Disponible en menú digital/venta en línea
  track_inventory: boolean; // Controlar inventario (false para servicios/productos digitales)
  has_variants?: boolean; // Si el producto tiene variantes (tamaños, toppings, etc.)
  created_at: string;
  updated_at: string;
  category?: Category;
  variants?: ProductVariant[]; // Variantes del producto
}

export interface Category {
  id: string;
  name: string;
  parent_id?: string;
  active: boolean;
  user_id?: string; // ID del usuario/restaurante dueño de la categoría
  // Sistema unificado multi-canal
  available_in_pos: boolean; // Disponible en punto de venta mostrador
  available_in_digital_menu: boolean; // Disponible en menú digital/venta en línea
  parent?: Category;
  children?: Category[];
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  credit_limit: number;
  credit_balance: number;
  points: number;
  active: boolean;
  created_at: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id?: string;
  user_id: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  created_at: string;
  customer?: Customer;
  user?: User;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  discount: number;
  product?: Product;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export type PaymentMethod =
  | "cash"
  | "card"
  | "transfer"
  | "credit";

export type SaleStatus =
  | "pending"
  | "completed"
  | "cancelled"
  | "refunded";

export type UserRole =
  | "admin"
  | "cashier"
  | "manager"
  | "inventory";

// Variant Types
export interface VariantType {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  variant_type_id: string;
  name: string;
  price_modifier: number;
  is_absolute_price: boolean;
  is_default: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  variant_type?: VariantType;
}

export interface SaleItemVariant {
  id: string;
  sale_item_id: string;
  variant_id: string;
  price_applied: number;
  created_at: string;
  variant?: ProductVariant;
}

export interface OrderItemVariant {
  id: string;
  order_item_id: string;
  variant_id: string;
  price_applied: number;
  created_at: string;
  variant?: ProductVariant;
}

// Extended types with variants
export interface ProductWithVariants extends Product {
  has_variants: boolean;
  variants?: ProductVariant[];
}

export interface CartItemVariant {
  variant_id: string;
  variant_name: string;
  variant_type: string;
  price_applied: number;
}

export interface SaleItemWithVariants extends SaleItem {
  selected_variants?: SaleItemVariant[];
}

// Global Products (shared barcode database)
export interface GlobalProduct {
  id: string;
  barcode: string;
  name: string;
  average_price: number;
  currency: string;
  category?: string;
  brand?: string;
  description?: string;
  image_url?: string;
  source: string; // "open_food_facts" | "upc_database" | "ai_lookup" | "manual"
  source_confidence: number; // 0.0 - 1.0
  lookup_count: number;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

// Barcode Lookup Response
export type BarcodeSourceType = "tenant" | "global" | "external" | "not_found";

export interface BarcodeLookupResult {
  source: BarcodeSourceType;
  product?: {
    barcode: string;
    name: string;
    price: number;
    currency: string;
    category?: string;
    brand?: string;
    description?: string;
    image_url?: string;
    confidence?: number;
  };
  message?: string;
}
