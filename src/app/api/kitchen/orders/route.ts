import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthenticatedUser } from '@/lib/auth-wrapper';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const DEMO_ORDERS = [
  {
    id: 'demo-1',
    order_number: 'Mesa 4',
    source: 'pos',
    table_number: '4',
    customer_name: 'Carlos',
    service_type: 'takeout',
    status: 'pending',
    total: 125.50,
    notes: null,
    created_at: new Date(Date.now() - 3 * 60000).toISOString(),
    items: [
      { id: 'item-1', product_name: 'Pizza carbonara grande', quantity: 1, unit_price: 85.00, modifiers: null, notes: null },
      { id: 'item-2', product_name: 'Ajoblanco', quantity: 1, unit_price: 25.00, modifiers: null, notes: null },
      { id: 'item-3', product_name: 'Café', quantity: 1, unit_price: 15.50, modifiers: 'Caramelo', notes: null }
    ]
  },
  {
    id: 'demo-2',
    order_number: 'Mesa 8',
    source: 'pos',
    table_number: '8',
    customer_name: 'Maria',
    service_type: 'delivery',
    status: 'in_progress',
    total: 85.00,
    notes: null,
    created_at: new Date(Date.now() - 8 * 60000).toISOString(),
    items: [
      { id: 'item-4', product_name: 'Pizza carbonara grande', quantity: 1, unit_price: 65.00, modifiers: 'Extra jamón', notes: null },
      { id: 'item-5', product_name: 'Gazpacho', quantity: 1, unit_price: 20.00, modifiers: null, notes: null }
    ]
  },
  {
    id: 'demo-3',
    order_number: 'Mesa 12',
    source: 'uber_eats',
    table_number: null,
    customer_name: 'Amalia',
    service_type: 'dine_in',
    status: 'pending',
    total: 156.00,
    notes: null,
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    items: [
      { id: 'item-6', product_name: 'Ajoblanco', quantity: 2, unit_price: 25.00, modifiers: null, notes: null },
      { id: 'item-7', product_name: 'Café', quantity: 1, unit_price: 15.00, modifiers: 'Caramelo', notes: null },
      { id: 'item-8', product_name: 'Panzenella', quantity: 2, unit_price: 18.00, modifiers: null, notes: null },
      { id: 'item-9', product_name: 'Campestre', quantity: 2, unit_price: 22.00, modifiers: 'Extra jamón', notes: null }
    ]
  },
  {
    id: 'demo-4',
    order_number: 'Mesa 10',
    source: 'rappi',
    table_number: null,
    customer_name: 'Romano',
    service_type: 'takeout',
    status: 'ready',
    total: 198.50,
    notes: null,
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    items: [
      { id: 'item-10', product_name: 'Pizza carbonara grande', quantity: 1, unit_price: 85.00, modifiers: null, notes: null },
      { id: 'item-11', product_name: 'Xató Salad', quantity: 1, unit_price: 28.00, modifiers: null, notes: null },
      { id: 'item-12', product_name: 'Esqueixada', quantity: 2, unit_price: 22.00, modifiers: null, notes: null },
      { id: 'item-13', product_name: 'Oreja de cerdo', quantity: 4, unit_price: 8.00, modifiers: 'Double', notes: null },
      { id: 'item-14', product_name: 'Pollo frito', quantity: 2, unit_price: 15.00, modifiers: 'Salsa mexicana', notes: null }
    ]
  }
];

export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const source = url.searchParams.get('source');

    let query = supabase
      .from('kitchen_orders')
      .select(`
        *,
        items:kitchen_order_items(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (status && status !== 'all') {
      if (status === 'active') {
        query = query.in('status', ['pending', 'in_progress']);
      } else {
        query = query.eq('status', status);
      }
    }

    if (source && source !== 'all') {
      query = query.eq('source', source);
    }

    const { data: orders, error } = await query;

    if (error) {
      if (error.message.includes('kitchen_orders') || error.code === '42P01') {
        console.log('Kitchen tables not found, returning demo data');
        let demoData = [...DEMO_ORDERS];
        
        if (status && status !== 'all') {
          if (status === 'active') {
            demoData = demoData.filter(o => ['pending', 'in_progress'].includes(o.status));
          } else {
            demoData = demoData.filter(o => o.status === status);
          }
        }
        
        if (source && source !== 'all') {
          demoData = demoData.filter(o => o.source === source);
        }
        
        return NextResponse.json(demoData);
      }
      console.error('Error fetching kitchen orders:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(orders || []);
  } catch (error: any) {
    console.error('Kitchen orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, ...orderData } = body;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
      .from('kitchen_orders')
      .insert({
        ...orderData,
        order_number: orderNumber,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating kitchen order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (items && items.length > 0) {
      const orderItems = items.map((item: any) => ({
        kitchen_order_id: order.id,
        product_name: item.product_name || item.name,
        quantity: item.quantity,
        unit_price: item.unit_price || item.price,
        modifiers: item.modifiers || null,
        notes: item.notes || null
      }));

      const { error: itemsError } = await supabase
        .from('kitchen_order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
      }
    }

    const { data: fullOrder } = await supabase
      .from('kitchen_orders')
      .select(`*, items:kitchen_order_items(*)`)
      .eq('id', order.id)
      .single();

    return NextResponse.json(fullOrder);
  } catch (error: any) {
    console.error('Create kitchen order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'ready') {
      updateData.ready_at = new Date().toISOString();
    } else if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data: order, error } = await supabase
      .from('kitchen_orders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`*, items:kitchen_order_items(*)`)
      .single();

    if (error) {
      console.error('Error updating kitchen order:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Update kitchen order error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
