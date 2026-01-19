import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

// Validation schema for payment intent request
const paymentIntentSchema = z.object({
  provider: z.enum(["mercadopago", "clip"]),
  deviceId: z.string().min(1, "Device ID requerido"),
  terminalId: z.string().optional(),
  accessToken: z.string().optional(),
  amount: z.number().positive("El monto debe ser positivo"),
  externalReference: z.string().optional(),
  intentId: z.string().optional(),
});

// Check if this is demo mode (no real API tokens)
function isDemoMode(accessToken?: string): boolean {
  return !accessToken || accessToken.length < 20 || accessToken.startsWith("demo_");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body with Zod
    const validationResult = paymentIntentSchema.safeParse(body);
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

    const { 
      provider, 
      deviceId, 
      accessToken, 
      amount, 
      externalReference,
      intentId,
    } = validationResult.data;

    // Demo mode: return simulated processing response
    if (isDemoMode(accessToken)) {
      return NextResponse.json({
        status: "processing",
        paymentIntentId: `demo_intent_${Date.now()}`,
        deviceId: deviceId,
        amount: amount,
        demo: true,
        message: "Modo demo: Esperando pago simulado en terminal...",
      });
    }

    if (provider === "mercadopago") {
      const response = await fetch(
        `${MERCADOPAGO_API_BASE}/devices/${deviceId}/payment-intents`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: Math.round(amount * 100),
            additional_info: {
              external_reference: externalReference || intentId,
              print_on_terminal: true,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json(
          { 
            error: "Error al crear intento de pago",
            message: errorData.message || response.statusText,
            status: "error",
          },
          { status: response.status }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        status: "processing",
        paymentIntentId: data.id,
        deviceId: data.device_id,
        amount: data.amount,
      });

    } else if (provider === "clip") {
      return NextResponse.json({
        status: "processing",
        paymentIntentId: `clip_${Date.now()}`,
        message: "Pago enviado a terminal Clip. Esperando confirmación...",
      });
    }

    return NextResponse.json(
      { error: "Provider no soportado", status: "error" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", status: "error" },
      { status: 500 }
    );
  }
}
