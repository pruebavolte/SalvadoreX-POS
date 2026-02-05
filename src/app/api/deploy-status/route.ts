import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Store recent deploy events in memory (for demo - use Redis/DB in production)
const deployHistory: Array<{
  timestamp: string;
  commit: string;
  message: string;
  status: string;
}> = [];

export async function GET() {
  try {
    // Get current git status
    const { stdout: gitLog } = await execAsync(
      'git log -5 --pretty=format:"%h|%s|%an|%ar"',
      { cwd: process.cwd() }
    );
    
    const { stdout: branch } = await execAsync(
      'git rev-parse --abbrev-ref HEAD',
      { cwd: process.cwd() }
    );
    
    const { stdout: lastCommit } = await execAsync(
      'git rev-parse HEAD',
      { cwd: process.cwd() }
    );
    
    const commits = gitLog.split("\n").map(line => {
      const [hash, message, author, time] = line.split("|");
      return { hash, message, author, time };
    });
    
    return NextResponse.json({
      status: "running",
      currentBranch: branch.trim(),
      currentCommit: lastCommit.trim().substring(0, 7),
      recentCommits: commits,
      deployHistory: deployHistory.slice(-10),
      webhookEndpoint: "/api/github-webhook",
      healthCheck: "/api/deploy-status"
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      error: error.message
    }, { status: 500 });
  }
}

// POST to manually trigger a pull (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const branch = body.branch || "main";
    
    console.log(`[Deploy] Manual pull requested for branch: ${branch}`);
    
    const { stdout, stderr } = await execAsync(`git pull origin ${branch}`, {
      cwd: process.cwd(),
      timeout: 60000
    });
    
    const entry = {
      timestamp: new Date().toISOString(),
      commit: "manual",
      message: "Manual pull triggered",
      status: "success"
    };
    deployHistory.push(entry);
    
    return NextResponse.json({
      success: true,
      message: "Pull completed",
      output: stdout,
      stderr: stderr || null
    });
    
  } catch (error: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      commit: "manual",
      message: error.message,
      status: "error"
    };
    deployHistory.push(entry);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
