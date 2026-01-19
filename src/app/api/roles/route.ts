import { NextRequest, NextResponse } from "next/server";

interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: Record<string, boolean>;
  editable: boolean;
}

declare global {
  var rolesStorage: Rol[] | undefined;
}

const defaultPermisos = {
  pos_ver: false,
  pos_cobrar: false,
  pos_descuentos: false,
  pos_cancelar: false,
  productos_ver: false,
  productos_crear: false,
  productos_editar: false,
  productos_eliminar: false,
  clientes_ver: false,
  clientes_crear: false,
  clientes_editar: false,
  reportes_ver: false,
  reportes_exportar: false,
  configuracion_ver: false,
  configuracion_modificar: false,
  usuarios_ver: false,
  usuarios_crear: false,
  usuarios_modificar: false,
  cocina_ver: false,
  inventario_ver: false,
  inventario_modificar: false,
  caja_ver: false,
  caja_corte: false,
};

function getRolesStorage(): Rol[] {
  if (!global.rolesStorage) {
    global.rolesStorage = [
      {
        id: "rol-admin",
        nombre: "ADMIN",
        descripcion: "Acceso total al sistema",
        editable: false,
        permisos: {
          pos_ver: true,
          pos_cobrar: true,
          pos_descuentos: true,
          pos_cancelar: true,
          productos_ver: true,
          productos_crear: true,
          productos_editar: true,
          productos_eliminar: true,
          clientes_ver: true,
          clientes_crear: true,
          clientes_editar: true,
          reportes_ver: true,
          reportes_exportar: true,
          configuracion_ver: true,
          configuracion_modificar: true,
          usuarios_ver: true,
          usuarios_crear: true,
          usuarios_modificar: true,
          cocina_ver: true,
          inventario_ver: true,
          inventario_modificar: true,
          caja_ver: true,
          caja_corte: true,
        },
      },
      {
        id: "rol-cajero",
        nombre: "CAJERO",
        descripcion: "POS y corte de caja",
        editable: true,
        permisos: {
          ...defaultPermisos,
          pos_ver: true,
          pos_cobrar: true,
          pos_descuentos: false,
          pos_cancelar: false,
          productos_ver: true,
          clientes_ver: true,
          clientes_crear: true,
          caja_ver: true,
          caja_corte: true,
        },
      },
      {
        id: "rol-cocina",
        nombre: "COCINA",
        descripcion: "Solo pantalla de cocina",
        editable: true,
        permisos: {
          ...defaultPermisos,
          cocina_ver: true,
          productos_ver: true,
        },
      },
      {
        id: "rol-almacen",
        nombre: "ALMACEN",
        descripcion: "Solo inventario",
        editable: true,
        permisos: {
          ...defaultPermisos,
          inventario_ver: true,
          inventario_modificar: true,
          productos_ver: true,
        },
      },
      {
        id: "rol-mesero",
        nombre: "MESERO",
        descripcion: "Solo toma de pedidos",
        editable: true,
        permisos: {
          ...defaultPermisos,
          pos_ver: true,
          pos_cobrar: false,
          productos_ver: true,
          clientes_ver: true,
        },
      },
    ];
  }
  return global.rolesStorage;
}

function generateId(): string {
  return `rol-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
}

export async function GET() {
  try {
    const roles = getRolesStorage();

    return NextResponse.json({
      success: true,
      data: roles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion, permisos } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "Nombre del rol es requerido" },
        { status: 400 }
      );
    }

    const roles = getRolesStorage();

    const existingRol = roles.find(
      (r) => r.nombre.toUpperCase() === nombre.toUpperCase()
    );
    if (existingRol) {
      return NextResponse.json(
        { success: false, error: "Ya existe un rol con ese nombre" },
        { status: 400 }
      );
    }

    const nuevoRol: Rol = {
      id: generateId(),
      nombre: nombre.toUpperCase(),
      descripcion: descripcion || "",
      editable: true,
      permisos: permisos || { ...defaultPermisos },
    };

    roles.push(nuevoRol);
    global.rolesStorage = roles;

    return NextResponse.json({
      success: true,
      data: nuevoRol,
    });
  } catch (error) {
    console.error("Error creating rol:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear rol" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nombre, descripcion, permisos } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID del rol requerido" },
        { status: 400 }
      );
    }

    const roles = getRolesStorage();
    const index = roles.findIndex((r) => r.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Rol no encontrado" },
        { status: 404 }
      );
    }

    if (!roles[index].editable && nombre && nombre !== roles[index].nombre) {
      return NextResponse.json(
        { success: false, error: "No se puede modificar el nombre de este rol" },
        { status: 400 }
      );
    }

    if (nombre && nombre !== roles[index].nombre) {
      const existingRol = roles.find(
        (r) => r.nombre.toUpperCase() === nombre.toUpperCase() && r.id !== id
      );
      if (existingRol) {
        return NextResponse.json(
          { success: false, error: "Ya existe un rol con ese nombre" },
          { status: 400 }
        );
      }
    }

    const rolActualizado: Rol = {
      ...roles[index],
      ...(nombre !== undefined && roles[index].editable && { nombre: nombre.toUpperCase() }),
      ...(descripcion !== undefined && { descripcion }),
      ...(permisos !== undefined && { permisos: { ...roles[index].permisos, ...permisos } }),
    };

    roles[index] = rolActualizado;
    global.rolesStorage = roles;

    return NextResponse.json({
      success: true,
      data: rolActualizado,
    });
  } catch (error) {
    console.error("Error updating rol:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar rol" },
      { status: 500 }
    );
  }
}
