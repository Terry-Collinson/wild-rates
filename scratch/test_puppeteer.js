const puppeteer = require('puppeteer');
const fs = require('fs');

async function testDownload() {
  const url = "https://lh3.googleusercontent.com/hrppk/ANjXD_yLhmLfM08qy4P0EINUvobMKG0t8bdltPAbXle1Cjv3iZ4-bdXlkKZKtfzdSoMoE6p3lIuwxqe_kmqAS9Ssh272uXbdFeo2XyA6btAZ4KAaNKfLEx_mz9pU5bX6LGFghERKIkbCGmb2IdzWpO0HFoUYKbO6Y0o";
  
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setExtraHTTPHeaders({
    'Referer': 'https://www.google.com/'
  });

  console.log("Navigating...");
  const response = await page.goto(url, { waitUntil: 'networkidle0' });
  
  console.log("Status:", response.status());
  const buffer = await response.buffer();
  
  console.log("Buffer size:", buffer.length);
  fs.writeFileSync('test_puppeteer.jpg', buffer);
  
  await browser.close();
  console.log("Done");
}

testDownload();
