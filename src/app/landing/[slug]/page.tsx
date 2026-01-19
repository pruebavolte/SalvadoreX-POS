"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, Package, BarChart3, FileText, Users, Clock, 
  Shield, Zap, Star, Check, ArrowRight, Phone, Mail, MapPin,
  Scissors, Store, UtensilsCrossed, Wrench, Car, Heart, Book,
  Shirt, Coffee, Dumbbell, Camera, Music, Palette, Briefcase,
  Building, Plane, Truck, Loader2, Sparkles, Timer, Flower2,
  PawPrint, Stethoscope, Hammer, HardHat, Pill, Croissant, Cookie,
  ChefHat, Flower, Gift, Gem, Crown, Play, Volume2, VolumeX,
  Calendar, Receipt, CreditCard, Smartphone, Globe, Award,
  TrendingUp, Target, Layers, Settings, Bell, MessageCircle, ShoppingBag, Cake
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  ShoppingCart, Package, BarChart3, FileText, Users, Clock, Shield, Zap,
  Star, Check, ArrowRight, Phone, Mail, MapPin, Scissors, Store,
  UtensilsCrossed, Wrench, Car, Heart, Book, Shirt, Coffee, Dumbbell,
  Camera, Music, Palette, Briefcase, Building, Plane, Truck, Sparkles,
  Timer, Flower2, PawPrint, Stethoscope, Hammer, HardHat, Pill, Croissant,
  Cookie, ChefHat, Flower, Gift, Gem, Crown, Play, Volume2, VolumeX,
  Calendar, Receipt, CreditCard, Smartphone, Globe, Award, TrendingUp,
  Target, Layers, Settings, Bell, MessageCircle, ShoppingBag, Cake,
};

interface LandingPageData {
  tenantId: string;
  status: string;
  businessType: string;
  content: {
    hero: { title: string; subtitle: string; cta: string; videoSearchTerm?: string };
    about: { title: string; description: string };
    features: Array<{ title: string; description: string; icon: string }>;
    benefits: string[];
    testimonials: Array<{ name: string; role: string; text: string; location?: string }>;
    stats?: Array<{ value: string; label: string }>;
    pricing: { title: string; price: string; period: string; features: string[] };
    cta: { title: string; subtitle: string; button: string };
    footer: { tagline: string };
    uniquePhrase?: string;
  };
  images: string[];
  videos?: string[];
  videoThumbnails?: string[];
  colorPalette: { primary: string; secondary: string; accent: string; background: string; text: string; gradient?: string };
  layoutVariant: string;
  animationPreset?: string;
  mood?: string;
  sectionIcons?: string[];
}

interface TenantData {
  id: string;
  name: string;
  slug: string;
  settings: {
    branding?: {
      primary_color?: string;
      logo_url?: string;
      platform_name?: string;
    };
  };
}

function FeatureIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = ICON_MAP[iconName] || Package;
  return <IconComponent className={className} />;
}

