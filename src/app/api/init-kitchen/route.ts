import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: Request) {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase credentials' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'check';

    if (action === 'check') {
      const tables = ['kitchen_orders', 'kitchen_order_items', 'platform_integrations'];
      const tableStatus: any = {};
      
      for (const table of tables) {
        const { error } = await supabase.from(table).select('id').limit(1);
        tableStatus[table] = error ? (error.code === '42P01' ? 'missing' : error.message) : 'exists';
      }
      
      const allExist = !Object.values(tableStatus).includes('missing');
      
      return NextResponse.json({
        message: 'Kitchen tables status check',
        tables: tableStatus,
        all_exist: allExist,
        next_step: allExist 
          ? 'Tables exist! Call /api/init-kitchen?action=seed to add sample orders'
          : 'Tables missing - please create them in Supabase SQL Editor. See /api/init-kitchen?action=sql for SQL commands'
      });
    }

    if (action === 'sql') {
      const sql = `
-- Run this in Supabase SQL Editor to create kitchen tables

-- Create kitchen_orders table
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  source text NOT NULL DEFAULT 'pos',
  external_order_id text,
  table_number text,
  customer_name text,
  service_type text NOT NULL DEFAULT 'dine_in',
  status text NOT NULL DEFAULT 'pending',
  total numeric(10, 2) NOT NULL DEFAULT 0,
  notes text,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  ready_at timestamp with time zone,
  delivered_at timestamp with time zone
);

-- Create kitchen_order_items table
CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_order_id uuid NOT NULL REFERENCES kitchen_orders(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10, 2) NOT NULL DEFAULT 0,
  modifiers text,
  notes text
);

-- Create platform_integrations table
CREATE TABLE IF NOT EXISTS platform_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  platform text NOT NULL,
  api_key text,
  api_secret text,
  store_id text,
  webhook_secret text,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_user_id ON kitchen_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_status ON kitchen_orders(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_source ON kitchen_orders(source);
CREATE INDEX IF NOT EXISTS idx_kitchen_orders_created_at ON kitchen_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_kitchen_order_items_order_id ON kitchen_order_items(kitchen_order_id);
CREATE INDEX IF NOT EXISTS idx_platform_integrations_user ON platform_integrations(user_id, platform);
`;

      return NextResponse.json({
        message: 'SQL commands to create kitchen tables',
        instructions: 'Copy the SQL below and run it in your Supabase SQL Editor',
        sql
      });
    }

    if (action === 'seed') {
      const { data: adminUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'ADMIN')
        .limit(1)
        .single();

      if (userError || !adminUser) {
        return NextResponse.json({ 
          error: 'No admin user found. Please run /api/init-db?step=seed first' 
        }, { status: 400 });
      }

      const sampleOrders = [
        {
          order_number: 'ORD-001',
          source: 'pos',
          table_number: '4',
          customer_name: 'Carlos',
          service_type: 'takeout',
          status: 'pending',
          total: 125.50,
          user_id: adminUser.id
        },
        {
          order_number: 'ORD-002',
          source: 'pos',
          table_number: '8',
          customer_name: 'Maria',
          service_type: 'delivery',
          status: 'in_progress',
          total: 85.00,
          user_id: adminUser.id
        },
        {
          order_number: 'UE-003',
          source: 'uber_eats',
          external_order_id: 'UBER123456',
          customer_name: 'Amalia',
          service_type: 'delivery',
          status: 'pending',
          total: 156.00,
          notes: 'Sin cebolla',
          user_id: adminUser.id
        },
        {
          order_number: 'DD-004',
          source: 'didi_food',
          external_order_id: 'DIDI789012',
          customer_name: 'Romano',
          service_type: 'delivery',
          status: 'ready',
          total: 98.50,
          user_id: adminUser.id
        },
        {
          order_number: 'RP-005',
          source: 'rappi',
          external_order_id: 'RAPPI345678',
          customer_name: 'Cliente Rappi',
          service_type: 'delivery',
          status: 'pending',
          total: 75.00,
          notes: 'Llamar al llegar',
          user_id: adminUser.id
        }
      ];

      const createdOrders: any[] = [];

      for (const order of sampleOrders) {
        const { data: newOrder, error: orderError } = await supabase
          .from('kitchen_orders')
          .insert(order)
          .select()
          .single();

        if (orderError) {
          console.error('Error creating order:', orderError);
          continue;
        }

        const items = [
          { kitchen_order_id: newOrder.id, product_name: 'Pizza carbonara grande', quantity: 1, unit_price: 85.00 },
          { kitchen_order_id: newOrder.id, product_name: 'Ajoblanco', quantity: 1, unit_price: 25.00, modifiers: 'Extra crema' },
          { kitchen_order_id: newOrder.id, product_name: 'Café', quantity: 1, unit_price: 15.50, modifiers: 'Caramelo' }
        ];

        await supabase.from('kitchen_order_items').insert(items);
        createdOrders.push(newOrder);
      }

      return NextResponse.json({
        success: true,
        message: 'Sample kitchen orders created!',
        orders_created: createdOrders.length
      });
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use ?action=check, ?action=sql, or ?action=seed' 
    }, { status: 400 });

  } catch (error: any) {
    console.error('Init kitchen error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
