"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { 
  Loader2, ExternalLink, ArrowLeft, Home, LogIn, UserPlus, 
  ShoppingCart, Package, BarChart3, Users, Zap, Shield, 
  CreditCard, Globe, Menu, X, Check, Star, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface TenantBranding {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
}

interface PreviewData {
  isPlatform: boolean;
  isPreview: boolean;
  tenantId: string;
  tenantSlug: string;
  tenantType: string;
  branding: TenantBranding;
}

export default function TenantPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [currentPage, setCurrentPage] = useState<"home" | "login" | "signup">("home");

  useEffect(() => {
    async function fetchPreviewBranding() {
      try {
        setLoading(true);
        const response = await fetch(`/api/tenant/branding/preview?tenantId=${tenantId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Error loading preview");
          return;
        }

        setPreviewData(data);
        
        // Apply CSS variables for tenant colors
        if (data.branding?.primaryColor) {
          document.documentElement.style.setProperty("--tenant-primary", data.branding.primaryColor);
          document.documentElement.style.setProperty("--tenant-secondary", data.branding.secondaryColor || "#64748b");
        }
      } catch (err) {
        setError("Error loading preview");
      } finally {
        setLoading(false);
      }
    }

    if (tenantId) {
      fetchPreviewBranding();
    }
  }, [tenantId]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">Cargando vista previa...</p>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center space-y-4">
          <p className="text-destructive">{error || "Error loading preview"}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const { branding } = previewData;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Preview Control Banner */}
      <div 
        className="sticky top-0 z-50 px-4 py-2 text-white text-sm flex items-center justify-between gap-4 flex-wrap"
        style={{ backgroundColor: branding.primaryColor }}
        data-testid="preview-banner"
      >
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          <span className="font-medium">Vista Previa:</span>
          <span>{branding.platformName}</span>
          {branding.customDomain && (
            <span className="opacity-75">({branding.customDomain})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            variant={currentPage === "home" ? "secondary" : "outline"}
            className="h-7 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
            onClick={() => setCurrentPage("home")}
            data-testid="button-preview-home"
          >
            <Home className="h-3 w-3 mr-1" />
            Inicio
          </Button>
          <Button 
            size="sm" 
            variant={currentPage === "login" ? "secondary" : "outline"}
            className="h-7 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
            onClick={() => setCurrentPage("login")}
            data-testid="button-preview-login"
          >
            <LogIn className="h-3 w-3 mr-1" />
            Login
          </Button>
          <Button 
            size="sm" 
            variant={currentPage === "signup" ? "secondary" : "outline"}
            className="h-7 text-xs bg-white/20 border-white/30 text-white hover:bg-white/30"
            onClick={() => setCurrentPage("signup")}
            data-testid="button-preview-signup"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Registro
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-7 text-xs text-white hover:bg-white/20"
            onClick={() => router.back()}
            data-testid="button-close-preview"
          >
            <X className="h-3 w-3 mr-1" />
            Cerrar
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1">
        {currentPage === "home" && (
          <FullLandingPage branding={branding} onNavigate={setCurrentPage} />
        )}
        {currentPage === "login" && (
          <FullLoginPage branding={branding} onNavigate={setCurrentPage} />
        )}
        {currentPage === "signup" && (
          <FullSignupPage branding={branding} onNavigate={setCurrentPage} />
        )}
      </div>
    </div>
  );
}

// ============== FULL LANDING PAGE ==============
function FullLandingPage({ 
  branding, 
  onNavigate 
}: { 
  branding: TenantBranding; 
  onNavigate: (page: "home" | "login" | "signup") => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    { icon: ShoppingCart, title: "Punto de Venta", desc: "Procesa ventas rápidamente con nuestra interfaz intuitiva" },
    { icon: Package, title: "Inventario", desc: "Controla tu stock en tiempo real" },
    { icon: BarChart3, title: "Reportes", desc: "Analiza tus ventas con reportes detallados" },
    { icon: Users, title: "Clientes", desc: "Gestiona tu base de clientes fácilmente" },
    { icon: CreditCard, title: "Pagos", desc: "Acepta múltiples formas de pago" },
    { icon: Globe, title: "Multi-sucursal", desc: "Administra todas tus sucursales" },
  ];

  const benefits = [
    "Sin comisiones ocultas",
    "Soporte 24/7 en español",
    "Actualizaciones gratuitas",
    "Respaldo en la nube",
    "Facturación electrónica incluida",
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      {/* Header/Navigation */}
      <header className="sticky top-10 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {branding.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.platformName}
                  className="h-10 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.platformName.charAt(0)}
                </div>
              )}
              <span 
                className="text-xl font-bold hidden sm:block"
                style={{ color: branding.primaryColor }}
              >
                {branding.platformName}
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Características
              </button>
              <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Precios
              </button>
              <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Contacto
              </button>
            </nav>

            {/* Auth Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button 
                variant="ghost"
                onClick={() => onNavigate("login")}
                data-testid="nav-button-login"
              >
                Iniciar Sesión
              </Button>
              <Button 
                onClick={() => onNavigate("signup")}
                style={{ backgroundColor: branding.primaryColor }}
                className="text-white"
                data-testid="nav-button-signup"
              >
                Empezar Gratis
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-4">
                <button className="text-left text-slate-600 dark:text-slate-400">Características</button>
                <button className="text-left text-slate-600 dark:text-slate-400">Precios</button>
                <button className="text-left text-slate-600 dark:text-slate-400">Contacto</button>
                <div className="flex flex-col gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <Button variant="outline" onClick={() => onNavigate("login")}>
                    Iniciar Sesión
                  </Button>
                  <Button 
                    onClick={() => onNavigate("signup")}
                    style={{ backgroundColor: branding.primaryColor }}
                    className="text-white"
                  >
                    Empezar Gratis
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-10"
          style={{ 
            background: `linear-gradient(135deg, ${branding.primaryColor} 0%, transparent 50%)` 
          }}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6"
              style={{ 
                backgroundColor: `${branding.primaryColor}15`,
                color: branding.primaryColor
              }}
            >
              <Zap className="h-4 w-4" />
              La solución #1 para tu negocio
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white mb-6">
              Impulsa tu negocio con{" "}
              <span style={{ color: branding.primaryColor }}>{branding.platformName}</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto">
              El punto de venta más completo y fácil de usar. Controla ventas, inventario, 
              clientes y reportes desde cualquier dispositivo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg"
                onClick={() => onNavigate("signup")}
                style={{ backgroundColor: branding.primaryColor }}
                className="text-white text-lg px-8 py-6"
                data-testid="hero-button-signup"
              >
                Comenzar Prueba Gratis
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate("login")}
                className="text-lg px-8 py-6"
                data-testid="hero-button-login"
              >
                Ya tengo cuenta
              </Button>
            </div>
            <p className="text-sm text-slate-500 mt-4">
              Sin tarjeta de crédito. 14 días de prueba gratis.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Herramientas poderosas para administrar tu negocio de manera eficiente
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-slate-950 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 hover-elevate transition-all"
                data-testid={`feature-card-${idx}`}
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${branding.primaryColor}15` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: branding.primaryColor }} />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                ¿Por qué elegir {branding.platformName}?
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                Miles de negocios confían en nosotros para gestionar sus operaciones diarias.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: branding.primaryColor }}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-slate-700 dark:text-slate-300">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div 
                className="absolute inset-0 rounded-2xl opacity-20"
                style={{ backgroundColor: branding.primaryColor }}
              />
              <div className="relative bg-slate-100 dark:bg-slate-800 rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-1 mb-4">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
                  "El mejor sistema de punto de venta que he usado. Fácil, rápido y muy completo."
                </p>
                <p className="text-sm text-slate-500">
                  — María García, Propietaria de Restaurante
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="py-20"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Comienza hoy mismo
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Únete a miles de negocios que ya confían en {branding.platformName}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg"
              onClick={() => onNavigate("signup")}
              className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8 py-6"
              data-testid="cta-button-signup"
            >
              Crear Cuenta Gratis
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => onNavigate("login")}
              className="border-white text-white hover:bg-white/10 text-lg px-8 py-6"
              data-testid="cta-button-login"
            >
              Iniciar Sesión
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                {branding.logoUrl ? (
                  <img 
                    src={branding.logoUrl} 
                    alt={branding.platformName}
                    className="h-8 w-auto object-contain brightness-0 invert"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div 
                    className="h-8 w-8 rounded flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    {branding.platformName.charAt(0)}
                  </div>
                )}
                <span className="font-bold">{branding.platformName}</span>
              </div>
              <p className="text-slate-400 text-sm">
                El punto de venta más completo para tu negocio.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white transition-colors">Características</button></li>
                <li><button className="hover:text-white transition-colors">Precios</button></li>
                <li><button className="hover:text-white transition-colors">Integraciones</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white transition-colors">Documentación</button></li>
                <li><button className="hover:text-white transition-colors">Contacto</button></li>
                <li><button className="hover:text-white transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button className="hover:text-white transition-colors">Privacidad</button></li>
                <li><button className="hover:text-white transition-colors">Términos</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>© {new Date().getFullYear()} {branding.platformName}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============== FULL LOGIN PAGE ==============
