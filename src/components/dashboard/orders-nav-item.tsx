"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

interface OrdersNavItemProps {
  isCollapsed?: boolean;
  mobile?: boolean;
  onMobileMenuChange?: (open: boolean) => void;
}

export function OrdersNavItem({ isCollapsed, mobile, onMobileMenuChange }: OrdersNavItemProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await fetch("/api/auth/check-admin");
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (loading || !isAdmin) {
    return null;
  }

  const isActive = pathname === "/dashboard/admin/orders";

  return (
    <Link
      href="/dashboard/admin/orders"
      onClick={() => mobile && onMobileMenuChange?.(false)}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        !mobile && isCollapsed && "justify-center"
      )}
      title={!mobile && isCollapsed ? "Órdenes" : undefined}
    >
      <ClipboardList className="w-5 h-5 flex-shrink-0" />
      {(mobile || !isCollapsed) && <span>Órdenes</span>}
    </Link>
  );
}
