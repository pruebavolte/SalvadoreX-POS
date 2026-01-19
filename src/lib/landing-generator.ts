import { Pool } from "pg";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet";
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

// Design Provider Abstraction
// Currently uses AI (OpenRouter) + Pexels for content/media generation
// Figma/Motiff APIs don't support programmatic website generation
// This abstraction allows for future provider integrations
export type DesignProvider = "ai" | "figma" | "motiff";

export interface DesignProviderConfig {
  provider: DesignProvider;
  enabled: boolean;
  fallbackToAI: boolean;
}

const DESIGN_PROVIDER_CONFIG: DesignProviderConfig = {
  provider: "ai", // Default: AI-based generation
  enabled: true,
  fallbackToAI: true, // Always fall back to AI if other providers fail
};

export function getDesignProviderConfig(): DesignProviderConfig {
  return DESIGN_PROVIDER_CONFIG;
}

function getPool() {
  return new Pool({ connectionString: DATABASE_URL });
}

const LAYOUT_VARIANTS = ["modern", "classic", "bold", "minimal", "elegant", "dynamic", "luxury", "playful", "corporate", "artisan"] as const;

const ANIMATION_PRESETS = {
  energetic: { duration: 0.3, type: "spring", stiffness: 400 },
  smooth: { duration: 0.6, type: "tween", ease: "easeInOut" },
  bouncy: { duration: 0.5, type: "spring", bounce: 0.4 },
  elegant: { duration: 0.8, type: "tween", ease: "easeOut" },
  quick: { duration: 0.2, type: "tween", ease: "linear" },
} as const;

const VERTICAL_STYLE_HINTS: Record<string, { colors: string[]; mood: string; icons: string[] }> = {
  barberia: { colors: ["#1a1a2e", "#16213e", "#0f3460"], mood: "masculine", icons: ["Scissors", "User", "Clock"] },
  restaurante: { colors: ["#ff6b35", "#f7c59f", "#2ec4b6"], mood: "warm", icons: ["UtensilsCrossed", "ChefHat", "Clock"] },
  cafeteria: { colors: ["#6f4e37", "#b68d40", "#d4a574"], mood: "cozy", icons: ["Coffee", "Cake", "Heart"] },
  tienda_ropa: { colors: ["#e91e63", "#9c27b0", "#673ab7"], mood: "fashionable", icons: ["Shirt", "ShoppingBag", "Sparkles"] },
  gimnasio: { colors: ["#ff5722", "#4caf50", "#2196f3"], mood: "energetic", icons: ["Dumbbell", "Heart", "Timer"] },
  spa: { colors: ["#a8dadc", "#457b9d", "#1d3557"], mood: "relaxing", icons: ["Flower2", "Heart", "Sparkles"] },
  veterinaria: { colors: ["#4caf50", "#8bc34a", "#ffeb3b"], mood: "caring", icons: ["Heart", "PawPrint", "Stethoscope"] },
  ferreteria: { colors: ["#ff9800", "#795548", "#607d8b"], mood: "industrial", icons: ["Wrench", "Hammer", "HardHat"] },
  farmacia: { colors: ["#00bcd4", "#4caf50", "#ffffff"], mood: "clinical", icons: ["Pill", "Heart", "Shield"] },
  panaderia: { colors: ["#d4a574", "#f5deb3", "#8b4513"], mood: "artisan", icons: ["Croissant", "Cookie", "ChefHat"] },
  floristeria: { colors: ["#e91e63", "#9c27b0", "#4caf50"], mood: "romantic", icons: ["Flower", "Heart", "Gift"] },
  joyeria: { colors: ["#ffd700", "#c0c0c0", "#1a1a2e"], mood: "luxury", icons: ["Gem", "Crown", "Sparkles"] },
  default: { colors: ["#3b82f6", "#1e40af", "#60a5fa"], mood: "professional", icons: ["Store", "ShoppingCart", "BarChart3"] },
};

async function searchPexelsImages(query: string, count: number = 6): Promise<string[]> {
  if (!PEXELS_API_KEY) {
    console.warn("[LandingGen] PEXELS_API_KEY not configured, using fallback images");
    return [
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
    ];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);

    const data = await response.json();
    return data.photos?.map((photo: any) => photo.src.large) || [];
  } catch (error) {
    console.error("[LandingGen] Error fetching Pexels images:", error);
    return [];
  }
}

