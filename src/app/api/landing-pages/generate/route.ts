import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const LAYOUT_VARIANTS = ["modern", "classic", "bold", "minimal", "elegant"] as const;

const COLOR_PALETTES = [
  { primary: "#3b82f6", secondary: "#1e40af", accent: "#60a5fa", background: "#f8fafc", text: "#1e293b" },
  { primary: "#10b981", secondary: "#047857", accent: "#34d399", background: "#f0fdf4", text: "#1e293b" },
  { primary: "#8b5cf6", secondary: "#6d28d9", accent: "#a78bfa", background: "#faf5ff", text: "#1e293b" },
  { primary: "#f59e0b", secondary: "#d97706", accent: "#fbbf24", background: "#fffbeb", text: "#1e293b" },
  { primary: "#ef4444", secondary: "#b91c1c", accent: "#f87171", background: "#fef2f2", text: "#1e293b" },
  { primary: "#06b6d4", secondary: "#0891b2", accent: "#22d3ee", background: "#ecfeff", text: "#1e293b" },
  { primary: "#ec4899", secondary: "#be185d", accent: "#f472b6", background: "#fdf2f8", text: "#1e293b" },
  { primary: "#14b8a6", secondary: "#0d9488", accent: "#2dd4bf", background: "#f0fdfa", text: "#1e293b" },
];

async function searchPexelsImages(query: string, count: number = 6): Promise<string[]> {
  if (!PEXELS_API_KEY) {
    console.warn("PEXELS_API_KEY not configured, using fallback images");
    return [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
    ];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      {
        headers: { Authorization: PEXELS_API_KEY },
      }
    );

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);

    const data = await response.json();
    return data.photos?.map((photo: any) => photo.src.large) || [];
  } catch (error) {
    console.error("Error fetching Pexels images:", error);
    return [];
  }
}

