import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await request.json();
    
    console.log('Rappi webhook received:', JSON.stringify(body, null, 2));

    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('platform', 'rappi')
      .eq('enabled', true)
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Integration not configured' }, { status: 400 });
    }

    const externalOrderId = body.order_id || body.id || `RAPPI-${Date.now()}`;
    
    const { data: existingOrder } = await supabase
      .from('kitchen_orders')
      .select('id')
      .eq('external_order_id', externalOrderId)
      .eq('source', 'rappi')
      .single();

    if (existingOrder) {
      return NextResponse.json({ message: 'Order already exists', order_id: existingOrder.id });
    }

    const items = (body.items || body.order_detail?.products || []).map((item: any) => ({
      product_name: item.name || item.product_name,
      quantity: item.units || item.quantity || 1,
      unit_price: item.unit_price || item.price || 0,
      modifiers: item.toppings?.map((t: any) => t.name).join(', ') || null,
      notes: item.comments || item.special_requests || null
    }));

    const orderNumber = `RP-${Date.now().toString(36).toUpperCase()}`;
    
    const { data: order, error: orderError } = await supabase
      .from('kitchen_orders')
      .insert({
        order_number: orderNumber,
        source: 'rappi',
        external_order_id: externalOrderId,
        customer_name: body.client?.name || body.customer_name || 'Cliente Rappi',
        service_type: 'delivery',
        status: 'pending',
        total: body.order_value || body.total || 0,
        notes: body.cooking_instructions || body.notes || null,
        user_id: integration.user_id
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating Rappi order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (items.length > 0) {
      const orderItems = items.map((item: any) => ({
        ...item,
        kitchen_order_id: order.id
      }));

      await supabase.from('kitchen_order_items').insert(orderItems);
    }

    console.log('Rappi order created:', order.id);

    return NextResponse.json({ 
      success: true, 
      order_id: order.id,
      order_number: orderNumber 
    });
  } catch (error: any) {
    console.error('Rappi webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    platform: 'rappi',
    message: 'Webhook endpoint active' 
  });
}
