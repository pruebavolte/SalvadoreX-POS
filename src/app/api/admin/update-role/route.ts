import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, updateUserRole } from "@/lib/supabase/users";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUser = await getUserByClerkId(userId);

    if (currentUser?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email y rol son requeridos" },
        { status: 400 }
      );
    }

    if (role !== "ADMIN" && role !== "USER" && role !== "CUSTOMER") {
      return NextResponse.json(
        { error: "Rol inválido. Use 'ADMIN', 'USER' o 'CUSTOMER'" },
        { status: 400 }
      );
    }

    if (email === currentUser.email && role === "USER") {
      return NextResponse.json(
        { error: "No puedes cambiar tu propio rol de administrador" },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserRole(email, role);

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `Rol actualizado a ${role === "ADMIN" ? "Administrador" : role === "CUSTOMER" ? "Cliente" : "Usuario"}`,
    });
  } catch (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json(
      { error: "Error al actualizar el rol del usuario" },
      { status: 500 }
    );
  }
}
