"use client";

import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface Request {
  id: string;
  folio: string;
  sistema: string;
  fechaRegistro: string;
  diasDesdeModificacion: number;
  modulo: string;
  descripcion: string;
  estado: "ABIERTA" | "EN_PROGRESO" | "RESUELTA" | "CERRADA";
  fechaSolucion?: string;
  comentario: string;
}

interface RequestsTableProps {
  data?: Request[];
}

export function RequestsTable({ data = [] }: RequestsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [requests, setRequests] = useState<Request[]>(data);

  const getStatusColor = (status: Request["estado"]) => {
    switch (status) {
      case "ABIERTA":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "EN_PROGRESO":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "RESUELTA":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "CERRADA":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const isAllSelected = selectedIds.size === requests.length && requests.length > 0;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < requests.length;

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.error("Selecciona al menos una solicitud para eliminar");
      return;
    }

    const newRequests = requests.filter((r) => !selectedIds.has(r.id));
    setRequests(newRequests);
    setSelectedIds(new Set());
    toast.success(`${selectedIds.size} solicitud(es) eliminada(s)`);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>Solicitudes de Soporte</CardTitle>
        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            className="gap-2"
            data-testid="button-delete-selected"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar {selectedIds.size}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">
            No hay solicitudes registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      data-testid="checkbox-select-all"
                    />
                  </TableHead>
                  <TableHead data-testid="header-folio">Folio</TableHead>
                  <TableHead data-testid="header-sistema">Sistema</TableHead>
                  <TableHead data-testid="header-fecha">Fecha y Hora</TableHead>
                  <TableHead data-testid="header-dias">Días</TableHead>
                  <TableHead data-testid="header-modulo">Módulo</TableHead>
                  <TableHead data-testid="header-descripcion">Descripción</TableHead>
                  <TableHead data-testid="header-estado">Estado</TableHead>
                  <TableHead data-testid="header-solucion">Fecha de Solución</TableHead>
                  <TableHead data-testid="header-comentario">Comentario</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {requests.map((request) => (
                  <TableRow
                    key={request.id}
                    data-testid={`row-request-${request.id}`}
                    className="hover:bg-accent/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onCheckedChange={(checked) =>
                          handleSelectRow(request.id, checked as boolean)
                        }
                        data-testid={`checkbox-select-${request.id}`}
                      />
                    </TableCell>

                    <TableCell className="font-medium" data-testid={`text-folio-${request.id}`}>
                      {request.folio}
                    </TableCell>

                    <TableCell data-testid={`text-sistema-${request.id}`}>
                      {request.sistema}
                    </TableCell>

                    <TableCell className="text-sm" data-testid={`text-fecha-${request.id}`}>
                      {formatDate(request.fechaRegistro)}
                    </TableCell>

                    <TableCell className="text-center" data-testid={`text-dias-${request.id}`}>
                      <Badge variant={request.diasDesdeModificacion > 7 ? "destructive" : "secondary"}>
                        {request.diasDesdeModificacion}
                      </Badge>
                    </TableCell>

                    <TableCell data-testid={`text-modulo-${request.id}`}>
                      {request.modulo}
                    </TableCell>

                    <TableCell className="max-w-xs text-sm truncate" data-testid={`text-descripcion-${request.id}`}>
                      {request.descripcion}
                    </TableCell>

                    <TableCell data-testid={`text-estado-${request.id}`}>
                      <Badge className={getStatusColor(request.estado)}>
                        {request.estado}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-sm" data-testid={`text-solucion-${request.id}`}>
                      {request.fechaSolucion ? formatDate(request.fechaSolucion) : "-"}
                    </TableCell>

                    <TableCell className="max-w-xs text-sm truncate" data-testid={`text-comentario-${request.id}`}>
                      {request.comentario || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