function FullLoginPage({ 
  branding, 
  onNavigate 
}: { 
  branding: TenantBranding; 
  onNavigate: (page: "home" | "login" | "signup") => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simular login
    setTimeout(() => {
      setLoading(false);
      alert(`Vista previa: Login con ${email}`);
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-48px)] flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <button 
              onClick={() => onNavigate("home")}
              className="inline-flex items-center gap-2"
            >
              {branding.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.platformName}
                  className="h-12 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.platformName.charAt(0)}
                </div>
              )}
              <span 
                className="text-2xl font-bold"
                style={{ color: branding.primaryColor }}
              >
                {branding.platformName}
              </span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Iniciar Sesión
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Ingresa tus credenciales para acceder
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  style={{ "--tw-ring-color": branding.primaryColor } as React.CSSProperties}
                  required
                  data-testid="input-login-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  required
                  data-testid="input-login-password"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-slate-600 dark:text-slate-400">Recordarme</span>
                </label>
                <button 
                  type="button"
                  className="font-medium hover:underline"
                  style={{ color: branding.primaryColor }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <Button 
                type="submit"
                className="w-full text-white py-6"
                style={{ backgroundColor: branding.primaryColor }}
                disabled={loading}
                data-testid="button-login-submit"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Iniciar Sesión"
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-950 text-slate-500">O continúa con</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="py-6" type="button">
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>
              <Button variant="outline" className="py-6" type="button">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </Button>
            </div>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
              ¿No tienes cuenta?{" "}
              <button 
                onClick={() => onNavigate("signup")}
                className="font-medium hover:underline"
                style={{ color: branding.primaryColor }}
              >
                Regístrate gratis
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-8"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="text-center text-white max-w-md">
          <Shield className="h-20 w-20 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">Bienvenido de vuelta</h2>
          <p className="text-white/80 text-lg">
            Accede a tu cuenta para gestionar tu negocio de manera eficiente.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============== FULL SIGNUP PAGE ==============
function FullSignupPage({ 
  branding, 
  onNavigate 
}: { 
  branding: TenantBranding; 
  onNavigate: (page: "home" | "login" | "signup") => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    businessName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert(`Vista previa: Registro de ${formData.email}`);
    }, 1000);
  };

  return (
    <div className="min-h-[calc(100vh-48px)] flex">
      {/* Left Panel - Visual */}
      <div 
        className="hidden lg:flex flex-1 items-center justify-center p-8"
        style={{ backgroundColor: branding.primaryColor }}
      >
        <div className="text-center text-white max-w-md">
          <Zap className="h-20 w-20 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-bold mb-4">Comienza tu prueba gratis</h2>
          <p className="text-white/80 text-lg mb-8">
            14 días de acceso completo sin tarjeta de crédito.
          </p>
          <ul className="text-left space-y-3">
            {["Acceso a todas las funciones", "Soporte personalizado", "Sin compromisos"].map((item, idx) => (
              <li key={idx} className="flex items-center gap-3">
                <Check className="h-5 w-5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <button 
              onClick={() => onNavigate("home")}
              className="inline-flex items-center gap-2"
            >
              {branding.logoUrl ? (
                <img 
                  src={branding.logoUrl} 
                  alt={branding.platformName}
                  className="h-12 w-auto object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div 
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {branding.platformName.charAt(0)}
                </div>
              )}
              <span 
                className="text-2xl font-bold"
                style={{ color: branding.primaryColor }}
              >
                {branding.platformName}
              </span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-950 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-8">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
              Crear Cuenta
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              Completa tus datos para empezar
            </p>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={handleChange("firstName")}
                    placeholder="Juan"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                    required
                    data-testid="input-signup-firstname"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={handleChange("lastName")}
                    placeholder="Pérez"
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                    required
                    data-testid="input-signup-lastname"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleChange("email")}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  required
                  data-testid="input-signup-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange("phone")}
                  placeholder="+52 555 123 4567"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  data-testid="input-signup-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nombre del negocio
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={handleChange("businessName")}
                  placeholder="Mi Negocio S.A."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  data-testid="input-signup-business"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2"
                  required
                  data-testid="input-signup-password"
                />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="rounded mt-1" required />
                <span className="text-slate-600 dark:text-slate-400">
                  Acepto los{" "}
                  <button type="button" className="underline" style={{ color: branding.primaryColor }}>
                    Términos de Servicio
                  </button>
                  {" "}y la{" "}
                  <button type="button" className="underline" style={{ color: branding.primaryColor }}>
                    Política de Privacidad
                  </button>
                </span>
              </label>
              <Button 
                type="submit"
                className="w-full text-white py-6"
                style={{ backgroundColor: branding.primaryColor }}
                disabled={loading}
                data-testid="button-signup-submit"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Crear Cuenta"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
              ¿Ya tienes cuenta?{" "}
              <button 
                onClick={() => onNavigate("login")}
                className="font-medium hover:underline"
                style={{ color: branding.primaryColor }}
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
