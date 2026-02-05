import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

// API endpoint for external AI systems to get full project context
export async function GET(request: NextRequest) {
  try {
    // Read the AI context documentation
    const contextPath = path.join(process.cwd(), "AI_CONTEXT.md");
    const replitMdPath = path.join(process.cwd(), "replit.md");
    
    let aiContext = "";
    let replitMd = "";
    
    if (fs.existsSync(contextPath)) {
      aiContext = fs.readFileSync(contextPath, "utf-8");
    }
    
    if (fs.existsSync(replitMdPath)) {
      replitMd = fs.readFileSync(replitMdPath, "utf-8");
    }

    // Get current project structure (key directories only)
    const getDirectoryStructure = (dir: string, depth: number = 0, maxDepth: number = 3): string[] => {
      if (depth >= maxDepth) return [];
      
      const items: string[] = [];
      const skipDirs = ['node_modules', '.next', '.git', '.cache', 'dist', '.replit'];
      
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (skipDirs.includes(entry.name)) continue;
          
          const indent = "  ".repeat(depth);
          if (entry.isDirectory()) {
            items.push(`${indent}${entry.name}/`);
            items.push(...getDirectoryStructure(path.join(dir, entry.name), depth + 1, maxDepth));
          } else if (depth < 2) {
            items.push(`${indent}${entry.name}`);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
      
      return items;
    };

    const structure = getDirectoryStructure(process.cwd());

    // Get list of API endpoints
    const apiDir = path.join(process.cwd(), "src/app/api");
    const getApiEndpoints = (dir: string, prefix: string = ""): string[] => {
      const endpoints: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const routePath = path.join(dir, entry.name, "route.ts");
            if (fs.existsSync(routePath)) {
              endpoints.push(`/api${prefix}/${entry.name}`);
            }
            endpoints.push(...getApiEndpoints(path.join(dir, entry.name), `${prefix}/${entry.name}`));
          }
        }
      } catch (e) {}
      return endpoints;
    };

    const apiEndpoints = fs.existsSync(apiDir) ? getApiEndpoints(apiDir) : [];

    // Get dashboard pages
    const dashboardDir = path.join(process.cwd(), "src/app/dashboard");
    const getDashboardPages = (dir: string): string[] => {
      const pages: string[] = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const pagePath = path.join(dir, entry.name, "page.tsx");
            if (fs.existsSync(pagePath)) {
              pages.push(`/dashboard/${entry.name}`);
            }
          }
        }
      } catch (e) {}
      return pages;
    };

    const dashboardPages = fs.existsSync(dashboardDir) ? getDashboardPages(dashboardDir) : [];

    return NextResponse.json({
      project: "SalvadoreX-POS",
      description: "Enterprise AI-powered Point of Sale System",
      repository: "https://github.com/pruebavolte/SalvadoreX-POS",
      
      // Quick reference for AI
      quickStart: {
        toMakeChanges: "Push to GitHub main branch, webhook will auto-deploy",
        webhookUrl: "/api/github-webhook",
        deployStatus: "/api/deploy-status",
        thisEndpoint: "/api/ai-context"
      },

      // Tech stack summary
      stack: {
        framework: "Next.js 16.1.3 (App Router)",
        language: "TypeScript",
        database: "PostgreSQL (Supabase) + Prisma ORM",
        auth: "Clerk",
        styling: "Tailwind CSS + Shadcn/UI",
        state: "React Context + TanStack Query"
      },

      // Available API endpoints
      apiEndpoints: apiEndpoints.sort(),

      // Dashboard pages
      dashboardPages: dashboardPages.sort(),

      // Key files for common tasks
      keyFiles: {
        whiteLabelUI: "src/app/dashboard/marcas-blancas/page.tsx",
        whiteLabelAPI: "src/app/api/white-labels/route.ts",
        productsAPI: "src/app/api/products/route.ts",
        salesAPI: "src/app/api/sales/route.ts",
        databaseSchema: "prisma/schema.prisma",
        githubWebhook: "src/app/api/github-webhook/route.ts",
        aiContext: "AI_CONTEXT.md",
        projectOverview: "replit.md"
      },

      // Project structure (abbreviated)
      projectStructure: structure.slice(0, 100),

      // Full documentation
      documentation: {
        aiContext: aiContext,
        replitMd: replitMd
      },

      // How to integrate
      integration: {
        step1: "Push code changes to GitHub repository",
        step2: "GitHub webhook triggers /api/github-webhook",
        step3: "Replit pulls changes and restarts automatically",
        step4: "Optional: Set DEPLOY_CALLBACK_URL to receive notification when complete",
        
        examplePush: {
          method: "Use GitHub API or git push",
          repository: "pruebavolte/SalvadoreX-POS",
          branch: "main"
        },
        
        callbackPayload: {
          status: "success | error",
          message: "Deploy complete or error message",
          commit: "commit SHA",
          timestamp: "ISO date",
          project: "SalvadoreX"
        }
      },

      // Common patterns
      patterns: {
        addApiEndpoint: "Create src/app/api/[name]/route.ts with GET/POST exports",
        addDashboardPage: "Create src/app/dashboard/[name]/page.tsx with 'use client'",
        modifyDatabase: "Edit prisma/schema.prisma, run 'npx prisma db push'",
        addComponent: "Create in src/components/, use Shadcn/UI patterns"
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to get context",
      details: error.message
    }, { status: 500 });
  }
}
