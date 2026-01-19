import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  getSession,
  joinSession,
  endSession,
  cleanupExpiredSessions,
  enableRemoteControl,
  disableRemoteControl,
  checkRateLimit,
} from "@/lib/webrtc/session-store";

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, code, sessionId, secret } = body;
    const clientIp = getClientIp(request);

    cleanupExpiredSessions();

    switch (action) {
      case "create": {
        const session = createSession(clientIp || undefined);

        return NextResponse.json({
          success: true,
          session: {
            id: session.id,
            code: session.code,
            status: session.status,
            expiresAt: session.expiresAt,
            hostSecret: session.hostSecret,
            remoteControlEnabled: session.remoteControlEnabled,
          },
        });
      }

      case "join": {
        if (!code) {
          return NextResponse.json(
            { success: false, error: "Session code is required" },
            { status: 400 }
          );
        }

        if (clientIp) {
          const rateLimit = checkRateLimit(clientIp);
          if (!rateLimit.allowed) {
            return NextResponse.json(
              { 
                success: false, 
                error: `Too many join attempts. Please try again in ${rateLimit.retryAfter} seconds.` 
              },
              { 
                status: 429,
                headers: { "Retry-After": String(rateLimit.retryAfter) }
              }
            );
          }
        }

        const session = joinSession(code, clientIp || undefined);

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found or already in use" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          session: {
            id: session.id,
            code: session.code,
            status: session.status,
            expiresAt: session.expiresAt,
            viewerSecret: session.viewerSecret,
            remoteControlEnabled: session.remoteControlEnabled,
          },
        });
      }

      case "end": {
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        const success = endSession(sessionId);

        if (!success) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Session ended successfully",
        });
      }

      case "status": {
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Session ID is required" },
            { status: 400 }
          );
        }

        const session = getSession(sessionId);

        if (!session) {
          return NextResponse.json(
            { success: false, error: "Session not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          session: {
            id: session.id,
            code: session.code,
            status: session.status,
            expiresAt: session.expiresAt,
            remoteControlEnabled: session.remoteControlEnabled,
          },
        });
      }

      case "enable-remote-control": {
        if (!sessionId || !secret) {
          return NextResponse.json(
            { success: false, error: "Session ID and host secret are required" },
            { status: 400 }
          );
        }

        const success = enableRemoteControl(sessionId, secret);

        if (!success) {
          return NextResponse.json(
            { success: false, error: "Session not found or invalid secret" },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Remote control enabled",
        });
      }

      case "disable-remote-control": {
        if (!sessionId || !secret) {
          return NextResponse.json(
            { success: false, error: "Session ID and host secret are required" },
            { status: 400 }
          );
        }

        const success = disableRemoteControl(sessionId, secret);

        if (!success) {
          return NextResponse.json(
            { success: false, error: "Session not found or invalid secret" },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          message: "Remote control disabled",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Support] Session error:", error);
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

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    cleanupExpiredSessions();

    const session = getSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
        expiresAt: session.expiresAt,
        remoteControlEnabled: session.remoteControlEnabled,
      },
    });
  } catch (error) {
    console.error("[Support] Session GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
