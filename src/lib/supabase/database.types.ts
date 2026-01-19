export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          clerk_id: string;
          email: string;
          first_name: string;
          last_name: string;
          image: string | null;
          role: 'ADMIN' | 'USER' | 'CUSTOMER' | 'SUPER_ADMIN';
          restaurant_id: string | null;
          age: number | null;
          height: number | null;
          weight: number | null;
          gender: string | null;
          blood_group: string | null;
          medical_issues: string | null;
          stripe_customer_id: string | null;
          stripe_invoice_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          clerk_id: string;
          email: string;
          first_name: string;
          last_name: string;
          image?: string | null;
          role: 'ADMIN' | 'USER' | 'CUSTOMER' | 'SUPER_ADMIN';
          restaurant_id?: string | null;
          age?: number | null;
          height?: number | null;
          weight?: number | null;
          gender?: string | null;
          blood_group?: string | null;
          medical_issues?: string | null;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
        };
        Update: {
          clerk_id?: string;
          email?: string;
          first_name?: string;
          last_name?: string;
          image?: string | null;
          role?: 'ADMIN' | 'USER' | 'CUSTOMER' | 'SUPER_ADMIN';
          restaurant_id?: string | null;
          age?: number | null;
          height?: number | null;
          weight?: number | null;
          gender?: string | null;
          blood_group?: string | null;
          medical_issues?: string | null;
          stripe_customer_id?: string | null;
          stripe_invoice_id?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          parent_id: string | null;
          user_id: string;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          parent_id?: string | null;
          user_id: string;
          active?: boolean;
        };
        Update: {
          name?: string;
          parent_id?: string | null;
          user_id?: string;
          active?: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          sku: string;
          barcode: string | null;
          name: string;
          description: string | null;
          category_id: string | null;
          user_id: string;
          product_type: string;
          price: number;
          cost: number;
          stock: number;
          min_stock: number;
          max_stock: number;
          image_url: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          sku: string;
          barcode?: string | null;
          name: string;
          description?: string | null;
          category_id?: string | null;
          user_id: string;
          product_type?: string;
          price: number;
          cost?: number;
          stock?: number;
          min_stock?: number;
          max_stock?: number;
          image_url?: string | null;
          active?: boolean;
        };
        Update: {
          sku?: string;
          barcode?: string | null;
          name?: string;
          description?: string | null;
          category_id?: string | null;
          user_id?: string;
          product_type?: string;
          price?: number;
          cost?: number;
          stock?: number;
          min_stock?: number;
          max_stock?: number;
          image_url?: string | null;
          active?: boolean;
        };
      };
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          credit_limit: number;
          credit_balance: number;
          points: number;
          active: boolean;
          created_at: string;
          user_id?: string;
        };
        Insert: {
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          credit_limit?: number;
          credit_balance?: number;
          points?: number;
          active?: boolean;
          user_id?: string;
        };
        Update: {
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          credit_limit?: number;
          credit_balance?: number;
          points?: number;
          active?: boolean;
          user_id?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          sale_number: string;
          customer_id: string | null;
          user_id: string | null;
          subtotal: number;
          discount: number;
          tax: number;
          total: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'credit';
          status: 'pending' | 'completed' | 'cancelled' | 'refunded';
          created_at: string;
        };
        Insert: {
          sale_number?: string;
          customer_id?: string | null;
          user_id?: string | null;
          subtotal: number;
          discount?: number;
          tax?: number;
          total: number;
          payment_method: 'cash' | 'card' | 'transfer' | 'credit';
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
        };
        Update: {
          sale_number?: string;
          customer_id?: string | null;
          user_id?: string | null;
          subtotal?: number;
          discount?: number;
          tax?: number;
          total?: number;
          payment_method?: 'cash' | 'card' | 'transfer' | 'credit';
          status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          discount: number;
        };
        Insert: {
          sale_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          discount?: number;
        };
        Update: {
          sale_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          discount?: number;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          total: number;
          currency: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: string;
          total: number;
          currency?: string;
          notes?: string | null;
        };
        Update: {
          user_id?: string;
          status?: string;
          total?: number;
          currency?: string;
          notes?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          currency: string;
          image_url: string | null;
        };
        Insert: {
          order_id: string;
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
          currency?: string;
          image_url?: string | null;
        };
        Update: {
          order_id?: string;
          product_id?: string;
          product_name?: string;
          quantity?: number;
          price?: number;
          currency?: string;
          image_url?: string | null;
        };
      };
      kitchen_orders: {
        Row: {
          id: string;
          order_number: string;
          source: 'pos' | 'uber_eats' | 'didi_food' | 'rappi' | 'pedidos_ya' | 'sin_delantal' | 'cornershop';
          external_order_id: string | null;
          table_number: string | null;
          customer_name: string | null;
          service_type: 'dine_in' | 'takeout' | 'delivery';
          status: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
          total: number;
          notes: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
          started_at: string | null;
          ready_at: string | null;
          delivered_at: string | null;
        };
        Insert: {
          order_number: string;
          source?: 'pos' | 'uber_eats' | 'didi_food' | 'rappi' | 'pedidos_ya' | 'sin_delantal' | 'cornershop';
          external_order_id?: string | null;
          table_number?: string | null;
          customer_name?: string | null;
          service_type?: 'dine_in' | 'takeout' | 'delivery';
          status?: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
          total: number;
          notes?: string | null;
          user_id: string;
          started_at?: string | null;
          ready_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          order_number?: string;
          source?: 'pos' | 'uber_eats' | 'didi_food' | 'rappi' | 'pedidos_ya' | 'sin_delantal' | 'cornershop';
          external_order_id?: string | null;
          table_number?: string | null;
          customer_name?: string | null;
          service_type?: 'dine_in' | 'takeout' | 'delivery';
          status?: 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
          total?: number;
          notes?: string | null;
          user_id?: string;
          started_at?: string | null;
          ready_at?: string | null;
          delivered_at?: string | null;
        };
      };
      kitchen_order_items: {
        Row: {
          id: string;
          kitchen_order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          modifiers: string | null;
          notes: string | null;
        };
        Insert: {
          kitchen_order_id: string;
          product_name: string;
          quantity: number;
          unit_price: number;
          modifiers?: string | null;
          notes?: string | null;
        };
        Update: {
          kitchen_order_id?: string;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          modifiers?: string | null;
          notes?: string | null;
        };
      };
      platform_integrations: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          api_key: string | null;
          api_secret: string | null;
          store_id: string | null;
          webhook_secret: string | null;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          platform: string;
          api_key?: string | null;
          api_secret?: string | null;
          store_id?: string | null;
          webhook_secret?: string | null;
          enabled?: boolean;
        };
        Update: {
          user_id?: string;
          platform?: string;
          api_key?: string | null;
          api_secret?: string | null;
          store_id?: string | null;
          webhook_secret?: string | null;
          enabled?: boolean;
        };
      };
      ingredients: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          sku: string;
          category: string | null;
          current_stock: number;
          min_stock: number;
          max_stock: number;
          unit_type: string;
          unit_name: string;
          cost_per_unit: number;
          restaurant_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          sku: string;
          category?: string | null;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          unit_type: string;
          unit_name: string;
          cost_per_unit?: number;
          restaurant_id: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          sku?: string;
          category?: string | null;
          current_stock?: number;
          min_stock?: number;
          max_stock?: number;
          unit_type?: string;
          unit_name?: string;
          cost_per_unit?: number;
          restaurant_id?: string;
        };
      };
      product_recipes: {
        Row: {
          id: string;
          product_id: string;
          ingredient_id: string;
          quantity: number;
          unit_name: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          ingredient_id: string;
          quantity: number;
          unit_name: string;
        };
        Update: {
          product_id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit_name?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          product_id: string;
          ingredient_id: string;
          quantity: number;
          unit_name: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          ingredient_id: string;
          quantity: number;
          unit_name: string;
        };
        Update: {
          product_id?: string;
          ingredient_id?: string;
          quantity?: number;
          unit_name?: string;
        };
      };
      returns: {
        Row: {
          id: string;
          sale_id: string;
          customer_id: string | null;
          user_id: string;
          reason: string | null;
          subtotal: number;
          tax: number;
          total: number;
          status: string;
          created_at: string;
        };
        Insert: {
          sale_id: string;
          customer_id?: string | null;
          user_id: string;
          reason?: string | null;
          subtotal: number;
          tax?: number;
          total: number;
          status?: string;
        };
        Update: {
          sale_id?: string;
          customer_id?: string | null;
          user_id?: string;
          reason?: string | null;
          subtotal?: number;
          tax?: number;
          total?: number;
          status?: string;
        };
      };
      return_items: {
        Row: {
          id: string;
          return_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Insert: {
          return_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Update: {
          return_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
        };
      };
      brands: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          owner_email: string;
          owner_name: string | null;
          vertical_id: string | null;
          plan: string;
          branding: Record<string, unknown>;
          enabled_modules: Record<string, unknown>;
          settings: Record<string, unknown>;
          active: boolean;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          owner_email: string;
          owner_name?: string | null;
          vertical_id?: string | null;
          plan?: string;
          branding?: Record<string, unknown>;
          enabled_modules?: Record<string, unknown>;
          settings?: Record<string, unknown>;
          active?: boolean;
          onboarding_completed?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          owner_email?: string;
          owner_name?: string | null;
          vertical_id?: string | null;
          plan?: string;
          branding?: Record<string, unknown>;
          enabled_modules?: Record<string, unknown>;
          settings?: Record<string, unknown>;
          active?: boolean;
          onboarding_completed?: boolean;
        };
      };
      verticals: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          icon: string | null;
          default_modules: Record<string, unknown>;
          default_settings: Record<string, unknown>;
          terminology: Record<string, unknown>;
          active: boolean;
          created_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          icon?: string | null;
          default_modules?: Record<string, unknown>;
          default_settings?: Record<string, unknown>;
          terminology?: Record<string, unknown>;
          active?: boolean;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          icon?: string | null;
          default_modules?: Record<string, unknown>;
          default_settings?: Record<string, unknown>;
          terminology?: Record<string, unknown>;
          active?: boolean;
        };
      };
      brand_onboarding: {
        Row: {
          id: string;
          brand_id: string;
          steps_completed: string[];
          current_step: string;
          completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          brand_id: string;
          steps_completed?: string[];
          current_step?: string;
          completed?: boolean;
        };
        Update: {
          brand_id?: string;
          steps_completed?: string[];
          current_step?: string;
          completed?: boolean;
        };
      };
      vertical_template_products: {
        Row: {
          id: string;
          vertical_id: string;
          source_product_id: string;
          name: string;
          description: string | null;
          sku: string | null;
          barcode: string | null;
          category_name: string | null;
          product_type: string;
          suggested_price: number;
          suggested_cost: number;
          image_url: string | null;
          is_active: boolean;
          display_order: number;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          vertical_id: string;
          source_product_id: string;
          name: string;
          description?: string | null;
          sku?: string | null;
          barcode?: string | null;
          category_name?: string | null;
          product_type?: string;
          suggested_price?: number;
          suggested_cost?: number;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_by?: string | null;
        };
        Update: {
          vertical_id?: string;
          source_product_id?: string;
          name?: string;
          description?: string | null;
          sku?: string | null;
          barcode?: string | null;
          category_name?: string | null;
          product_type?: string;
          suggested_price?: number;
          suggested_cost?: number;
          image_url?: string | null;
          is_active?: boolean;
          display_order?: number;
          created_by?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_brand_config: {
        Args: { p_brand_id: string };
        Returns: Record<string, unknown>;
      };
      decrement_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: void;
      };
      increment_product_stock: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: void;
      };
      process_recipe_deductions: {
        Args: { p_product_id: string; p_quantity: number };
        Returns: void;
      };
      update_ingredient_stock: {
        Args: { p_ingredient_id: string; p_quantity: number; p_operation: string };
        Returns: void;
      };
      exec_sql: {
        Args: { sql: string } | { sql_query: string };
        Returns: unknown;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