async function generateLandingContent(businessName: string, businessType: string): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    console.error("OPENROUTER_API_KEY not configured");
    return getDefaultContent(businessName, businessType);
  }

  const systemPrompt = `Eres un experto en marketing digital y diseño de landing pages para negocios mexicanos. 
Tu tarea es generar contenido ÚNICO y ESPECÍFICO para una landing page basada en el tipo de negocio.

REGLAS IMPORTANTES:
1. Todo el contenido debe ser en ESPAÑOL
2. El contenido debe ser ESPECÍFICO para el tipo de negocio mencionado
3. Incluye terminología y productos relevantes para ese giro de negocio en México
4. Las características deben reflejar lo que ese tipo de negocio realmente necesita
5. Los testimoniales deben ser realistas para el contexto mexicano
6. El tono debe ser profesional pero cercano

Responde SOLO con un objeto JSON válido (sin markdown, sin \`\`\`), con esta estructura exacta:
{
  "hero": {
    "title": "Título principal atractivo para [tipo de negocio]",
    "subtitle": "Subtítulo que describe el valor del sistema POS",
    "cta": "Texto del botón de acción"
  },
  "about": {
    "title": "Título sección nosotros",
    "description": "Descripción de 2-3 oraciones sobre cómo el POS ayuda a este tipo de negocio"
  },
  "features": [
    {
      "title": "Nombre de característica 1",
      "description": "Descripción breve",
      "icon": "nombre_icono_lucide"
    },
    {
      "title": "Nombre de característica 2",
      "description": "Descripción breve",
      "icon": "nombre_icono_lucide"
    },
    {
      "title": "Nombre de característica 3",
      "description": "Descripción breve",
      "icon": "nombre_icono_lucide"
    },
    {
      "title": "Nombre de característica 4",
      "description": "Descripción breve",
      "icon": "nombre_icono_lucide"
    }
  ],
  "benefits": [
    "Beneficio específico 1 para este negocio",
    "Beneficio específico 2 para este negocio",
    "Beneficio específico 3 para este negocio",
    "Beneficio específico 4 para este negocio"
  ],
  "testimonials": [
    {
      "name": "Nombre completo mexicano",
      "role": "Dueño de [nombre de negocio]",
      "text": "Testimonio realista de 1-2 oraciones"
    },
    {
      "name": "Nombre completo mexicano",
      "role": "Gerente de [nombre de negocio]",
      "text": "Testimonio realista de 1-2 oraciones"
    }
  ],
  "pricing": {
    "title": "Plan para tu negocio",
    "price": "899",
    "period": "mes",
    "features": ["Característica 1", "Característica 2", "Característica 3", "Característica 4"]
  },
  "cta": {
    "title": "Título de llamada a la acción final",
    "subtitle": "Subtítulo motivador",
    "button": "Texto del botón"
  },
  "footer": {
    "tagline": "Eslogan corto"
  },
  "imageSearchTerms": ["término de búsqueda 1 para imágenes", "término 2", "término 3"]
}`;

  const userMessage = `Genera contenido de landing page para un negocio llamado "${businessName}" del tipo "${businessType}".

El contenido debe ser 100% específico para ${businessType}. Por ejemplo:
- Si es una barbería: habla de citas, cortes, servicios de barbería
- Si es una zapatería: habla de inventario de calzado, tallas, proveedores
- Si es un restaurante: habla de mesas, pedidos, menú digital
- Si es una tienda de abarrotes: habla de inventario, proveedores, puntos de venta

Incluye características del sistema POS que serían útiles para ${businessType}.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.systeminternational.app",
        "X-Title": "SalvadoreX Landing Page Generator",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenRouter API error:", error);
      return getDefaultContent(businessName, businessType);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return getDefaultContent(businessName, businessType);
    }

    try {
      const cleanContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return getDefaultContent(businessName, businessType);
    }
  } catch (error) {
    console.error("Error calling OpenRouter:", error);
    return getDefaultContent(businessName, businessType);
  }
}

function getDefaultContent(businessName: string, businessType: string) {
  return {
    hero: {
      title: `Sistema POS para ${businessType || businessName}`,
      subtitle: "La solución integral para administrar tu negocio de manera eficiente",
      cta: "Comenzar Ahora",
    },
    about: {
      title: `Sobre ${businessName}`,
      description: `${businessName} ofrece una plataforma completa de punto de venta diseñada específicamente para ${businessType || "tu negocio"}. Simplifica tus operaciones y aumenta tus ventas.`,
    },
    features: [
      { title: "Punto de Venta Rápido", description: "Cobra de manera ágil y sin complicaciones", icon: "ShoppingCart" },
      { title: "Inventario Inteligente", description: "Controla tu stock en tiempo real", icon: "Package" },
      { title: "Reportes Detallados", description: "Analiza tus ventas y toma mejores decisiones", icon: "BarChart3" },
      { title: "Facturación Electrónica", description: "Cumple con el SAT automáticamente", icon: "FileText" },
    ],
    benefits: [
      "Aumenta tus ventas hasta un 30%",
      "Reduce errores en el inventario",
      "Ahorra tiempo en la administración",
      "Accede desde cualquier dispositivo",
    ],
    testimonials: [
      { name: "María García", role: "Propietaria", text: "Este sistema cambió la forma en que manejo mi negocio. Ahora todo es más fácil." },
      { name: "Carlos López", role: "Gerente", text: "La facturación electrónica me ahorra horas de trabajo cada semana." },
    ],
    pricing: {
      title: "Plan Profesional",
      price: "899",
      period: "mes",
      features: ["Usuarios ilimitados", "Soporte 24/7", "Facturación CFDI", "Reportes avanzados"],
    },
    cta: {
      title: "¿Listo para transformar tu negocio?",
      subtitle: "Únete a miles de negocios que ya usan nuestra plataforma",
      button: "Solicitar Demo Gratis",
    },
    footer: {
      tagline: "Tu negocio, simplificado",
    },
    imageSearchTerms: [businessType || "business", "store", "shop"],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, businessName, businessType } = await request.json();

    if (!tenantId || !businessName) {
      return NextResponse.json(
        { error: "tenantId and businessName are required" },
        { status: 400 }
      );
    }

    const effectiveBusinessType = businessType || businessName;
    console.log(`[Landing API] Delegating to landing-generator for ${businessName} (${effectiveBusinessType})`);
    
    const { generateLandingPageForTenant } = await import("@/lib/landing-generator");
    
    const result = await generateLandingPageForTenant(tenantId, businessName, effectiveBusinessType);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to generate landing page" }, { status: 500 });
    }

    console.log(`[Landing API] Successfully generated landing page for ${businessName}`);

    return NextResponse.json({
      success: true,
      landingPage: {
        tenantId,
        status: "ready",
        content: result.landingPage?.content,
        images: result.landingPage?.images,
        videos: result.landingPage?.videos || [],
        videoThumbnails: result.landingPage?.videoThumbnails || [],
        colorPalette: result.landingPage?.colorPalette,
        layoutVariant: result.landingPage?.layoutVariant,
        animationPreset: result.landingPage?.animationPreset,
        mood: result.landingPage?.mood,
        sectionIcons: result.landingPage?.sectionIcons,
      },
    });
  } catch (error) {
    console.error("[Landing API] Generation error:", error);
    return NextResponse.json({ error: "Failed to generate landing page" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = request.nextUrl.searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
    }

    const { data: landingPage, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();

    if (error || !landingPage) {
      return NextResponse.json({ error: "Landing page not found" }, { status: 404 });
    }

    return NextResponse.json({
      landingPage: {
        id: landingPage.id,
        tenantId: landingPage.tenant_id,
        status: landingPage.status,
        businessType: landingPage.business_type,
        content: landingPage.content,
        images: landingPage.images,
        videos: landingPage.videos || [],
        videoThumbnails: landingPage.video_thumbnails || [],
        colorPalette: landingPage.color_palette,
        layoutVariant: landingPage.layout_variant,
        animationPreset: landingPage.animation_preset,
        mood: landingPage.mood,
        sectionIcons: landingPage.section_icons,
        generatedAt: landingPage.generated_at,
      },
    });
  } catch (error) {
    console.error("[Landing] Error fetching landing page:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