export default function LandingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [landingData, setLandingData] = useState<LandingPageData | null>(null);
  const [generating, setGenerating] = useState(false);
  const [videoMuted, setVideoMuted] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const tenantRes = await fetch(`/api/tenants/by-slug?slug=${slug}`);
        if (!tenantRes.ok) {
          setError("Marca no encontrada");
          setLoading(false);
          return;
        }
        const tenantData = await tenantRes.json();
        setTenant(tenantData.tenant);

        const landingRes = await fetch(`/api/landing-pages/generate?tenantId=${tenantData.tenant.id}`);
        if (landingRes.ok) {
          const data = await landingRes.json();
          // If status is still "generating", trigger actual generation
          if (data.landingPage.status === "generating" || !data.landingPage.content?.hero) {
            const storedBusinessType = tenantData.tenant.settings?.business_type;
            if (!storedBusinessType) {
              // No business type configured - show error instead of generating generic content
              setError("Esta marca no tiene un giro de negocio configurado. Por favor edítala para agregar el giro.");
              return;
            }
            setGenerating(true);
            const genRes = await fetch("/api/landing-pages/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                tenantId: tenantData.tenant.id,
                businessName: tenantData.tenant.name,
                businessType: storedBusinessType,
              }),
            });
            if (genRes.ok) {
              const genData = await genRes.json();
              setLandingData(genData.landingPage);
            }
            setGenerating(false);
          } else {
            setLandingData(data.landingPage);
          }
        } else if (landingRes.status === 404) {
          const storedBusinessType = tenantData.tenant.settings?.business_type;
          if (!storedBusinessType) {
            setError("Esta marca no tiene un giro de negocio configurado. Por favor edítala para agregar el giro.");
            return;
          }
          setGenerating(true);
          const genRes = await fetch("/api/landing-pages/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tenantId: tenantData.tenant.id,
              businessName: tenantData.tenant.name,
              businessType: storedBusinessType,
            }),
          });
          if (genRes.ok) {
            const genData = await genRes.json();
            setLandingData(genData.landingPage);
          }
          setGenerating(false);
        }
      } catch (err) {
        console.error("Error loading landing page:", err);
        setError("Error al cargar la página");
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchData();
    }
  }, [slug]);

  if (loading || generating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-blue-600" />
          <p className="text-lg text-gray-600">
            {generating ? "Generando tu landing page personalizada..." : "Cargando..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md">
          <CardContent className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-gray-800">Página no encontrada</h1>
            <p className="text-gray-600">{error || "La marca que buscas no existe."}</p>
            <Button onClick={() => window.location.href = "/"}>Volver al inicio</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const content: LandingPageData["content"] = landingData?.content || getDefaultContent(tenant.name);
  const images = landingData?.images || [];
  const videos = landingData?.videos || [];
  const palette = landingData?.colorPalette || { primary: "#3b82f6", secondary: "#1e40af", accent: "#60a5fa", background: "#f8fafc", text: "#1e293b" };
  const brandColor = tenant.settings?.branding?.primary_color || palette.primary;
  const logoUrl = tenant.settings?.branding?.logo_url;
  const brandName = tenant.settings?.branding?.platform_name || tenant.name;
  const mood = landingData?.mood || "professional";
  const stats = content.stats || [];
  const uniquePhrase = content.uniquePhrase || "";
  const isDarkMood = mood === "luxury" || mood === "masculine";

  const toggleVideoMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setVideoMuted(!videoMuted);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: palette.background, color: palette.text }}>
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b ${isDarkMood ? "bg-gray-900/80 border-gray-800" : "bg-white/80"}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={brandName} className="h-10 w-auto" data-testid="img-brand-logo" />
            ) : (
              <div 
                className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: brandColor }}
                data-testid="div-brand-logo-placeholder"
              >
                {brandName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className={`text-xl font-bold ${isDarkMood ? "text-white" : ""}`} data-testid="text-brand-name">{brandName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className={`${isDarkMood ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}>Características</a>
            <a href="#pricing" className={`${isDarkMood ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}>Precios</a>
            <a href="#contact" className={`${isDarkMood ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"} transition-colors`}>Contacto</a>
            <div>
              <Button style={{ backgroundColor: brandColor }} data-testid="button-header-cta">
                Comenzar
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <section className="relative py-20 md:py-32 overflow-hidden min-h-[80vh] flex items-center">
        {videos[0] ? (
          <div className="absolute inset-0 z-0">
            <video 
              ref={videoRef}
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
              data-testid="video-hero-background"
            >
              <source src={videos[0]} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />
            <button 
              onClick={toggleVideoMute}
              className="absolute bottom-4 right-4 z-20 p-3 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
              data-testid="button-video-mute"
            >
              {videoMuted ? <VolumeX className="w-5 h-5 text-white" /> : <Volume2 className="w-5 h-5 text-white" />}
            </button>
          </div>
        ) : images[0] ? (
          <div className="absolute inset-0 z-0">
            <img src={images[0]} alt="Hero" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>
        ) : (
          <div className="absolute inset-0 z-0" style={{ background: palette.gradient || `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)` }} />
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center w-full">
          <div>
            {uniquePhrase && (
              <Badge className="mb-6 text-sm py-1 px-4" style={{ backgroundColor: `${brandColor}30`, color: "white", border: `1px solid ${brandColor}` }}>
                <Sparkles className="w-4 h-4 mr-2" />
                {uniquePhrase}
              </Badge>
            )}
            <h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight"
              data-testid="text-hero-title"
            >
              {content.hero.title}
            </h1>
          </div>
          <p 
            className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto text-white/90"
            data-testid="text-hero-subtitle"
          >
            {content.hero.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div>
              <Button 
                size="lg" 
                style={{ backgroundColor: brandColor }}
                className="text-lg px-8 shadow-lg"
                data-testid="button-hero-cta"
              >
                {content.hero.cta}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <div>
              <Button 
                size="lg" 
                variant="outline"
                className="text-white border-white hover:bg-white/10 backdrop-blur-sm"
                data-testid="button-hero-demo"
              >
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="py-12 relative overflow-hidden" style={{ background: palette.gradient || `linear-gradient(135deg, ${palette.primary} 0%, ${palette.secondary} 100%)` }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className="text-center text-white"
                >
                  <div className="text-4xl md:text-5xl font-bold mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/80 text-sm md:text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-white" id="about">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" data-testid="text-about-title">
                {content.about.title}
              </h2>
              <p className="text-lg text-gray-600 mb-8" data-testid="text-about-description">
                {content.about.description}
              </p>
              <div className="space-y-3">
                {content.benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Check className="w-4 h-4" />
                    </div>
                    <span className="text-gray-700" data-testid={`text-benefit-${i}`}>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            {images[1] && (
              <div className="relative">
                <img 
                  src={images[1]} 
                  alt="About" 
                  className="rounded-2xl shadow-2xl" 
                  data-testid="img-about"
                />
                <div 
                  className="absolute -bottom-6 -right-6 w-32 h-32 rounded-2xl opacity-20"
                  style={{ backgroundColor: brandColor }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" id="features" style={{ backgroundColor: palette.background }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>
              Características
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Herramientas diseñadas específicamente para tu tipo de negocio
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.features.slice(0, 6).map((feature, i) => (
              <div key={i}>
                <Card className="hover-elevate transition-all duration-300 h-full group" data-testid={`card-feature-${i}`}>
                  <CardContent className="p-6">
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4"
                      style={{ backgroundColor: brandColor }}
                    >
                      <FeatureIcon iconName={feature.icon} className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">{feature.title}</h3>
                    <p className="text-gray-600 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

      {images[2] && (
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0">
            <img src={images[2]} alt="Feature" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/60" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 text-center text-white">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              Únete a cientos de negocios exitosos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
                <div className="text-white/80">Negocios activos</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">1M+</div>
                <div className="text-white/80">Transacciones</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">99.9%</div>
                <div className="text-white/80">Uptime</div>
              </div>
              <div>
                <div className="text-4xl md:text-5xl font-bold mb-2">24/7</div>
                <div className="text-white/80">Soporte</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>
              Testimonios
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Lo que dicen nuestros clientes</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {content.testimonials.map((testimonial, i) => (
              <Card key={i} className="p-6" data-testid={`card-testimonial-${i}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 text-lg italic">"{testimonial.text}"</p>
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: brandColor }}
                    >
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-gray-600 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" id="pricing" style={{ backgroundColor: palette.background }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <Badge className="mb-4" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}>
              Precios
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.pricing.title}</h2>
          </div>
          <div className="max-w-md mx-auto">
            <Card className="overflow-hidden" data-testid="card-pricing">
              <div className="p-8 text-center text-white" style={{ backgroundColor: brandColor }}>
                <div className="text-5xl font-bold mb-2">${content.pricing.price}</div>
                <div className="text-white/80">MXN / {content.pricing.period}</div>
              </div>
              <CardContent className="p-8">
                <ul className="space-y-4">
                  {content.pricing.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <Check className="w-5 h-5" style={{ color: brandColor }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-8 text-lg py-6"
                  style={{ backgroundColor: brandColor }}
                  data-testid="button-pricing-cta"
                >
                  Comenzar Ahora
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24" id="contact">
        <div className="max-w-7xl mx-auto px-4">
          <div 
            className="rounded-3xl p-8 md:p-16 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${palette.secondary} 100%)` }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-cta-title">
              {content.cta.title}
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              {content.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-100 text-lg px-8"
                data-testid="button-final-cta"
              >
                {content.cta.button}
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-white border-white hover:bg-white/10"
              >
                <Phone className="mr-2 h-5 w-5" />
                Contactar
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={brandName} className="h-8 w-auto brightness-0 invert" />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: brandColor }}
                  >
                    {brandName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-lg font-bold">{brandName}</span>
              </div>
              <p className="text-gray-400">{content.footer.tagline}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white">Características</a></li>
                <li><a href="#pricing" className="hover:text-white">Precios</a></li>
                <li><a href="#" className="hover:text-white">Integraciones</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Centro de ayuda</a></li>
                <li><a href="#" className="hover:text-white">Documentación</a></li>
                <li><a href="#" className="hover:text-white">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">Privacidad</a></li>
                <li><a href="#" className="hover:text-white">Términos</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
            <p className="text-sm mt-2">Powered by SalvadoreX</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function getDefaultContent(name: string): LandingPageData["content"] {
  return {
    hero: {
      title: `Bienvenido a ${name}`,
      subtitle: "La solución integral para administrar tu negocio de manera eficiente",
      cta: "Comenzar Ahora",
    },
    about: {
      title: `Sobre ${name}`,
      description: `${name} ofrece una plataforma completa de punto de venta diseñada específicamente para tu negocio.`,
    },
    features: [
      { title: "Punto de Venta", description: "Cobra de manera ágil", icon: "ShoppingCart" },
      { title: "Inventario", description: "Controla tu stock", icon: "Package" },
      { title: "Reportes", description: "Analiza tus ventas", icon: "BarChart3" },
      { title: "Facturación", description: "Cumple con el SAT", icon: "FileText" },
    ],
    benefits: [
      "Aumenta tus ventas",
      "Reduce errores",
      "Ahorra tiempo",
      "Acceso multiplataforma",
    ],
    testimonials: [
      { name: "María García", role: "Propietaria", text: "Excelente sistema para mi negocio." },
      { name: "Carlos López", role: "Gerente", text: "Me ahorra horas de trabajo." },
    ],
    stats: [],
    pricing: {
      title: "Plan Profesional",
      price: "899",
      period: "mes",
      features: ["Usuarios ilimitados", "Soporte 24/7", "Facturación CFDI", "Reportes"],
    },
    cta: {
      title: "¿Listo para crecer?",
      subtitle: "Únete a miles de negocios exitosos",
      button: "Solicitar Demo",
    },
    footer: {
      tagline: "Tu negocio, simplificado",
    },
    uniquePhrase: "",
  };
}
