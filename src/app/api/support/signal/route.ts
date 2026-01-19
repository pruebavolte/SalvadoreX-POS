import { NextRequest, NextResponse } from "next/server";
import type { Signal } from "@/lib/webrtc/types";
import {
  validateSignalRequest,
  addSignal,
  getSignals,
  getSession,
  isRemoteControlEnabled,
} from "@/lib/webrtc/session-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, signal, secret } = body;

    if (!sessionId || !signal || !secret) {
      return NextResponse.json(
        { success: false, error: "Session ID, signal, and secret are required" },
        { status: 400 }
      );
    }

    if (!signal.from || !signal.type) {
      return NextResponse.json(
        { success: false, error: "Signal must have from and type properties" },
        { status: 400 }
      );
    }

    const validation = validateSignalRequest(sessionId, signal.from, secret);
    
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      );
    }

    const newSignal: Signal = {
      from: signal.from,
      type: signal.type,
      data: signal.data,
      timestamp: signal.timestamp || new Date().toISOString(),
    };

    const success = addSignal(sessionId, newSignal);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to add signal" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Signal added successfully",
    });
  } catch (error) {
    console.error("[Support] Signal POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    const role = searchParams.get("role") as "host" | "viewer" | null;
    const secret = searchParams.get("secret");
    const after = searchParams.get("after");

    if (!sessionId || !role || !secret) {
      return NextResponse.json(
        { success: false, error: "Session ID, role, and secret are required" },
        { status: 400 }
      );
    }

    const validation = validateSignalRequest(sessionId, role, secret);
    
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      );
    }

    const session = getSession(sessionId);
    const signals = getSignals(sessionId, role, after || undefined);

    return NextResponse.json({
      success: true,
      signals,
      sessionStatus: session?.status || "unknown",
      remoteControlEnabled: isRemoteControlEnabled(sessionId),
    });
  } catch (error) {
    console.error("[Support] Signal GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
