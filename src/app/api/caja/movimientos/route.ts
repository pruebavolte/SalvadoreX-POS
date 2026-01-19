import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

interface Movimiento {
  id: string;
  turnoId: string;
  userId: string;
  type: "withdrawal" | "deposit";
  amount: number;
  concept: string;
  createdAt: string;
}

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
  var cajaMovimientos: Map<string, Movimiento[]> | undefined;
  var cajaTurnos: Map<string, Turno[]> | undefined;
}

function getMovimientosForUser(userId: string): Movimiento[] {
  if (!global.cajaMovimientos) {
    global.cajaMovimientos = new Map();
  }
  if (!global.cajaMovimientos.has(userId)) {
    global.cajaMovimientos.set(userId, []);
  }
  return global.cajaMovimientos.get(userId)!;
}

function getActiveTurno(userId: string): Turno | null {
  if (!global.cajaTurnos) {
    return null;
  }
  const turnos = global.cajaTurnos.get(userId);
  if (!turnos) return null;
  return turnos.find(t => t.status === "active") || null;
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
        movimientos: [],
        message: "No hay turno activo"
      });
    }

    const allMovimientos = getMovimientosForUser(user.id);
    const turnoMovimientos = allMovimientos
      .filter(m => m.turnoId === activeTurno.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      movimientos: turnoMovimientos,
      turnoId: activeTurno.id,
    });
  } catch (error: any) {
    console.error("Movimientos GET error:", error);
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
    const { type, amount, concept } = body;

    if (type !== "withdrawal" && type !== "deposit") {
      return NextResponse.json({ error: "Tipo de movimiento inválido" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "El monto debe ser un número positivo" }, { status: 400 });
    }

    if (!concept || typeof concept !== "string" || concept.trim().length === 0) {
      return NextResponse.json({ error: "El concepto es requerido" }, { status: 400 });
    }

    const activeTurno = getActiveTurno(user.id);
    if (!activeTurno) {
      return NextResponse.json({ error: "No hay turno activo. Debe iniciar un turno primero." }, { status: 400 });
    }

    const movimientos = getMovimientosForUser(user.id);
    
    const newMovimiento: Movimiento = {
      id: crypto.randomUUID(),
      turnoId: activeTurno.id,
      userId: user.id,
      type,
      amount: Math.round(amount * 100) / 100,
      concept: concept.trim(),
      createdAt: new Date().toISOString(),
    };

    movimientos.push(newMovimiento);

    if (type === "withdrawal") {
      activeTurno.totalWithdrawals += newMovimiento.amount;
    } else {
      activeTurno.totalDeposits += newMovimiento.amount;
    }

    return NextResponse.json({
      success: true,
      movimiento: newMovimiento,
      turnoTotals: {
        totalWithdrawals: activeTurno.totalWithdrawals,
        totalDeposits: activeTurno.totalDeposits,
      }
    });
  } catch (error: any) {
    console.error("Movimientos POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
