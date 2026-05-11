import re

with open('HomePage.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = ''.join(lines)

# ===== 1. 替换状态初始化（335-339行）=====
old_state_init = """  const [posts, setPosts] = useState<Post[]>(loadPosts);
  const [conventions, setConventions] = useState<Convention[]>(loadConventions);
  const [services, setServices] = useState<ServiceData[]>(loadServices);
  const [products, setProducts] = useState<ProductData[]>(loadProducts);
  const [cosWorks, setCosWorks] = useState<CosWorkData[]>(loadCosWorks);"""

new_state_init = """  const [posts, setPosts] = useState<Post[]>([]);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [cosWorks, setCosWorks] = useState<CosWorkData[]>([]);"""

if old_state_init in content:
    content = content.replace(old_state_init, new_state_init)
    print('✓ 替换了状态初始化')
else:
    print('✗ 未找到状态初始化代码')

# ===== 2. 在 refreshPosts 函数后添加 useEffect 加载数据 =====
# 找到 refreshPosts 函数定义
refresh_pattern = r'// 手动刷新帖子数据（包括COS、服务、商品）\n  const refreshPosts = \(\) => \{[^}]+\};'

refresh_replacement = """// 手动刷新帖子数据（包括COS、服务、商品）
  const refreshPosts = () => {
    const loadAllData = async () => {
      const [postsData, conventionsData, servicesData, productsData, cosWorksData] = await Promise.all([
        postsApi.getAll(),
        conventionsApi.getAll(),
        servicesApi.getAll(),
        productsApi.getAll(),
        cosWorksApi.getAll(),
      ]);
      
      // 转换 posts
      const formattedPosts = postsData.map(p => ({
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
      
      // 转换 conventions
      const formattedConventions = conventionsData.map(c => ({
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
      
      // 转换 services
      const formattedServices = servicesData.map(s => ({
        id: s.id,
        nickname: s.author?.username || '未知',
        category: s.category || 'other',
        contact: '',
        description: s.description,
        priceRange: `¥${s.price}`,
        createdAt: new Date(s.created_at).toLocaleDateString(),
        status: s.status || 'approved',
      }));
      
      // 转换 products
      const formattedProducts = productsData.map(p => ({
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
      
      // 转换 cosWorks
      const formattedCosWorks = cosWorksData.map(w => ({
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
      
      setPosts(formattedPosts);
      setConventions(formattedConventions);
      setServices(formattedServices);
      setProducts(formattedProducts);
      setCosWorks(formattedCosWorks);
      setLastUpdate(new Date());
    };
    
    loadAllData();
  };"""

match = re.search(refresh_pattern, content, re.DOTALL)
if match:
    content = content[:match.start()] + refresh_replacement + content[match.end():]
    print('✓ 替换了 refreshPosts 函数')
else:
    print('✗ 未找到 refreshPosts 函数')

# 写回文件
with open('HomePage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('\nDone! 需要运行 npm run build 检查错误')
