import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUser = await getUserByClerkId(clerkUserId);

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, email, password } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario es requerido" },
        { status: 400 }
      );
    }

    // Get user from Supabase to find their Clerk ID
    const { data: targetUserData, error: userError } = await supabaseAdmin
      .from("users")
      .select("id, clerk_id, email")
      .eq("id", userId)
      .single();

    if (userError || !targetUserData) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const targetUser = targetUserData as { id: string; clerk_id: string | null; email: string };
    const updates: { email?: string } = {};

    // Update email if provided and different
    if (email && email !== targetUser.email) {
      // Update in Supabase
      const { error: updateError } = await supabaseAdmin
        .from("users")
        // @ts-ignore - Supabase type mismatch with update
        .update({ email })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating email in Supabase:", updateError);
        return NextResponse.json(
          { error: "Error al actualizar el correo electrónico" },
          { status: 500 }
        );
      }

      // Try to update in Clerk if user has clerk_id
      if (targetUser.clerk_id) {
        try {
          const client = await clerkClient();
          await client.users.updateUser(targetUser.clerk_id, {
            primaryEmailAddressID: undefined,
          });
          // Note: Updating email in Clerk is more complex and may require verification
          // For now, we just update in Supabase
        } catch (clerkError) {
          console.warn("Could not update email in Clerk:", clerkError);
          // Continue - Supabase update succeeded
        }
      }

      updates.email = email;
    }

    // Update password if provided
    if (password && password.length > 0) {
      if (targetUser.clerk_id) {
        try {
          const client = await clerkClient();
          await client.users.updateUser(targetUser.clerk_id, {
            password: password,
          });
        } catch (clerkError: any) {
          console.error("Error updating password in Clerk:", clerkError);
          
          // Handle specific Clerk errors
          if (clerkError.status === 404) {
            return NextResponse.json(
              { error: "Este usuario no tiene una cuenta de autenticación válida en el sistema. Puede que necesite registrarse nuevamente." },
              { status: 400 }
            );
          }
          
          const errorMessage = clerkError.errors?.[0]?.message || 
            clerkError.errors?.[0]?.longMessage ||
            "Error al actualizar la contraseña. La contraseña debe tener al menos 8 caracteres.";
          
          return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json(
          { error: "Este usuario no tiene cuenta de autenticación vinculada" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Credenciales actualizadas correctamente",
      updates,
    });
  } catch (error) {
    console.error("Error updating user credentials:", error);
    return NextResponse.json(
      { error: "Error al actualizar las credenciales del usuario" },
      { status: 500 }
    );
  }
}
