"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  MoreHorizontal,
  Loader2,
  FileX,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Ban,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  orderId?: string;
  saleId?: string;
  receptorRfc: string;
  receptorNombre: string;
  uuidFiscal?: string;
  serie?: string;
  folio?: string;
  total: number;
  moneda: string;
  status: 'pending' | 'issued' | 'cancelled' | 'error';
  pdfUrl?: string;
  xmlUrl?: string;
  cancellationReason?: string;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendiente", variant: "secondary" },
  issued: { label: "Timbrada", variant: "default" },
  cancelled: { label: "Cancelada", variant: "destructive" },
  error: { label: "Error", variant: "destructive" },
};

export function InvoiceHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [invoiceToCancel, setInvoiceToCancel] = useState<Invoice | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
  });

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, pagination.offset]);

  const fetchInvoices = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      params.append("limit", pagination.limit.toString());
      params.append("offset", pagination.offset.toString());

      const res = await fetch(`/api/billing/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Error al cargar facturas");

      const data = await res.json();
      setInvoices(data.invoices || []);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0,
      }));
    } catch (error) {
      toast.error("Error al cargar el historial de facturas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownload = async (invoice: Invoice, type: 'pdf' | 'xml') => {
    const url = type === 'pdf' ? invoice.pdfUrl : invoice.xmlUrl;
    if (!url) {
      toast.error(`No hay archivo ${type.toUpperCase()} disponible`);
      return;
    }

    try {
      window.open(url, '_blank');
    } catch (error) {
      toast.error(`Error al descargar ${type.toUpperCase()}`);
    }
  };

  const handleCancelClick = (invoice: Invoice) => {
    setInvoiceToCancel(invoice);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!invoiceToCancel) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/billing/invoices/${invoiceToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motive: "02",
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al cancelar la factura");
      }

      toast.success("Factura cancelada correctamente");
      fetchInvoices(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar la factura");
    } finally {
      setCancelling(false);
      setCancelDialogOpen(false);
      setInvoiceToCancel(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = "MXN") => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const handlePreviousPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({
        ...prev,
        offset: Math.max(0, prev.offset - prev.limit),
      }));
    }
  };

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({
        ...prev,
        offset: prev.offset + prev.limit,
      }));
    }
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              Historial de Facturas
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Lista de todas las facturas emitidas
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] min-h-[36px]" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="issued">Timbradas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
                <SelectItem value="error">Con Error</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchInvoices(true)}
              disabled={refreshing}
              data-testid="button-refresh-invoices"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileX className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground">No hay facturas</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {statusFilter !== "all" 
                ? "No se encontraron facturas con el filtro seleccionado"
                : "Aún no se han emitido facturas"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha</TableHead>
                    <TableHead className="whitespace-nowrap">RFC Receptor</TableHead>
                    <TableHead className="whitespace-nowrap hidden sm:table-cell">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Total</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatDate(invoice.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {invoice.receptorRfc}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell max-w-[200px] truncate text-sm">
                        {invoice.receptorNombre}
                      </TableCell>
                      <TableCell className="text-right font-medium whitespace-nowrap">
                        {formatCurrency(invoice.total, invoice.moneda)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_LABELS[invoice.status]?.variant || "secondary"}>
                          {STATUS_LABELS[invoice.status]?.label || invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-actions-${invoice.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {invoice.pdfUrl && (
                              <DropdownMenuItem
                                onClick={() => handleDownload(invoice, 'pdf')}
                                data-testid={`button-download-pdf-${invoice.id}`}
                              >
                                <FileDown className="h-4 w-4 mr-2" />
                                Descargar PDF
                              </DropdownMenuItem>
                            )}
                            {invoice.xmlUrl && (
                              <DropdownMenuItem
                                onClick={() => handleDownload(invoice, 'xml')}
                                data-testid={`button-download-xml-${invoice.id}`}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Descargar XML
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'issued' && (
                              <DropdownMenuItem
                                onClick={() => handleCancelClick(invoice)}
                                className="text-destructive focus:text-destructive"
                                data-testid={`button-cancel-${invoice.id}`}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Cancelar Factura
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between px-4 py-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Mostrando {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} de {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={pagination.offset === 0}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Cancelar factura?</DialogTitle>
              <DialogDescription>
                Esta acción cancelará la factura con folio{" "}
                <strong>{invoiceToCancel?.serie}{invoiceToCancel?.folio}</strong> ante el SAT.
                Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCancelDialogOpen(false)}
                disabled={cancelling}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelConfirm}
                disabled={cancelling}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4 mr-2" />
                )}
                Confirmar Cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
