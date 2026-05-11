import re

# 读取文件
with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# ===== 1. 替换 loadPosts 函数 =====
pattern_posts = r'// 从 localStorage 加载帖子数据\nconst loadPosts = \(\): Post\[\] => \{[^}]+\};'
replacement_posts = """// 从 Supabase 加载帖子数据
const loadPosts = async (): Promise<Post[]> => {
  try {
    const data = await postsApi.getAll();
    return data.map(p => ({
      id: p.id,
      title: p.title,
      section: p.section === 'anime' ? '动漫讨论' : 
                p.section === 'manga' ? '漫画讨论' :
                p.section === 'cos' ? 'COS讨论' : '综合讨论',
      sectionIcon: '📝',
      sectionColor: 'from-violet-500 to-purple-500',
      author: p.author?.username || '未知',
      createdAt: new Date(p.created_at).toLocaleDateString(),
      views: p.views || 0,
      likes: p.likes || 0,
    }));
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
  return defaultPosts;
};"""

match = re.search(pattern_posts, content, re.DOTALL)
if match:
    content = content[:match.start()] + replacement_posts + content[match.end():]
    print('✓ 替换了 loadPosts 函数')
else:
    print('✗ 未找到 loadPosts 函数')

# ===== 2. 替换 loadConventions 函数 =====
pattern_conventions = r'// 从 localStorage 加载漫展数据\nconst loadConventions = \(\): Convention\[\] => \{[^}]+\};'
replacement_conventions = """// 从 Supabase 加载漫展数据
const loadConventions = async (): Promise<Convention[]> => {
  try {
    const data = await conventionsApi.getAll();
    return data.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      date: c.date,
      endDate: c.end_date,
      location: c.location,
      images: c.images || [],
      link: c.link || '',
      views: c.views || 0,
      likes: c.likes || 0,
      isFeatured: c.is_featured || false,
      isHot: c.is_hot || false,
      status: c.status || 'approved',
      createdAt: new Date(c.created_at).toLocaleDateString(),
      authorName: c.author?.username || '未知',
    }));
  } catch (e) {
    console.error('Failed to load conventions:', e);
  }
  return [];
};"""

match = re.search(pattern_conventions, content, re.DOTALL)
if match:
    content = content[:match.start()] + replacement_conventions + content[match.end():]
    print('✓ 替换了 loadConventions 函数')
else:
    print('✗ 未找到 loadConventions 函数')

# ===== 3. 替换 loadServices 函数 =====
pattern_services = r'// 从 localStorage 加载服务数据.*?const loadServices = \(\): ServiceData\[\] => \{[^}]+\};'
replacement_services = """// 从 Supabase 加载服务数据
const loadServices = async (): Promise<ServiceData[]> => {
  try {
    const data = await servicesApi.getAll();
    return data.map(s => ({
      id: s.id,
      nickname: s.author?.username || '未知',
      category: s.category || 'other',
      contact: '',
      description: s.description,
      priceRange: `¥${s.price}`,
      createdAt: new Date(s.created_at).toLocaleDateString(),
      status: s.status || 'approved',
    }));
  } catch (e) {
    console.error('Failed to load services:', e);
  }
  return [];
};"""

match = re.search(pattern_services, content, re.DOTALL)
if match:
    content = content[:match.start()] + replacement_services + content[match.end():]
    print('✓ 替换了 loadServices 函数')
else:
    print('✗ 未找到 loadServices 函数')

# ===== 4. 替换 loadProducts 函数 =====
pattern_products = r'// 从 localStorage 加载商品数据.*?const loadProducts = \(\): ProductData\[\] => \{[^}]+\};'
replacement_products = """// 从 Supabase 加载商品数据
const loadProducts = async (): Promise<ProductData[]> => {
  try {
    const data = await productsApi.getAll();
    return data.map(p => ({
      id: p.id,
      title: p.title,
      category: p.category || 'other',
      price: p.price,
      condition: '良好',
      description: p.description,
      seller: p.author?.username || '未知',
      contact: '',
      createdAt: new Date(p.created_at).toLocaleDateString(),
      status: p.status || 'approved',
    }));
  } catch (e) {
    console.error('Failed to load products:', e);
  }
  return [];
};"""

match = re.search(pattern_products, content, re.DOTALL)
if match:
    content = content[:match.start()] + replacement_products + content[match.end():]
    print('✓ 替换了 loadProducts 函数')
else:
    print('✗ 未找到 loadProducts 函数')

# ===== 5. 替换 loadCosWorks 函数 =====
pattern_cos = r'// 加载COS作品数据\nconst loadCosWorks = \(\): CosWorkData\[\] => \{[^}]+\};'
replacement_cos = """// 从 Supabase 加载COS作品数据
const loadCosWorks = async (): Promise<CosWorkData[]> => {
  try {
    const data = await cosWorksApi.getAll();
    return data.map(w => ({
      id: w.id,
      title: w.title,
      authorName: w.author?.username || '未知',
      authorId: w.user_id,
      category: w.tags?.[0] || '其他',
      description: w.description,
      images: w.images || [],
      views: w.views || 0,
      likes: w.likes || 0,
      status: w.status || 'approved',
      createdAt: new Date(w.created_at).toLocaleDateString(),
    }));
  } catch (e) {
    console.error('Failed to load cos works:', e);
  }
  return [];
};"""

match = re.search(pattern_cos, content, re.DOTALL)
if match:
    content = content[:match.start()] + replacement_cos + content[match.end():]
    print('✓ 替换了 loadCosWorks 函数')
else:
    print('✗ 未找到 loadCosWorks 函数')

# 写回文件
with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n迁移脚本执行完成！')
print('请检查文件并手动修复任何 TypeScript 错误')
