import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: NextRequest) {
  // Security Guardrail: Only allow local development deployments
  const isDev = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEV_MODE === 'true';
  
  if (!isDev) {
    return NextResponse.json(
      { error: "Forbidden: Local deployments can only be initiated from a development environment." },
      { status: 403 }
    );
  }

  try {
    console.log("Staging and committing files to Git...");
    
    // 1. Stage all changes
    await execPromise('git add .');
    
    // 2. Commit changes (handling the case where there are no local changes to commit)
    try {
      const timestamp = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      await execPromise(`git commit -m "Admin live update: ${timestamp}"`);
      console.log("Committed local changes to Git.");
    } catch (e) {
      console.log("No new changes to commit to Git.");
    }

    // 3. Push to GitHub main branch
    console.log("Pushing to GitHub...");
    let gitPushSuccess = true;
    let gitPushMsg = "";
    try {
      const { stdout: gitPushOut } = await execPromise('git push origin main');
      console.log("Git push output:", gitPushOut);
      gitPushMsg = "Git repository updated successfully.";
    } catch (pushErr: any) {
      console.warn("Git push warning:", pushErr.message);
      gitPushSuccess = false;
      gitPushMsg = "Changes deployed, but Git push skipped (everything up-to-date or already pushed).";
    }

    // 4. Trigger local Firebase App Hosting deployment
    console.log("Triggering local Firebase App Hosting deployment...");
    const { stdout, stderr } = await execPromise('firebase deploy --project booking-service-1c217');
    
    console.log("Firebase deploy output:", stdout);
    if (stderr) console.warn("Firebase deploy warnings/errors:", stderr);
    
    return NextResponse.json({
      success: true,
      message: gitPushSuccess ? "Successfully pushed to GitHub and deployed to Firebase!" : "Deployed to Firebase! (Git push skipped/up-to-date)",
      gitStatus: gitPushMsg,
      stdout: stdout,
      stderr: stderr
    });
  } catch (error: any) {
    console.error("Firebase deploy failed:", error);
    return NextResponse.json(
      { 
        error: "Deployment failed", 
        details: error.message || String(error),
        stdout: error.stdout,
        stderr: error.stderr
      },
      { status: 500 }
    );
  }
}
