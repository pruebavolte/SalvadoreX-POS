import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { withRBAC } from "@/lib/rbac";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { id } = await params;
    const { designProvider } = await request.json();

    if (!['motiff', 'sigma'].includes(designProvider)) {
      return NextResponse.json({ error: "Invalid design provider" }, { status: 400 });
    }

    const { data: currentTenant } = await supabase
      .from("tenants")
      .select("settings")
      .eq("id", id)
      .single();

    const currentSettings = (currentTenant?.settings || {}) as Record<string, unknown>;

    const { error } = await supabase
      .from("tenants")
      .update({
        settings: {
          ...currentSettings,
          design_provider: designProvider,
        },
      })
      .eq("id", id);

    if (error) {
      console.error("[DesignProvider] Error:", error);
      return NextResponse.json({ error: "Error updating design provider" }, { status: 500 });
    }

    return NextResponse.json({ success: true, designProvider });
  } catch (error) {
    console.error("[DesignProvider] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
