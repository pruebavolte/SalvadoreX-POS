"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DollarSign,
    Users,
    Package,
    TrendingUp,
    ShoppingCart,
    AlertTriangle,
    ArrowRight,
    Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getProducts, getCustomers, getSales } from "@/lib/services/supabase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrentUser } from "@/hooks/use-current-user";

export default function DashboardPage() {
    const { user, loading: userLoading } = useCurrentUser();
    const [stats, setStats] = useState({
        totalSales: 0,
        totalRevenue: 0,
        totalProducts: 0,
        lowStockProducts: 0,
        totalCustomers: 0,
        customersWithCredit: 0,
    });
    const [salesData, setSalesData] = useState<any[]>([]);
    const [recentSales, setRecentSales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            // Wait for user to be loaded
            if (userLoading || !user) {
                return;
            }

            try {
                // Fetch all data in parallel (including digital menu orders)
                // Filter by user_id to only show current user's data
                const [productsRes, customersRes, salesRes, ordersRes] = await Promise.all([
                    getProducts({ user_id: user.id }, 1, 1000),
                    getCustomers({}, 1, 1000), // Customers are shared globally
                    getSales({ user_id: user.id }, 1, 100),
                    // Fetch orders from digital menu via API (already filtered by user_id)
                    fetch('/api/dashboard/orders').then(res => res.json()),
                ]);

                const orders = ordersRes.orders || [];

                // Calculate stats from both POS sales and digital menu orders
                const posRevenue = salesRes.data.reduce((sum, sale) => sum + sale.total, 0);
                const ordersRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
                const totalRevenue = posRevenue + ordersRevenue;

                const lowStock = productsRes.data.filter(
                    (p) => p.stock > 0 && p.stock <= p.min_stock
                ).length;
                const customersWithCredit = customersRes.data.filter((c) => c.credit_balance > 0).length;

                setStats({
                    totalSales: salesRes.total + orders.length,
                    totalRevenue,
                    totalProducts: productsRes.total,
                    lowStockProducts: lowStock,
                    totalCustomers: customersRes.total,
                    customersWithCredit,
                });

                // Process real sales data for chart - group by day
                const last7Days: { [key: string]: { day: string; date: string; revenue: number; count: number } } = {};

                // Initialize last 7 days
                for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayName = date.toLocaleDateString("es-ES", { weekday: "short" });
                    last7Days[dateStr] = { day: dayName, date: dateStr, revenue: 0, count: 0 };
                }

                // Aggregate POS sales by day
                salesRes.data.forEach((sale) => {
                    const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
                    if (last7Days[saleDate]) {
                        last7Days[saleDate].revenue += sale.total;
                        last7Days[saleDate].count += 1;
                    }
                });

                // Aggregate digital menu orders by day
                orders.forEach((order: any) => {
                    const orderDate = new Date(order.created_at).toISOString().split('T')[0];
                    if (last7Days[orderDate]) {
                        last7Days[orderDate].revenue += order.total || 0;
                        last7Days[orderDate].count += 1;
                    }
                });

                // Convert to array for chart
                const salesByDay = Object.values(last7Days).map(item => ({
                    day: item.day,
                    revenue: Math.round(item.revenue * 100) / 100,
                    sales: item.count,
                }));

                setSalesData(salesByDay);

                // Combine and sort recent sales from both sources
                const combinedSales = [
                    ...salesRes.data.map((sale) => ({
                        id: sale.id,
                        sale_number: sale.sale_number,
                        total: sale.total,
                        payment_method: sale.payment_method,
                        status: sale.status,
                        created_at: sale.created_at,
                        source: 'pos' as const,
                    })),
                    ...orders.map((order: any) => ({
                        id: order.id,
                        sale_number: `MD-${order.id.slice(0, 6)}`,
                        total: order.total || 0,
                        payment_method: order.payment_method || 'pending',
                        status: order.status || 'PENDING',
                        created_at: order.created_at,
                        source: 'digital_menu' as const,
                    })),
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                // Get recent sales (top 5)
                setRecentSales(combinedSales.slice(0, 5));
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, userLoading]);

    if (loading || userLoading) {
        return (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No hay usuario autenticado</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-8">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">
                        Bienvenido a tu sistema de Punto de Venta SalvadorX
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ventas Totales</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className="text-green-600">{stats.totalSales} ventas</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Productos</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalProducts}</div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <AlertTriangle className="h-3 w-3 text-orange-600" />
                                <span className="text-orange-600">{stats.lowStockProducts} stock bajo</span>
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.customersWithCredit} con crédito
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                ${stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : "0.00"}
                            </div>
                            <p className="text-xs text-muted-foreground">Por venta</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Link href="/dashboard/pos">
                        <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <ShoppingCart className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">Nueva Venta</p>
                                        <p className="text-xs text-muted-foreground">Punto de venta</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/inventory">
                        <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <Package className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">Inventario</p>
                                        <p className="text-xs text-muted-foreground">Gestionar productos</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/menu-digital">
                        <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <Sparkles className="h-6 w-6 text-amber-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">Menu Digital</p>
                                        <p className="text-xs text-muted-foreground">Digitalizar con IA</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/customers">
                        <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-green-500/10 rounded-lg">
                                        <Users className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">Clientes</p>
                                        <p className="text-xs text-muted-foreground">Base de clientes</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/dashboard/reports">
                        <Card className="cursor-pointer hover:bg-accent transition-colors">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-purple-500/10 rounded-lg">
                                        <TrendingUp className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold">Reportes</p>
                                        <p className="text-xs text-muted-foreground">Analíticas</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Charts */}
                <div className="grid gap-4 lg:grid-cols-7">
                    <Card className="lg:col-span-4">
                        <CardHeader>
                            <CardTitle>Ventas de la Semana</CardTitle>
                            <CardDescription>
                                Ingresos diarios de los últimos 7 días
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `$${value}`} />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Ventas Recientes</CardTitle>
                            <CardDescription>
                                Últimas {recentSales.length} transacciones
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {recentSales.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No hay ventas recientes
                                    </p>
                                ) : (
                                    recentSales.map((sale) => (
                                        <div key={sale.id} className="flex items-center justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-medium">
                                                        {sale.sale_number || `#${sale.id.slice(0, 8)}`}
                                                    </p>
                                                    {sale.source === 'digital_menu' && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Menú
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(sale.created_at).toLocaleDateString("es-ES", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })}
                                                </p>
                                            </div>
                                            <div className="text-right space-y-1">
                                                <p className="font-semibold">${sale.total.toFixed(2)}</p>
                                                <Badge
                                                    variant={sale.status === "completed" || sale.status === "COMPLETED" ? "default" : "outline"}
                                                    className="text-xs"
                                                >
                                                    {sale.payment_method === "cash" ? "Efectivo" :
                                                     sale.payment_method === "card" ? "Tarjeta" :
                                                     sale.payment_method === "transfer" ? "Transfer" :
                                                     sale.payment_method === "pending" ? "Pendiente" :
                                                     sale.payment_method}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
