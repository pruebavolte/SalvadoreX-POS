import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY'
      }, { status: 500 });
    }

    // Use service role key for admin operations
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const results: any[] = [];

    // Create tables using raw SQL via postgres function
    const createTablesSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clerk_id text UNIQUE NOT NULL,
        email text UNIQUE NOT NULL,
        first_name text,
        last_name text,
        image text,
        role text DEFAULT 'CUSTOMER' CHECK (role IN ('ADMIN', 'USER', 'CUSTOMER')),
        restaurant_id uuid,
        age integer,
        height integer,
        weight integer,
        gender text,
        blood_group text,
        medical_issues text,
        stripe_customer_id text,
        stripe_invoice_id text,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Categories table
      CREATE TABLE IF NOT EXISTS categories (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        parent_id uuid REFERENCES categories(id),
        user_id uuid REFERENCES users(id),
        active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Products table
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sku text UNIQUE NOT NULL,
        barcode text,
        name text NOT NULL,
        description text,
        price numeric(10, 2) NOT NULL,
        cost numeric(10, 2),
        stock integer DEFAULT 0,
        min_stock integer DEFAULT 5,
        max_stock integer DEFAULT 100,
        category_id uuid REFERENCES categories(id),
        image_url text,
        product_type text DEFAULT 'PRODUCT',
        available_in_pos boolean DEFAULT true,
        available_in_digital_menu boolean DEFAULT false,
        track_inventory boolean DEFAULT true,
        active boolean DEFAULT true,
        user_id uuid REFERENCES users(id),
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Product Variants table
      CREATE TABLE IF NOT EXISTS product_variants (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        product_id uuid REFERENCES products(id) ON DELETE CASCADE,
        name text NOT NULL,
        variant_type text DEFAULT 'SIZE',
        price_modifier numeric(10, 2) DEFAULT 0,
        is_default boolean DEFAULT false,
        active boolean DEFAULT true,
        created_at timestamp with time zone DEFAULT now()
      );

      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name text NOT NULL,
        email text,
        phone text,
        credit_balance numeric(10, 2) DEFAULT 0,
        loyalty_points integer DEFAULT 0,
        user_id uuid REFERENCES users(id),
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Sales table
      CREATE TABLE IF NOT EXISTS sales (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_number text UNIQUE NOT NULL,
        total numeric(10, 2) NOT NULL,
        subtotal numeric(10, 2),
        tax numeric(10, 2),
        discount numeric(10, 2) DEFAULT 0,
        payment_method text DEFAULT 'CASH',
        status text DEFAULT 'COMPLETED',
        notes text,
        customer_id uuid REFERENCES customers(id),
        user_id uuid REFERENCES users(id),
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Sale Items table
      CREATE TABLE IF NOT EXISTS sale_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        variant_id uuid REFERENCES product_variants(id),
        quantity integer NOT NULL,
        unit_price numeric(10, 2) NOT NULL,
        total numeric(10, 2) NOT NULL,
        notes text,
        created_at timestamp with time zone DEFAULT now()
      );

      -- Orders table (for digital menu)
      CREATE TABLE IF NOT EXISTS orders (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_number text,
        customer_name text,
        customer_email text,
        customer_phone text,
        total numeric(10, 2) NOT NULL,
        subtotal numeric(10, 2),
        tax numeric(10, 2),
        payment_method text DEFAULT 'PENDING',
        status text DEFAULT 'PENDING',
        notes text,
        restaurant_id uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      -- Order Items table
      CREATE TABLE IF NOT EXISTS order_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        variant_id uuid REFERENCES product_variants(id),
        quantity integer NOT NULL,
        unit_price numeric(10, 2) NOT NULL,
        total numeric(10, 2) NOT NULL,
        notes text,
        created_at timestamp with time zone DEFAULT now()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
      CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    `;

    // Execute SQL using rpc
    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (sqlError) {
      // Try alternative method - direct REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify({ sql: createTablesSQL })
      });

      if (!response.ok) {
        results.push({ step: 'Create tables via RPC', success: false, note: 'RPC not available, using direct insert' });
      }
    } else {
      results.push({ step: 'Create tables', success: true });
    }

    // Now insert data using the Supabase client
    // Step 1: Create admin user
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .upsert([
        { 
          clerk_id: 'test_admin_001', 
          email: 'admin@salvadorex.test', 
          first_name: 'Admin', 
          last_name: 'User',
          role: 'ADMIN'
        }
      ], { onConflict: 'email' })
      .select()
      .single();

    results.push({ 
      step: 'Create admin user', 
      success: !userError, 
      data: adminUser?.email,
      error: userError?.message 
    });

    if (adminUser) {
      // Create categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .upsert([
          { name: 'Bebidas', user_id: adminUser.id, active: true },
          { name: 'Comidas Rápidas', user_id: adminUser.id, active: true },
          { name: 'Postres', user_id: adminUser.id, active: true },
          { name: 'Snacks', user_id: adminUser.id, active: true },
          { name: 'Entradas', user_id: adminUser.id, active: true }
        ], { onConflict: 'name', ignoreDuplicates: true })
        .select();

      results.push({ step: 'Create categories', success: !catError, count: categories?.length });

      // Get all categories
      const { data: allCategories } = await supabase.from('categories').select('*');
      const bevCat = allCategories?.find(c => c.name === 'Bebidas');
      const foodCat = allCategories?.find(c => c.name === 'Comidas Rápidas');
      const dessertCat = allCategories?.find(c => c.name === 'Postres');
      const snackCat = allCategories?.find(c => c.name === 'Snacks');
      const entradaCat = allCategories?.find(c => c.name === 'Entradas');

      // Create products
      const products = [
        // Bebidas
        { sku: 'BEB-001', barcode: '7501234567890', name: 'Coca Cola 600ml', description: 'Refresco de cola sabor original', price: 2.50, cost: 1.00, stock: 100, min_stock: 10, max_stock: 200, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'BEB-002', barcode: '7501234567891', name: 'Sprite 600ml', description: 'Refresco de limón refrescante', price: 2.50, cost: 1.00, stock: 80, min_stock: 10, max_stock: 200, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'BEB-003', barcode: '7501234567892', name: 'Agua Mineral 500ml', description: 'Agua purificada embotellada', price: 1.50, cost: 0.50, stock: 150, min_stock: 20, max_stock: 300, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'BEB-004', barcode: '7501234567893', name: 'Jugo de Naranja', description: 'Jugo natural de naranja', price: 3.00, cost: 1.20, stock: 60, min_stock: 10, max_stock: 120, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'BEB-005', barcode: '7501234567894', name: 'Café Americano', description: 'Café negro tradicional', price: 2.00, cost: 0.40, stock: 200, min_stock: 20, max_stock: 500, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: false, active: true },
        
        // Comidas Rápidas
        { sku: 'COM-001', barcode: '7501234567900', name: 'Hamburguesa Clásica', description: 'Pan, carne 150g, lechuga, tomate, cebolla y mayonesa', price: 8.00, cost: 3.50, stock: 50, min_stock: 5, max_stock: 100, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'COM-002', barcode: '7501234567901', name: 'Hamburguesa con Queso', description: 'Hamburguesa clásica con queso cheddar derretido', price: 9.50, cost: 4.00, stock: 45, min_stock: 5, max_stock: 100, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'COM-003', barcode: '7501234567902', name: 'Tacos de Carne Asada (3)', description: 'Tres tacos con carne asada, cebolla y cilantro', price: 6.50, cost: 2.50, stock: 60, min_stock: 5, max_stock: 120, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'COM-004', barcode: '7501234567903', name: 'Pizza Personal Pepperoni', description: 'Pizza 8" con queso mozzarella y pepperoni', price: 9.50, cost: 4.00, stock: 40, min_stock: 5, max_stock: 80, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'COM-005', barcode: '7501234567904', name: 'Hot Dog Clásico', description: 'Salchicha, pan, mostaza, ketchup y cebolla', price: 4.00, cost: 1.50, stock: 70, min_stock: 10, max_stock: 150, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'COM-006', barcode: '7501234567905', name: 'Quesadillas (3)', description: 'Tortillas con queso derretido', price: 5.00, cost: 1.80, stock: 55, min_stock: 5, max_stock: 110, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        
        // Postres
        { sku: 'POS-001', barcode: '7501234567910', name: 'Helado de Vainilla', description: 'Copa de helado cremoso de vainilla', price: 3.00, cost: 1.00, stock: 60, min_stock: 10, max_stock: 120, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'POS-002', barcode: '7501234567911', name: 'Helado de Chocolate', description: 'Copa de helado cremoso de chocolate', price: 3.00, cost: 1.00, stock: 55, min_stock: 10, max_stock: 120, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'POS-003', barcode: '7501234567912', name: 'Flan de Caramelo', description: 'Flan casero con caramelo', price: 4.50, cost: 1.80, stock: 30, min_stock: 5, max_stock: 60, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'POS-004', barcode: '7501234567913', name: 'Pastel de Chocolate', description: 'Rebanada de pastel de chocolate', price: 5.00, cost: 2.00, stock: 25, min_stock: 5, max_stock: 50, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        
        // Snacks
        { sku: 'SNK-001', barcode: '7501234567920', name: 'Papas Fritas', description: 'Papas fritas crujientes', price: 2.50, cost: 0.80, stock: 100, min_stock: 20, max_stock: 200, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'SNK-002', barcode: '7501234567921', name: 'Nachos con Queso', description: 'Nachos tostados con salsa de queso', price: 4.00, cost: 1.20, stock: 45, min_stock: 5, max_stock: 90, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'SNK-003', barcode: '7501234567922', name: 'Aros de Cebolla', description: 'Aros de cebolla empanizados', price: 3.50, cost: 1.00, stock: 50, min_stock: 10, max_stock: 100, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        
        // Entradas
        { sku: 'ENT-001', barcode: '7501234567930', name: 'Ensalada César', description: 'Lechuga romana, crutones, queso parmesano', price: 6.00, cost: 2.20, stock: 35, min_stock: 5, max_stock: 70, category_id: entradaCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
        { sku: 'ENT-002', barcode: '7501234567931', name: 'Alitas BBQ (6)', description: 'Alitas de pollo con salsa BBQ', price: 7.50, cost: 3.00, stock: 40, min_stock: 5, max_stock: 80, category_id: entradaCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true, track_inventory: true, active: true },
      ];

      let productsCreated = 0;
      for (const product of products) {
        const { error: prodError } = await supabase
          .from('products')
          .upsert([product], { onConflict: 'sku', ignoreDuplicates: true });
        
        if (!prodError) productsCreated++;
      }
      results.push({ step: 'Create products', success: true, count: productsCreated });

      // Create customers
      const customers = [
        { name: 'Juan Pérez García', email: 'juan.perez@example.com', phone: '5551234567', credit_balance: 0, loyalty_points: 150, user_id: adminUser.id },
        { name: 'María García López', email: 'maria.garcia@example.com', phone: '5559876543', credit_balance: 25.00, loyalty_points: 350, user_id: adminUser.id },
        { name: 'Carlos Rodríguez Hernández', email: 'carlos.rodriguez@example.com', phone: '5552468135', credit_balance: 10.00, loyalty_points: 75, user_id: adminUser.id },
        { name: 'Ana Martínez Ruiz', email: 'ana.martinez@example.com', phone: '5553692581', credit_balance: 0, loyalty_points: 500, user_id: adminUser.id },
        { name: 'Luis Fernández Torres', email: 'luis.fernandez@example.com', phone: '5554185926', credit_balance: 50.00, loyalty_points: 200, user_id: adminUser.id },
        { name: 'Patricia Sánchez Díaz', email: 'patricia.sanchez@example.com', phone: '5555273849', credit_balance: 15.00, loyalty_points: 125, user_id: adminUser.id },
      ];

      let customersCreated = 0;
      for (const customer of customers) {
        const { error: custError } = await supabase
          .from('customers')
          .upsert([customer], { onConflict: 'email', ignoreDuplicates: true });
        
        if (!custError) customersCreated++;
      }
      results.push({ step: 'Create customers', success: true, count: customersCreated });

      // Create sample sales
      const saleNumber = `POS-${Date.now()}`;
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          total: 25.50,
          subtotal: 22.00,
          tax: 3.50,
          payment_method: 'CASH',
          status: 'COMPLETED',
          user_id: adminUser.id
        }])
        .select()
        .single();

      if (sale) {
        // Get some products for sale items
        const { data: prods } = await supabase.from('products').select('*').limit(3);
        if (prods && prods.length > 0) {
          await supabase.from('sale_items').insert([
            { sale_id: sale.id, product_id: prods[0].id, quantity: 2, unit_price: prods[0].price, total: prods[0].price * 2 },
            { sale_id: sale.id, product_id: prods[1].id, quantity: 1, unit_price: prods[1].price, total: prods[1].price },
          ]);
        }
        results.push({ step: 'Create sample sale', success: true, sale_number: saleNumber });
      }
    }

    // Get final counts
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: categoryCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
    const { count: saleCount } = await supabase.from('sales').select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: '¡Base de datos configurada y poblada exitosamente!',
      summary: {
        products: productCount || 0,
        customers: customerCount || 0,
        categories: categoryCount || 0,
        sales: saleCount || 0
      },
      results
    });
  } catch (error: any) {
    console.error('Setup error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
