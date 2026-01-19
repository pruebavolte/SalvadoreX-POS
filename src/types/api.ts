// API types and interfaces

import { Product, Customer, Sale, Category } from "./database";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Cart types
export interface CartItemVariant {
  variant_id: string;
  variant_name: string;
  variant_type: string;
  price_applied: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  selectedVariants?: CartItemVariant[]; // Variantes seleccionadas
  unitPriceWithVariants?: number; // Precio unitario incluyendo variantes
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

// Voice order types
export interface VoiceCommand {
  type: "add" | "remove" | "update" | "search" | "total" | "finish" | "cancel";
  product?: string;
  quantity?: number;
  confidence: number;
}

export interface VoiceOrderResult {
  transcription: string;
  command: VoiceCommand;
  success: boolean;
  message: string;
}

// Search and filter types
export interface ProductFilter {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  active?: boolean;
  product_type?: "inventory" | "menu_digital"; // OBSOLETO: usar available_in_pos y available_in_digital_menu
  // Sistema unificado multi-canal
  available_in_pos?: boolean;
  available_in_digital_menu?: boolean;
  track_inventory?: boolean;
  user_id?: string; // Filter by user/restaurant owner
}

export interface CustomerFilter {
  search?: string;
  has_credit?: boolean;
  active?: boolean;
}

export interface SaleFilter {
  customer_id?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  status?: string;
}

// Report types
export interface SalesReport {
  total_sales: number;
  total_revenue: number;
  total_profit: number;
  average_ticket: number;
  sales_by_payment_method: Record<string, number>;
  sales_by_category: Record<string, number>;
  top_products: Array<{
    product: Product;
    quantity_sold: number;
    revenue: number;
  }>;
  sales_by_day: Array<{
    date: string;
    sales: number;
    revenue: number;
  }>;
}

export interface InventoryReport {
  total_products: number;
  total_stock_value: number;
  low_stock_products: Product[];
  out_of_stock_products: Product[];
  categories_summary: Array<{
    category: Category;
    product_count: number;
    total_value: number;
  }>;
}

export interface CustomerReport {
  total_customers: number;
  active_customers: number;
  total_credit_balance: number;
  customers_with_debt: number;
  top_customers: Array<{
    customer: Customer;
    total_purchases: number;
    total_spent: number;
  }>;
}
