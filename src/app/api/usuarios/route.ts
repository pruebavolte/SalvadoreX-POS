import { NextRequest, NextResponse } from "next/server";

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  ultimoAcceso: string;
  password?: string;
}

declare global {
  var usuariosStorage: Usuario[] | undefined;
}

function getUsuariosStorage(): Usuario[] {
  if (!global.usuariosStorage) {
    global.usuariosStorage = [
      {
        id: "usr-001",
        nombre: "Carlos Administrador",
        email: "admin@salvadorex.com",
        rol: "ADMIN",
        activo: true,
        ultimoAcceso: new Date().toISOString(),
      },
      {
        id: "usr-002",
        nombre: "María García",
        email: "maria.cajero@salvadorex.com",
        rol: "CAJERO",
        activo: true,
        ultimoAcceso: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "usr-003",
        nombre: "Juan Pérez",
        email: "juan.cajero@salvadorex.com",
        rol: "CAJERO",
        activo: true,
        ultimoAcceso: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: "usr-004",
        nombre: "Ana Rodríguez",
        email: "ana.cocina@salvadorex.com",
        rol: "COCINA",
        activo: false,
        ultimoAcceso: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  }
  return global.usuariosStorage;
}

function generateId(): string {
  return `usr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const rol = searchParams.get("rol");
    const buscar = searchParams.get("buscar");

    let usuarios = getUsuariosStorage();

    if (estado && estado !== "todos") {
      usuarios = usuarios.filter((u) =>
        estado === "activos" ? u.activo : !u.activo
      );
    }

    if (rol && rol !== "todos") {
      usuarios = usuarios.filter((u) => u.rol === rol);
    }

    if (buscar) {
      const searchLower = buscar.toLowerCase();
      usuarios = usuarios.filter(
        (u) =>
          u.nombre.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      data: usuarios.map(({ password, ...user }) => user),
    });
  } catch (error) {
    console.error("Error fetching usuarios:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, email, rol, password } = body;

    if (!nombre || !email || !rol) {
      return NextResponse.json(
        { success: false, error: "Nombre, email y rol son requeridos" },
        { status: 400 }
      );
    }

    const usuarios = getUsuariosStorage();

    const existingUser = usuarios.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Ya existe un usuario con ese email" },
        { status: 400 }
      );
    }

    const nuevoUsuario: Usuario = {
      id: generateId(),
      nombre,
      email,
      rol,
      activo: true,
      ultimoAcceso: new Date().toISOString(),
      password: password || "123456",
    };

    usuarios.push(nuevoUsuario);
    global.usuariosStorage = usuarios;

    const { password: _, ...userWithoutPassword } = nuevoUsuario;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nombre, email, rol, activo, password } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    const usuarios = getUsuariosStorage();
    const index = usuarios.findIndex((u) => u.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    if (email && email !== usuarios[index].email) {
      const existingUser = usuarios.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.id !== id
      );
      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "Ya existe un usuario con ese email" },
          { status: 400 }
        );
      }
    }

    const usuarioActualizado: Usuario = {
      ...usuarios[index],
      ...(nombre !== undefined && { nombre }),
      ...(email !== undefined && { email }),
      ...(rol !== undefined && { rol }),
      ...(activo !== undefined && { activo }),
      ...(password !== undefined && { password }),
    };

    usuarios[index] = usuarioActualizado;
    global.usuariosStorage = usuarios;

    const { password: _, ...userWithoutPassword } = usuarioActualizado;

    return NextResponse.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error updating usuario:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
}
