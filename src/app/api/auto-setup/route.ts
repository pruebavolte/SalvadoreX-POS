import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.SUPABASE_URL_2!;
const supabaseKey = process.env.SUPABASE_ANON_KEY_2!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const results: any[] = [];

    // Step 1: Create admin user
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (checkError && checkError.code === '42P01') {
      // Table doesn't exist - return instructions
      return NextResponse.json({
        success: false,
        message: 'Tables do not exist. Please create them in Supabase SQL Editor first.',
        instructions: 'Go to Supabase Dashboard > SQL Editor and run the CREATE TABLE scripts'
      }, { status: 400 });
    }

    // Table exists, insert data
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

    results.push({ step: 'Create admin user', success: !userError, error: userError?.message });

    if (adminUser) {
      // Create categories
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .upsert([
          { name: 'Bebidas', user_id: adminUser.id, active: true },
          { name: 'Comidas Rápidas', user_id: adminUser.id, active: true },
          { name: 'Postres', user_id: adminUser.id, active: true },
          { name: 'Snacks', user_id: adminUser.id, active: true }
        ], { onConflict: 'name,user_id', ignoreDuplicates: true })
        .select();

      results.push({ step: 'Create categories', success: !catError, count: categories?.length, error: catError?.message });

      // Get category IDs
      const { data: allCategories } = await supabase.from('categories').select('*');
      const bevCat = allCategories?.find(c => c.name === 'Bebidas');
      const foodCat = allCategories?.find(c => c.name === 'Comidas Rápidas');
      const dessertCat = allCategories?.find(c => c.name === 'Postres');
      const snackCat = allCategories?.find(c => c.name === 'Snacks');

      // Create products
      const products = [
        { sku: 'BEB-001', barcode: '7501234567890', name: 'Coca Cola 600ml', description: 'Refresco de cola', price: 2.50, cost: 1.00, stock: 100, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-002', barcode: '7501234567891', name: 'Sprite 600ml', description: 'Refresco de limón', price: 2.50, cost: 1.00, stock: 80, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-003', barcode: '7501234567892', name: 'Agua 500ml', description: 'Agua purificada', price: 1.50, cost: 0.50, stock: 150, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-001', barcode: '7501234567893', name: 'Hamburguesa Clásica', description: 'Con queso y tomate', price: 8.00, cost: 3.50, stock: 50, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-002', barcode: '7501234567894', name: 'Tacos de Carne Asada', description: 'Tres tacos', price: 6.50, cost: 2.50, stock: 60, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-003', barcode: '7501234567895', name: 'Pizza Personal', description: 'Con pepperoni', price: 9.50, cost: 4.00, stock: 40, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'POS-001', barcode: '7501234567897', name: 'Helado de Vainilla', description: 'Cremoso', price: 3.00, cost: 1.00, stock: 60, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'SNK-001', barcode: '7501234567899', name: 'Papas Fritas', description: 'Crujientes', price: 2.00, cost: 0.60, stock: 100, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
      ];

      for (const product of products) {
        const { error: prodError } = await supabase
          .from('products')
          .upsert([product], { onConflict: 'sku', ignoreDuplicates: true });
        
        if (!prodError) {
          results.push({ step: `Create product ${product.name}`, success: true });
        }
      }

      // Create customers
      const customers = [
        { name: 'Juan Pérez García', email: 'juan@example.com', phone: '5551234567', loyalty_points: 150, user_id: adminUser.id },
        { name: 'María García López', email: 'maria@example.com', phone: '5559876543', credit_balance: 25.00, loyalty_points: 350, user_id: adminUser.id },
        { name: 'Carlos Rodríguez', email: 'carlos@example.com', phone: '5552468135', credit_balance: 10.00, loyalty_points: 75, user_id: adminUser.id },
      ];

      for (const customer of customers) {
        const { error: custError } = await supabase
          .from('customers')
          .upsert([customer], { onConflict: 'email', ignoreDuplicates: true });
        
        if (!custError) {
          results.push({ step: `Create customer ${customer.name}`, success: true });
        }
      }
    }

    // Count final data
    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    const { count: customerCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
    const { count: categoryCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: '¡Base de datos poblada exitosamente!',
      summary: {
        products: productCount,
        customers: customerCount,
        categories: categoryCount
      },
      results
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      hint: 'Tables may not exist. Create them in Supabase SQL Editor first.'
    }, { status: 500 });
  }
}
