import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log('=== 开始功能测试 ===');

  // 1. 测试首页加载
  console.log('\n[1] 测试首页加载...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_01_home.png' });
  console.log('  首页截图已保存');

  // 2. 测试登录功能
  console.log('\n[2] 测试登录功能...');
  await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1000));
  
  // 输入账号密码
  await page.type('input[placeholder="请输入账号"]', 'admin001');
  await page.type('input[placeholder="请输入密码"]', '5201314');
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: 'test_02_login_form.png' });
  
  // 点击登录按钮
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'test_03_after_login.png' });
  console.log('  登录成功，截图已保存');
  
  const urlAfterLogin = page.url();
  console.log(`  登录后URL: ${urlAfterLogin}`);

  // 3. 测试漫展专区
  console.log('\n[3] 测试漫展专区...');
  await page.goto('http://localhost:3000/convention', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_04_convention.png' });
  console.log('  漫展专区截图已保存');

  // 4. 测试COS专区
  console.log('\n[4] 测试COS专区...');
  await page.goto('http://localhost:3000/cos', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_05_cos.png' });
  console.log('  COS专区截图已保存');

  // 5. 测试服务专区
  console.log('\n[5] 测试服务专区...');
  await page.goto('http://localhost:3000/service', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_06_service.png' });
  console.log('  服务专区截图已保存');

  // 6. 测试交易专区
  console.log('\n[6] 测试交易专区...');
  await page.goto('http://localhost:3000/trading', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_07_trading.png' });
  console.log('  交易专区截图已保存');

  // 7. 测试个人主页
  console.log('\n[7] 测试个人主页...');
  await page.goto('http://localhost:3000/profile/admin001', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'test_08_profile.png' });
  console.log('  个人主页截图已保存');

  // 8. 检查登录状态（Header是否显示用户信息）
  console.log('\n[8] 检查登录状态...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));
  const headerText = await page.evaluate(() => {
    const header = document.querySelector('header');
    return header ? header.innerText : 'No header found';
  });
  console.log(`  Header内容: ${headerText.substring(0, 100)}...`);
  await page.screenshot({ path: 'test_09_logged_in_header.png' });

  console.log('\n=== 功能测试完成 ===');
  await browser.close();
})();
