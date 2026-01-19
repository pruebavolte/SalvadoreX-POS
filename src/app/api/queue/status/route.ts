import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface QueueEntry {
  id: string;
  user_id: string;
  queue_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  position: number;
  created_at: string;
  called_at: string | null;
  estimated_wait_minutes: number;
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

function getStats(userId: string) {
  if (!global.queueStats) {
    global.queueStats = new Map();
  }
  return global.queueStats.get(userId) || { totalServed: 0, totalWaitTime: 0 };
}

export async function GET(request: NextRequest) {
  try {
    const entryId = request.nextUrl.searchParams.get("entryId");
    const phone = request.nextUrl.searchParams.get("phone");
    const userId = request.nextUrl.searchParams.get("userId");

    if (!entryId && !phone) {
      return NextResponse.json({ error: "entryId o phone requerido" }, { status: 400 });
    }

    let entry: QueueEntry | undefined;

    if (entryId) {
      for (const [uid, queue] of global.memoryQueue?.entries() || []) {
        entry = queue.find(e => e.id === entryId);
        if (entry) break;
      }
    } else if (phone && userId) {
      const queue = getQueueForUser(userId);
      entry = queue
        .filter(e => e.customer_phone === phone && ["waiting", "called"].includes(e.status))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
    }

    if (!entry) {
      return NextResponse.json({ 
        found: false,
        message: "No se encontró tu lugar en la fila" 
      });
    }

    const stats = getStats(entry.user_id);
    const avgWait = stats.totalServed > 0 ? Math.round(stats.totalWaitTime / stats.totalServed) : 3;
    const estimatedWait = Math.round(entry.position * avgWait);

    return NextResponse.json({
      found: true,
      entry: {
        id: entry.id,
        queueNumber: entry.queue_number,
        position: entry.position,
        status: entry.status,
        estimatedWaitMinutes: estimatedWait,
        createdAt: entry.created_at,
        calledAt: entry.called_at,
      },
    });
  } catch (error: any) {
    console.error("Queue status error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
