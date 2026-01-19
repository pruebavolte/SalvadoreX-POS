"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Play, 
  Truck, 
  Store, 
  ShoppingBag,
  RefreshCw,
  Filter,
  UtensilsCrossed
} from "lucide-react";
import { cn } from "@/lib/cn";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'cancelled';
type ServiceType = 'dine_in' | 'takeout' | 'delivery';
type OrderSource = 'pos' | 'uber_eats' | 'didi_food' | 'rappi' | 'pedidos_ya' | 'sin_delantal' | 'cornershop';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  modifiers: string | null;
  notes: string | null;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  source: OrderSource;
  external_order_id: string | null;
  table_number: string | null;
  customer_name: string | null;
  service_type: ServiceType;
  status: OrderStatus;
  total: number;
  notes: string | null;
  created_at: string;
  started_at: string | null;
  ready_at: string | null;
  items: OrderItem[];
}

const serviceTypeLabels: Record<ServiceType, string> = {
  dine_in: 'Comer dentro',
  takeout: 'Para llevar',
  delivery: 'A domicilio'
};

const serviceTypeIcons: Record<ServiceType, typeof Store> = {
  dine_in: Store,
  takeout: ShoppingBag,
  delivery: Truck
};

const sourceLabels: Record<OrderSource, string> = {
  pos: 'POS',
  uber_eats: 'Uber Eats',
  didi_food: 'Didi Food',
  rappi: 'Rappi',
  pedidos_ya: 'Pedidos Ya',
  sin_delantal: 'Sin Delantal',
  cornershop: 'Cornershop'
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600',
  in_progress: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600',
  ready: 'bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600',
  delivered: 'bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600',
  cancelled: 'bg-gray-200 border-gray-400 dark:bg-gray-700 dark:border-gray-500'
};

const headerColors: Record<OrderStatus, string> = {
  pending: 'bg-red-500 text-white',
  in_progress: 'bg-yellow-500 text-black',
  ready: 'bg-green-500 text-white',
  delivered: 'bg-gray-400 text-white dark:bg-gray-600',
  cancelled: 'bg-gray-500 text-white'
};

function getTimeColor(createdAt: string, status: OrderStatus): string {
  if (status === 'delivered' || status === 'cancelled') return '';
  
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  
  if (minutes < 5) return 'text-green-600 dark:text-green-400';
  if (minutes < 10) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-red-600 dark:text-red-400';
}

export default function CocinaPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const { data: orders = [], isLoading, refetch } = useQuery<KitchenOrder[]>({
    queryKey: ['/api/kitchen/orders', statusFilter, sourceFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (sourceFilter) params.set('source', sourceFilter);
      const res = await fetch(`/api/kitchen/orders?${params}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    refetchInterval: 5000
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const res = await fetch('/api/kitchen/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (!res.ok) throw new Error('Failed to update order');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });
      toast.success("Pedido actualizado");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar pedido");
    }
  });

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  const getNextAction = (status: OrderStatus): { label: string; nextStatus: OrderStatus; icon: typeof Play } | null => {
    switch (status) {
      case 'pending':
        return { label: 'Iniciar', nextStatus: 'in_progress', icon: Play };
      case 'in_progress':
        return { label: 'Listo', nextStatus: 'ready', icon: CheckCircle2 };
      case 'ready':
        return { label: 'Entregado', nextStatus: 'delivered', icon: Truck };
      default:
        return null;
    }
  };

  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const pendingCount = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="flex flex-col h-full bg-muted/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-background border-b">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <h1 className="text-lg sm:text-xl font-semibold" data-testid="text-page-title">Cocina</h1>
          <Badge variant="secondary" className="text-xs sm:text-sm" data-testid="badge-order-count">
            {activeOrders.length} pedidos
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs sm:text-sm" data-testid="badge-pending-count">
              {pendingCount} pendientes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] sm:w-[160px] h-10 min-h-[44px]" data-testid="select-status-filter">
              <Filter className="h-4 w-4 mr-1 sm:mr-2" />
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="in_progress">En Preparación</SelectItem>
              <SelectItem value="ready">Listos</SelectItem>
              <SelectItem value="delivered">Entregados</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[130px] sm:w-[160px] h-10 min-h-[44px]" data-testid="select-source-filter">
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              <SelectItem value="pos">POS</SelectItem>
              <SelectItem value="uber_eats">Uber Eats</SelectItem>
              <SelectItem value="didi_food">Didi Food</SelectItem>
              <SelectItem value="rappi">Rappi</SelectItem>
            </SelectContent>
          </Select>

          <Button 
            variant="outline" 
            size="icon"
            className="h-10 w-10 min-h-[44px] min-w-[44px]"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4 text-center">
            <UtensilsCrossed className="h-12 w-12 sm:h-16 sm:w-16 mb-4" />
            <p className="text-base sm:text-lg">No hay pedidos pendientes</p>
            <p className="text-xs sm:text-sm">Los nuevos pedidos aparecerán aquí automáticamente</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
            {orders.map((order) => {
              const ServiceIcon = serviceTypeIcons[order.service_type];
              const nextAction = getNextAction(order.status);
              const timeColor = getTimeColor(order.created_at, order.status);

              return (
                <Card 
                  key={order.id} 
                  className={cn(
                    "flex flex-col overflow-hidden border-2 transition-all",
                    statusColors[order.status]
                  )}
                  data-testid={`card-order-${order.id}`}
                >
                  <CardHeader className={cn("p-2 sm:p-3 space-y-0", headerColors[order.status])}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-base sm:text-lg" data-testid={`text-order-number-${order.id}`}>
                        {order.table_number ? `Mesa ${order.table_number}` : order.order_number}
                      </div>
                      <Badge 
                        variant="outline" 
                        className="bg-white/20 border-white/40 text-inherit text-xs"
                      >
                        {sourceLabels[order.source]}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm opacity-90">
                      <span className={cn("flex items-center gap-1", timeColor)}>
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(order.created_at), { 
                          addSuffix: false, 
                          locale: es 
                        })}
                      </span>
                      {order.customer_name && (
                        <span className="truncate max-w-[80px] sm:max-w-[100px]">{order.customer_name}</span>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 p-2 sm:p-3 space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                      <ServiceIcon className="h-4 w-4" />
                      <span>{serviceTypeLabels[order.service_type]}</span>
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      {order.items?.map((item, idx) => (
                        <div key={item.id || idx} className="text-xs sm:text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-medium text-foreground">
                              {item.quantity} x
                            </span>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground break-words">
                                {item.product_name}
                              </span>
                              {item.modifiers && (
                                <p className="text-xs text-muted-foreground ml-2 break-words">
                                  {item.modifiers}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 ml-2 italic break-words">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs sm:text-sm text-orange-800 dark:text-orange-200 break-words">
                        {order.notes}
                      </div>
                    )}
                  </CardContent>

                  {nextAction && (
                    <div className="p-2 sm:p-3 border-t">
                      <Button
                        className="w-full min-h-[44px]"
                        variant={order.status === 'pending' ? 'default' : 'secondary'}
                        onClick={() => handleStatusChange(order.id, nextAction.nextStatus)}
                        disabled={updateStatusMutation.isPending}
                        data-testid={`button-action-${order.id}`}
                      >
                        <nextAction.icon className="h-4 w-4 mr-2" />
                        {nextAction.label}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
