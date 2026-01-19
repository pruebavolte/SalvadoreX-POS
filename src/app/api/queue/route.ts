import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";

export const dynamic = "force-dynamic";

interface QueueEntry {
  id: string;
  user_id: string;
  queue_number: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  position: number;
  created_at: string;
  called_at: string | null;
  served_at: string | null;
  estimated_wait_minutes: number;
  actual_wait_minutes: number | null;
}

declare global {
  var memoryQueue: Map<string, QueueEntry[]> | undefined;
  var queueCounters: Map<string, number> | undefined;
  var queueStats: Map<string, { totalServed: number; totalWaitTime: number }> | undefined;
}

function getQueueForUser(userId: string): QueueEntry[] {
  if (!global.memoryQueue) {
    global.memoryQueue = new Map();
  }
  if (!global.memoryQueue.has(userId)) {
    global.memoryQueue.set(userId, []);
  }
  return global.memoryQueue.get(userId)!;
}

function getNextNumber(userId: string): number {
  if (!global.queueCounters) {
    global.queueCounters = new Map();
  }
  const today = new Date().toISOString().split("T")[0];
  const key = `${userId}-${today}`;
  const current = global.queueCounters.get(key) || 0;
  global.queueCounters.set(key, current + 1);
  return current + 1;
}

function getStats(userId: string) {
  if (!global.queueStats) {
    global.queueStats = new Map();
  }
  return global.queueStats.get(userId) || { totalServed: 0, totalWaitTime: 0 };
}

function setStats(userId: string, stats: { totalServed: number; totalWaitTime: number }) {
  if (!global.queueStats) {
    global.queueStats = new Map();
  }
  global.queueStats.set(userId, stats);
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get("status") || "waiting";
    const queue = getQueueForUser(user.id);

    let entries = queue;
    if (status !== "all") {
      entries = queue.filter(e => e.status === status);
    } else {
      entries = queue.filter(e => ["waiting", "called", "serving"].includes(e.status));
    }

    entries.sort((a, b) => a.position - b.position);

    const stats = getStats(user.id);
    const waitingCount = queue.filter(e => e.status === "waiting").length;
    const avgWait = stats.totalServed > 0 ? Math.round(stats.totalWaitTime / stats.totalServed) : 3;

    return NextResponse.json({
      entries,
      stats: {
        waiting: waitingCount,
        averageWaitMinutes: avgWait,
        totalServedToday: stats.totalServed,
      },
    });
  } catch (error: any) {
    console.error("Queue GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tenantId, customerName, customerEmail, customerPhone } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    const queue = getQueueForUser(userId);
    const queueNumber = getNextNumber(userId);
    const waitingEntries = queue.filter(e => e.status === "waiting");
    const position = waitingEntries.length + 1;

    const stats = getStats(userId);
    const avgWait = stats.totalServed > 0 ? Math.round(stats.totalWaitTime / stats.totalServed) : 3;
    const estimatedWait = Math.round(position * avgWait);

    const entry: QueueEntry = {
      id: crypto.randomUUID(),
      user_id: userId,
      queue_number: queueNumber,
      customer_name: customerName || null,
      customer_email: customerEmail || null,
      customer_phone: customerPhone || null,
      status: "waiting",
      position,
      created_at: new Date().toISOString(),
      called_at: null,
      served_at: null,
      estimated_wait_minutes: estimatedWait,
      actual_wait_minutes: null,
    };

    queue.push(entry);

    return NextResponse.json({
      success: true,
      entry,
      position,
      estimatedWaitMinutes: estimatedWait,
      queueNumber,
    });
  } catch (error: any) {
    console.error("Queue POST error:", error);
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
    const { action, entryId } = body;
    const queue = getQueueForUser(user.id);

    if (action === "next") {
      const waitingEntries = queue.filter(e => e.status === "waiting").sort((a, b) => a.position - b.position);

      if (waitingEntries.length === 0) {
        return NextResponse.json({ error: "No hay nadie en la fila" }, { status: 404 });
      }

      const currentEntry = waitingEntries[0];
      const calledAt = new Date();
      const waitTime = Math.round((calledAt.getTime() - new Date(currentEntry.created_at).getTime()) / 60000);

      currentEntry.status = "called";
      currentEntry.called_at = calledAt.toISOString();
      currentEntry.actual_wait_minutes = waitTime;

      const remainingWaiting = queue.filter(e => e.status === "waiting").sort((a, b) => a.position - b.position);
      remainingWaiting.forEach((e, i) => {
        e.position = i + 1;
      });

      return NextResponse.json({
        success: true,
        called: currentEntry,
        remainingInQueue: remainingWaiting.length,
      });
    }

    if (action === "complete" && entryId) {
      const entry = queue.find(e => e.id === entryId);
      if (entry) {
        entry.status = "served";
        entry.served_at = new Date().toISOString();

        const stats = getStats(user.id);
        stats.totalServed += 1;
        stats.totalWaitTime += entry.actual_wait_minutes || 0;
        setStats(user.id, stats);
      }

      return NextResponse.json({ success: true });
    }

    if (action === "cancel" && entryId) {
      const entryIndex = queue.findIndex(e => e.id === entryId);
      if (entryIndex !== -1) {
        const entry = queue[entryIndex];
        entry.status = "cancelled";

        const remainingWaiting = queue.filter(e => e.status === "waiting").sort((a, b) => a.position - b.position);
        remainingWaiting.forEach((e, i) => {
          e.position = i + 1;
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("Queue PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
