import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const step = url.searchParams.get('step') || 'check';
  
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables' },
      { status: 500 }
    );
  }
  
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (step === 'check') {
      const tables = ['users', 'categories', 'products', 'customers', 'sales', 'sale_items', 'orders', 'order_items'];
      const tableStatus: any = {};
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        tableStatus[table] = error ? (error.code === '42P01' ? 'missing' : error.message) : 'exists';
      }
      
      return NextResponse.json({
        message: 'Database status check',
        tables: tableStatus,
        next_step: Object.values(tableStatus).includes('missing') 
          ? 'Tables missing - please create them in Supabase SQL Editor first'
          : 'All tables exist! Call /api/init-db?step=seed to populate data'
      });
    }
    
    if (step === 'seed') {
      const results: any[] = [];
      
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .upsert([{
          clerk_id: 'test_admin_001',
          email: 'admin@salvadorex.test',
          first_name: 'Admin',
          last_name: 'Usuario',
          role: 'ADMIN'
        }], { onConflict: 'email' })
        .select()
        .single();

      if (userError) {
        return NextResponse.json({ error: 'Failed to create admin user', details: userError.message }, { status: 400 });
      }

      results.push({ step: 'Admin user created', email: adminUser.email });

      const categories = [
        { name: 'Bebidas', user_id: adminUser.id, active: true },
        { name: 'Comidas Rapidas', user_id: adminUser.id, active: true },
        { name: 'Postres', user_id: adminUser.id, active: true },
        { name: 'Snacks', user_id: adminUser.id, active: true },
        { name: 'Entradas', user_id: adminUser.id, active: true }
      ];

      for (const cat of categories) {
        await supabase.from('categories').upsert([cat], { onConflict: 'name', ignoreDuplicates: true });
      }
      results.push({ step: 'Categories created', count: categories.length });

      const { data: allCats } = await supabase.from('categories').select('*');
      const bevCat = allCats?.find(c => c.name === 'Bebidas');
      const foodCat = allCats?.find(c => c.name === 'Comidas Rapidas');
      const dessertCat = allCats?.find(c => c.name === 'Postres');
      const snackCat = allCats?.find(c => c.name === 'Snacks');
      const entradaCat = allCats?.find(c => c.name === 'Entradas');

      const products = [
        { sku: 'BEB-001', barcode: '7501234567890', name: 'Coca Cola 600ml', description: 'Refresco de cola', price: 2.50, cost: 1.00, stock: 100, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-002', barcode: '7501234567891', name: 'Sprite 600ml', description: 'Refresco de limon', price: 2.50, cost: 1.00, stock: 80, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-003', barcode: '7501234567892', name: 'Agua Mineral 500ml', description: 'Agua purificada', price: 1.50, cost: 0.50, stock: 150, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-004', barcode: '7501234567893', name: 'Jugo de Naranja', description: 'Jugo natural', price: 3.00, cost: 1.20, stock: 60, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'BEB-005', barcode: '7501234567894', name: 'Cafe Americano', description: 'Cafe negro', price: 2.00, cost: 0.40, stock: 200, category_id: bevCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-001', barcode: '7501234567900', name: 'Hamburguesa Clasica', description: 'Con carne, lechuga y tomate', price: 8.00, cost: 3.50, stock: 50, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-002', barcode: '7501234567901', name: 'Hamburguesa con Queso', description: 'Con queso cheddar', price: 9.50, cost: 4.00, stock: 45, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-003', barcode: '7501234567902', name: 'Tacos de Carne Asada (3)', description: 'Con cebolla y cilantro', price: 6.50, cost: 2.50, stock: 60, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-004', barcode: '7501234567903', name: 'Pizza Personal', description: 'Con pepperoni', price: 9.50, cost: 4.00, stock: 40, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-005', barcode: '7501234567904', name: 'Hot Dog', description: 'Clasico', price: 4.00, cost: 1.50, stock: 70, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'COM-006', barcode: '7501234567905', name: 'Quesadillas (3)', description: 'Con queso derretido', price: 5.00, cost: 1.80, stock: 55, category_id: foodCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'POS-001', barcode: '7501234567910', name: 'Helado de Vainilla', description: 'Cremoso', price: 3.00, cost: 1.00, stock: 60, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'POS-002', barcode: '7501234567911', name: 'Helado de Chocolate', description: 'Cremoso', price: 3.00, cost: 1.00, stock: 55, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'POS-003', barcode: '7501234567912', name: 'Flan de Caramelo', description: 'Casero', price: 4.50, cost: 1.80, stock: 30, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'POS-004', barcode: '7501234567913', name: 'Pastel de Chocolate', description: 'Rebanada', price: 5.00, cost: 2.00, stock: 25, category_id: dessertCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'SNK-001', barcode: '7501234567920', name: 'Papas Fritas', description: 'Crujientes', price: 2.50, cost: 0.80, stock: 100, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'SNK-002', barcode: '7501234567921', name: 'Nachos con Queso', description: 'Con salsa', price: 4.00, cost: 1.20, stock: 45, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'SNK-003', barcode: '7501234567922', name: 'Aros de Cebolla', description: 'Empanizados', price: 3.50, cost: 1.00, stock: 50, category_id: snackCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'ENT-001', barcode: '7501234567930', name: 'Ensalada Cesar', description: 'Con aderezo', price: 6.00, cost: 2.20, stock: 35, category_id: entradaCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
        { sku: 'ENT-002', barcode: '7501234567931', name: 'Alitas BBQ (6)', description: 'Con salsa BBQ', price: 7.50, cost: 3.00, stock: 40, category_id: entradaCat?.id, user_id: adminUser.id, available_in_pos: true, available_in_digital_menu: true },
      ];

      let productCount = 0;
      for (const prod of products) {
        const { error } = await supabase.from('products').upsert([prod], { onConflict: 'sku', ignoreDuplicates: true });
        if (!error) productCount++;
      }
      results.push({ step: 'Products created', count: productCount });

      const customers = [
        { name: 'Juan Perez Garcia', email: 'juan@example.com', phone: '5551234567', loyalty_points: 150, user_id: adminUser.id },
        { name: 'Maria Garcia Lopez', email: 'maria@example.com', phone: '5559876543', credit_balance: 25.00, loyalty_points: 350, user_id: adminUser.id },
        { name: 'Carlos Rodriguez', email: 'carlos@example.com', phone: '5552468135', credit_balance: 10.00, loyalty_points: 75, user_id: adminUser.id },
        { name: 'Ana Martinez', email: 'ana@example.com', phone: '5553692581', loyalty_points: 500, user_id: adminUser.id },
        { name: 'Luis Fernandez', email: 'luis@example.com', phone: '5554185926', credit_balance: 50.00, loyalty_points: 200, user_id: adminUser.id },
      ];

      let customerCount = 0;
      for (const cust of customers) {
        const { error } = await supabase.from('customers').upsert([cust], { onConflict: 'email', ignoreDuplicates: true });
        if (!error) customerCount++;
      }
      results.push({ step: 'Customers created', count: customerCount });

      const saleNum = 'POS-' + Date.now();
      const { data: sale } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNum,
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
        const { data: prods } = await supabase.from('products').select('*').limit(2);
        if (prods && prods.length > 0) {
          await supabase.from('sale_items').insert([
            { sale_id: sale.id, product_id: prods[0].id, quantity: 2, unit_price: prods[0].price, total: prods[0].price * 2 }
          ]);
        }
        results.push({ step: 'Sample sale created', sale_number: saleNum });
      }

      const { count: pCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: cCount } = await supabase.from('customers').select('*', { count: 'exact', head: true });
      const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });

      return NextResponse.json({
        success: true,
        message: 'Base de datos poblada exitosamente!',
        summary: { products: pCount, customers: cCount, categories: catCount },
        results
      });
    }

    if (step === 'dev-user') {
      const DEV_USER_EMAIL = "dev@salvadorex.test";
      const DEV_USER_CLERK_ID = "dev_user_local";

      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', DEV_USER_EMAIL)
        .single();

      if (existingUser) {
        return NextResponse.json({
          success: true,
          message: 'Dev user already exists',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            role: existingUser.role,
            first_name: existingUser.first_name,
            last_name: existingUser.last_name
          },
          instructions: `Set DEV_USER_ID=${existingUser.id} in your environment variables`
        });
      }

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          clerk_id: DEV_USER_CLERK_ID,
          email: DEV_USER_EMAIL,
          first_name: 'Dev',
          last_name: 'User',
          role: 'ADMIN'
        }])
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ 
          error: 'Failed to create dev user', 
          details: createError.message 
        }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: 'Dev user created successfully!',
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          first_name: newUser.first_name,
          last_name: newUser.last_name
        },
        instructions: `Set DEV_USER_ID=${newUser.id} in your environment variables`
      });
    }

    return NextResponse.json({ error: 'Invalid step. Use ?step=check, ?step=seed, or ?step=dev-user' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
