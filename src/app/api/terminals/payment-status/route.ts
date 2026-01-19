import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

// Validation schema for payment status request
const paymentStatusSchema = z.object({
  provider: z.enum(["mercadopago", "clip"]),
  paymentIntentId: z.string().optional(),
  intentId: z.string().optional(),
  deviceId: z.string().optional(),
  accessToken: z.string().optional(),
});

// Track demo poll counts for simulated responses (in-memory for this instance)
const demoPollCounts: Record<string, number> = {};

// Check if this is demo mode (no real API tokens)
function isDemoMode(accessToken?: string, paymentIntentId?: string): boolean {
  if (!accessToken || accessToken.length < 20 || accessToken.startsWith("demo_")) {
    return true;
  }
  if (paymentIntentId?.startsWith("demo_")) {
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body with Zod
    const validationResult = paymentStatusSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: "Datos de solicitud inválidos",
          message: validationResult.error.errors.map(e => e.message).join(", "),
          status: "error",
        },
        { status: 400 }
      );
    }

    const { provider, paymentIntentId, intentId, accessToken } = validationResult.data;
    const trackingId = intentId || paymentIntentId || "unknown";

    // Demo mode: simulate payment approval after 2-3 polls
    if (isDemoMode(accessToken, paymentIntentId)) {
      demoPollCounts[trackingId] = (demoPollCounts[trackingId] || 0) + 1;
      const pollCount = demoPollCounts[trackingId];
      
      // Approve after 2-3 polls (simulates customer completing payment)
      if (pollCount >= 2) {
        delete demoPollCounts[trackingId];
        const authCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        return NextResponse.json({
          status: "approved",
          paymentId: `demo_pay_${Date.now()}`,
          authorizationCode: authCode,
          demo: true,
          message: "Modo demo: Pago aprobado exitosamente",
        });
      }
      
      // Still processing
      return NextResponse.json({
        status: "processing",
        demo: true,
        message: `Modo demo: Esperando pago... (intento ${pollCount})`,
      });
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Payment Intent ID requerido", status: "error" },
        { status: 400 }
      );
    }

    if (provider === "mercadopago") {
      const response = await fetch(
        `${MERCADOPAGO_API_BASE}/payment-intents/${paymentIntentId}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: "Error al verificar estado del pago",
            message: errorData.message || response.statusText,
            status: "error",
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      let status: "pending" | "processing" | "approved" | "rejected" | "cancelled" | "error" = "pending";
      
      if (data.state === "FINISHED") {
        const paymentState = data.payment?.state?.toLowerCase();
        if (paymentState === "approved") {
          status = "approved";
        } else if (paymentState === "rejected") {
          status = "rejected";
        } else if (paymentState === "cancelled") {
          status = "cancelled";
        }
      } else if (data.state === "PROCESSING" || data.state === "OPEN") {
        status = "processing";
      } else if (data.state === "CANCELLED") {
        status = "cancelled";
      } else if (data.state === "ERROR") {
        status = "error";
      }

      return NextResponse.json({
        status,
        paymentId: data.payment?.id,
        authorizationCode: data.payment?.authorization_code,
        errorMessage: data.payment?.status_detail,
        rawState: data.state,
      });

    } else if (provider === "clip") {
      return NextResponse.json({
        status: "processing",
        message: "Verificando estado con Clip...",
      });
    }

    return NextResponse.json(
      { error: "Provider no soportado", status: "error" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", status: "error" },
      { status: 500 }
    );
  }
}
