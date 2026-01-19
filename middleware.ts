import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Define which routes are public (don't require authentication)
 */
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/init-db(.*)',
  '/menu(.*)', // Digital menu is public
  '/api/menu-products(.*)', // Menu products API is public
  '/api/best-sellers(.*)', // Best sellers API is public
  '/factura(.*)', // Public invoice request page
  '/api/billing/request(.*)', // Public invoice request API
  '/support(.*)', // Remote support pages are public
  '/api/support(.*)', // Remote support API is public
  '/preview(.*)', // White-label preview pages are public
  '/api/tenant/branding(.*)', // Tenant branding API is public
  '/landing(.*)', // White-label landing pages are public
]);

/**
 * Define which routes are completely public (no auth check at all)
 */
const isCompletelyPublicRoute = createRouteMatcher([
  '/',
  '/menu(.*)',
  '/api/menu-products(.*)',
  '/api/best-sellers(.*)',
  '/factura(.*)', // Public invoice request page
  '/api/billing/request(.*)', // Public invoice request API
  '/support(.*)', // Remote support pages are public
  '/api/support(.*)', // Remote support API is public
  '/preview(.*)', // White-label preview pages are public
  '/api/tenant/branding(.*)', // Tenant branding API is public
  '/landing(.*)', // White-label landing pages are public
]);

const isDevelopment = process.env.NODE_ENV === 'development';

export default clerkMiddleware(async (auth, req) => {
  // Allow completely public routes without any auth check
  if (isCompletelyPublicRoute(req)) {
    return NextResponse.next();
  }

  // For auth routes (login/signup), don't protect but also don't redirect if already logged in
  // This prevents the infinite loop when there are auth errors
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // In development mode, bypass authentication for dashboard and API routes
  if (isDevelopment) {
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/')) {
      console.log('[Middleware] Development mode - bypassing auth for:', pathname);
      return NextResponse.next();
    }
  }

  // For all other routes, require authentication
  // This will redirect to sign-in if not authenticated
  await auth.protect();

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
