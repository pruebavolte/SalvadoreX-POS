import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withRBAC, isRBACEnabled } from "@/lib/rbac";
import { getUserIdsInTenant } from "@/lib/rbac/helpers";

// GET /api/products - Get products filtered by tenant
export async function GET(request: NextRequest) {
  try {
    const isDevelopment = process.env.NODE_ENV === "development";
    let userId: string | null = null;
    let tenantId: string | null = null;

    if (isDevelopment) {
      userId = null;
    } else {
      const rbacResult = await withRBAC(request, {
        permissions: ['products:view'],
        requireAll: false
      });

      if (rbacResult instanceof NextResponse) {
        return rbacResult;
      }

      userId = rbacResult.userId;
      tenantId = rbacResult.tenantId;
    }

    const supabase = supabaseAdmin;

    const searchParams = request.nextUrl.searchParams;
    const productType = searchParams.get("product_type");
    const availableInPos = searchParams.get("available_in_pos");
    const availableInDigitalMenu = searchParams.get("available_in_digital_menu");
    const trackInventory = searchParams.get("track_inventory");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = supabase
      .from("products")
      .select("*", { count: "exact" });

    // Apply tenant filtering - skip in development for testing
    if (!isDevelopment) {
      if (isRBACEnabled() && tenantId) {
        const userIds = await getUserIdsInTenant(tenantId);
        if (userIds.length === 0) {
          return NextResponse.json({
            data: [],
            page,
            limit,
            total: 0,
            totalPages: 0,
          });
        }
        query = query.in("user_id", userIds);
      } else if (userId) {
        query = query.eq("user_id", userId);
      }
    }

    // Apply filters - Sistema unificado multi-canal
    if (availableInPos !== null) {
      query = query.eq("available_in_pos", availableInPos === "true");
    }
    if (availableInDigitalMenu !== null) {
      query = query.eq("available_in_digital_menu", availableInDigitalMenu === "true");
    }
    if (trackInventory !== null) {
      query = query.eq("track_inventory", trackInventory === "true");
    }

    // Mantener compatibilidad con product_type (OBSOLETO)
    if (productType) {
      query = query.eq("product_type", productType);
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    query = query.range(start, end).order("created_at", { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching products:", error);
      return NextResponse.json(
        { error: "Error al obtener productos" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Error in GET /api/products:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product with user_id
export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['products:create'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId } = rbacResult;
    const supabase = supabaseAdmin;

    const productData = await request.json();

    // Add user_id to product data
    const productWithUserId = {
      ...productData,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from("products")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .insert([productWithUserId])
      .select("*")
      .single();

    if (error) {
      console.error("Error creating product:", error);
      return NextResponse.json(
        { error: "Error al crear producto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in POST /api/products:", error);
    return NextResponse.json(
      { error: "Error al crear producto" },
      { status: 500 }
    );
  }
}

// PATCH /api/products/:id - Update product (only if user owns it or in same tenant)
export async function PATCH(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['products:edit'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    const supabase = supabaseAdmin;

    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    const updates = await request.json();

    // Build query based on RBAC status
    let query = supabase
      .from("products")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .update(updates)
      .eq("id", productId);

    if (isRBACEnabled() && tenantId) {
      // Get all user IDs in this tenant
      const userIds = await getUserIdsInTenant(tenantId);
      if (userIds.length === 0) {
        return NextResponse.json(
          { error: "Producto no encontrado o no autorizado" },
          { status: 404 }
        );
      }
      query = query.in("user_id", userIds);
    } else {
      // RBAC disabled: only allow updating own products
      query = query.eq("user_id", userId);
    }

    const { data, error } = await query
      .select("*")
      .single();

    if (error) {
      console.error("Error updating product:", error);
      return NextResponse.json(
        { error: "Error al actualizar producto" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Producto no encontrado o no autorizado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    console.error("Error in PATCH /api/products:", error);
    return NextResponse.json(
      { error: "Error al actualizar producto" },
      { status: 500 }
    );
  }
}

// DELETE /api/products/:id - Delete product (only if user owns it or in same tenant)
export async function DELETE(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['products:delete'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { userId, tenantId } = rbacResult;
    const supabase = supabaseAdmin;

    const url = new URL(request.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
      return NextResponse.json(
        { error: "ID de producto requerido" },
        { status: 400 }
      );
    }

    // Build query based on RBAC status
    let query = supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (isRBACEnabled() && tenantId) {
      // Get all user IDs in this tenant
      const userIds = await getUserIdsInTenant(tenantId);
      if (userIds.length === 0) {
        return NextResponse.json(
          { error: "Producto no encontrado o no autorizado" },
          { status: 404 }
        );
      }
      query = query.in("user_id", userIds);
    } else {
      // RBAC disabled: only allow deleting own products
      query = query.eq("user_id", userId);
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting product:", error);
      return NextResponse.json(
        { error: "Error al eliminar producto" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/products:", error);
    return NextResponse.json(
      { error: "Error al eliminar producto" },
      { status: 500 }
    );
  }
}
