import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/factory";
import type { SystemModule } from "../route";

function isMissingTableOrColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return code === "42P01" || 
         code === "42703" ||
         code?.startsWith("PGRST") ||
         message.includes("does not exist") || 
         message.includes("PGRST") ||
         message.includes("schema cache");
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";
    const category = searchParams.get("category");
    const premiumOnly = searchParams.get("premium") === "true";
    const aiOnly = searchParams.get("ai") === "true";

    let query = supabase
      .from("system_modules")
      .select("*")
      .order("sort_order");

    if (activeOnly) {
      query = query.eq("active", true);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (premiumOnly) {
      query = query.eq("is_premium", true);
    }

    if (aiOnly) {
      query = query.eq("is_ai_feature", true);
    }

    const { data, error } = await query;

    if (error) {
      if (isMissingTableOrColumnError(error)) {
        return NextResponse.json({
          data: [],
          grouped: {},
          success: true,
          migrationPending: true,
          message: "Modules table not yet created. Run migrations 021, 022, 023 first.",
        });
      }
      throw error;
    }

    const groupedData: Record<string, SystemModule[]> = {};
    for (const module of (data || []) as unknown as SystemModule[]) {
      const cat = module.category || "other";
      if (!groupedData[cat]) {
        groupedData[cat] = [];
      }
      groupedData[cat].push(module);
    }

    return NextResponse.json({
      data: data as unknown as SystemModule[],
      grouped: groupedData,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    return NextResponse.json(
      { error: "Failed to fetch modules", success: false },
      { status: 500 }
    );
  }
}
