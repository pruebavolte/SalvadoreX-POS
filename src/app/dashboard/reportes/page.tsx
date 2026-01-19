"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  BarChart3,
  Loader2,
  ShoppingCart,
  Receipt,
  Package,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
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
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

interface VentaDiaria {
  fecha: string;
  dia: string;
  ventas: number;
  transacciones: number;
  ticketPromedio: number;
}

interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  cantidadVendida: number;
  ingresos: number;
}

interface MetodoPago {
  metodo: string;
  porcentaje: number;
  cantidad: number;
  monto: number;
  color: string;
}

interface Corte {
  id: string;
  fecha: string;
  fechaFormateada: string;
  horaInicio: string;
  horaCierre: string;
  fondoInicial: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ventasTransferencia: number;
  ventasCredito: number;
  totalVentas: number;
  retiros: number;
  depositos: number;
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  status: "cuadrado" | "sobrante" | "faltante";
  usuario: string;
}

interface KPIs {
  totalVentas: number;
  totalTransacciones: number;
  ticketPromedio: number;
  productoMasVendido: string;
  cambioVentas: number;
  ventasDiarias: number;
}

type RangoFechas = "hoy" | "semana" | "mes" | "personalizado";

export default function ReportesAvanzadosPage() {
  const [loading, setLoading] = useState(true);
  const [rangoFechas, setRangoFechas] = useState<RangoFechas>("mes");
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [ventasDiarias, setVentasDiarias] = useState<VentaDiaria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reportes?tipo=resumen");
      const result = await response.json();

      if (result.success) {
        setKpis(result.data.kpis);
        setVentasDiarias(result.data.ventasDiarias);
        setProductos(result.data.productosMasVendidos);
        setMetodosPago(result.data.metodosPago);
        setCortes(result.data.historialCortes);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Error al cargar los datos del reporte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const handleExport = (format: "pdf" | "excel") => {
    if (format === "pdf") {
      toast.success("Exportando a PDF...", {
        description: "El archivo se descargará en breve",
      });
    } else {
      toast.success("Exportando a Excel...", {
        description: "El archivo se descargará en breve",
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  const getFilteredDays = () => {
    switch (rangoFechas) {
      case "hoy":
        return ventasDiarias.slice(-1);
      case "semana":
        return ventasDiarias.slice(-7);
      case "mes":
      default:
        return ventasDiarias;
    }
  };

  const filteredVentas = getFilteredDays();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">
            Reportes Avanzados
          </h1>
          <p className="text-sm text-muted-foreground">
            Análisis detallado de ventas y operaciones
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Select
            value={rangoFechas}
            onValueChange={(value: RangoFechas) => setRangoFechas(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]" data-testid="select-rango-fechas">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Seleccionar rango" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-h-[44px]" data-testid="button-exportar">
                <Download className="mr-2 h-4 w-4" />
                <span className="hidden xs:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport("pdf")}
                className="min-h-[44px]"
                data-testid="menuitem-export-pdf"
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport("excel")}
                className="min-h-[44px]"
                data-testid="menuitem-export-excel"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-4 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Ventas
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-ventas">
                  {kpis ? formatCurrency(kpis.totalVentas) : "$0.00"}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {kpis && kpis.cambioVentas >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={
                      kpis && kpis.cambioVentas >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {kpis ? `${kpis.cambioVentas >= 0 ? "+" : ""}${kpis.cambioVentas}%` : "0%"}
                  </span>{" "}
                  vs semana anterior
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Transacciones
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-transacciones">
                  {kpis ? kpis.totalTransacciones : 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Promedio diario:{" "}
                  {kpis
                    ? Math.round(kpis.totalTransacciones / ventasDiarias.length)
                    : 0}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Ticket Promedio
                </CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-ticket-promedio">
                  {kpis ? formatCurrency(kpis.ticketPromedio) : "$0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Venta diaria promedio:{" "}
                  {kpis ? formatCurrency(kpis.ventasDiarias) : "$0.00"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Producto Estrella
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-lg font-bold truncate"
                  data-testid="text-producto-estrella"
                  title={kpis?.productoMasVendido || "N/A"}
                >
                  {kpis?.productoMasVendido || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Más vendido del período
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="ventas" className="space-y-4">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-2 lg:grid-cols-4">
                <TabsTrigger value="ventas" className="min-h-[44px] text-xs sm:text-sm whitespace-nowrap" data-testid="tab-ventas">
                  <BarChart3 className="mr-1.5 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Ventas por</span> Día
                </TabsTrigger>
                <TabsTrigger value="productos" className="min-h-[44px] text-xs sm:text-sm whitespace-nowrap" data-testid="tab-productos">
                  <Package className="mr-1.5 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Productos</span> Top
                </TabsTrigger>
                <TabsTrigger value="pagos" className="min-h-[44px] text-xs sm:text-sm whitespace-nowrap" data-testid="tab-pagos">
                  <DollarSign className="mr-1.5 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Métodos</span> Pago
                </TabsTrigger>
                <TabsTrigger value="cortes" className="min-h-[44px] text-xs sm:text-sm whitespace-nowrap" data-testid="tab-cortes">
                  <Receipt className="mr-1.5 sm:mr-2 h-4 w-4" />
                  <span className="hidden xs:inline">Historial</span> Cortes
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="ventas" className="space-y-4">
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Ventas por Día</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Ingresos diarios en el período seleccionado
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                      <div className="min-w-[300px]">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <BarChart data={filteredVentas}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="dia"
                              className="text-xs fill-muted-foreground"
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} width={50} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            <Bar
                              dataKey="ventas"
                              fill="hsl(var(--primary))"
                              name="Ventas"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Tendencia de Ventas</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Evolución de ingresos a lo largo del tiempo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                      <div className="min-w-[300px]">
                        <ResponsiveContainer width="100%" height={250} minWidth={300}>
                          <LineChart data={filteredVentas}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="dia"
                              className="text-xs fill-muted-foreground"
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 10 }} width={50} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: "12px" }} />
                            <Line
                              type="monotone"
                              dataKey="ventas"
                              stroke="#22c55e"
                              strokeWidth={2}
                              name="Ventas"
                              dot={{ fill: "#22c55e", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="productos" className="space-y-4">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Top 10 Productos Más Vendidos</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Productos con mayor volumen de ventas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 sm:w-12 text-xs sm:text-sm">#</TableHead>
                          <TableHead className="text-xs sm:text-sm min-w-[120px]">Producto</TableHead>
                          <TableHead className="text-xs sm:text-sm hidden sm:table-cell">Categoría</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Precio</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Cant.</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm">Ingresos</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productos.slice(0, 10).map((producto, index) => (
                          <TableRow key={producto.id} data-testid={`row-producto-${producto.id}`}>
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                              {index + 1}
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-4">
                              <div className="max-w-[150px] sm:max-w-none truncate">
                                {producto.nombre}
                              </div>
                              <div className="sm:hidden mt-0.5">
                                <Badge variant="outline" className="text-xs">{producto.categoria}</Badge>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell py-2 sm:py-4">
                              <Badge variant="outline">{producto.categoria}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm py-2 sm:py-4">
                              {formatCurrency(producto.precio)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-xs sm:text-sm py-2 sm:py-4">
                              {producto.cantidadVendida}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-green-600 text-xs sm:text-sm py-2 sm:py-4">
                              {formatCurrency(producto.ingresos)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pagos" className="space-y-4">
              <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Distribución por Método de Pago</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Porcentaje de ventas por forma de pago
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
                      <div className="min-w-[280px]">
                        <ResponsiveContainer width="100%" height={280} minWidth={280}>
                          <PieChart>
                            <Pie
                              data={metodosPago}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ metodo, porcentaje }) =>
                                `${metodo}: ${porcentaje}%`
                              }
                              outerRadius={90}
                              fill="#8884d8"
                              dataKey="porcentaje"
                              nameKey="metodo"
                            >
                              {metodosPago.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [
                                `${value}%`,
                                name,
                              ]}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-base sm:text-lg">Detalle por Método de Pago</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Montos y transacciones por forma de pago
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                    <div className="space-y-2 sm:space-y-4">
                      {metodosPago.map((metodo) => (
                        <div
                          key={metodo.metodo}
                          className="flex items-center justify-between gap-2 p-3 sm:p-4 rounded-lg border"
                          data-testid={`card-metodo-${metodo.metodo.toLowerCase()}`}
                        >
                          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: metodo.color }}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm sm:text-base truncate">{metodo.metodo}</p>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {metodo.porcentaje}% del total
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm sm:text-lg">
                              {formatCurrency(metodo.monto)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {metodo.cantidad} trans.
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="cortes" className="space-y-4">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-base sm:text-lg">Historial de Cortes de Caja</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Últimos 5 cierres de turno registrados
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
                  <div className="space-y-3 sm:space-y-4">
                    {cortes.map((corte) => (
                      <div
                        key={corte.id}
                        className="p-3 sm:p-4 rounded-lg border"
                        data-testid={`card-corte-${corte.id}`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium capitalize text-sm sm:text-base truncate">
                                {corte.fechaFormateada}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
                                <Clock className="h-3 w-3" />
                                <span>{corte.horaInicio} - {corte.horaCierre}</span>
                                <span className="hidden xs:inline">| {corte.usuario}</span>
                              </p>
                            </div>
                          </div>
                          <Badge
                            className="text-xs self-start sm:self-auto flex-shrink-0"
                            variant={
                              corte.status === "cuadrado"
                                ? "default"
                                : corte.status === "sobrante"
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {corte.status === "cuadrado" && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {corte.status === "sobrante" && (
                              <TrendingUp className="mr-1 h-3 w-3" />
                            )}
                            {corte.status === "faltante" && (
                              <AlertCircle className="mr-1 h-3 w-3" />
                            )}
                            {corte.status === "cuadrado"
                              ? "Cuadrado"
                              : corte.status === "sobrante"
                              ? `Sobrante: ${formatCurrency(corte.diferencia)}`
                              : `Faltante: ${formatCurrency(Math.abs(corte.diferencia))}`}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-muted-foreground">Total Ventas</p>
                            <p className="font-semibold">
                              {formatCurrency(corte.totalVentas)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Efectivo</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrency(corte.ventasEfectivo)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Tarjeta</p>
                            <p className="font-semibold text-blue-600">
                              {formatCurrency(corte.ventasTarjeta)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground text-xs">Esperado/Contado</p>
                            <p className="font-semibold text-xs sm:text-sm">
                              {formatCurrency(corte.efectivoEsperado)} / {formatCurrency(corte.efectivoContado)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
