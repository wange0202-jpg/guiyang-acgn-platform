const fs = require('fs');
const path = require('path');

// 需要迁移的页面
const pages = [
  'HomePage.tsx',
  'CosPage.tsx',
  'ConventionPage.tsx',
  'ServicePage.tsx',
  'TradingPage.tsx',
  'PostDetailPage.tsx',
  'ProfilePage.tsx',
  'AuditPage.tsx',
];

let totalModified = 0;

pages.forEach(page => {
  const filePath = path.join(_dirname, page);
  if (!fs.existsSync(filePath)) {
    console.log(`跳过 ${page}（文件不存在）`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // 1. 添加 import（如果还没有）
  if (!content.includes('supabaseData')) {
    // 在第一个 import 后添加
    const importMatch = content.match(/^import .+$/m);
    if (importMatch) {
      const insertPos = importMatch.index + importMatch[0].length;
      content = content.slice(0, insertPos) + "\nimport { postsApi, conventionsApi, cosWorksApi, servicesApi, productsApi } from '../lib/supabaseData';" + content.slice(insertPos);
      modified = true;
      console.log(`  ✓ ${page}: 添加了 supabaseData import`);
    }
  }

  // 2. 替换 localStorage.getItem('xxx') 为从 Supabase 加载的 async 函数调用
  // 这个太复杂，跳过，只做状态初始化修改

  // 3. 修改状态初始化：从 localStorage 改为 []
  const statePatterns = [
    /const \[(\w+), set\1\] = useState<[^>]+>\(load\w+\);/g,
    /const \[(\w+), set\1\] = useState<[^>]+>\(JSON\.parse\(localStorage\.getItem\('[^']+'\) \|\| '\[]'\)\);/g,
  ];

  statePatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, (match, stateName) => {
        modified = true;
        console.log(`  ✓ ${page}: 修改了 ${stateName} 状态初始化`);
        return match.replace(/=\s*useState[^;]+;/, '= useState([]);');
      });
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    totalModified++;
    console.log(`✓ ${page} 修改完成`);
  } else {
    console.log(`○ ${page} 无需修改或已修改`);
  }
});

console.log(`\n总共修改了 ${totalModified} 个文件`);
console.log('注意：这只是一个起点，还需要手动修改数据加载和保存逻辑');
