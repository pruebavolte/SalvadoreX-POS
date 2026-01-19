# SalvadoreX - AI-Powered Point of Sale System

## Overview
SalvadoreX is an enterprise-grade Point of Sale (POS) system with advanced AI capabilities designed for restaurants and retail businesses. It integrates traditional POS functions (product catalog, inventory, sales) with cutting-edge AI features like voice ordering, menu digitalization from photos, and AI image generation for products. The system supports multi-channel sales (in-store and digital menu), multi-language interfaces (6 languages), and multi-currency operations (5 currencies). It also includes features like product variants, multi-brand/white-label capabilities, PWA support for offline functionality, real-time kitchen display, and virtual queue management. The project aims to provide a comprehensive, AI-enhanced solution for diverse business verticals.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
**Framework:** Next.js 16.0.1 with App Router and React 19.2.0, utilizing Server and Client Components with TypeScript.
**UI Components:** Shadcn/UI with Radix UI primitives and Tailwind CSS for styling, supporting dark mode and full responsiveness across devices. Responsive patterns include dynamic grid layouts, mobile-first stacking, and adaptive typography.
**State Management:** React Context API for global state, TanStack Query for server state and data fetching, and React hooks for local component state.
**Routing:** Dedicated routes for staff (`/dashboard/*`), customers (`/dashboard-user/*`), and public virtual queue (`/fila/*`).

### Backend
**API Layer:** Next.js API Routes (App Router) following a RESTful design, with server-side rendering and edge runtime support.
**Authentication:** Clerk for JWT-based authentication and role-based access control (ADMIN, USER, CUSTOMER), with user synchronization to Supabase.
**Authorization:** Implemented Role-Based Access Control (RBAC) system with tenant resolution, permission checking, and hierarchical validation using `ltree` paths. It features granular permissions (e.g., `products:view`, `orders:create`) and multi-tenant isolation via Row Level Security (RLS). A feature flag (`RBAC_ENABLED`) allows for gradual rollout.
**Remote Support Module:** WebRTC-based system for remote assistance with host and viewer secrets, rate limiting, explicit consent for remote control, and session expiration.
**Billing/Invoicing Module:** Implements Mexican electronic invoicing (CFDI 4.0) with fiscal data configuration, certificate management, and public invoice request functionality via Facturama API integration.
**Business Verticals Administration:** Manages over 250 Mexican business verticals, allowing module assignment and configuration per vertical, supporting multi-brand and white-label architectures.
**Template Products System:** Each vertical can have template products that are automatically copied to new business accounts. Administrators can create templates directly or select products from the catalog using a POS-style product search interface with visual selection, filtering by name/SKU/barcode, and multi-select capabilities.

### Data Storage
**Primary Database:** Supabase (PostgreSQL) for all application data, utilizing RLS for multi-tenant isolation, UUID primary keys, soft deletes, and audit fields.
**Secondary Database:** Supabase instance (zhvwmzkcqngcaqpdxtwr) configured as warm standby with identical schema. Password stored in `SUPABASE_DB_PASSWORD_2` secret. Schema synchronized January 2026.
**File Storage:** Supabase Storage for product images with CDN-backed URLs.
**Caching:** Service Worker for PWA offline support, React Query for server data, and localStorage for user preferences.

**Database Tables (SalvadoreX Schema):**
- `users` - User accounts synced from Clerk
- `categories` - Product categories with parent/child hierarchy
- `products` - Product catalog with multi-channel flags
- `variant_types` - Types of product variants (size, topping, etc.)
- `product_variants` - Specific variant options per product
- `customers` - Customer database with credit/loyalty
- `sales` - Completed sales transactions
- `sale_items` - Line items per sale
- `sale_item_variants` - Variants selected per sale item
- `orders` - Digital menu orders
- `order_items` - Line items per order
- `order_item_variants` - Variants selected per order item
- `global_products` - Shared barcode database

## External Dependencies

**AI Services:**
- **ElevenLabs:** Text-to-speech and speech-to-text for real-time voice ordering in multiple languages.
- **OpenRouter (Claude AI):** Natural language processing for voice commands, product matching, and context-aware conversation.
- **Google Gemini AI:** Vision API for menu digitalization from photos, extracting and structuring product data.

**Payment Processing:**
- **Stripe:** Payment gateway for general transactions, customer tracking, and invoice management.
- **Mercado Pago Point:** Integration for in-person payments via terminal devices, with OAuth 2.0.

**Image Services:**
- **Pexels API:** Provides free stock photos for products, serving as a fallback when merchant-provided images are unavailable.

**Third-Party Libraries:**
- `@tanstack/react-query`: Server state management.
- `@clerk/nextjs`: Authentication and user management.
- `@supabase/supabase-js`: Database client.
- `@dnd-kit/*`: Drag-and-drop functionality.
- `recharts`: Data visualization.
- `react-hook-form` + `zod`: Form handling and validation.
- `date-fns`: Date manipulation.
- `lucide-react`: Icon library.

**External APIs (Specific Modules):**
- **Facturama API:** For CFDI generation and timbrado in the Billing/Invoicing Module.

### White-Label System with Automatic Landing Page Generation
**White-Label Management:** Full CRUD for white-label brands at `/dashboard/marcas-blancas`. Each brand requires a **mandatory business type** (giro de negocio) such as "Barbería", "Zapatería", "Restaurante", etc.

**Enhanced Landing Page Generation (December 2025):**
- When a new white-label brand is created, the system generates a UNIQUE landing page using AI
- Content is generated via OpenRouter (Claude AI) with vertical-specific prompts
- **Unique Visual Differentiation per Vertical:**
  - Vertical-specific color palettes based on business mood (luxury, energetic, warm, clinical, etc.)
  - Pexels Images API for vertical-relevant stock photos
  - Pexels Videos API for hero section background videos
  - 10 layout variants: modern, classic, bold, minimal, elegant, dynamic, luxury, playful, corporate, artisan
  - 40+ Lucide icon mappings for dynamic feature icons
  - Framer Motion animations (fadeInUp, scaleIn, staggerChildren)
  - Stats section with animated counters
  - Mood-based animation presets: energetic, smooth, bouncy, elegant, quick

**Vertical Style Hints System:**
- Maps business types (barberia, restaurante, cafeteria, etc.) to specific:
  - Color schemes (e.g., barbería → masculine dark tones, spa → relaxing teals)
  - Mood indicators for animation/layout selection
  - Recommended icon sets

**Key Files:**
- `src/lib/landing-generator.ts`: Enhanced generation logic with video search, unique palettes, animations
- `src/app/api/landing-pages/generate/route.ts`: API endpoint delegating to landing-generator
- `src/app/landing/[slug]/page.tsx`: Client-side renderer with video backgrounds, Framer Motion animations

**Public Routes:**
- `/landing/[slug]` routes are completely public (no authentication required)
- Configured in `middleware.ts` under `isCompletelyPublicRoute`

**Database Fields (landing_pages table):**
- `videos`: Array of video URLs from Pexels
- `video_thumbnails`: Array of video thumbnail URLs
- `color_palette`: Unique JSONB palette per vertical
- `layout_variant`: Selected layout style
- `animation_preset`: Animation style (energetic, smooth, etc.)
- `animation_config`: Animation configuration JSONB
- `mood`: Vertical mood indicator
- `section_icons`: Array of icon names for sections

**Validation:**
- `businessType` is mandatory (frontend disables submit, backend returns 400 if empty)
- All values are trimmed before saving to prevent whitespace-only submissions
- Legacy tenants without business_type show error when accessing landing page