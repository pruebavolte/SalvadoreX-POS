import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase/client";
import type { BrandConfig } from "@/types/brand";

// GET /api/brands/[id]/config - Get complete brand configuration with vertical defaults merged
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: brandId } = await params;

    // Call the database function to get merged configuration
    const { data, error } = await (supabase.rpc as any)("get_brand_config", {
      p_brand_id: brandId,
    });

    if (error) {
      console.error("Error fetching brand config:", error);
      throw error;
    }

    return NextResponse.json({
      data: data as BrandConfig,
      success: true,
    });
  } catch (error: any) {
    console.error("Error getting brand config:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to get brand configuration",
        success: false,
      },
      { status: 500 }
    );
  }
}
