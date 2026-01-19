"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { getSales } from "@/lib/services/supabase";
import { supabase } from "@/lib/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function ReportsPage() {
  const { user, loading: userLoading } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalSales: 0,
    averageTicket: 0,
    previousRevenue: 0,
    previousSales: 0,
  });
  const [salesByDayData, setSalesByDayData] = useState<any[]>([]);
  const [topProductsData, setTopProductsData] = useState<any[]>([]);
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<any[]>([]);
  const [salesByCategoryData, setSalesByCategoryData] = useState<any[]>([]);

  useEffect(() => {
    const fetchReportsData = async () => {
      // Wait for user to be loaded
      if (userLoading || !user) {
        return;
      }

      try {
        // Get dates for last 7 days and previous 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(today.getDate() - 14);

        // Fetch current period sales (filtered by user_id)
        const currentSalesRes = await getSales({
          user_id: user.id,
          start_date: sevenDaysAgo.toISOString(),
          end_date: today.toISOString(),
        }, 1, 1000);

        // Fetch previous period sales for comparison (filtered by user_id)
        const previousSalesRes = await getSales({
          user_id: user.id,
          start_date: fourteenDaysAgo.toISOString(),
          end_date: sevenDaysAgo.toISOString(),
        }, 1, 1000);

        // Calculate stats
        const totalRevenue = currentSalesRes.data.reduce((sum, sale) => sum + sale.total, 0);
        const totalSales = currentSalesRes.data.length;
        const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
        const previousRevenue = previousSalesRes.data.reduce((sum, sale) => sum + sale.total, 0);
        const previousSales = previousSalesRes.data.length;

        setStats({
          totalRevenue,
          totalSales,
          averageTicket,
          previousRevenue,
          previousSales,
        });

        // Process sales by day
        const last7Days: { [key: string]: { date: string; day: string; sales: number; revenue: number } } = {};
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const dayName = date.toLocaleDateString("es-ES", { weekday: "short" });
          last7Days[dateStr] = { date: dateStr, day: dayName.charAt(0).toUpperCase() + dayName.slice(1), sales: 0, revenue: 0 };
        }

        currentSalesRes.data.forEach((sale) => {
          const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
          if (last7Days[saleDate]) {
            last7Days[saleDate].sales += 1;
            last7Days[saleDate].revenue += sale.total;
          }
        });

        setSalesByDayData(Object.values(last7Days).map(item => ({
          date: item.day,
          sales: item.sales,
          revenue: Math.round(item.revenue * 100) / 100,
        })));

        // Process sales by payment method
        const paymentMethods: { [key: string]: { count: number; amount: number } } = {};
        currentSalesRes.data.forEach((sale) => {
          const method = sale.payment_method || 'other';
          if (!paymentMethods[method]) {
            paymentMethods[method] = { count: 0, amount: 0 };
          }
          paymentMethods[method].count += 1;
          paymentMethods[method].amount += sale.total;
        });

        const methodColors: { [key: string]: string } = {
          cash: "#22c55e",
          card: "#3b82f6",
          transfer: "#a855f7",
          credit: "#ef4444",
          other: "#6b7280",
        };

        const methodNames: { [key: string]: string } = {
          cash: "Efectivo",
          card: "Tarjeta",
          transfer: "Transferencia",
          credit: "Crédito",
          other: "Otro",
        };

        const paymentData = Object.entries(paymentMethods).map(([method, data]) => ({
          name: methodNames[method] || method,
          value: totalSales > 0 ? Math.round((data.count / totalSales) * 100) : 0,
          amount: data.amount,
          count: data.count,
          color: methodColors[method] || "#6b7280",
        }));

        setSalesByPaymentMethod(paymentData);

        // Fetch top products from sale_items (filtered by user's sales)
        const { data: saleItemsData } = await supabase
          .from("sale_items")
          .select(`
            quantity,
            subtotal,
            sale_id,
            product:products(name, category:categories(name)),
            sale:sales!inner(user_id)
          `)
          .eq("sale.user_id", user.id)
          .gte("sale.created_at", sevenDaysAgo.toISOString());

        if (saleItemsData) {
          // Aggregate by product
          const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
          const categorySales: { [key: string]: number } = {};

          saleItemsData.forEach((item: any) => {
            const productName = item.product?.name || "Producto desconocido";
            const categoryName = item.product?.category?.name || "Sin categoría";

            if (!productSales[productName]) {
              productSales[productName] = { name: productName, quantity: 0, revenue: 0 };
            }
            productSales[productName].quantity += item.quantity;
            productSales[productName].revenue += item.subtotal;

            if (!categorySales[categoryName]) {
              categorySales[categoryName] = 0;
            }
            categorySales[categoryName] += item.subtotal;
          });

          // Get top 5 products
          const topProducts = Object.values(productSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
          setTopProductsData(topProducts);

          // Get category data
          const categoryData = Object.entries(categorySales)
            .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
            .sort((a, b) => b.amount - a.amount);
          setSalesByCategoryData(categoryData);
        }

      } catch (error) {
        console.error("Error fetching reports data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [user, userLoading]);

  // Calculate percentage changes
  const revenueChange = stats.previousRevenue > 0
    ? ((stats.totalRevenue - stats.previousRevenue) / stats.previousRevenue * 100).toFixed(1)
    : "0";
  const salesChange = stats.previousSales > 0
    ? ((stats.totalSales - stats.previousSales) / stats.previousSales * 100).toFixed(1)
    : "0";
  const previousAvgTicket = stats.previousSales > 0 ? stats.previousRevenue / stats.previousSales : 0;
  const ticketChange = previousAvgTicket > 0
    ? ((stats.averageTicket - previousAvgTicket) / previousAvgTicket * 100).toFixed(1)
    : "0";

  if (loading || userLoading) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-center h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">
        <div className="flex items-center justify-center h-[400px]">
          <p className="text-muted-foreground">No hay usuario autenticado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Reportes y Analíticas
            </h1>
            <p className="text-muted-foreground mt-2">
              Analiza el rendimiento de tu negocio
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Últimos 7 días
            </Button>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas Totales
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {parseFloat(revenueChange) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={parseFloat(revenueChange) >= 0 ? "text-green-600" : "text-red-600"}>
                  {parseFloat(revenueChange) >= 0 ? "+" : ""}{revenueChange}%
                </span> vs semana anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Número de Ventas
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSales}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {parseFloat(salesChange) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={parseFloat(salesChange) >= 0 ? "text-green-600" : "text-red-600"}>
                  {parseFloat(salesChange) >= 0 ? "+" : ""}{salesChange}%
                </span> vs semana anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ticket Promedio
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.averageTicket.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {parseFloat(ticketChange) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )}
                <span className={parseFloat(ticketChange) >= 0 ? "text-green-600" : "text-red-600"}>
                  {parseFloat(ticketChange) >= 0 ? "+" : ""}{ticketChange}%
                </span> vs semana anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ventas Anteriores
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.previousSales}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${stats.previousRevenue.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} semana anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Tabs */}
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Ventas</TabsTrigger>
            <TabsTrigger value="products">Productos</TabsTrigger>
            <TabsTrigger value="payments">Pagos</TabsTrigger>
            <TabsTrigger value="categories">Categorías</TabsTrigger>
          </TabsList>

          {/* Sales Tab */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Día</CardTitle>
                  <CardDescription>
                    Número de ventas realizadas en los últimos 7 días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={salesByDayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sales" fill="#3b82f6" name="Ventas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Ingresos por Día</CardTitle>
                  <CardDescription>
                    Ingresos totales en los últimos 7 días
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={salesByDayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Ingresos"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Productos Más Vendidos</CardTitle>
                <CardDescription>
                  Top 5 productos con mayor volumen de ventas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill="#8b5cf6" name="Cantidad Vendida" />
                    <Bar dataKey="revenue" fill="#22c55e" name="Ingresos ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Métodos de Pago</CardTitle>
                  <CardDescription>
                    Porcentaje de ventas por método de pago
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={salesByPaymentMethod}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {salesByPaymentMethod.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Resumen de Métodos de Pago</CardTitle>
                  <CardDescription>
                    Detalles por método de pago esta semana
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesByPaymentMethod.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay datos de pagos
                      </p>
                    ) : (
                      salesByPaymentMethod.map((method) => (
                        <div key={method.name} className="flex items-center justify-between p-4 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: method.color }}
                            />
                            <div>
                              <p className="font-medium">{method.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {method.value}% del total
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg">
                              ${method.amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {method.count} ventas
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ventas por Categoría</CardTitle>
                <CardDescription>
                  Ingresos totales por categoría de productos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={salesByCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend />
                    <Bar dataKey="amount" fill="#f59e0b" name="Ventas ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
