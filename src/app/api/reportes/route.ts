import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function generateDailySalesData(days: number = 30) {
  const data = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseAmount = 5000;
    const variation = Math.floor(Math.random() * 6000) - 3000;
    const dayOfWeek = date.getDay();
    const weekendBoost = (dayOfWeek === 0 || dayOfWeek === 6) ? 1500 : 0;
    const amount = Math.max(2000, Math.min(8000, baseAmount + variation + weekendBoost));
    
    const avgTicket = 85 + Math.floor(Math.random() * 40);
    const transactions = Math.floor(amount / avgTicket);
    
    data.push({
      fecha: date.toISOString().split('T')[0],
      dia: date.toLocaleDateString("es-MX", { weekday: "short" }),
      ventas: Math.round(amount * 100) / 100,
      transacciones: transactions,
      ticketPromedio: Math.round((amount / transactions) * 100) / 100,
    });
  }
  
  return data;
}

function generateTopProducts(limit: number = 10) {
  const products = [
    { id: 1, nombre: "Hamburguesa Clásica", categoria: "Hamburguesas", precio: 89.00 },
    { id: 2, nombre: "Tacos al Pastor (3 pzs)", categoria: "Tacos", precio: 65.00 },
    { id: 3, nombre: "Pizza Pepperoni Grande", categoria: "Pizzas", precio: 189.00 },
    { id: 4, nombre: "Refresco 600ml", categoria: "Bebidas", precio: 25.00 },
    { id: 5, nombre: "Papas Francesas", categoria: "Acompañamientos", precio: 45.00 },
    { id: 6, nombre: "Alitas BBQ (10 pzs)", categoria: "Entradas", precio: 149.00 },
    { id: 7, nombre: "Quesadilla de Pollo", categoria: "Quesadillas", precio: 75.00 },
    { id: 8, nombre: "Agua Natural 500ml", categoria: "Bebidas", precio: 18.00 },
    { id: 9, nombre: "Torta de Milanesa", categoria: "Tortas", precio: 85.00 },
    { id: 10, nombre: "Helado de Vainilla", categoria: "Postres", precio: 35.00 },
    { id: 11, nombre: "Hot Dog Especial", categoria: "Hot Dogs", precio: 55.00 },
    { id: 12, nombre: "Ensalada César", categoria: "Ensaladas", precio: 95.00 },
    { id: 13, nombre: "Burrito de Carne", categoria: "Burritos", precio: 99.00 },
    { id: 14, nombre: "Nachos con Queso", categoria: "Entradas", precio: 69.00 },
    { id: 15, nombre: "Café Americano", categoria: "Bebidas", precio: 35.00 },
  ];

  const productsWithSales = products.map((product, index) => {
    const baseSales = 150 - (index * 8);
    const variation = Math.floor(Math.random() * 30) - 15;
    const cantidadVendida = Math.max(20, baseSales + variation);
    const ingresos = cantidadVendida * product.precio;
    
    return {
      ...product,
      cantidadVendida,
      ingresos: Math.round(ingresos * 100) / 100,
    };
  });

  return productsWithSales
    .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
    .slice(0, limit);
}

function generatePaymentMethodsData() {
  const totalVentas = 100;
  
  return [
    {
      metodo: "Efectivo",
      porcentaje: 60,
      cantidad: 180,
      monto: 45600.00,
      color: "#22c55e",
    },
    {
      metodo: "Tarjeta",
      porcentaje: 25,
      cantidad: 75,
      monto: 19000.00,
      color: "#3b82f6",
    },
    {
      metodo: "Transferencia",
      porcentaje: 10,
      cantidad: 30,
      monto: 7600.00,
      color: "#a855f7",
    },
    {
      metodo: "Crédito",
      porcentaje: 5,
      cantidad: 15,
      monto: 3800.00,
      color: "#f59e0b",
    },
  ];
}

