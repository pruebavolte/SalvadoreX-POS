import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/factory";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { count: verticalsCount } = await supabase
      .from("verticals")
      .select("*", { count: "exact", head: true });
    
    const { count: categoriesCount } = await supabase
      .from("vertical_categories")
      .select("*", { count: "exact", head: true });
    
    const { count: modulesCount } = await supabase
      .from("system_modules")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({
      success: true,
      message: "Verticals API is working",
      stats: {
        verticals: verticalsCount ?? 0,
        categories: categoriesCount ?? 0,
        modules: modulesCount ?? 0,
        migrationApplied: (verticalsCount ?? 0) > 0,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isMissingTable = errorMessage.includes("does not exist") || 
                          errorMessage.includes("PGRST") ||
                          errorMessage.includes("42P01");
    
    return NextResponse.json({
      success: true,
      message: "Verticals API is working - migrations pending",
      migrationRequired: isMissingTable,
      note: isMissingTable 
        ? "Database tables not found. Please run migrations 021, 022, 023 in Supabase SQL Editor."
        : undefined,
      error: isMissingTable ? undefined : errorMessage,
    });
  }
}
