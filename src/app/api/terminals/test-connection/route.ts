import { NextRequest, NextResponse } from "next/server";

const MERCADOPAGO_API_BASE = "https://api.mercadopago.com/point/integration-api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, deviceId, accessToken } = body;

    if (!provider || !accessToken) {
      return NextResponse.json(
        { connected: false, error: "Faltan parámetros requeridos" },
        { status: 400 }
      );
    }

    if (provider === "mercadopago") {
      const response = await fetch(`${MERCADOPAGO_API_BASE}/devices?offset=0&limit=50`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        return NextResponse.json({
          connected: false,
          error: "Token de acceso inválido o expirado",
        });
      }

      const data = await response.json();
      const devices = data.devices || [];
      
      if (deviceId) {
        const deviceFound = devices.find((d: { id: string }) => d.id === deviceId);
        if (!deviceFound) {
          return NextResponse.json({
            connected: false,
            error: "Dispositivo no encontrado. Verifica el ID del dispositivo.",
          });
        }
      }

      return NextResponse.json({
        connected: true,
        devicesCount: devices.length,
        message: "Conexión exitosa con Mercado Pago",
      });

    } else if (provider === "clip") {
      return NextResponse.json({
        connected: true,
        message: "Configuración de Clip guardada. La conexión se verificará al procesar un pago.",
      });
    }

    return NextResponse.json(
      { connected: false, error: "Provider no soportado" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error testing terminal connection:", error);
    return NextResponse.json(
      { connected: false, error: "Error de conexión" },
      { status: 500 }
    );
  }
}
