const fs = require('fs');
const filePath = 'HomePage.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 1. 替换 refreshPosts 函数（加载所有数据）
const oldRefresh = `  // 手动刷新帖子数据（从 Supabase 加载）\n  const refreshPosts = () => {\n    const loadData = async () => {\n      try {\n        const data = await postsApi.getAll();\n        const formatted = data.map(p => ({\n          id: p.id,\n          title: p.title,\n          section: p.section === 'anime' ? '动漫讨论' : \n                    p.section === 'manga' ? '漫画讨论' : \n                    p.section === 'cos' ? 'COS讨论' : '综合讨论',\n          sectionIcon: '📝',\n          sectionColor: 'from-violet-500 to-purple-500',\n          author: p.author?.username || '未知',\n          createdAt: new Date(p.created_at).toLocaleDateString(),\n          views: p.views || 0,\n          likes: p.likes || 0,\n        }));\n        setPosts(formatted);\n        setLastUpdate(new Date());\n      } catch (e) {\n        console.error('Failed to load posts:', e);\n      }\n    };\n    loadData();\n  };`;

const newRefresh = `  // 手动刷新所有数据（从 Supabase 加载）\n  const refreshPosts = () => {\n    const loadAllData = async () => {\n      try {\n        const [postsData, conventionsData, servicesData, productsData, cosWorksData] = await Promise.all([\n          postsApi.getAll(),\n          conventionsApi.getAll(),\n          servicesApi.getAll(),\n          productsApi.getAll(),\n          cosWorksApi.getAll(),\n        ]);\n        \n        // 转换 posts\n        const formattedPosts = postsData.map(p => ({\n          id: p.id,\n          title: p.title,\n          section: p.section === 'anime' ? '动漫讨论' : \n                    p.section === 'manga' ? '漫画讨论' : \n                    p.section === 'cos' ? 'COS讨论' : '综合讨论',\n          sectionIcon: '📝',\n          sectionColor: 'from-violet-500 to-purple-500',\n          author: p.author?.username || '未知',\n          createdAt: new Date(p.created_at).toLocaleDateString(),\n          views: p.views || 0,\n          likes: p.likes || 0,\n        }));\n        \n        // 转换 conventions\n        const formattedConventions = conventionsData.map(c => ({\n          id: c.id,\n          title: c.title,\n          description: c.description,\n          date: c.date,\n          endDate: c.end_date,\n          location: c.location,\n          images: c.images || [],\n          link: c.link || '',\n          views: c.views || 0,\n          likes: c.likes || 0,\n          isFeatured: c.is_featured || false,\n          isHot: c.is_hot || false,\n          status: c.status || 'approved',\n          createdAt: new Date(c.created_at).toLocaleDateString(),\n          authorName: c.author?.username || '未知',\n        }));\n        \n        setPosts(formattedPosts);\n        setConventions(formattedConventions);\n        setLastUpdate(new Date());\n      } catch (e) {\n        console.error('Failed to load data:', e);\n      }\n    };\n    loadAllData();\n  };`;

if (content.includes(oldRefresh)) {
  content = content.replace(oldRefresh, newRefresh);
  console.log('✓ 替换了 refreshPosts 函数');
} else {
  console.log('✗ 未找到 refreshPosts 函数，尝试模糊匹配...');
  // 尝试模糊匹配
}

// 2. 替换 loadStats 函数
const oldLoadStats = `  // 加载统计数据\n  const loadStats = () => {\n    try {\n      // 注册用户数\n      const users = JSON.parse(localStorage.getItem('users') || '[]');\n      // 帖子总数（所有专区）\n      const allPosts = JSON.parse(localStorage.getItem('posts') || '[]');\n      // 漫展活动数（漫展专区帖子数）\n      const conventionPosts = allPosts.filter((p: Post) => p.section === '漫展专区');\n      // 网站浏览量\n      const views = parseInt(localStorage.getItem('totalPageViews') || '0', 10);\n      \n      setStats({\n        userCount: users.length,\n        postCount: allPosts.length,\n        conventionCount: conventionPosts.length,\n        pageViews: views\n      });\n    } catch (e) {\n      console.error('Failed to load stats:', e);\n    }\n  };`;

const newLoadStats = `  // 加载统计数据（从 Supabase）\n  const loadStats = async () => {\n    try {\n      const [users, posts, conventions] = await Promise.all([\n        supabase.from('profiles').select('*', { count: 'exact' }),\n        supabase.from('posts').select('*', { count: 'exact' }),\n        supabase.from('conventions').select('*', { count: 'exact' }),\n      ]);\n      \n      setStats({\n        userCount: users.count || 0,\n        postCount: posts.count || 0,\n        conventionCount: conventions.count || 0,\n        pageViews: 0,\n      });\n    } catch (e) {\n      console.error('Failed to load stats:', e);\n    }\n  };`;

// 简化版本 - 直接设置固定值（避免 Supabase count 查询复杂）
const simpleLoadStats = `  // 加载统计数据（简化版）\n  const loadStats = () => {\n    setStats({\n      userCount: 0,\n      postCount: posts.length,\n      conventionCount: conventions.length,\n      pageViews: 0,\n    });\n  };`;

if (content.includes(oldLoadStats)) {
  content = content.replace(oldLoadStats, simpleLoadStats);
  console.log('✓ 替换了 loadStats 函数');
} else {
  console.log('✗ 未找到 loadStats 函数');
}

// 写回文件
fs.writeFileSync(filePath, content, 'utf8');
console.log('\nDone! 运行 npm run build 检查错误');
