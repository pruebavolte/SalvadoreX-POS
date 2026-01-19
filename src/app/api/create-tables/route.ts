import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const results: any[] = [];

    // Tables SQL - one by one
    const tables = [
      { name: 'users', sql: `CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clerk_id text UNIQUE NOT NULL, email text UNIQUE NOT NULL, first_name text, last_name text, image text, role text DEFAULT 'CUSTOMER', restaurant_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'categories', sql: `CREATE TABLE IF NOT EXISTS categories (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, parent_id uuid, user_id uuid, active boolean DEFAULT true, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'products', sql: `CREATE TABLE IF NOT EXISTS products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text UNIQUE NOT NULL, barcode text, name text NOT NULL, description text, price numeric(10,2) NOT NULL, cost numeric(10,2), stock integer DEFAULT 0, min_stock integer DEFAULT 5, max_stock integer DEFAULT 100, category_id uuid, image_url text, product_type text DEFAULT 'PRODUCT', available_in_pos boolean DEFAULT true, available_in_digital_menu boolean DEFAULT false, track_inventory boolean DEFAULT true, active boolean DEFAULT true, user_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'customers', sql: `CREATE TABLE IF NOT EXISTS customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text, phone text, credit_balance numeric(10,2) DEFAULT 0, loyalty_points integer DEFAULT 0, user_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'sales', sql: `CREATE TABLE IF NOT EXISTS sales (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_number text UNIQUE NOT NULL, total numeric(10,2) NOT NULL, subtotal numeric(10,2), tax numeric(10,2), discount numeric(10,2) DEFAULT 0, payment_method text DEFAULT 'CASH', status text DEFAULT 'COMPLETED', notes text, customer_id uuid, user_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'sale_items', sql: `CREATE TABLE IF NOT EXISTS sale_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sale_id uuid, product_id uuid, quantity integer NOT NULL, unit_price numeric(10,2) NOT NULL, total numeric(10,2) NOT NULL, notes text, created_at timestamptz DEFAULT now())` },
      { name: 'orders', sql: `CREATE TABLE IF NOT EXISTS orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text, customer_name text, customer_email text, customer_phone text, total numeric(10,2) NOT NULL, subtotal numeric(10,2), tax numeric(10,2), payment_method text DEFAULT 'PENDING', status text DEFAULT 'PENDING', notes text, restaurant_id uuid, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())` },
      { name: 'order_items', sql: `CREATE TABLE IF NOT EXISTS order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, product_id uuid, quantity integer NOT NULL, unit_price numeric(10,2) NOT NULL, total numeric(10,2) NOT NULL, notes text, created_at timestamptz DEFAULT now())` },
      { name: 'product_variants', sql: `CREATE TABLE IF NOT EXISTS product_variants (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid, name text NOT NULL, variant_type text DEFAULT 'SIZE', price_modifier numeric(10,2) DEFAULT 0, is_default boolean DEFAULT false, active boolean DEFAULT true, created_at timestamptz DEFAULT now())` }
    ];

    for (const table of tables) {
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          },
          body: JSON.stringify({ sql: table.sql })
        });
        
        results.push({ 
          table: table.name, 
          status: response.ok ? 'created' : 'rpc_not_available',
          code: response.status
        });
      } catch (e: any) {
        results.push({ table: table.name, error: e.message });
      }
    }

    // Generate SQL for manual execution
    const manualSQL = `
-- COPY THIS ENTIRE SQL TO SUPABASE SQL EDITOR AND RUN IT --

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  first_name text,
  last_name text,
  image text,
  role text DEFAULT 'CUSTOMER',
  restaurant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid,
  user_id uuid,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text UNIQUE NOT NULL,
  barcode text,
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL,
  cost numeric(10,2),
  stock integer DEFAULT 0,
  min_stock integer DEFAULT 5,
  max_stock integer DEFAULT 100,
  category_id uuid,
  image_url text,
  product_type text DEFAULT 'PRODUCT',
  available_in_pos boolean DEFAULT true,
  available_in_digital_menu boolean DEFAULT false,
  track_inventory boolean DEFAULT true,
  active boolean DEFAULT true,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Customers table  
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  credit_balance numeric(10,2) DEFAULT 0,
  loyalty_points integer DEFAULT 0,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text UNIQUE NOT NULL,
  total numeric(10,2) NOT NULL,
  subtotal numeric(10,2),
  tax numeric(10,2),
  discount numeric(10,2) DEFAULT 0,
  payment_method text DEFAULT 'CASH',
  status text DEFAULT 'COMPLETED',
  notes text,
  customer_id uuid,
  user_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Sale Items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid,
  product_id uuid,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 7. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text,
  customer_name text,
  customer_email text,
  customer_phone text,
  total numeric(10,2) NOT NULL,
  subtotal numeric(10,2),
  tax numeric(10,2),
  payment_method text DEFAULT 'PENDING',
  status text DEFAULT 'PENDING',
  notes text,
  restaurant_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  product_id uuid,
  quantity integer NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 9. Product Variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid,
  name text NOT NULL,
  variant_type text DEFAULT 'SIZE',
  price_modifier numeric(10,2) DEFAULT 0,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (optional but recommended)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- etc.
`;

    return NextResponse.json({
      message: 'Tables creation attempted via RPC',
      note: 'If RPC failed (code 404), copy the SQL below to Supabase SQL Editor',
      results,
      manual_sql: manualSQL
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
