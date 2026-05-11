const fs = require('fs');
const filePath = 'HomePage.tsx';

let content = fs.readFileSync(filePath, 'utf8');

// 替换 refreshPosts 函数
const oldFunc = `  // 手动刷新帖子数据（从 Supabase 加载）\n  const refreshPosts = () => {\n    const loadData = async () => {\n      try {\n        const data = await postsApi.getAll();\n        const formatted = data.map(p => ({\n          id: p.id,\n          title: p.title,\n          section: p.section === 'anime' ? '动漫讨论' : \n                    p.section === 'manga' ? '漫画讨论' : \n                    p.section === 'cos' ? 'COS讨论' : '综合讨论',\n          sectionIcon: '📝',\n          sectionColor: 'from-violet-500 to-purple-500',\n          author: p.author?.username || '未知',\n          createdAt: new Date(p.created_at).toLocaleDateString(),\n          views: p.views || 0,\n          likes: p.likes || 0,\n        }));\n        setPosts(formatted);\n        setLastUpdate(new Date());\n      } catch (e) {\n        console.error('Failed to load posts:', e);\n      }\n    };\n    loadData();\n  };`;

const newFunc = `  // 手动刷新所有数据（从 Supabase 加载）\n  const refreshPosts = () => {\n    const loadAllData = async () => {\n      try {\n        const [postsData, conventionsData, servicesData, productsData, cosWorksData] = await Promise.all([\n          postsApi.getAll(),\n          conventionsApi.getAll(),\n          servicesApi.getAll(),\n          productsApi.getAll(),\n          cosWorksApi.getAll(),\n        ]);\n        \n        // 转换 posts\n        const formattedPosts = postsData.map(p => ({\n          id: p.id,\n          title: p.title,\n          section: p.section === 'anime' ? '动漫讨论' : \n                    p.section === 'manga' ? '漫画讨论' : \n                    p.section === 'cos' ? 'COS讨论' : '综合讨论',\n          sectionIcon: '📝',\n          sectionColor: 'from-violet-500 to-purple-500',\n          author: p.author?.username || '未知',\n          createdAt: new Date(p.created_at).toLocaleDateString(),\n          views: p.views || 0,\n          likes: p.likes || 0,\n        }));\n        \n        // 转换 conventions\n        const formattedConventions = conventionsData.map(c => ({\n          id: c.id,\n          title: c.title,\n          description: c.description,\n          date: c.date,\n          endDate: c.end_date,\n          location: c.location,\n          images: c.images || [],\n          link: c.link || '',\n          views: c.views || 0,\n          likes: c.likes || 0,\n          isFeatured: c.is_featured || false,\n          isHot: c.is_hot || false,\n          status: c.status || 'approved',\n          createdAt: new Date(c.created_at).toLocaleDateString(),\n          authorName: c.author?.username || '未知',\n        }));\n        \n        setPosts(formattedPosts);\n        setConventions(formattedConventions);\n        setLastUpdate(new Date());\n      } catch (e) {\n        console.error('Failed to load data:', e);\n      }\n    };\n    loadAllData();\n  };`;

if (content.includes(oldFunc)) {
  content = content.replace(oldFunc, newFunc);
  console.log('✓ 替换了 refreshPosts 函数');
} else {
  console.log('✗ 未找到 refreshPosts 函数');
  // 尝试模糊查找
  const idx = content.indexOf('const refreshPosts = () => {');
  if (idx > -1) {
    console.log('  找到函数起始位置:', idx);
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done!');
