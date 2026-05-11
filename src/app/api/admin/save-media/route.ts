import { NextResponse } from 'next/server';
import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Initialize Stealth Plugin
if ((puppeteer as any).customQueryHandlers) {
  // This prevents multiple initializations in dev mode
} else {
  puppeteer.use(StealthPlugin());
}

// 1. Add a random delay to look less like a bot
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: Request) {
  let browser = null;
  try {
    const { url, folderName, fileName } = await req.json();

    if (!url || !folderName || !fileName) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    // 1. Setup Directories
    const publicDir = path.join(process.cwd(), 'public');
    const targetDir = path.join(publicDir, 'assets', 'lodges', folderName);
    await fs.ensureDir(targetDir);
    const absoluteFilePath = path.join(targetDir, fileName);

    console.log(`🚀 Launching Stealth Browser for: ${fileName}`);

    // 2. Launch Puppeteer in non-headless mode to avoid bot detection
    browser = await puppeteer.launch({
      headless: true, // MAGIC: False makes it a real browser, bypassing 99% of checks
      userDataDir: path.join(process.cwd(), '.puppeteer_cache'), // Persist cookies/session
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
      ]
    });

    const page = await browser.newPage();

    // Set a realistic User-Agent for Windows
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Mimic a high-end Mac/Windows screen so the pixels look "real"
    await page.setViewport({ width: 1920, height: 1080 });

    // 3. Change the 'goto' logic to be more patient
    console.log(`📡 Visiting: ${url}`);

    // Add a random 1-3 second sleep before navigating
    await delay(Math.floor(Math.random() * 2000) + 1000);

    // 1. Visit the URL
    const response = await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    if (response?.status() === 403 || response?.status() === 404) {
      throw new Error(`Google blocked the request with a ${response.status()} error.`);
    }

    // 2. If Google is still being stubborn, try a "Human" scroll 
    // (Bots don't usually move the mouse/scroll)
    await page.evaluate(() => window.scrollBy(0, 100));
    await delay(1000);

    // 3. THE MAGIC TRICK: Screenshot the image instead of downloading the buffer
    // Most Google-hosted images are wrapped in a <img> tag. 
    // We wait for it to appear, then snap it.
    try {
      const imgElement = await page.waitForSelector('img', { timeout: 5000 });
      if (imgElement) {
        await imgElement.screenshot({ path: absoluteFilePath });
        console.log(`📸 Screenshot captured: ${fileName}`);
      } else {
        throw new Error("No image element found on page");
      }
    } catch (e) {
      // Fallback: Just screenshot the whole viewport if the <img> tag is weird
      await page.screenshot({ path: absoluteFilePath });
      console.log(`📸 Viewport screenshot fallback used for: ${fileName}`);
    }

    // 4. Return success
    return NextResponse.json({
      success: true,
      path: `/assets/lodges/${folderName}/${fileName}`
    });

  } catch (error: any) {
    console.error(`❌ Stealth Download Failed:`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // 6. ALWAYS close the browser or your RAM will fill up
    if (browser) {
      await browser.close();
    }
  }
}