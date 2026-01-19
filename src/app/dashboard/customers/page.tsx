"use client";

import { useState } from "react";
import { useCustomers, useCustomerMutations } from "@/hooks/use-customers";
import { Customer } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  CreditCard,
  Award,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Phone,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerModal } from "@/components/customers/customer-modal";
import { toast } from "sonner";

export default function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [creditFilter, setCreditFilter] = useState<string>("all");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { customers, loading, page, totalPages, setPage, updateFilter, refresh } = useCustomers();
  const { remove } = useCustomerMutations();

  const handleSearch = () => {
    updateFilter({
      search: searchQuery || undefined,
      has_credit: creditFilter === "with_credit" ? true : creditFilter === "no_credit" ? false : undefined,
    });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCreditFilter("all");
    updateFilter({});
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingCustomer(null);
    setCustomerModalOpen(true);
  };

  const handleCloseModal = () => {
    setCustomerModalOpen(false);
    setEditingCustomer(null);
  };

  const handleDelete = async (customer: Customer) => {
    const creditBalance = customer.credit_balance ?? 0;
    if (creditBalance > 0) {
      toast.error(
        `No se puede eliminar a ${customer.name} porque tiene un saldo pendiente de $${creditBalance.toFixed(2)}`,
        { duration: 5000 }
      );
      return;
    }

    if (window.confirm(`¿Estás seguro de eliminar al cliente "${customer.name}"?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await remove(customer.id);
        toast.success("Cliente eliminado correctamente");
        refresh();
      } catch (error) {
        toast.error("Error al eliminar cliente");
      }
    }
  };

  const totalCustomers = customers.length;
  const customersWithCredit = customers.filter((c) => (c.credit_balance ?? 0) > 0).length;
  const totalCreditBalance = customers.reduce((sum, c) => sum + (c.credit_balance ?? 0), 0);
  const totalPoints = customers.reduce((sum, c) => sum + (c.points ?? 0), 0);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-6 sm:gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
              Clientes
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
              Gestiona tu base de clientes y cuentas por cobrar
            </p>
          </div>
          <Button 
            onClick={handleAddNew} 
            size="lg"
            className="w-full sm:w-auto min-h-[44px]"
            data-testid="button-add-customer"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Cliente
          </Button>
        </div>

        {/* Stats Cards - Responsive grid: 1 col mobile, 2 col tablet, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clientes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-customers">{totalCustomers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Clientes con Crédito
              </CardTitle>
              <CreditCard className="h-4 w-4 text-orange-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="text-customers-with-credit">
                {customersWithCredit}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total por Cobrar
              </CardTitle>
              <CreditCard className="h-4 w-4 text-red-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="text-total-receivable">
                ${totalCreditBalance.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Puntos Totales
              </CardTitle>
              <Award className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-total-points">
                {totalPoints.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Stack vertically on mobile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>
              Busca y filtra clientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {/* Search input - always full width */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o teléfono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-10 min-h-[44px]"
                  data-testid="input-search"
                />
              </div>
              
              {/* Filter buttons - Wrap on mobile */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={creditFilter === "all" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("all");
                    updateFilter({ search: searchQuery || undefined });
                  }}
                  className="flex-1 sm:flex-none min-h-[44px]"
                  data-testid="button-filter-all"
                >
                  Todos
                </Button>
                <Button
                  variant={creditFilter === "with_credit" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("with_credit");
                    updateFilter({
                      search: searchQuery || undefined,
                      has_credit: true,
                    });
                  }}
                  className="flex-1 sm:flex-none min-h-[44px]"
                  data-testid="button-filter-with-credit"
                >
                  Con Crédito
                </Button>
                <Button
                  variant={creditFilter === "no_credit" ? "default" : "outline"}
                  onClick={() => {
                    setCreditFilter("no_credit");
                    updateFilter({
                      search: searchQuery || undefined,
                      has_credit: false,
                    });
                  }}
                  className="flex-1 sm:flex-none min-h-[44px]"
                  data-testid="button-filter-no-credit"
                >
                  Sin Crédito
                </Button>
              </div>
              
              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={handleSearch}
                  className="w-full sm:w-auto min-h-[44px]"
                  data-testid="button-search"
                >
                  Buscar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleClearFilters}
                  className="w-full sm:w-auto min-h-[44px]"
                  data-testid="button-clear-filters"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers - Mobile Card View */}
        <div className="md:hidden space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Cargando clientes...
              </CardContent>
            </Card>
          ) : customers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No se encontraron clientes
              </CardContent>
            </Card>
          ) : (
            customers.map((customer) => {
              const creditLimit = customer.credit_limit ?? 0;
              const creditBalance = customer.credit_balance ?? 0;
              const creditUsed = creditLimit > 0 
                ? (creditBalance / creditLimit) * 100 
                : 0;

              return (
                <Card key={customer.id} data-testid={`card-customer-${customer.id}`}>
                  <CardContent className="p-4">
                    {/* Header with name and actions */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base truncate">{customer.name}</h3>
                          {customer.active !== false ? (
                            <Badge variant="default" className="bg-green-600 flex-shrink-0">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex-shrink-0">Inactivo</Badge>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="min-h-[44px] min-w-[44px] flex-shrink-0"
                            data-testid={`button-actions-${customer.id}`}
                          >
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleEdit(customer)}
                            className="min-h-[44px]"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="min-h-[44px]">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Ver Historial
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(customer)}
                            className="text-destructive focus:text-destructive min-h-[44px]"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Contact info */}
                    <div className="mt-3 space-y-1.5">
                      {customer.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{customer.email}</span>
                        </div>
                      )}
                      {customer.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{customer.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Credit and points info */}
                    <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Límite</p>
                        <p className="font-medium text-sm">${(customer.credit_limit ?? 0).toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Saldo</p>
                        <p className={cn(
                          "font-semibold text-sm",
                          (customer.credit_balance ?? 0) > 0 && "text-red-600"
                        )}>
                          ${(customer.credit_balance ?? 0).toFixed(2)}
                        </p>
                        {(customer.credit_balance ?? 0) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {creditUsed.toFixed(0)}% usado
                          </p>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Puntos</p>
                        <div className="flex items-center justify-center gap-1">
                          <Award className="h-3 w-3 text-yellow-500" />
                          <span className="font-medium text-sm">{customer.points ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Customers Table - Desktop view */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Límite Crédito</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-right">Puntos</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Cargando clientes...
                      </TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        No se encontraron clientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => {
                      const creditLimit = customer.credit_limit ?? 0;
                      const creditBalance = customer.credit_balance ?? 0;
                      const creditUsed = creditLimit > 0 
                        ? (creditBalance / creditLimit) * 100 
                        : 0;

                      return (
                        <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {customer.email || "N/A"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{customer.phone || "N/A"}</div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${creditLimit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div
                              className={cn(
                                "font-semibold",
                                creditBalance > 0 && "text-red-600"
                              )}
                            >
                              ${creditBalance.toFixed(2)}
                            </div>
                            {creditBalance > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {creditUsed.toFixed(0)}% usado
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Award className="h-3 w-3 text-yellow-500" />
                              <span className="font-medium">{customer.points ?? 0}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.active !== false ? (
                              <Badge variant="default" className="bg-green-600">
                                Activo
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactivo</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(customer)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Ver Historial
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(customer)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination - Touch-friendly */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
            <div className="text-sm text-muted-foreground order-2 sm:order-1">
              Página {page} de {totalPages}
            </div>
            <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                data-testid="button-prev-page"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-1 sm:hidden">Anterior</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="flex-1 sm:flex-none min-h-[44px] min-w-[44px]"
                data-testid="button-next-page"
              >
                <span className="mr-1 sm:hidden">Siguiente</span>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      <CustomerModal
        open={customerModalOpen}
        onOpenChange={handleCloseModal}
        customer={editingCustomer}
      />
    </div>
  );
}
