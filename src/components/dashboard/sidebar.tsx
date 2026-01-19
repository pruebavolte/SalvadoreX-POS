"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Home,
    BarChart3,
    Package,
    Users as UsersIcon,
    Settings,
    ShoppingCart,
    ChevronLeft,
    ChefHat,
    ClipboardList,
    RotateCcw,
    Soup,
    Ticket,
    UtensilsCrossed,
    Users,
    Wallet,
    Receipt,
    Headphones,
    Building2,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { AdminNavItem } from "@/components/dashboard/admin-nav-item";
import { OrdersNavItem } from "@/components/dashboard/orders-nav-item";

const navigation = [
    { name: "POS", href: "/dashboard/pos", icon: ShoppingCart },
    { name: "Cocina", href: "/dashboard/cocina", icon: UtensilsCrossed },
    { name: "Corte de Caja", href: "/dashboard/corte", icon: Wallet },
    { name: "Fila Virtual", href: "/dashboard/fila", icon: Users },
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Inventario", href: "/dashboard/inventory", icon: Package },
    { name: "Ingredientes", href: "/dashboard/ingredients", icon: Soup },
    { name: "Menu Digital", href: "/dashboard/menu-digital", icon: ChefHat },
    { name: "Devoluciones", href: "/dashboard/devoluciones", icon: RotateCcw },
    { name: "Clientes", href: "/dashboard/customers", icon: UsersIcon },
    { name: "Solicitudes", href: "/dashboard/requests", icon: Ticket },
    { name: "Reportes", href: "/dashboard/reportes", icon: BarChart3 },
    { name: "Facturación", href: "/dashboard/billing", icon: Receipt },
    { name: "Marcas Blancas", href: "/dashboard/marcas-blancas", icon: Building2 },
    { name: "Soporte Remoto", href: "/dashboard/support", icon: Headphones },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
    isCollapsed: boolean;
    onToggle: () => void;
    mobileMenuOpen: boolean;
    onMobileMenuChange: (open: boolean) => void;
}

export default function Sidebar({
    isCollapsed,
    onToggle,
    mobileMenuOpen,
    onMobileMenuChange,
}: SidebarProps) {
    const pathname = usePathname();

    const NavigationContent = ({ mobile = false }: { mobile?: boolean }) => (
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => mobile && onMobileMenuChange(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                            isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            !mobile && isCollapsed && "justify-center"
                        )}
                        title={!mobile && isCollapsed ? item.name : undefined}
                    >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        {(mobile || !isCollapsed) && <span>{item.name}</span>}
                    </Link>
                );
            })}
            <OrdersNavItem
                isCollapsed={!mobile ? isCollapsed : false}
                mobile={mobile}
                onMobileMenuChange={onMobileMenuChange}
            />
            <AdminNavItem
                isCollapsed={!mobile ? isCollapsed : false}
                mobile={mobile}
                onMobileMenuChange={onMobileMenuChange}
            />
        </nav>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:border-border lg:bg-background lg:shadow-sm transition-all duration-300",
                    isCollapsed ? "lg:w-20" : "lg:w-64"
                )}
            >
                <div className="flex flex-col flex-1 min-h-0 bg-background">
                    {/* Logo & Toggle */}
                    <div className="flex items-center justify-between h-16 px-6 border-b border-border">
                        {!isCollapsed && (
                            <img
                                src="/images/logo_salvadorx.png"
                                alt="Logo SalvadoreX"
                                className="w-2/5"
                            />
                        )}
                        <button
                            onClick={onToggle}
                            className={cn(
                                "p-2 rounded-lg hover:bg-accent transition-colors",
                                isCollapsed && "mx-auto"
                            )}
                            aria-label="Toggle sidebar"
                        >
                            <ChevronLeft
                                className={cn(
                                    "w-5 h-5 transition-transform duration-300",
                                    isCollapsed && "rotate-180"
                                )}
                            />
                        </button>
                    </div>

                    {/* Navigation */}
                    <NavigationContent />

                    {/* Footer */}
                    {!isCollapsed && (
                        <div className="flex-shrink-0 p-4 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                © 2025 SalvadoreX
                            </p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={mobileMenuOpen} onOpenChange={onMobileMenuChange}>
                <SheetContent side="left" className="w-64 p-0">
                    <div className="flex flex-col h-full">
                        <SheetHeader className="border-b p-6">
                            <SheetTitle>
                                <img
                                    src="/images/logo_salvadorx.png"
                                    alt="Logo SalvadoreX"
                                    className="w-2/5"
                                />
                            </SheetTitle>
                        </SheetHeader>

                        {/* Navigation */}
                        <NavigationContent mobile />

                        {/* Footer */}
                        <div className="flex-shrink-0 p-4 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                © 2025 SalvadoreX
                            </p>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