async function searchPexelsVideos(query: string, count: number = 2): Promise<Array<{ url: string; thumbnail: string }>> {
  if (!PEXELS_API_KEY) {
    console.warn("[LandingGen] PEXELS_API_KEY not configured for videos");
    return [];
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&size=medium`,
      { headers: { Authorization: PEXELS_API_KEY } }
    );

    if (!response.ok) throw new Error(`Pexels Videos API error: ${response.status}`);

    const data = await response.json();
    return data.videos?.map((video: any) => ({
      url: video.video_files?.find((f: any) => f.quality === "hd" || f.quality === "sd")?.link || video.video_files?.[0]?.link || "",
      thumbnail: video.image || "",
    })).filter((v: any) => v.url) || [];
  } catch (error) {
    console.error("[LandingGen] Error fetching Pexels videos:", error);
    return [];
  }
}

function getVerticalStyleHints(businessType: string): { colors: string[]; mood: string; icons: string[] } {
  const normalizedType = businessType.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
  
  for (const [key, value] of Object.entries(VERTICAL_STYLE_HINTS)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return value;
    }
  }
  return VERTICAL_STYLE_HINTS.default;
}

// Style presets for preview generation
export const STYLE_PRESETS = {
  modern: { 
    layout: "modern", 
    mood: "professional", 
    colors: ["#3b82f6", "#1e40af", "#60a5fa"],
    description: "Diseño limpio y moderno con tonos azules profesionales"
  },
  classic: { 
    layout: "classic", 
    mood: "warm", 
    colors: ["#d97706", "#b45309", "#f59e0b"],
    description: "Estilo clásico y cálido con tonos ámbar"
  },
  luxury: { 
    layout: "luxury", 
    mood: "elegant", 
    colors: ["#ffd700", "#1a1a2e", "#c0c0c0"],
    description: "Diseño elegante y lujoso con dorado y negro"
  },
} as const;

export type StyleVariant = keyof typeof STYLE_PRESETS;

export interface DesignPreview {
  styleVariant: StyleVariant;
  styleName: string;
  description: string;
  heroTitle: string;
  heroSubtitle: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  thumbnailImage: string;
  layoutVariant: string;
}

export async function generateDesignPreview(
  styleVariant: StyleVariant,
  businessType: string
): Promise<DesignPreview> {
  const preset = STYLE_PRESETS[styleVariant];
  const searchQuery = `${businessType} ${preset.mood} ${styleVariant}`;
  
  const images = await searchPexelsImages(searchQuery, 1);
  const thumbnailImage = images[0] || "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop";
  
  const titles: Record<StyleVariant, { title: string; subtitle: string }> = {
    modern: {
      title: `Tu ${businessType} del futuro`,
      subtitle: "Tecnología y eficiencia para tu negocio moderno"
    },
    classic: {
      title: `Tradición y calidad en ${businessType}`,
      subtitle: "La experiencia que tus clientes merecen"
    },
    luxury: {
      title: `${businessType} de lujo`,
      subtitle: "Exclusividad y elegancia en cada detalle"
    },
  };
  
  const { title, subtitle } = titles[styleVariant];
  
  const colorPalette = {
    primary: preset.colors[0],
    secondary: preset.colors[1],
    accent: preset.colors[2],
    background: styleVariant === "luxury" ? "#0f0f0f" : "#f8fafc",
    text: styleVariant === "luxury" ? "#f8fafc" : "#1e293b",
  };
  
  return {
    styleVariant,
    styleName: styleVariant.charAt(0).toUpperCase() + styleVariant.slice(1),
    description: preset.description,
    heroTitle: title,
    heroSubtitle: subtitle,
    colorPalette,
    thumbnailImage,
    layoutVariant: preset.layout,
  };
}

export async function generateAllStylePreviews(businessType: string): Promise<DesignPreview[]> {
  const variants: StyleVariant[] = ["modern", "classic", "luxury"];
  const previews = await Promise.all(
    variants.map(variant => generateDesignPreview(variant, businessType))
  );
  return previews;
}

function generateUniqueColorPalette(businessType: string, hints: { colors: string[]; mood: string }) {
  const baseColors = hints.colors;
  const randomHue = Math.floor(Math.random() * 30) - 15;
  
  const adjustHue = (hex: string, shift: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const l = (max + min) / 2 / 255;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    h = ((h * 360 + shift + 360) % 360) / 360;
    const s = d === 0 ? 0 : l > 0.5 ? d / 255 / (2 - 2 * l) : d / 255 / (2 * l);
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const nr = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const ng = Math.round(hue2rgb(p, q, h) * 255);
    const nb = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
  };

  return {
    primary: adjustHue(baseColors[0] || "#3b82f6", randomHue),
    secondary: adjustHue(baseColors[1] || "#1e40af", randomHue),
    accent: adjustHue(baseColors[2] || "#60a5fa", randomHue),
    background: hints.mood === "luxury" ? "#0f0f0f" : hints.mood === "masculine" ? "#1a1a2e" : "#f8fafc",
    text: hints.mood === "luxury" || hints.mood === "masculine" ? "#f8fafc" : "#1e293b",
    gradient: `linear-gradient(135deg, ${adjustHue(baseColors[0] || "#3b82f6", randomHue)} 0%, ${adjustHue(baseColors[1] || "#1e40af", randomHue)} 100%)`,
  };
}

async function generateLandingContent(businessName: string, businessType: string): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    console.error("[LandingGen] OPENROUTER_API_KEY not configured");
    return getDefaultContent(businessName, businessType);
  }

  const styleHints = getVerticalStyleHints(businessType);

  const systemPrompt = `Eres un experto en marketing digital y diseño de landing pages para negocios mexicanos.
Tu tarea es generar contenido ÚNICO, CREATIVO y MUY ESPECÍFICO para una landing page.
CADA LANDING PAGE DEBE SER COMPLETAMENTE DIFERENTE - usa terminología, estilo y personalidad únicos.

REGLAS IMPORTANTES:
1. Todo el contenido en ESPAÑOL mexicano coloquial y profesional
2. El contenido debe ser 100% ESPECÍFICO para el giro de negocio
3. USA CREATIVIDAD - cada título, subtítulo y descripción debe ser ÚNICO
4. Incluye jerga y términos específicos del giro en México
5. Los testimoniales deben parecer REALES con nombres mexicanos completos
6. Adapta el TONO según el tipo de negocio (elegante para joyería, energético para gym, etc.)

EL GIRO DE NEGOCIO ES: ${businessType}
AMBIENTE/MOOD SUGERIDO: ${styleHints.mood}

Responde SOLO con JSON válido (sin markdown), estructura:
{
  "hero": {
    "title": "Título ÚNICO y creativo que capture la esencia de ${businessType}",
    "subtitle": "Subtítulo emocional y específico para el giro",
    "cta": "Llamada a acción relevante",
    "videoSearchTerm": "término específico para buscar video de fondo (ej: 'barbershop haircut close up')"
  },
  "about": {
    "title": "Título creativo para sección nosotros",
    "description": "Descripción de 2-3 oraciones muy específica para ${businessType}"
  },
  "features": [
    {"title": "Característica 1 específica para ${businessType}", "description": "Descripción", "icon": "IconoLucide"},
    {"title": "Característica 2 específica", "description": "Descripción", "icon": "IconoLucide"},
    {"title": "Característica 3 específica", "description": "Descripción", "icon": "IconoLucide"},
    {"title": "Característica 4 específica", "description": "Descripción", "icon": "IconoLucide"},
    {"title": "Característica 5 específica", "description": "Descripción", "icon": "IconoLucide"},
    {"title": "Característica 6 específica", "description": "Descripción", "icon": "IconoLucide"}
  ],
  "benefits": ["Beneficio 1 específico", "Beneficio 2", "Beneficio 3", "Beneficio 4", "Beneficio 5"],
  "testimonials": [
    {"name": "Nombre completo mexicano", "role": "Puesto específico del giro", "text": "Testimonio realista 1-2 oraciones", "location": "Ciudad, Estado"},
    {"name": "Nombre completo mexicano", "role": "Puesto", "text": "Testimonio", "location": "Ciudad"},
    {"name": "Nombre completo mexicano", "role": "Puesto", "text": "Testimonio", "location": "Ciudad"}
  ],
  "stats": [
    {"value": "número realista", "label": "métrica relevante para ${businessType}"},
    {"value": "número", "label": "métrica"},
    {"value": "número", "label": "métrica"},
    {"value": "número", "label": "métrica"}
  ],
  "pricing": {
    "title": "Nombre del plan específico",
    "price": "precio realista MXN",
    "period": "mes",
    "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"]
  },
  "cta": {
    "title": "Título de cierre poderoso",
    "subtitle": "Subtítulo motivador",
    "button": "Texto del botón"
  },
  "footer": {
    "tagline": "Eslogan corto y memorable"
  },
  "imageSearchTerms": ["término específico 1", "término 2", "término 3"],
  "videoSearchTerms": ["término para video 1", "término 2"],
  "animationStyle": "energetic|smooth|bouncy|elegant|quick",
  "sectionIcons": ["Icono1", "Icono2", "Icono3"],
  "uniquePhrase": "Frase única y memorable que define este negocio"
}`;

  const userMessage = `Genera contenido de landing page para "${businessName}" del giro "${businessType}".

IMPORTANTE: El contenido debe ser COMPLETAMENTE DIFERENTE a cualquier otra landing page.
- Usa vocabulario específico del giro ${businessType}
- Los iconos deben ser de Lucide React relevantes al giro
- El estilo de animación debe coincidir con el mood: ${styleHints.mood}
- Los términos de búsqueda de imágenes y videos deben ser MUY específicos

Ejemplos de especificidad:
- Barbería: "agenda de citas para barberos", "gestión de turnos", video: "barber cutting hair mexican"
- Restaurante: "comandas digitales", "menú QR", video: "mexican restaurant kitchen busy"
- Gimnasio: "control de membresías", "check-in biométrico", video: "gym workout training"
- Joyería: "inventario de piezas únicas", "avalúos", video: "jewelry gold rings display"

¡SÉ CREATIVO Y ESPECÍFICO!`;

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
      console.error("[LandingGen] OpenRouter API error:", error);
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
      console.error("[LandingGen] Error parsing AI response:", parseError);
      return getDefaultContent(businessName, businessType);
    }
  } catch (error) {
    console.error("[LandingGen] Error calling OpenRouter:", error);
    return getDefaultContent(businessName, businessType);
  }
}

function getDefaultContent(businessName: string, businessType: string) {
  return {
    hero: {
      title: `Sistema POS para ${businessType}`,
      subtitle: "La solución integral para administrar tu negocio de manera eficiente",
      cta: "Comenzar Ahora",
    },
    about: {
      title: `Sobre ${businessName}`,
      description: `${businessName} ofrece una plataforma completa de punto de venta diseñada específicamente para ${businessType}. Simplifica tus operaciones y aumenta tus ventas.`,
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
    imageSearchTerms: [businessType, "business", "store"],
  };
}

interface LandingPageResult {
  success: boolean;
  error?: string;
  landingPage?: {
    tenantId: string;
    status: string;
    content: any;
    images: string[];
    videos: string[];
    videoThumbnails: string[];
    colorPalette: any;
    layoutVariant: string;
    animationPreset: string;
    mood: string;
    sectionIcons: string[];
  };
}

export async function generateLandingPageForTenant(
  tenantId: string,
  businessName: string,
  businessType: string
): Promise<LandingPageResult> {
  const pool = getPool();
  
  try {
    console.log(`[LandingGen] Starting ENHANCED generation for ${businessName} (${businessType})`);

    // Verify tenant exists before creating landing page (prevents FK violation)
    const tenantCheck = await pool.query(
      `SELECT id FROM tenants WHERE id = $1`,
      [tenantId]
    );

    if (tenantCheck.rows.length === 0) {
      console.error(`[LandingGen] Tenant ${tenantId} not found in tenants table - cannot create landing page`);
      await pool.end();
      return { success: false, error: `Tenant ${tenantId} not found` };
    }

    console.log(`[LandingGen] Tenant ${tenantId} verified, proceeding with landing page generation`);

    // Upsert with status generating using PostgreSQL
    await pool.query(
      `INSERT INTO landing_pages (tenant_id, status, business_type, created_at, updated_at)
       VALUES ($1, 'generating', $2, NOW(), NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET status = 'generating', business_type = $2, updated_at = NOW()`,
      [tenantId, businessType]
    );

    // Get vertical-specific style hints
    const styleHints = getVerticalStyleHints(businessType);
    console.log(`[LandingGen] Style hints for ${businessType}:`, styleHints);

    // Generate content using AI
    const content = await generateLandingContent(businessName, businessType);

    // Get image search terms from content and fetch images
    const imageSearchTerms = content.imageSearchTerms || [businessType, "business", "store"];
    const searchQuery = imageSearchTerms.join(" ");
    console.log(`[LandingGen] Searching images for: ${searchQuery}`);
    const images = await searchPexelsImages(searchQuery, 8);

    // Search for videos based on AI-generated terms
    const videoSearchTerms = content.videoSearchTerms || content.hero?.videoSearchTerm || [businessType];
    const videoQuery = Array.isArray(videoSearchTerms) ? videoSearchTerms[0] : videoSearchTerms;
    console.log(`[LandingGen] Searching videos for: ${videoQuery}`);
    const videos = await searchPexelsVideos(videoQuery, 2);

    // Generate unique color palette based on business type
    const uniquePalette = generateUniqueColorPalette(businessType, styleHints);
    console.log(`[LandingGen] Generated unique palette:`, uniquePalette);

    // Select layout variant based on mood
    const moodLayouts: Record<string, string> = {
      masculine: "bold",
      warm: "modern",
      cozy: "classic",
      fashionable: "elegant",
      energetic: "dynamic",
      relaxing: "minimal",
      caring: "playful",
      industrial: "corporate",
      clinical: "minimal",
      artisan: "artisan",
      romantic: "elegant",
      luxury: "luxury",
      professional: "modern",
    };
    const selectedLayout = moodLayouts[styleHints.mood] || LAYOUT_VARIANTS[Math.floor(Math.random() * LAYOUT_VARIANTS.length)];

    // Select animation preset based on mood
    const moodAnimations: Record<string, keyof typeof ANIMATION_PRESETS> = {
      masculine: "smooth",
      warm: "smooth",
      cozy: "elegant",
      fashionable: "elegant",
      energetic: "energetic",
      relaxing: "elegant",
      caring: "bouncy",
      industrial: "quick",
      clinical: "quick",
      artisan: "smooth",
      romantic: "elegant",
      luxury: "elegant",
      professional: "smooth",
    };
    const animationPreset = content.animationStyle || moodAnimations[styleHints.mood] || "smooth";
    const animationConfig = ANIMATION_PRESETS[animationPreset as keyof typeof ANIMATION_PRESETS] || ANIMATION_PRESETS.smooth;

    // Prepare icons from hints and AI response
    const icons = [...new Set([...(styleHints.icons || []), ...(content.sectionIcons || [])])];

    // Prepare final content
    const finalContent = {
      ...content,
      uniquePhrase: content.uniquePhrase || `La mejor solución para tu ${businessType}`,
      stats: content.stats || [
        { value: "500+", label: "Clientes satisfechos" },
        { value: "99%", label: "Uptime" },
        { value: "24/7", label: "Soporte" },
        { value: "1M+", label: "Transacciones" },
      ],
    };

    // Save to database with enhanced data using PostgreSQL
    const videoUrls = videos.map(v => v.url);
    const videoThumbnails = videos.map(v => v.thumbnail);
    
    await pool.query(
      `UPDATE landing_pages SET
        status = 'ready',
        content = $1,
        images = $2,
        videos = $3,
        video_thumbnails = $4,
        color_palette = $5,
        layout_variant = $6,
        animation_preset = $7,
        animation_config = $8,
        mood = $9,
        section_icons = $10,
        generated_at = NOW(),
        updated_at = NOW()
       WHERE tenant_id = $11`,
      [
        JSON.stringify(finalContent),
        images,
        videoUrls,
        videoThumbnails,
        JSON.stringify(uniquePalette),
        selectedLayout,
        animationPreset,
        JSON.stringify(animationConfig),
        styleHints.mood,
        icons,
        tenantId
      ]
    );

    console.log(`[LandingGen] Successfully saved landing page for ${businessName}`);

    const resultContent = {
      ...content,
      uniquePhrase: content.uniquePhrase || `La mejor solución para tu ${businessType}`,
      stats: content.stats || [
        { value: "500+", label: "Clientes satisfechos" },
        { value: "99%", label: "Uptime" },
        { value: "24/7", label: "Soporte" },
        { value: "1M+", label: "Transacciones" },
      ],
    };

    console.log(`[LandingGen] Successfully generated ENHANCED landing page for ${businessName}`);
    
    await pool.end();
    
    return { 
      success: true,
      landingPage: {
        tenantId,
        status: "ready",
        content: finalContent,
        images,
        videos: videoUrls,
        videoThumbnails,
        colorPalette: uniquePalette,
        layoutVariant: selectedLayout,
        animationPreset,
        mood: styleHints.mood,
        sectionIcons: icons,
      },
    };
  } catch (error) {
    console.error("[LandingGen] Generation error:", error);
    await pool.end();
    return { success: false, error: "Failed to generate landing page" };
  }
}
