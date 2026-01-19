"use client";

import { RequestsTable, type Request } from "@/components/requests-table";
import { Card, CardContent } from "@/components/ui/card";

// Sample data - Replace with actual API call
const SAMPLE_REQUESTS: Request[] = [
  {
    id: "1",
    folio: "SOL-001",
    sistema: "POS",
    fechaRegistro: "2025-11-29T10:30:00",
    diasDesdeModificacion: 2,
    modulo: "Ventas",
    descripcion: "Error en cálculo de descuentos",
    estado: "EN_PROGRESO",
    fechaSolucion: undefined,
    comentario: "Investigando el problema en la lógica de descuentos",
  },
  {
    id: "2",
    folio: "SOL-002",
    sistema: "Inventario",
    fechaRegistro: "2025-11-27T14:15:00",
    diasDesdeModificacion: 4,
    modulo: "Stock",
    descripcion: "Sincronización de inventario lenta",
    estado: "ABIERTA",
    fechaSolucion: undefined,
    comentario: "Usuario reporta lag en actualizaciones",
  },
  {
    id: "3",
    folio: "SOL-003",
    sistema: "Digital Menu",
    fechaRegistro: "2025-11-25T09:00:00",
    diasDesdeModificacion: 6,
    modulo: "Órdenes",
    descripcion: "Integración con delivery",
    estado: "RESUELTA",
    fechaSolucion: "2025-11-28T16:30:00",
    comentario: "API integrada correctamente",
  },
  {
    id: "4",
    folio: "SOL-004",
    sistema: "Reportes",
    fechaRegistro: "2025-11-20T11:45:00",
    diasDesdeModificacion: 11,
    modulo: "Analytics",
    descripcion: "Exportación de datos a Excel",
    estado: "CERRADA",
    fechaSolucion: "2025-11-24T13:20:00",
    comentario: "Documentación actualizada con instrucciones",
  },
  {
    id: "5",
    folio: "SOL-005",
    sistema: "Clientes",
    fechaRegistro: "2025-11-28T15:20:00",
    diasDesdeModificacion: 1,
    modulo: "Lealtad",
    descripcion: "Puntos de recompensa no se actualizan",
    estado: "EN_PROGRESO",
    fechaSolucion: undefined,
    comentario: "Revisando la base de datos de puntos",
  },
];

export default function RequestsPage() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Solicitudes de Soporte
          </h1>
          <p className="text-muted-foreground">
            Gestiona y realiza seguimiento de todas las solicitudes del sistema
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {SAMPLE_REQUESTS.length}
              </div>
              <p className="text-sm text-muted-foreground">Total de solicitudes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {SAMPLE_REQUESTS.filter((r) => r.estado === "ABIERTA").length}
              </div>
              <p className="text-sm text-muted-foreground">Abiertas</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {SAMPLE_REQUESTS.filter((r) => r.estado === "EN_PROGRESO").length}
              </div>
              <p className="text-sm text-muted-foreground">En progreso</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {SAMPLE_REQUESTS.filter((r) => r.estado === "RESUELTA" || r.estado === "CERRADA").length}
              </div>
              <p className="text-sm text-muted-foreground">Resueltas</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <RequestsTable data={SAMPLE_REQUESTS} />
      </div>
    </div>
  );
}
