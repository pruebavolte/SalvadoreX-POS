import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";

// Get variant sales report
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const userData = await getUserByClerkId(userId);

    if (!userData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Get sale item variants with product and variant info
    let saleVariantsQuery = supabaseAdmin
      .from("sale_item_variants")
      .select(`
        id,
        price_applied,
        created_at,
        variant:product_variants (
          id,
          name,
          price_modifier,
          variant_type:variant_types (
            id,
            name
          ),
          product:products (
            id,
            name,
            user_id
          )
        )
      `);

    // Get order item variants
    let orderVariantsQuery = supabaseAdmin
      .from("order_item_variants")
      .select(`
        id,
        price_applied,
        created_at,
        variant:product_variants (
          id,
          name,
          price_modifier,
          variant_type:variant_types (
            id,
            name
          ),
          product:products (
            id,
            name,
            user_id
          )
        )
      `);

    if (startDate) {
      saleVariantsQuery = saleVariantsQuery.gte("created_at", startDate);
      orderVariantsQuery = orderVariantsQuery.gte("created_at", startDate);
    }

    if (endDate) {
      saleVariantsQuery = saleVariantsQuery.lte("created_at", endDate);
      orderVariantsQuery = orderVariantsQuery.lte("created_at", endDate);
    }

    const [saleVariantsResult, orderVariantsResult] = await Promise.all([
      saleVariantsQuery,
      orderVariantsQuery,
    ]);

    // Combine results and filter by user
    const allVariantSales: any[] = [];

    if (saleVariantsResult.data) {
      saleVariantsResult.data.forEach((item: any) => {
        if (item.variant?.product?.user_id === userData.id) {
          allVariantSales.push({
            ...item,
            source: "pos",
          });
        }
      });
    }

    if (orderVariantsResult.data) {
      orderVariantsResult.data.forEach((item: any) => {
        if (item.variant?.product?.user_id === userData.id) {
          allVariantSales.push({
            ...item,
            source: "digital_menu",
          });
        }
      });
    }

    // Aggregate by variant
    const variantStats: Record<string, {
      variant_id: string;
      variant_name: string;
      variant_type: string;
      product_name: string;
      total_sold: number;
      revenue: number;
    }> = {};

    // Aggregate by variant type
    const variantTypeStats: Record<string, Record<string, number>> = {};

    // Aggregate by product + variant combination
    const productVariantCombos: Record<string, {
      product_name: string;
      variants: string[];
      count: number;
      revenue: number;
    }> = {};

    allVariantSales.forEach((sale) => {
      const variant = sale.variant;
      if (!variant) return;

      const variantId = variant.id;
      const variantName = variant.name;
      const variantType = variant.variant_type?.name || "Otro";
      const productName = variant.product?.name || "Producto";
      const priceApplied = sale.price_applied || 0;

      // Update variant stats
      if (!variantStats[variantId]) {
        variantStats[variantId] = {
          variant_id: variantId,
          variant_name: variantName,
          variant_type: variantType,
          product_name: productName,
          total_sold: 0,
          revenue: 0,
        };
      }
      variantStats[variantId].total_sold += 1;
      variantStats[variantId].revenue += priceApplied;

      // Update variant type stats
      if (!variantTypeStats[variantType]) {
        variantTypeStats[variantType] = {};
      }
      if (!variantTypeStats[variantType][variantName]) {
        variantTypeStats[variantType][variantName] = 0;
      }
      variantTypeStats[variantType][variantName] += 1;
    });

    // Sort variants by total sold
    const topVariants = Object.values(variantStats)
      .sort((a, b) => b.total_sold - a.total_sold)
      .slice(0, 20);

    // Format variant type stats
    const variantsByType: Record<string, Array<{ name: string; count: number }>> = {};
    Object.entries(variantTypeStats).forEach(([type, variants]) => {
      variantsByType[type] = Object.entries(variants)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    });

    // Calculate summary
    const summary = {
      totalVariantSales: allVariantSales.length,
      totalRevenue: Object.values(variantStats).reduce((sum, v) => sum + v.revenue, 0),
      uniqueVariants: Object.keys(variantStats).length,
      topVariantType: Object.entries(variantTypeStats)
        .map(([type, variants]) => ({
          type,
          total: Object.values(variants).reduce((sum, count) => sum + count, 0),
        }))
        .sort((a, b) => b.total - a.total)[0]?.type || null,
    };

    return NextResponse.json({
      success: true,
      topVariants,
      variantsByType,
      summary,
    });
  } catch (error) {
    console.error("Error fetching variant report:", error);
    return NextResponse.json(
      { error: "Error al obtener reporte de variantes" },
      { status: 500 }
    );
  }
}
