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

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const { userId, verticalId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    if (verticalId) {
      const { data: vertical, error: verticalError } = await supabase
        .from("verticals")
        .select("id, name, display_name")
        .eq("id", verticalId)
        .eq("active", true)
        .single();

      if (verticalError || !vertical) {
        return NextResponse.json(
          { error: "Giro de negocio no encontrado o inactivo" },
          { status: 404 }
        );
      }
    }

    const { data: existingUser, error: userCheckError } = await supabase
      .from("users")
      .select("id, vertical_id")
      .eq("id", userId)
      .single();

    if (userCheckError || !existingUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const previousVerticalId = (existingUser as any).vertical_id;

    const { data, error } = await supabase
      .from("users")
      .update({ 
        vertical_id: verticalId || null,
        updated_at: new Date().toISOString()
      } as never)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user vertical:", error);
      throw error;
    }

    let productsCopied = 0;
    if (verticalId && verticalId !== previousVerticalId) {
      try {
        const result = await copyTemplateProductsToUser(userId, verticalId);
        productsCopied = result.productsCopied;
        if (!result.success) {
          console.warn("[UpdateUserVertical] Template copy warning:", result.error);
        }
      } catch (templateError) {
        console.error("[UpdateUserVertical] Error copying templates:", templateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: productsCopied > 0 
        ? `Giro de negocio actualizado. ${productsCopied} producto(s) plantilla copiado(s).`
        : "Giro de negocio actualizado correctamente",
      user: data,
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
