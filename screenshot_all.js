import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const pages = [
    { name: 'home', url: 'http://localhost:3000/' },
    { name: 'convention', url: 'http://localhost:3000/convention' },
    { name: 'cos', url: 'http://localhost:3000/cos' },
    { name: 'service', url: 'http://localhost:3000/service' },
    { name: 'trading', url: 'http://localhost:3000/trading' },
    { name: 'auth', url: 'http://localhost:3000/auth' },
  ];

  for (const p of pages) {
    try {
      console.log(`Visiting: ${p.name} (${p.url})`);
      await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: `screenshot_${p.name}.png`, fullPage: false });
      console.log(`Saved: screenshot_${p.name}.png`);
    } catch (e) {
      console.error(`Error visiting ${p.name}:`, e.message);
    }
  }

  await browser.close();
  console.log('All screenshots done!');
})();
