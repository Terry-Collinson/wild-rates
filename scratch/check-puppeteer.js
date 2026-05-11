try {
  require('puppeteer');
  console.log('PUPPETEER_INSTALLED');
} catch (e) {
  console.log('PUPPETEER_MISSING');
}
