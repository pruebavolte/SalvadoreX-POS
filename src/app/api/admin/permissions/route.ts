import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { withRBAC } from "@/lib/rbac";

const supabase = supabaseAdmin as any;

export async function GET(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['users:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const { data: permissions, error } = await supabase
      .from("permissions")
      .select("*")
      .order("module", { ascending: true })
      .order("action", { ascending: true});

    if (error) {
      console.error("Error fetching permissions:", error);
      return NextResponse.json(
        { error: "Error al obtener permisos", details: error.message },
        { status: 500 }
      );
    }

    const groupedByModule = permissions?.reduce((acc: Record<string, any[]>, perm: any) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {}) || {};

    return NextResponse.json({ 
      permissions: permissions || [],
      grouped: groupedByModule,
    });
  } catch (error) {
    console.error("Error in GET /api/admin/permissions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
