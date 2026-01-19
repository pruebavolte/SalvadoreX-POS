import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Missing Supabase config' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create users first
    await supabase.from('users').insert([
      { 
        clerk_id: 'test_admin_001', 
        email: 'admin@salvadorex.test', 
        first_name: 'Admin', 
        last_name: 'User',
        role: 'ADMIN'
      },
      { 
        clerk_id: 'test_cashier_001', 
        email: 'cashier@salvadorex.test', 
        first_name: 'Cajero', 
        last_name: 'POS',
        role: 'USER'
      }
    ]).select();

    // Get admin user
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'ADMIN')
      .limit(1);

    const adminUser = users?.[0];

    if (!adminUser) {
      return NextResponse.json({ error: 'Could not create admin user' }, { status: 500 });
    }

    // Create categories
    await supabase.from('categories').insert([
      { name: 'Bebidas', user_id: adminUser.id, active: true },
      { name: 'Comidas Rápidas', user_id: adminUser.id, active: true },
      { name: 'Postres', user_id: adminUser.id, active: true },
      { name: 'Snacks', user_id: adminUser.id, active: true }
    ]);

    // Get categories
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', adminUser.id);

    const bevCat = categories?.find(c => c.name === 'Bebidas');
    const foodCat = categories?.find(c => c.name === 'Comidas Rápidas');
    const dessertCat = categories?.find(c => c.name === 'Postres');
    const snackCat = categories?.find(c => c.name === 'Snacks');

    // Create products
    await supabase.from('products').insert([
      {
        sku: 'BEB-001',
        barcode: '7501234567890',
        name: 'Coca Cola 600ml',
        description: 'Refresco de cola sabor original',
        price: 2.50,
        cost: 1.00,
        stock: 100,
        min_stock: 10,
        max_stock: 200,
        category_id: bevCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'BEB-002',
        barcode: '7501234567891',
        name: 'Sprite 600ml',
        description: 'Refresco de limón',
        price: 2.50,
        cost: 1.00,
        stock: 80,
        min_stock: 10,
        max_stock: 200,
        category_id: bevCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'BEB-003',
        barcode: '7501234567892',
        name: 'Agua Embotellada 500ml',
        description: 'Agua purificada',
        price: 1.50,
        cost: 0.50,
        stock: 150,
        min_stock: 20,
        max_stock: 300,
        category_id: bevCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'COM-001',
        barcode: '7501234567893',
        name: 'Hamburguesa Clásica',
        description: 'Pan, carne, lechuga, tomate, cebolla y mayonesa',
        price: 8.00,
        cost: 3.50,
        stock: 50,
        min_stock: 5,
        max_stock: 100,
        category_id: foodCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'COM-002',
        barcode: '7501234567894',
        name: 'Tacos de Carne Asada',
        description: 'Tres tacos con carne asada, cebolla y cilantro',
        price: 6.50,
        cost: 2.50,
        stock: 60,
        min_stock: 5,
        max_stock: 120,
        category_id: foodCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'COM-003',
        barcode: '7501234567895',
        name: 'Pizza Personal',
        description: 'Pizza mediana con queso y pepperoni',
        price: 9.50,
        cost: 4.00,
        stock: 40,
        min_stock: 5,
        max_stock: 80,
        category_id: foodCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'COM-004',
        barcode: '7501234567896',
        name: 'Empanadas (3)',
        description: 'Tres empanadas de carne',
        price: 4.00,
        cost: 1.50,
        stock: 70,
        min_stock: 10,
        max_stock: 150,
        category_id: foodCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'POS-001',
        barcode: '7501234567897',
        name: 'Helado de Vainilla',
        description: 'Helado cremoso de vainilla',
        price: 3.00,
        cost: 1.00,
        stock: 60,
        min_stock: 10,
        max_stock: 120,
        category_id: dessertCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'POS-002',
        barcode: '7501234567898',
        name: 'Flan de Caramelo',
        description: 'Flan casero con caramelo',
        price: 4.50,
        cost: 1.80,
        stock: 30,
        min_stock: 5,
        max_stock: 60,
        category_id: dessertCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'SNK-001',
        barcode: '7501234567899',
        name: 'Papas Fritas',
        description: 'Papas fritas crujientes',
        price: 2.00,
        cost: 0.60,
        stock: 100,
        min_stock: 20,
        max_stock: 200,
        category_id: snackCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      },
      {
        sku: 'SNK-002',
        barcode: '7501234567900',
        name: 'Nachos con Queso',
        description: 'Nachos tostados con salsa de queso',
        price: 3.50,
        cost: 1.20,
        stock: 45,
        min_stock: 5,
        max_stock: 90,
        category_id: snackCat?.id,
        product_type: 'PRODUCT',
        available_in_pos: true,
        available_in_digital_menu: true,
        track_inventory: true,
        active: true,
        user_id: adminUser.id
      }
    ]);

    // Create customers
    await supabase.from('customers').insert([
      {
        name: 'Juan Pérez García',
        email: 'juan.perez@example.com',
        phone: '5551234567',
        credit_balance: 0,
        loyalty_points: 150,
        user_id: adminUser.id
      },
      {
        name: 'María García López',
        email: 'maria.garcia@example.com',
        phone: '5559876543',
        credit_balance: 25.00,
        loyalty_points: 350,
        user_id: adminUser.id
      },
      {
        name: 'Carlos Rodríguez',
        email: 'carlos.rodriguez@example.com',
        phone: '5552468135',
        credit_balance: 10.00,
        loyalty_points: 75,
        user_id: adminUser.id
      },
      {
        name: 'Ana Martínez',
        email: 'ana.martinez@example.com',
        phone: '5553692581',
        credit_balance: 0,
        loyalty_points: 500,
        user_id: adminUser.id
      },
      {
        name: 'Luis Fernández',
        email: 'luis.fernandez@example.com',
        phone: '5554185926',
        credit_balance: 50.00,
        loyalty_points: 200,
        user_id: adminUser.id
      }
    ]);

    // Create sample sales
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', adminUser.id);

    const customer1 = customers?.[0];

    if (customer1) {
      const saleNum = `POS-${Date.now()}`;
      const { data: sales } = await supabase
        .from('sales')
        .insert([
          {
            sale_number: saleNum,
            total: 25.50,
            subtotal: 22.00,
            tax: 3.50,
            payment_method: 'CASH',
            status: 'COMPLETED',
            customer_id: customer1.id,
            user_id: adminUser.id
          }
        ])
        .select();

      // Add sale items
      if (sales && sales[0]) {
        const { data: products } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', adminUser.id)
          .limit(3);

        if (products && products.length > 0) {
          await supabase.from('sale_items').insert([
            {
              sale_id: sales[0].id,
              product_id: products[0].id,
              quantity: 2,
              unit_price: products[0].price,
              total: products[0].price * 2
            },
            {
              sale_id: sales[0].id,
              product_id: products[1].id,
              quantity: 1,
              unit_price: products[1].price,
              total: products[1].price
            }
          ]);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Base de datos poblada con datos de prueba',
      data: {
        admin_user: adminUser.email,
        products_created: 11,
        categories_created: 4,
        customers_created: 5,
        sample_sales_created: 1
      }
    });
  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: error.message, details: error },
      { status: 500 }
    );
  }
}
