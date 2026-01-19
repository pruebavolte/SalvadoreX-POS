"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, Clock, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  currency: string;
  image_url?: string;
}

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  notes?: string;
  created_at: string;
  order_items: OrderItem[];
}

const statusConfig = {
  PENDING: { label: "Pendiente", icon: Clock, color: "bg-yellow-500" },
  CONFIRMED: { label: "Confirmado", icon: CheckCircle2, color: "bg-blue-500" },
  PREPARING: { label: "Preparando", icon: Clock, color: "bg-orange-500" },
  READY: { label: "Listo", icon: CheckCircle2, color: "bg-green-500" },
  DELIVERED: { label: "Entregado", icon: CheckCircle2, color: "bg-gray-500" },
  CANCELLED: { label: "Cancelado", icon: XCircle, color: "bg-red-500" },
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/orders");

      if (!response.ok) {
        throw new Error("Error al cargar pedidos");
      }

      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error al cargar tus pedidos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Mis Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Historial de todos tus pedidos
        </p>
      </div>

      {orders.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No tienes pedidos aún</h3>
              <p className="text-muted-foreground">
                Tus pedidos aparecerán aquí una vez que realices tu primera orden
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const StatusIcon = statusConfig[order.status as keyof typeof statusConfig]?.icon || Clock;
            const statusColor = statusConfig[order.status as keyof typeof statusConfig]?.color || "bg-gray-500";
            const statusLabel = statusConfig[order.status as keyof typeof statusConfig]?.label || order.status;

            return (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">
                        Pedido #{order.id.slice(0, 8)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleString("es-MX", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <Badge className={`${statusColor} text-white`}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabel}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Items */}
                  <div className="space-y-2">
                    {order.order_items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.product_name}
                              width={40}
                              height={40}
                              className="object-cover rounded"
                            />
                          ) : (
                            <ShoppingBag className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-muted-foreground">
                            Cantidad: {item.quantity}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Notas:</span> {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Total */}
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="font-semibold">Total:</span>
                    <span className="text-xl font-bold text-primary">
                      ${order.total.toFixed(2)} {order.currency}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
