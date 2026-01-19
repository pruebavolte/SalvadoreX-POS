import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = supabaseAdmin;

    const { data: testComponents, error: testError } = await supabase
      .from("vertical_component_overrides" as never)
      .select("id")
      .limit(1);

    const tablesExist = !testError || !testError.message.includes("does not exist");

    return NextResponse.json({ 
      success: true, 
      tablesExist,
      message: tablesExist 
        ? "Tables already exist" 
        : "Tables need to be created in Supabase dashboard. Run the migration SQL manually."
    });

  } catch (error) {
    console.error("Migration check error:", error);
    return NextResponse.json(
      { error: "Migration check failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
