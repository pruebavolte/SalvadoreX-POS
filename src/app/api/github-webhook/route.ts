import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import crypto from "crypto";

const execAsync = promisify(exec);

// Webhook secret for verifying GitHub signatures
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

// Callback URL to notify your external system when deploy is complete
const CALLBACK_URL = process.env.DEPLOY_CALLBACK_URL || "";

function verifySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return true; // Skip verification if no secret configured
  
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

async function notifyCallback(status: "success" | "error", message: string, commit?: string) {
  if (!CALLBACK_URL) return;
  
  try {
    await fetch(CALLBACK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        message,
        commit,
        timestamp: new Date().toISOString(),
        project: "SalvadoreX"
      })
    });
  } catch (error) {
    console.error("[GitHub Webhook] Failed to notify callback:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-hub-signature-256") || "";
    const event = request.headers.get("x-github-event") || "";
    
    // Verify webhook signature
    if (WEBHOOK_SECRET && !verifySignature(payload, signature)) {
      console.error("[GitHub Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    const data = JSON.parse(payload);
    
    // Only process push events
    if (event !== "push") {
      return NextResponse.json({ 
        message: `Event '${event}' ignored`,
        processed: false 
      });
    }
    
    const branch = data.ref?.replace("refs/heads/", "") || "main";
    const commit = data.after || data.head_commit?.id || "unknown";
    const commitMessage = data.head_commit?.message || "No message";
    const pusher = data.pusher?.name || "unknown";
    
    console.log(`[GitHub Webhook] Push received: ${branch} - ${commit.substring(0, 7)}`);
    console.log(`[GitHub Webhook] By: ${pusher} - "${commitMessage}"`);
    
    // Only process main/master branch
    if (branch !== "main" && branch !== "master") {
      return NextResponse.json({ 
        message: `Branch '${branch}' ignored`,
        processed: false 
      });
    }
    
    // Execute git pull
    try {
      const { stdout, stderr } = await execAsync("git pull origin " + branch, {
        cwd: process.cwd(),
        timeout: 60000
      });
      
      console.log("[GitHub Webhook] Git pull output:", stdout);
      if (stderr) console.log("[GitHub Webhook] Git pull stderr:", stderr);
      
      // Notify callback of success
      await notifyCallback("success", `Deploy complete: ${commitMessage}`, commit);
      
      return NextResponse.json({
        success: true,
        message: "Pull successful, app will restart automatically",
        commit: commit.substring(0, 7),
        branch,
        pusher,
        commitMessage
      });
      
    } catch (gitError: any) {
      console.error("[GitHub Webhook] Git pull failed:", gitError.message);
      
      // Notify callback of error
      await notifyCallback("error", `Git pull failed: ${gitError.message}`, commit);
      
      return NextResponse.json({
        success: false,
        error: "Git pull failed",
        details: gitError.message
      }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("[GitHub Webhook] Error:", error);
    return NextResponse.json({ 
      error: "Webhook processing failed",
      details: error.message 
    }, { status: 500 });
  }
}

// GET endpoint to check webhook status
export async function GET() {
  return NextResponse.json({
    status: "active",
    webhook: "/api/github-webhook",
    configured: {
      webhookSecret: !!WEBHOOK_SECRET,
      callbackUrl: !!CALLBACK_URL
    },
    instructions: {
      step1: "Create a webhook in your GitHub repo settings",
      step2: "Set Payload URL to: https://YOUR-REPLIT-URL/api/github-webhook",
      step3: "Set Content type to: application/json",
      step4: "Set Secret to match GITHUB_WEBHOOK_SECRET env var",
      step5: "Select 'Just the push event'",
      step6: "Optionally set DEPLOY_CALLBACK_URL to receive notifications"
    }
  });
}
