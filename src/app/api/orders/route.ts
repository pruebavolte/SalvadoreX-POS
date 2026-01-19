import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { getUserOrders, createOrder } from "@/lib/supabase/orders";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { getUserIdsInTenant, getTenantById } from "@/lib/rbac/helpers";
import { supabaseAdmin } from "@/lib/supabase/server";

// Get user's orders with tenant filtering
export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['orders:view'],
      requireAll: false,
      skipTenantResolution: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    
    const rbacEnabled = isRBACEnabled();
    
    // When RBAC enabled, get orders for ALL users in tenant
    // When RBAC disabled, get orders for current user only
    const userIds = rbacEnabled && tenantId 
      ? await getUserIdsInTenant(tenantId)
      : [userId];
    
    console.log('[RBAC Orders GET] RBAC enabled:', rbacEnabled, 'tenantId:', tenantId, 'userIds:', userIds);
    
    if (userIds.length === 0) {
      return NextResponse.json({ orders: [] });
    }
    
    // Query orders for ALL users in tenant (or just current user if RBAC disabled)
    const { data: orders, error } = await (supabaseAdmin
      .from("orders") as any)
      .select(`
        *,
        order_items (*)
      `)
      .in("user_id", userIds)
      .order("created_at", { ascending: false });
      
    if (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }

    return NextResponse.json({ orders: orders || [] });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener las órdenes" },
      { status: 500 }
    );
  }
}

// Create new order
// Allows public orders when restaurantId is provided (for shared menu)
// Otherwise requires authentication with RBAC
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, notes, currency, restaurantId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requieren items para crear una orden" },
        { status: 400 }
      );
    }

    let targetUserId: string;

    // PUBLIC ORDER: If restaurantId is provided, this is a public order from shared menu
    if (restaurantId) {
      console.log('[RBAC Orders POST] Public order attempt for restaurantId:', restaurantId);
      
      // Validate tenant exists and is active
      const { data: tenant, error: tenantError } = await (supabaseAdmin
        .from("tenants") as any)
        .select("id, active, settings")
        .eq("id", restaurantId)
        .single();
        
      if (tenantError || !tenant) {
        console.error('[RBAC Orders POST] Tenant not found:', restaurantId, tenantError);
        return NextResponse.json(
          { error: "Restaurant no encontrado" },
          { status: 400 }
        );
      }
      
      if (!tenant.active) {
        console.error('[RBAC Orders POST] Tenant inactive:', restaurantId);
        return NextResponse.json(
          { error: "Restaurant inactivo" },
          { status: 400 }
        );
      }
      
      // Validate tenant allows public orders
      const settings = tenant.settings;
      if (!settings?.allowPublicOrders) {
        console.error('[RBAC Orders POST] Public orders not allowed for tenant:', restaurantId);
        return NextResponse.json(
          { error: "Órdenes públicas no permitidas para este restaurant" },
          { status: 403 }
        );
      }
      
      // TODO: Add rate limiting here
      // Example: Check if IP has made >10 orders in last hour for this tenant
      // Consider implementing:
      // - IP-based rate limiting (e.g., max 10 orders per hour per IP)
      // - Require a public API key per tenant for additional security
      // - Track order patterns to detect abuse
      
      targetUserId = restaurantId;
      console.log('[RBAC Orders POST] Public order validated successfully for tenant:', restaurantId);
    } else {
      // AUTHENTICATED ORDER: Use RBAC enforcement
      const rbacResult = await withRBAC(request, {
        permissions: ['orders:create'],
        requireAll: false
      });

      if (rbacResult instanceof NextResponse) {
        return rbacResult;
      }

      const { userId } = rbacResult;
      targetUserId = userId;
      console.log('[RBAC Orders POST] Authenticated order for user:', userId);
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    const order = await createOrder({
      userId: targetUserId,
      total,
      currency: currency || "MXN",
      notes: notes || null,
      items: items.map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        currency: item.currency || currency || "MXN",
        imageUrl: item.imageUrl || null,
      })),
    });

    return NextResponse.json({
      success: true,
      order,
      message: "Orden creada exitosamente",
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error al crear la orden" },
      { status: 500 }
    );
  }
}
