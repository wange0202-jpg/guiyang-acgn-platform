import re

# 读取文件
with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. 替换 loadPosts 函数
old_load_posts = """// 从 localStorage 加载帖子数据
const loadPosts = (): Post[] => {
  try {
    const saved = localStorage.getItem('posts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
  return defaultPosts;
};"""

new_load_posts = """// 从 Supabase 加载帖子数据
const loadPosts = async (): Promise<Post[]> => {
  try {
    const data = await postsApi.getAll();
    return data.map(p => ({
      id: p.id,
      title: p.title,
      section: p.section === 'anime' ? '动漫讨论' : 
                p.section === 'manga' ? '漫画讨论' :
                p.section === 'cos' ? 'COS讨论' : '综合讨论',
      sectionIcon: p.section === 'anime' ? '📺' : 
                   p.section === 'manga' ? '📚' :
                   p.section === 'cos' ? '📸' : '💬',
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

# 2. 替换 loadConventions 函数
old_load_conventions = """// 从 localStorage 加载漫展数据
const loadConventions = (): Convention[] => {
  try {
    const saved = localStorage.getItem('conventions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load conventions:', e);
  }
  return [];
};"""

new_load_conventions = """// 从 Supabase 加载漫展数据
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

# 执行替换
content = content.replace(old_load_posts, new_load_posts)
content = content.replace(old_load_conventions, new_load_conventions)

# 写回文件
with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('HomePage.tsx 部分替换完成')
print('需要继续修改: loadServices, loadProducts, loadCosWorks, loadStats 等函数')
