import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface DevolucionItem {
  productoId: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Devolucion {
  id: string;
  numeroDevolucion: string;
  ticketOriginal: string;
  fechaVentaOriginal: string;
  fechaDevolucion: string;
  cliente?: string;
  productos: DevolucionItem[];
  montoTotal: number;
  motivo: "defecto" | "error" | "cambio_opinion" | "otro";
  motivoDescripcion?: string;
  tipoReembolso: "efectivo" | "nota_credito" | "cambio_producto";
  estado: "pendiente" | "completada" | "cancelada";
  notaCreditoId?: string;
  usuario: string;
}

const demoVentas = [
  {
    id: "venta-001",
    ticketNumero: "TK-2024-001",
    fecha: "2024-12-01",
    cliente: "Juan Pérez",
    total: 450.00,
    metodoPago: "efectivo",
    productos: [
      { id: "prod-1", nombre: "Hamburguesa Clásica", cantidad: 2, precioUnitario: 89.00, subtotal: 178.00 },
      { id: "prod-2", nombre: "Papas Francesas", cantidad: 2, precioUnitario: 45.00, subtotal: 90.00 },
      { id: "prod-3", nombre: "Refresco 600ml", cantidad: 4, precioUnitario: 25.00, subtotal: 100.00 },
      { id: "prod-4", nombre: "Helado de Vainilla", cantidad: 2, precioUnitario: 41.00, subtotal: 82.00 },
    ],
  },
  {
    id: "venta-002",
    ticketNumero: "TK-2024-002",
    fecha: "2024-12-01",
    cliente: "María García",
    total: 285.00,
    metodoPago: "tarjeta",
    productos: [
      { id: "prod-5", nombre: "Pizza Pepperoni Grande", cantidad: 1, precioUnitario: 189.00, subtotal: 189.00 },
      { id: "prod-6", nombre: "Alitas BBQ (10 pzs)", cantidad: 1, precioUnitario: 96.00, subtotal: 96.00 },
    ],
  },
  {
    id: "venta-003",
    ticketNumero: "TK-2024-003",
    fecha: "2024-11-30",
    cliente: undefined,
    total: 165.00,
    metodoPago: "efectivo",
    productos: [
      { id: "prod-7", nombre: "Tacos al Pastor (3 pzs)", cantidad: 2, precioUnitario: 65.00, subtotal: 130.00 },
      { id: "prod-8", nombre: "Agua Natural 500ml", cantidad: 2, precioUnitario: 17.50, subtotal: 35.00 },
    ],
  },
  {
    id: "venta-004",
    ticketNumero: "TK-2024-004",
    fecha: "2024-11-29",
    cliente: "Carlos López",
    total: 520.00,
    metodoPago: "transferencia",
    productos: [
      { id: "prod-9", nombre: "Burrito de Carne", cantidad: 3, precioUnitario: 99.00, subtotal: 297.00 },
      { id: "prod-10", nombre: "Nachos con Queso", cantidad: 2, precioUnitario: 69.00, subtotal: 138.00 },
      { id: "prod-11", nombre: "Café Americano", cantidad: 3, precioUnitario: 28.33, subtotal: 85.00 },
    ],
  },
];

const demoDevoluciones: Devolucion[] = [
  {
    id: "dev-001",
    numeroDevolucion: "DEV-2024-001",
    ticketOriginal: "TK-2024-001",
    fechaVentaOriginal: "2024-12-01",
    fechaDevolucion: "2024-12-02T10:30:00",
    cliente: "Juan Pérez",
    productos: [
      { productoId: "prod-1", productoNombre: "Hamburguesa Clásica", cantidad: 1, precioUnitario: 89.00, subtotal: 89.00 },
    ],
    montoTotal: 89.00,
    motivo: "defecto",
    motivoDescripcion: "Producto en mal estado",
    tipoReembolso: "efectivo",
    estado: "completada",
    usuario: "Cajero 1",
  },
  {
    id: "dev-002",
    numeroDevolucion: "DEV-2024-002",
    ticketOriginal: "TK-2024-002",
    fechaVentaOriginal: "2024-12-01",
    fechaDevolucion: "2024-12-02T14:15:00",
    cliente: "María García",
    productos: [
      { productoId: "prod-5", productoNombre: "Pizza Pepperoni Grande", cantidad: 1, precioUnitario: 189.00, subtotal: 189.00 },
    ],
    montoTotal: 189.00,
    motivo: "cambio_opinion",
    tipoReembolso: "nota_credito",
    estado: "completada",
    notaCreditoId: "nc-001",
    usuario: "Cajero 2",
  },
  {
    id: "dev-003",
    numeroDevolucion: "DEV-2024-003",
    ticketOriginal: "TK-2024-003",
    fechaVentaOriginal: "2024-11-30",
    fechaDevolucion: "2024-12-02T16:45:00",
    productos: [
      { productoId: "prod-7", productoNombre: "Tacos al Pastor (3 pzs)", cantidad: 1, precioUnitario: 65.00, subtotal: 65.00 },
    ],
    montoTotal: 65.00,
    motivo: "error",
    motivoDescripcion: "Error en el pedido",
    tipoReembolso: "cambio_producto",
    estado: "pendiente",
    usuario: "Cajero 1",
  },
];

declare global {
  var devolucionesStorage: Devolucion[];
  var ventasStorage: typeof demoVentas;
}

if (!global.devolucionesStorage) {
  global.devolucionesStorage = [...demoDevoluciones];
}

if (!global.ventasStorage) {
  global.ventasStorage = [...demoVentas];
}

function generateDevolucionNumber(): string {
  const year = new Date().getFullYear();
  const count = global.devolucionesStorage.length + 1;
  return `DEV-${year}-${count.toString().padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const fechaDesde = searchParams.get("fechaDesde");
    const fechaHasta = searchParams.get("fechaHasta");
    const buscarTicket = searchParams.get("buscarTicket");

    if (buscarTicket) {
      const ventas = global.ventasStorage.filter(
        (v) =>
          v.ticketNumero.toLowerCase().includes(buscarTicket.toLowerCase()) ||
          v.id.toLowerCase().includes(buscarTicket.toLowerCase())
      );
      return NextResponse.json({
        success: true,
        data: ventas,
        type: "ventas",
      });
    }

    let devoluciones = [...global.devolucionesStorage];

    if (estado && estado !== "todos") {
      devoluciones = devoluciones.filter((d) => d.estado === estado);
    }

    if (fechaDesde) {
      devoluciones = devoluciones.filter(
        (d) => new Date(d.fechaDevolucion) >= new Date(fechaDesde)
      );
    }

    if (fechaHasta) {
      devoluciones = devoluciones.filter(
        (d) => new Date(d.fechaDevolucion) <= new Date(fechaHasta)
      );
    }

    devoluciones.sort(
      (a, b) =>
        new Date(b.fechaDevolucion).getTime() -
        new Date(a.fechaDevolucion).getTime()
    );

    return NextResponse.json({
      success: true,
      data: devoluciones,
      type: "devoluciones",
    });
  } catch (error: any) {
    console.error("Error fetching devoluciones:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ticketOriginal,
      fechaVentaOriginal,
      cliente,
      productos,
      motivo,
      motivoDescripcion,
      tipoReembolso,
    } = body;

    if (!ticketOriginal || !productos || productos.length === 0 || !motivo || !tipoReembolso) {
      return NextResponse.json(
        { success: false, error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const montoTotal = productos.reduce(
      (sum: number, p: DevolucionItem) => sum + p.subtotal,
      0
    );

    const nuevaDevolucion: Devolucion = {
      id: `dev-${Date.now()}`,
      numeroDevolucion: generateDevolucionNumber(),
      ticketOriginal,
      fechaVentaOriginal,
      fechaDevolucion: new Date().toISOString(),
      cliente,
      productos,
      montoTotal,
      motivo,
      motivoDescripcion,
      tipoReembolso,
      estado: tipoReembolso === "cambio_producto" ? "pendiente" : "completada",
      usuario: "Cajero 1",
    };

    let notaCreditoCreada = null;

    if (tipoReembolso === "nota_credito") {
      const notaCreditoId = `nc-${Date.now()}`;
      nuevaDevolucion.notaCreditoId = notaCreditoId;

      const fechaVencimiento = new Date();
      fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 6);

      notaCreditoCreada = {
        id: notaCreditoId,
        numeroNota: `NC-${new Date().getFullYear()}-${(global.notasCreditoStorage?.length || 0) + 1}`.padStart(3, "0"),
        devolucionId: nuevaDevolucion.id,
        cliente,
        montoOriginal: montoTotal,
        montoDisponible: montoTotal,
        fechaEmision: new Date().toISOString(),
        fechaVencimiento: fechaVencimiento.toISOString(),
        estado: "activa" as const,
        historialUso: [],
      };

      if (!global.notasCreditoStorage) {
        global.notasCreditoStorage = [];
      }
      global.notasCreditoStorage.push(notaCreditoCreada);
    }

    global.devolucionesStorage.push(nuevaDevolucion);

    return NextResponse.json({
      success: true,
      data: nuevaDevolucion,
      notaCredito: notaCreditoCreada,
    });
  } catch (error: any) {
    console.error("Error creating devolucion:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, estado } = body;

    if (!id || !estado) {
      return NextResponse.json(
        { success: false, error: "ID y estado son requeridos" },
        { status: 400 }
      );
    }

    const index = global.devolucionesStorage.findIndex((d) => d.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Devolución no encontrada" },
        { status: 404 }
      );
    }

    global.devolucionesStorage[index].estado = estado;

    return NextResponse.json({
      success: true,
      data: global.devolucionesStorage[index],
    });
  } catch (error: any) {
    console.error("Error updating devolucion:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
