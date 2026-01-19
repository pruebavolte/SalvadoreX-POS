import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

interface Turno {
  id: string;
  userId: string;
  startedAt: string;
  closedAt: string | null;
  initialCash: number;
  countedCash: number | null;
  status: "active" | "closed";
  salesCash: number;
  salesCard: number;
  salesTransfer: number;
  salesCredit: number;
  totalWithdrawals: number;
  totalDeposits: number;
  difference: number | null;
  notes: string | null;
}

declare global {
  var cajaTurnos: Map<string, Turno[]> | undefined;
}

function getTurnosForUser(userId: string): Turno[] {
  if (!global.cajaTurnos) {
    global.cajaTurnos = new Map();
  }
  if (!global.cajaTurnos.has(userId)) {
    global.cajaTurnos.set(userId, []);
  }
  return global.cajaTurnos.get(userId)!;
}

function getActiveTurno(userId: string): Turno | null {
  const turnos = getTurnosForUser(userId);
  return turnos.find(t => t.status === "active") || null;
}

// Storage for demo sales - persisted across requests
declare global {
  var cajaDemoSales: Map<string, { salesCash: number; salesCard: number; salesTransfer: number; salesCredit: number }> | undefined;
}

function getOrCreateDemoSales(turnoId: string): { salesCash: number; salesCard: number; salesTransfer: number; salesCredit: number } {
  if (!global.cajaDemoSales) {
    global.cajaDemoSales = new Map();
  }
  
  if (!global.cajaDemoSales.has(turnoId)) {
    // Generate demo sales only ONCE when turno is first accessed
    // These values stay constant for this turno
    global.cajaDemoSales.set(turnoId, {
      salesCash: 2450.00,
      salesCard: 1875.50,
      salesTransfer: 650.00,
      salesCredit: 320.00,
    });
  }
  
  return global.cajaDemoSales.get(turnoId)!;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const activeTurno = getActiveTurno(user.id);

    if (!activeTurno) {
      return NextResponse.json({
        activeTurno: null,
        hasActiveTurno: false,
      });
    }

    // Get consistent demo sales for this turno (generated once, stays constant)
    const demoSales = getOrCreateDemoSales(activeTurno.id);
    activeTurno.salesCash = demoSales.salesCash;
    activeTurno.salesCard = demoSales.salesCard;
    activeTurno.salesTransfer = demoSales.salesTransfer;
    activeTurno.salesCredit = demoSales.salesCredit;

    const expectedCash = activeTurno.initialCash + 
      activeTurno.salesCash + 
      activeTurno.totalDeposits - 
      activeTurno.totalWithdrawals;

    return NextResponse.json({
      activeTurno: {
        ...activeTurno,
        expectedCash,
      },
      hasActiveTurno: true,
    });
  } catch (error: any) {
    console.error("Turno GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { initialCash } = body;

    if (typeof initialCash !== "number" || initialCash < 0) {
      return NextResponse.json({ error: "El fondo inicial debe ser un número positivo" }, { status: 400 });
    }

    const existingActive = getActiveTurno(user.id);
    if (existingActive) {
      return NextResponse.json({ error: "Ya existe un turno activo. Debe cerrarlo primero." }, { status: 400 });
    }

    const turnos = getTurnosForUser(user.id);
    
    const newTurno: Turno = {
      id: crypto.randomUUID(),
      userId: user.id,
      startedAt: new Date().toISOString(),
      closedAt: null,
      initialCash,
      countedCash: null,
      status: "active",
      salesCash: 0,
      salesCard: 0,
      salesTransfer: 0,
      salesCredit: 0,
      totalWithdrawals: 0,
      totalDeposits: 0,
      difference: null,
      notes: null,
    };

    turnos.push(newTurno);

    return NextResponse.json({
      success: true,
      turno: newTurno,
    });
  } catch (error: any) {
    console.error("Turno POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { countedCash, notes } = body;

    if (typeof countedCash !== "number" || countedCash < 0) {
      return NextResponse.json({ error: "El efectivo contado debe ser un número positivo" }, { status: 400 });
    }

    const activeTurno = getActiveTurno(user.id);
    if (!activeTurno) {
      return NextResponse.json({ error: "No hay turno activo para cerrar" }, { status: 404 });
    }

    // Get consistent demo sales for this turno
    const demoSales = getOrCreateDemoSales(activeTurno.id);
    activeTurno.salesCash = demoSales.salesCash;
    activeTurno.salesCard = demoSales.salesCard;
    activeTurno.salesTransfer = demoSales.salesTransfer;
    activeTurno.salesCredit = demoSales.salesCredit;

    const expectedCash = activeTurno.initialCash + 
      activeTurno.salesCash + 
      activeTurno.totalDeposits - 
      activeTurno.totalWithdrawals;

    const difference = countedCash - expectedCash;

    activeTurno.closedAt = new Date().toISOString();
    activeTurno.countedCash = countedCash;
    activeTurno.status = "closed";
    activeTurno.difference = Math.round(difference * 100) / 100;
    activeTurno.notes = notes || null;

    const report = {
      turnoId: activeTurno.id,
      startedAt: activeTurno.startedAt,
      closedAt: activeTurno.closedAt,
      initialCash: activeTurno.initialCash,
      salesCash: activeTurno.salesCash,
      salesCard: activeTurno.salesCard,
      salesTransfer: activeTurno.salesTransfer,
      salesCredit: activeTurno.salesCredit,
      totalSales: activeTurno.salesCash + activeTurno.salesCard + activeTurno.salesTransfer + activeTurno.salesCredit,
      totalWithdrawals: activeTurno.totalWithdrawals,
      totalDeposits: activeTurno.totalDeposits,
      expectedCash: Math.round(expectedCash * 100) / 100,
      countedCash: activeTurno.countedCash,
      difference: activeTurno.difference,
      notes: activeTurno.notes,
    };

    return NextResponse.json({
      success: true,
      message: "Turno cerrado exitosamente",
      report,
    });
  } catch (error: any) {
    console.error("Turno PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
