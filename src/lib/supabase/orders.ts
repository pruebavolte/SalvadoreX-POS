import { supabaseAdmin } from "./server";
import type { Database } from "./client";

type Order = Database['public']['Tables']['orders']['Row'];
type OrderItem = Database['public']['Tables']['order_items']['Row'];

export async function getUserOrders(userId: string): Promise<(Order & { order_items: OrderItem[] })[]> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    throw error;
  }

  return data as any;
}

export async function getAllOrders(): Promise<any[]> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*),
      users (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all orders:", error);
    throw error;
  }

  return data as any;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (*),
      users (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching order:", error);
    return null;
  }

  return data as any;
}

export async function createOrder(orderData: {
  userId: string;
  total: number;
  currency: string;
  notes?: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    currency: string;
    imageUrl?: string;
  }>;
}) {
  const supabase = supabaseAdmin;
  
  const { data: order, error: orderError } = await supabase
    .from("orders")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .insert({
      user_id: orderData.userId,
      total: orderData.total,
      currency: orderData.currency,
      notes: orderData.notes || null,
      status: 'PENDING'
    })
    .select()
    .single();

  if (orderError) {
    console.error("Error creating order:", orderError);
    throw orderError;
  }

  const items = orderData.items.map(item => ({
    order_id: (order as any).id,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    price: item.price,
    currency: item.currency,
    image_url: item.imageUrl || null
  }));

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .insert(items)
    .select();

  if (itemsError) {
    console.error("Error creating order items:", itemsError);
    throw itemsError;
  }

  return {
    ...(order as any),
    items: orderItems
  };
}

export async function updateOrderStatus(orderId: string, status: string): Promise<Order> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("orders")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .update({ status })
    .eq("id", orderId)
    .select(`
      *,
      order_items (*)
    `)
    .single();

  if (error) {
    console.error("Error updating order status:", error);
    throw error;
  }

  return data as any;
}
