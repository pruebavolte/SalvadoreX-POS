"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShoppingCart, Loader2, User, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  currency: string;
  imageUrl?: string | null;
}

interface Order {
  id: string;
  userId: string;
  status: string;
  total: number;
  currency: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  PREPARING: "bg-orange-500",
  READY: "bg-purple-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  PREPARING: "En preparación",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/orders");

      if (!response.ok) {
        throw new Error("Error al obtener órdenes");
      }

      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar las órdenes");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el estado");
      }

      toast.success(data.message);
      await fetchOrders();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error(error.message || "Error al actualizar el estado");
    } finally {
      setUpdating(false);
    }
  };

  const ordersByStatus = {
    PENDING: orders.filter((o) => o.status === "PENDING").length,
    CONFIRMED: orders.filter((o) => o.status === "CONFIRMED").length,
    PREPARING: orders.filter((o) => o.status === "PREPARING").length,
    READY: orders.filter((o) => o.status === "READY").length,
    DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
    CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-8 w-8 text-primary" />
          Gestión de Órdenes
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra todas las órdenes del menú digital
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Object.entries(ordersByStatus).map(([status, count]) => (
          <Card key={status}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {statusLabels[status]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Órdenes</CardTitle>
          <CardDescription>
            {orders.length} orden{orders.length !== 1 && "es"} total
            {orders.length !== 1 && "es"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <ShoppingCart className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">No hay órdenes aún</p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className={statusColors[order.status]}>
                          {statusLabels[order.status]}
                        </Badge>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {order.user?.firstName || "Cliente"} {order.user?.lastName || ""}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleString("es-ES")}
                        </div>
                      </div>

                      <div className="text-sm">
                        {(order.items?.length || 0)} artículo
                        {(order.items?.length || 0) !== 1 && "s"} - Total:{" "}
                        <span className="font-bold text-primary">
                          ${(order.total || 0).toFixed(2)} {order.currency || "MXN"}
                        </span>
                      </div>

                      {order.notes && (
                        <div className="text-sm text-muted-foreground flex items-start gap-1">
                          <FileText className="h-3 w-3 mt-0.5" />
                          <span>{order.notes}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusUpdate(order.id, value)
                        }
                        disabled={updating}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PENDING">Pendiente</SelectItem>
                          <SelectItem value="CONFIRMED">Confirmado</SelectItem>
                          <SelectItem value="PREPARING">
                            En preparación
                          </SelectItem>
                          <SelectItem value="READY">Listo</SelectItem>
                          <SelectItem value="DELIVERED">Entregado</SelectItem>
                          <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsDialogOpen(true);
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalles de la Orden</DialogTitle>
            <DialogDescription>
              Orden #{selectedOrder?.id.slice(-8)}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div>
                      <span className="font-semibold">Nombre:</span>{" "}
                      {selectedOrder.user?.firstName || "Cliente"}{" "}
                      {selectedOrder.user?.lastName || ""}
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span>{" "}
                      {selectedOrder.user?.email || "No disponible"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Estado:</span>
                    <Badge className={statusColors[selectedOrder.status]}>
                      {statusLabels[selectedOrder.status]}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>
                      {new Date(selectedOrder.createdAt).toLocaleString(
                        "es-ES"
                      )}
                    </span>
                  </div>
                  {selectedOrder.notes && (
                    <div className="pt-2 border-t">
                      <span className="font-semibold">Notas:</span>
                      <p className="mt-1 text-muted-foreground">
                        {selectedOrder.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Productos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 pb-3 border-b last:border-0 last:pb-0"
                      >
                        <div className="relative w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.productName}
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full">
                              <ShoppingCart className="h-6 w-6 text-gray-300" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">
                            {item.productName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} {item.currency} x{" "}
                            {item.quantity}
                          </div>
                        </div>

                        <div className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-3 border-t text-lg font-bold">
                      <span>Total:</span>
                      <span className="text-primary">
                        ${selectedOrder.total.toFixed(2)}{" "}
                        {selectedOrder.currency}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
