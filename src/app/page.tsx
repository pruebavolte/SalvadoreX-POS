import { Metadata } from "next";
import { BrandedHome } from "@/components/home/branded-home";

export const metadata: Metadata = {
  title: "SalvadoreX - Punto de Venta Inteligente",
  description: "Más que un Punto de Venta, el mejor socio para tu negocio.",
};

export default function HomePage() {
  return <BrandedHome />;
}