function generateCortesHistory() {
  const cortes = [];
  const today = new Date();
  
  for (let i = 1; i <= 5; i++) {
    const fecha = new Date(today);
    fecha.setDate(fecha.getDate() - i);
    
    const fondoInicial = 2000;
    const ventasEfectivo = 3500 + Math.floor(Math.random() * 2000);
    const ventasTarjeta = 1500 + Math.floor(Math.random() * 1000);
    const ventasTransferencia = 500 + Math.floor(Math.random() * 500);
    const ventasCredito = 200 + Math.floor(Math.random() * 300);
    const retiros = Math.floor(Math.random() * 500);
    const depositos = Math.floor(Math.random() * 300);
    
    const esperado = fondoInicial + ventasEfectivo + depositos - retiros;
    const contado = esperado + (Math.random() > 0.7 ? Math.floor(Math.random() * 50) - 25 : 0);
    const diferencia = contado - esperado;
    
    cortes.push({
      id: `corte-${i}`,
      fecha: fecha.toISOString(),
      fechaFormateada: fecha.toLocaleDateString("es-MX", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      horaInicio: "08:00",
      horaCierre: "22:00",
      fondoInicial: fondoInicial,
      ventasEfectivo: ventasEfectivo,
      ventasTarjeta: ventasTarjeta,
      ventasTransferencia: ventasTransferencia,
      ventasCredito: ventasCredito,
      totalVentas: ventasEfectivo + ventasTarjeta + ventasTransferencia + ventasCredito,
      retiros: retiros,
      depositos: depositos,
      efectivoEsperado: Math.round(esperado * 100) / 100,
      efectivoContado: Math.round(contado * 100) / 100,
      diferencia: Math.round(diferencia * 100) / 100,
      status: diferencia === 0 ? "cuadrado" : diferencia > 0 ? "sobrante" : "faltante",
      usuario: "Cajero " + (Math.floor(Math.random() * 3) + 1),
    });
  }
  
  return cortes;
}

function calculateKPIs(dailySales: any[], topProducts: any[]) {
  const totalVentas = dailySales.reduce((sum, day) => sum + day.ventas, 0);
  const totalTransacciones = dailySales.reduce((sum, day) => sum + day.transacciones, 0);
  const ticketPromedio = totalTransacciones > 0 ? totalVentas / totalTransacciones : 0;
  const productoMasVendido = topProducts.length > 0 ? topProducts[0].nombre : "N/A";
  
  const last7Days = dailySales.slice(-7);
  const previous7Days = dailySales.slice(-14, -7);
  
  const ventasUltimos7 = last7Days.reduce((sum, day) => sum + day.ventas, 0);
  const ventasAnteriores7 = previous7Days.reduce((sum, day) => sum + day.ventas, 0);
  const cambioVentas = ventasAnteriores7 > 0 
    ? ((ventasUltimos7 - ventasAnteriores7) / ventasAnteriores7 * 100).toFixed(1)
    : "0";
  
  return {
    totalVentas: Math.round(totalVentas * 100) / 100,
    totalTransacciones,
    ticketPromedio: Math.round(ticketPromedio * 100) / 100,
    productoMasVendido,
    cambioVentas: parseFloat(cambioVentas),
    ventasDiarias: Math.round((totalVentas / dailySales.length) * 100) / 100,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const limit = parseInt(searchParams.get("limit") || "10");

    switch (tipo) {
      case "ventas_diarias": {
        const days = 30;
        const dailySales = generateDailySalesData(days);
        
        let filteredSales = dailySales;
        if (desde && hasta) {
          filteredSales = dailySales.filter(
            (sale) => sale.fecha >= desde && sale.fecha <= hasta
          );
        }
        
        return NextResponse.json({
          success: true,
          data: filteredSales,
        });
      }

      case "productos_mas_vendidos": {
        const topProducts = generateTopProducts(limit);
        return NextResponse.json({
          success: true,
          data: topProducts,
        });
      }

      case "metodos_pago": {
        const paymentMethods = generatePaymentMethodsData();
        return NextResponse.json({
          success: true,
          data: paymentMethods,
        });
      }

      case "cortes": {
        const cortes = generateCortesHistory();
        return NextResponse.json({
          success: true,
          data: cortes,
        });
      }

      case "resumen":
      default: {
        const dailySales = generateDailySalesData(30);
        const topProducts = generateTopProducts(10);
        const paymentMethods = generatePaymentMethodsData();
        const cortes = generateCortesHistory();
        const kpis = calculateKPIs(dailySales, topProducts);

        return NextResponse.json({
          success: true,
          data: {
            kpis,
            ventasDiarias: dailySales,
            productosMasVendidos: topProducts,
            metodosPago: paymentMethods,
            historialCortes: cortes,
          },
        });
      }
    }
  } catch (error: any) {
    console.error("Reportes API error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
