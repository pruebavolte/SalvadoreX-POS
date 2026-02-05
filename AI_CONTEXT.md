# SalvadoreX - AI Integration Context Document

This document provides complete context for AI systems to understand, navigate, and modify the SalvadoreX POS system.

## Quick Reference

| Item | Value |
|------|-------|
| **Repository** | https://github.com/pruebavolte/SalvadoreX-POS |
| **Framework** | Next.js 16.1.3 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL (Supabase) |
| **Auth** | Clerk |
| **Styling** | Tailwind CSS + Shadcn/UI |

---

## 1. System Architecture

### Technology Stack
```
Frontend: Next.js 16 + React 19 + TypeScript
Backend:  Next.js API Routes (App Router)
Database: Supabase (PostgreSQL) with Prisma ORM
Auth:     Clerk (JWT + RBAC)
Styling:  Tailwind CSS + Shadcn/UI + Radix UI
State:    React Context + TanStack Query
```

### Directory Structure
```
SalvadoreX-POS/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (Backend)
│   │   │   ├── github-webhook/    # GitHub webhook receiver
│   │   │   ├── deploy-status/     # Deployment status API
│   │   │   ├── white-labels/      # White label CRUD
│   │   │   ├── verticals/         # Business verticals
│   │   │   ├── products/          # Product management
│   │   │   ├── sales/             # Sales transactions
│   │   │   ├── customers/         # Customer management
│   │   │   └── ...               # Other API endpoints
│   │   ├── dashboard/         # Staff dashboard pages
│   │   │   ├── marcas-blancas/   # White label management
│   │   │   ├── estructuras/      # Brand design generator
│   │   │   ├── productos/        # Product catalog
│   │   │   ├── ventas/           # Sales management
│   │   │   ├── inventario/       # Inventory
│   │   │   └── ...
│   │   ├── dashboard-user/    # Customer dashboard
│   │   └── fila/              # Virtual queue (public)
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn/UI components
│   │   └── ...               # Custom components
│   ├── lib/                   # Utilities and configs
│   │   ├── supabase.ts       # Supabase client
│   │   ├── github.ts         # GitHub API client
│   │   └── ...
│   └── hooks/                 # Custom React hooks
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets
└── scripts/                   # Utility scripts
```

---

## 2. API Endpoints Reference

### Core APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET, POST | Product CRUD |
| `/api/products/[id]` | GET, PUT, DELETE | Single product |
| `/api/categories` | GET, POST | Category management |
| `/api/sales` | GET, POST | Sales transactions |
| `/api/customers` | GET, POST | Customer management |
| `/api/white-labels` | GET, POST | White label brands |
| `/api/white-labels/[id]` | GET, PUT, DELETE | Single brand |
| `/api/verticals` | GET | Business verticals |

### Automation APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/github-webhook` | POST | Receives GitHub push events, triggers auto-pull |
| `/api/github-webhook` | GET | Returns webhook configuration instructions |
| `/api/deploy-status` | GET | Current deployment status and recent commits |
| `/api/deploy-status` | POST | Manually trigger git pull |

### AI/Generation APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brand-structures/create-element` | POST | AI generates new brand elements |
| `/api/brand-structures/create-element-manual` | POST | Manual element creation |
| `/api/landing-pages/generate` | POST | Generate landing page for brand |

---

## 3. Database Schema (Key Tables)

### Core Business Tables
```sql
-- Products
products (id, name, description, price, category_id, sku, image_url, ...)

-- Categories
categories (id, name, description, parent_id, ...)

-- Sales
sales (id, customer_id, total, status, created_at, ...)

-- Customers
customers (id, name, email, phone, ...)

-- Users (synced from Clerk)
users (id, clerk_id, email, role, tenant_id, ...)
```

### White Label / Multi-tenant Tables
```sql
-- White label brands
white_labels (id, name, business_type, domain, primary_color, logo_url, ...)

-- Business verticals (types of business)
verticals (id, name, display_name, slug, category_id, ...)

-- Landing pages
landing_pages (id, brand_id, html_content, structure_config, ...)

-- Brand design elements
brand_color_palettes (id, name, colors, mood, ...)
brand_typography_sets (id, name, fonts, ...)
brand_layouts (id, name, template, ...)
brand_animation_sets (id, name, animations, ...)
brand_image_sets (id, name, images, ...)
brand_video_sets (id, name, videos, ...)
```

---

## 4. Key Modules

### 4.1 Marcas Blancas (White Labels)
**Path:** `/dashboard/marcas-blancas`
**File:** `src/app/dashboard/marcas-blancas/page.tsx`

Features:
- CRUD for white label brands
- Auto-sync with business verticals (1 brand per vertical)
- Visual Laboratory for brand design
- Live preview with device toggle (desktop/tablet/mobile)
- AI-powered design generation

### 4.2 Estructuras (Brand Design Generator)
**Path:** `/dashboard/estructuras`
**File:** `src/app/dashboard/estructuras/page.tsx`

