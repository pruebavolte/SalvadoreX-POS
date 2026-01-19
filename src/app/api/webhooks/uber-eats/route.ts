import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = request.headers.get('x-uber-signature') || request.headers.get('authorization');
    
    const body = await request.json();
    
    console.log('Uber Eats webhook received:', JSON.stringify(body, null, 2));

    const { data: integration } = await supabase
      .from('platform_integrations')
      .select('*')
      .eq('platform', 'uber_eats')
      .eq('enabled', true)
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Integration not configured' }, { status: 400 });
    }

    const externalOrderId = body.order_id || body.id || `UBER-${Date.now()}`;
    
    const { data: existingOrder } = await supabase
      .from('kitchen_orders')
      .select('id')
      .eq('external_order_id', externalOrderId)
      .eq('source', 'uber_eats')
      .single();

    if (existingOrder) {
      return NextResponse.json({ message: 'Order already exists', order_id: existingOrder.id });
    }

    const items = (body.items || body.order_items || []).map((item: any) => ({
      product_name: item.title || item.name || item.product_name,
      quantity: item.quantity || 1,
      unit_price: item.price || item.unit_price || 0,
      modifiers: item.modifiers?.map((m: any) => m.title || m.name).join(', ') || null,
      notes: item.special_instructions || item.notes || null
    }));

    const orderNumber = `UE-${Date.now().toString(36).toUpperCase()}`;
    
    const { data: order, error: orderError } = await supabase
      .from('kitchen_orders')
      .insert({
        order_number: orderNumber,
        source: 'uber_eats',
        external_order_id: externalOrderId,
        customer_name: body.customer?.name || body.customer_name || 'Cliente Uber Eats',
        service_type: 'delivery',
        status: 'pending',
        total: body.total || body.order_total || 0,
        notes: body.special_instructions || body.notes || null,
        user_id: integration.user_id
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating Uber Eats order:', orderError);
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    if (items.length > 0) {
      const orderItems = items.map((item: any) => ({
        ...item,
        kitchen_order_id: order.id
      }));

      await supabase.from('kitchen_order_items').insert(orderItems);
    }

    console.log('Uber Eats order created:', order.id);

    return NextResponse.json({ 
      success: true, 
      order_id: order.id,
      order_number: orderNumber 
    });
  } catch (error: any) {
    console.error('Uber Eats webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    platform: 'uber_eats',
    message: 'Webhook endpoint active' 
  });
}
