const puppeteer = require('puppeteer');

(async () => {
  const baseUrl = 'http://localhost:5500/main.html';
  const viewerCount = 5;

  for (let i = 1; i <= viewerCount; i++) {
    const viewerId = `cesium${String(i).padStart(2, '0')}`;
    const url = `${baseUrl}?viewer_id=${viewerId}`;

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: [
        `--window-position=${100 * i},100`,
        '--window-size=800,600'
      ]
    });

    const page = await browser.newPage();
    await page.goto(url);
    console.log(`✅ 已開啟 Viewer ${viewerId}`);
  }

  console.log('🚀 所有視窗都開啟完成');
})();
