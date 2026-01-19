import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const body = await request.json();
    
    console.log('Didi Food webhook received:', JSON.stringify(body, null, 2));

    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('platform', 'didi_food')
      .eq('enabled', true)
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Integration not configured' }, { status: 400 });
    }

    const externalOrderId = body.order_id || body.id || `DIDI-${Date.now()}`;
    
    const { data: existingOrder } = await supabase
      .from('kitchen_orders')
      .select('id')
      .eq('external_order_id', externalOrderId)
      .eq('source', 'didi_food')
      .single();

    if (existingOrder) {
      return NextResponse.json({ message: 'Order already exists', order_id: existingOrder.id });
    }

    const items = (body.items || body.products || []).map((item: any) => ({
      product_name: item.name || item.product_name || item.title,
      quantity: item.quantity || item.qty || 1,
      unit_price: item.price || item.unit_price || 0,
      modifiers: item.options?.map((o: any) => o.name).join(', ') || null,
      notes: item.comment || item.notes || null
    }));

    const orderNumber = `DD-${Date.now().toString(36).toUpperCase()}`;
    
    const { data: order, error: orderError } = await supabase
      .from('kitchen_orders')
      .insert({
        order_number: orderNumber,
        source: 'didi_food',
        external_order_id: externalOrderId,
        customer_name: body.customer_name || body.user?.name || 'Cliente Didi Food',
        service_type: 'delivery',
        status: 'pending',
        total: body.total_amount || body.total || 0,
        notes: body.delivery_notes || body.notes || null,
        user_id: integration.user_id
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating Didi Food order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (items.length > 0) {
      const orderItems = items.map((item: any) => ({
        ...item,
        kitchen_order_id: order.id
      }));

      await supabase.from('kitchen_order_items').insert(orderItems);
    }

    console.log('Didi Food order created:', order.id);

    return NextResponse.json({ 
      success: true, 
      order_id: order.id,
      order_number: orderNumber 
    });
  } catch (error: any) {
    console.error('Didi Food webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    platform: 'didi_food',
    message: 'Webhook endpoint active' 
  });
}
