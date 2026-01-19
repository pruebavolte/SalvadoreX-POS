import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { getSupabaseAdmin } from "@/lib/supabase/factory";
import { copyTemplateProductsToUser } from "@/lib/supabase/template-products";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { verticalId } = await req.json();

    if (!verticalId) {
      return NextResponse.json(
        { error: "ID de giro de negocio requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: vertical, error: verticalError } = await supabase
      .from("verticals")
      .select("id, name, display_name")
      .eq("id", verticalId)
      .eq("active", true)
      .single();

    if (verticalError || !vertical) {
      return NextResponse.json(
        { error: "Giro de negocio no encontrado" },
        { status: 404 }
      );
    }

    const previousVerticalId = (currentUser as any).vertical_id;

    const { data, error } = await supabase
      .from("users")
      .update({ 
        vertical_id: verticalId,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user vertical:", error);
      throw error;
    }

    let productsCopied = 0;
    if (verticalId !== previousVerticalId) {
      try {
        const result = await copyTemplateProductsToUser(currentUser.id, verticalId);
        productsCopied = result.productsCopied;
        if (!result.success) {
          console.warn("[UpdateVertical] Template copy warning:", result.error);
        }
      } catch (templateError) {
        console.error("[UpdateVertical] Error copying templates:", templateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: productsCopied > 0 
        ? `Giro de negocio actualizado. ${productsCopied} producto(s) plantilla copiado(s).`
        : "Giro de negocio actualizado correctamente",
      user: data,
      vertical: vertical,
      productsCopied,
    });
  } catch (error) {
    console.error("Error updating user vertical:", error);
    return NextResponse.json(
      { error: "Error al actualizar el giro de negocio" },
      { status: 500 }
    );
  }
}