Features:
- AI generates unique brand designs
- Element navigation (colors, typography, layouts, animations)
- Layout-specific HTML templates
- Visual catalog previews

### 4.3 Products & Inventory
**Path:** `/dashboard/productos`, `/dashboard/inventario`

Features:
- Product catalog with variants
- Inventory tracking
- Category management
- Image upload to Supabase Storage

### 4.4 Sales (POS)
**Path:** `/dashboard/ventas`

Features:
- Point of sale interface
- Multi-payment support
- Receipt generation
- Sales history

---

## 5. How to Make Changes via GitHub

### Automated Flow
```
1. Your AI pushes code to: https://github.com/pruebavolte/SalvadoreX-POS
2. GitHub webhook sends POST to: /api/github-webhook
3. Replit executes: git pull origin main
4. App automatically restarts with new code
5. Optional: Callback sent to your DEPLOY_CALLBACK_URL
```

### Webhook Payload (from GitHub)
```json
{
  "ref": "refs/heads/main",
  "after": "abc123...",
  "head_commit": {
    "id": "abc123...",
    "message": "Your commit message"
  },
  "pusher": {
    "name": "your-ai-system"
  }
}
```

### Response from Replit
```json
{
  "success": true,
  "message": "Pull successful, app will restart automatically",
  "commit": "abc123",
  "branch": "main"
}
```

### Callback Notification (to your system)
```json
{
  "status": "success",
  "message": "Deploy complete: Your commit message",
  "commit": "abc123...",
  "timestamp": "2024-01-15T10:30:00Z",
  "project": "SalvadoreX"
}
```

---

## 6. Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Supabase PostgreSQL connection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service key | Yes |
| `CLERK_SECRET_KEY` | Clerk authentication | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk public key | Yes |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature verification | Optional |
| `DEPLOY_CALLBACK_URL` | URL to notify after deploy | Optional |
| `OPENAI_API_KEY` | OpenAI for AI features | Yes |
| `PEXELS_API_KEY` | Pexels for stock images | Optional |

---

## 7. Code Patterns & Conventions

### API Route Pattern
```typescript
// src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const data = await prisma.resource.findMany();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const created = await prisma.resource.create({ data: body });
    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### Component Pattern
```typescript
// src/app/dashboard/[module]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ModulePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const res = await fetch("/api/resource");
    const json = await res.json();
    setData(json.data || []);
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Module Title</h1>
      {/* Content */}
    </div>
  );
}
```

---

## 8. Common Tasks for AI

### Add a New API Endpoint
1. Create file: `src/app/api/[endpoint]/route.ts`
2. Export GET, POST, PUT, DELETE as needed
3. Use Prisma for database operations
4. Return NextResponse.json()

### Add a New Dashboard Page
1. Create folder: `src/app/dashboard/[page]/`
2. Create file: `page.tsx` with "use client" directive
3. Import UI components from `@/components/ui/`
4. Add navigation link in sidebar if needed

### Modify Database Schema
1. Edit `prisma/schema.prisma`
2. Run: `npx prisma db push` or create migration
3. Regenerate client: `npx prisma generate`

### Add New White Label Feature
1. Modify: `src/app/dashboard/marcas-blancas/page.tsx`
2. Update API: `src/app/api/white-labels/route.ts`
3. Test sync with verticals

---

## 9. Testing Your Changes

### Check Deployment Status
```bash
curl https://YOUR-REPLIT-URL/api/deploy-status
```

### Manually Trigger Pull
```bash
curl -X POST https://YOUR-REPLIT-URL/api/deploy-status \
  -H "Content-Type: application/json" \
  -d '{"branch": "main"}'
```

### Verify Webhook
```bash
curl https://YOUR-REPLIT-URL/api/github-webhook
```

---

## 10. Important Files to Know

| File | Purpose |
|------|---------|
| `src/app/dashboard/marcas-blancas/page.tsx` | White label management UI |
| `src/app/api/white-labels/route.ts` | White label API |
| `src/app/api/github-webhook/route.ts` | GitHub webhook handler |
| `src/app/api/verticals/route.ts` | Business verticals API |
| `prisma/schema.prisma` | Database schema |
| `replit.md` | Project overview for Replit Agent |
| `AI_CONTEXT.md` | This file - AI integration context |

---

## 11. Quick Commands

```bash
# Start development server
npm run dev

# Database operations
npx prisma db push      # Push schema changes
npx prisma generate     # Regenerate Prisma client
npx prisma studio       # Visual database browser

# Git operations (via API for automation)
POST /api/deploy-status  # Trigger git pull
GET /api/deploy-status   # Check current commit
```

---

## 12. Support & Troubleshooting

### Common Issues

**Port 5000 in use:**
```bash
pkill -f "node.*next"
```

**Database connection failed:**
- Check `DATABASE_URL` environment variable
- Verify Supabase project is active

**Webhook not triggering:**
- Verify webhook URL in GitHub settings
- Check `GITHUB_WEBHOOK_SECRET` matches
- Review logs at `/api/deploy-status`

---

*Document generated for AI integration. Last updated: 2024*
