import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface UsoNotaCredito {
  fecha: string;
  monto: number;
  ticketAplicado: string;
}

export interface NotaCredito {
  id: string;
  numeroNota: string;
  devolucionId?: string;
  cliente?: string;
  montoOriginal: number;
  montoDisponible: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: "activa" | "usada" | "vencida" | "parcial";
  historialUso: UsoNotaCredito[];
}

const demoNotasCredito: NotaCredito[] = [
  {
    id: "nc-001",
    numeroNota: "NC-2024-001",
    devolucionId: "dev-002",
    cliente: "María García",
    montoOriginal: 189.00,
    montoDisponible: 189.00,
    fechaEmision: "2025-12-02T14:15:00",
    fechaVencimiento: "2026-06-02T14:15:00",
    estado: "activa",
    historialUso: [],
  },
  {
    id: "nc-002",
    numeroNota: "NC-2024-002",
    cliente: "Carlos López",
    montoOriginal: 250.00,
    montoDisponible: 150.00,
    fechaEmision: "2025-11-15T10:00:00",
    fechaVencimiento: "2026-05-15T10:00:00",
    estado: "parcial",
    historialUso: [
      {
        fecha: "2025-11-20T12:30:00",
        monto: 100.00,
        ticketAplicado: "TK-2024-050",
      },
    ],
  },
];

declare global {
  var notasCreditoStorage: NotaCredito[];
}

if (!global.notasCreditoStorage) {
  global.notasCreditoStorage = [...demoNotasCredito];
}

function generateNotaNumber(): string {
  const year = new Date().getFullYear();
  const count = global.notasCreditoStorage.length + 1;
  return `NC-${year}-${count.toString().padStart(3, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado");
    const soloActivas = searchParams.get("soloActivas") === "true";

    let notas = [...global.notasCreditoStorage];

    const ahora = new Date();
    notas = notas.map((nota) => {
      if (nota.estado === "activa" || nota.estado === "parcial") {
        if (new Date(nota.fechaVencimiento) < ahora) {
          nota.estado = "vencida";
        }
      }
      return nota;
    });

    if (soloActivas) {
      notas = notas.filter(
        (n) => (n.estado === "activa" || n.estado === "parcial") && n.montoDisponible > 0
      );
    }

    if (estado && estado !== "todos") {
      notas = notas.filter((n) => n.estado === estado);
    }

    notas.sort(
      (a, b) =>
        new Date(b.fechaEmision).getTime() - new Date(a.fechaEmision).getTime()
    );

    return NextResponse.json({
      success: true,
      data: notas,
    });
  } catch (error: any) {
    console.error("Error fetching notas de credito:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cliente, monto, devolucionId } = body;

    if (!monto || monto <= 0) {
      return NextResponse.json(
        { success: false, error: "Monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const fechaVencimiento = new Date();
    fechaVencimiento.setMonth(fechaVencimiento.getMonth() + 6);

    const nuevaNota: NotaCredito = {
      id: `nc-${Date.now()}`,
      numeroNota: generateNotaNumber(),
      devolucionId,
      cliente,
      montoOriginal: monto,
      montoDisponible: monto,
      fechaEmision: new Date().toISOString(),
      fechaVencimiento: fechaVencimiento.toISOString(),
      estado: "activa",
      historialUso: [],
    };

    global.notasCreditoStorage.push(nuevaNota);

    return NextResponse.json({
      success: true,
      data: nuevaNota,
    });
  } catch (error: any) {
    console.error("Error creating nota de credito:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, montoAplicar, ticketAplicado } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID es requerido" },
        { status: 400 }
      );
    }

    const index = global.notasCreditoStorage.findIndex((n) => n.id === id);
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: "Nota de crédito no encontrada" },
        { status: 404 }
      );
    }

    const nota = global.notasCreditoStorage[index];

    if (nota.estado === "usada") {
      return NextResponse.json(
        { success: false, error: "La nota de crédito ya fue usada completamente" },
        { status: 400 }
      );
    }

    if (nota.estado === "vencida") {
      return NextResponse.json(
        { success: false, error: "La nota de crédito está vencida" },
        { status: 400 }
      );
    }

    if (new Date(nota.fechaVencimiento) < new Date()) {
      nota.estado = "vencida";
      global.notasCreditoStorage[index] = nota;
      return NextResponse.json(
        { success: false, error: "La nota de crédito ha vencido" },
        { status: 400 }
      );
    }

    if (montoAplicar && montoAplicar > 0) {
      if (montoAplicar > nota.montoDisponible) {
        return NextResponse.json(
          { success: false, error: "El monto excede el saldo disponible" },
          { status: 400 }
        );
      }

      nota.montoDisponible -= montoAplicar;
      nota.historialUso.push({
        fecha: new Date().toISOString(),
        monto: montoAplicar,
        ticketAplicado: ticketAplicado || "Sin ticket",
      });

      if (nota.montoDisponible <= 0) {
        nota.estado = "usada";
        nota.montoDisponible = 0;
      } else {
        nota.estado = "parcial";
      }
    }

    global.notasCreditoStorage[index] = nota;

    return NextResponse.json({
      success: true,
      data: nota,
    });
  } catch (error: any) {
    console.error("Error updating nota de credito:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
