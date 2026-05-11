import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Settings, X, TrendingUp, RefreshCw, Shield, Bookmark } from 'lucide-react';
import { getCurrentUser, getUserByUsername } from '../lib/auth';
import { Convention } from '../types';
import { realtimeViews } from '../lib/realtime';
import { postsApi, conventionsApi, cosWorksApi, servicesApi, productsApi } from "../lib/supabaseData";

// 星星闪烁组件
const Stars: React.FC = () => {
  const stars = useMemo(() => 
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 2 + 2,
      opacity: Math.random() * 0.5 + 0.5
    })), []
  );

  return (
    <div className="stars-container">
      {stars.map(star => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            opacity: star.opacity
          }}
        />
      ))}
    </div>
  );
};

// 帖子类型定义
interface Post {
  id: string;
  title: string;
  section: string;
  sectionIcon: string;
  sectionColor: string;
  author: string;
  createdAt: string;
  views: number;
  price?: number;
  location?: string;
  date?: string;
}

// 用户头像组件
interface UserAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, size = 'sm' }) => {
  const user = getUserByUsername(username);
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-lg'
  };

  if (user?.avatar) {
    return (
      <img 
        src={user.avatar} 
        alt={username} 
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <span className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center font-bold text-white`}>
      {username.charAt(0)}
    </span>
  );
};

// 热门话题类型
type HotTopicType = 'post' | 'convention' | 'cos' | 'service' | 'trading';

interface HotTopic {
  id: string;
  postId: string;
  type: HotTopicType; // 类型：帖子、漫展、COS、服务、交易
  customTitle?: string; // 自定义标题
}

// 默认帖子数据（为空，用户需自行发布）
const defaultPosts: Post[] = [];

// 从 localStorage 加载帖子数据
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
};

// 保存帖子数据到 localStorage
const savePosts = (posts: Post[]): void => {
  try {
    localStorage.setItem('posts', JSON.stringify(posts));
  } catch (e) {
    console.error('Failed to save posts:', e);
  }
};

// 从 localStorage 加载漫展数据
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
};

// 从 localStorage 加载服务数据
interface ServiceData {
  id: string;
  nickname: string;
  category: string;
  contact: string;
  description: string;
  priceRange: string;
  createdAt: string;
  status?: string;
}

const loadServices = (): ServiceData[] => {
  try {
    const saved = localStorage.getItem('services');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load services:', e);
  }
  return [];
};

// 从 localStorage 加载商品数据
interface ProductData {
  id: string;
  title: string;
  category: string;
  price: number;
  condition: string;
  description: string;
  seller: string;
  contact: string;
  createdAt: string;
  status?: string;
}

const loadProducts = (): ProductData[] => {
  try {
    const saved = localStorage.getItem('products');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load products:', e);
  }
  return [];
};

// COS作品数据结构
interface CosWorkData {
  id: string;
  title: string;
  authorName: string;
  authorId?: string;
  category: string;
  description: string;
  images: string[];
  views?: number;
  likes?: number;
  status?: string;
  createdAt: string;
}

// 加载COS作品数据
const loadCosWorks = (): CosWorkData[] => {
  try {
    const saved = localStorage.getItem('cosWorks');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load cos works:', e);
  }
  return [];
};

// 帖子类型对应的跳转路径
const sectionPaths: Record<string, string> = {
  '漫展专区': '/convention',
  'COS专区': '/cos',
  '服务专区': '/service',
  '交易专区': '/trading',
};

// 专区导航数据
const sections = [
  { 
    icon: '🎭', 
    title: '漫展专区', 
    desc: '贵阳漫展信息一览无余',
    path: '/convention',
    color: 'from-pink-500 to-rose-500'
  },
  { 
    icon: '📸', 
    title: 'COS专区', 
    desc: '分享你的cosplay作品',
    path: '/cos',
    color: 'from-violet-500 to-purple-500'
  },
  { 
    icon: '💄', 
    title: '服务专区', 
    desc: '妆娘摄影后期一网打尽',
    path: '/service',
    color: 'from-cyan-500 to-blue-500'
  },
  { 
    icon: '🔄', 
    title: '交易专区', 
    desc: '闲置物品安全交易',
    path: '/trading',
    color: 'from-amber-500 to-orange-500'
  },
];

// 获取热门帖子（排除已移除的，按点击量排序，取前4个）
const getHotPosts = (posts: Post[], pinnedIds: string[], excludedIds: string[] = []): Post[] => {
  // 排除已移除的帖子
  const availablePosts = posts.filter(p => !excludedIds.includes(p.id));
  
  // 优先使用置顶的帖子
  const pinnedPosts = availablePosts.filter(p => pinnedIds.includes(p.id));
  const otherPosts = availablePosts.filter(p => !pinnedIds.includes(p.id));
  
  // 置顶帖子排在前面，其余按点击量排序
  const sortedOthers = [...otherPosts].sort((a, b) => b.views - a.views);
  
  return [...pinnedPosts, ...sortedOthers].slice(0, 4);
};

// 从 localStorage 加载置顶话题
const loadPinnedTopics = (): HotTopic[] => {
  try {
    const saved = localStorage.getItem('pinnedHotTopics');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        // 过滤掉空数据的置顶项
        return parsed.filter((t: HotTopic) => t.postId && t.postId.trim() !== '');
      }
    }
  } catch (e) {
    console.error('Failed to load pinned topics:', e);
  }
  return [];
};

// 检查是否需要重置热门话题（URL带参数时自动清除）
const checkAndResetHotTopics = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('resetHot') === '1') {
    localStorage.removeItem('pinnedHotTopics');
    localStorage.removeItem('removedHotPostIds');
    // 清除URL参数
    window.history.replaceState({}, '', window.location.pathname);
    console.log('热门话题已重置');
  }
};

// 保存置顶话题到 localStorage
const savePinnedTopics = (topics: HotTopic[]) => {
  try {
    localStorage.setItem('pinnedHotTopics', JSON.stringify(topics));
    console.log('Saved pinned topics:', topics); // 调试用
  } catch (e) {
    console.error('Failed to save pinned topics:', e);
  }
};

const HomePage: React.FC = () => {
  // 检查是否需要重置热门话题
  checkAndResetHotTopics();
  
  const [scrollY, setScrollY] = useState(0);
  // 用于防止 StrictMode 导致的重复计数
  const hasIncrementedViews = useRef(false);
  const [activeSection, setActiveSection] = useState<string>('all');
  const [showHotTopicManager, setShowHotTopicManager] = useState(false);
  const [pinnedHotTopics, setPinnedHotTopics] = useState<HotTopic[]>(loadPinnedTopics);
  const [removedPostIds, setRemovedPostIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('removedHotPostIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [newHotTopicPostId, setNewHotTopicPostId] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [cosWorks, setCosWorks] = useState<CosWorkData[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // 实时浏览量状态
  const [realtimeViewsData, setRealtimeViewsData] = useState<Record<string, number>>({});

  // 统计数据状态
  const [stats, setStats] = useState(() => {
    return {
      userCount: 0,
      postCount: 0,
      conventionCount: 0,
      pageViews: 0
    };
  });

  // 加载统计数据
  const loadStats = () => {
    try {
      // 注册用户数
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      // 帖子总数（所有专区）
      const allPosts = JSON.parse(localStorage.getItem('posts') || '[]');
      // 漫展活动数（漫展专区帖子数）
      const conventionPosts = allPosts.filter((p: Post) => p.section === '漫展专区');
      // 网站浏览量
      const views = parseInt(localStorage.getItem('totalPageViews') || '0', 10);
      
      setStats({
        userCount: users.length,
        postCount: allPosts.length,
        conventionCount: conventionPosts.length,
        pageViews: views
      });
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  // 增加网站浏览量
  const incrementPageViews = () => {
    try {
      const views = parseInt(localStorage.getItem('totalPageViews') || '0', 10);
      localStorage.setItem('totalPageViews', String(views + 1));
    } catch (e) {
      console.error('Failed to increment page views:', e);
    }
  };

  // 获取当前登录用户
  const currentUser = getCurrentUser();
  
  // 检查是否为站主
  const isAdmin = currentUser?.role === 'admin';

  // 保存移除的帖子ID列表
  const saveRemovedPostIds = (ids: string[]) => {
    try {
      localStorage.setItem('removedHotPostIds', JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save removed post ids:', e);
    }
  };

  // 获取热门话题（帖子 + 漫展 + COS + 服务 + 交易）
  const hotTopics = useMemo(() => {
    type HotTopicResult = { type: HotTopicType; data: Post | Convention; topicId?: string };
    const result: HotTopicResult[] = [];
    
    // 处理置顶话题
    for (const topic of pinnedHotTopics) {
      if (topic.postId) {
        if (topic.type === 'convention') {
          const convention = conventions.find(c => c.id === topic.postId);
          if (convention && !removedPostIds.includes(topic.postId)) {
            result.push({ type: 'convention', data: convention, topicId: topic.id });
          }
        } else if (topic.type === 'cos') {
          // COS作品
          const cosWork = cosWorks.find(w => w.id === topic.postId);
          if (cosWork && !removedPostIds.includes(topic.postId)) {
            const post: Post = {
              id: cosWork.id,
              title: cosWork.title,
              section: 'COS专区',
              sectionIcon: '📸',
              sectionColor: 'from-violet-500 to-purple-500',
              author: cosWork.authorName,
              createdAt: cosWork.createdAt,
              views: cosWork.views || 0,
            };
            result.push({ type: 'cos', data: post, topicId: topic.id });
          }
        } else if (topic.type === 'service') {
          // 服务
          const service = services.find(s => s.id === topic.postId);
          if (service && !removedPostIds.includes(topic.postId)) {
            const categoryLabel = service.category === 'makeup' ? '妆娘' : 
                                  service.category === 'wig' ? '毛娘' : 
                                  service.category === 'photographer' ? '摄影师' : '道具师';
            const post: Post = {
              id: service.id,
              title: `${service.nickname} - ${categoryLabel}`,
              section: '服务专区',
              sectionIcon: '💄',
              sectionColor: 'from-cyan-500 to-blue-500',
              author: service.nickname,
              createdAt: service.createdAt,
              views: 0,
            };
            result.push({ type: 'service', data: post, topicId: topic.id });
          }
        } else if (topic.type === 'trading') {
          // 交易商品
          const product = products.find(p => p.id === topic.postId);
          if (product && !removedPostIds.includes(topic.postId)) {
            const post: Post = {
              id: product.id,
              title: product.title,
              section: '交易专区',
              sectionIcon: '🔄',
              sectionColor: 'from-amber-500 to-orange-500',
              author: product.seller,
              createdAt: product.createdAt,
              views: 0,
              price: product.price,
            };
            result.push({ type: 'trading', data: post, topicId: topic.id });
          }
        } else if (topic.type === 'post') {
          // 普通帖子
          const post = posts.find(p => p.id === topic.postId);
          if (post && !removedPostIds.includes(topic.postId)) {
            result.push({ type: 'post', data: post, topicId: topic.id });
          }
        }
      }
    }
    
    // 添加未置顶的帖子（按浏览量排序）
    const pinnedPostIds = pinnedHotTopics.map(t => t.postId);
    
    const unpinnedPosts = posts
      .filter(p => !pinnedPostIds.includes(p.id) && !removedPostIds.includes(p.id))
      .sort((a, b) => b.views - a.views)
      .slice(0, 4);
    
    unpinnedPosts.forEach(post => result.push({ type: 'post', data: post }));
    // 不再自动添加漫展到热门话题，只有手动置顶的漫展才会显示
    
    return result.slice(0, 4);
  }, [posts, conventions, services, products, cosWorks, pinnedHotTopics, removedPostIds]);
  
  // 根据专区筛选帖子（包含所有四个专区：漫展、COS、服务、交易）
  const filteredPosts = useMemo(() => {
    // 转换服务数据为帖子格式
    const servicePosts: Post[] = services.map(s => ({
      id: s.id,
      title: `${s.nickname} - ${s.category === 'makeup' ? '妆娘' : s.category === 'wig' ? '毛娘' : s.category === 'photographer' ? '摄影师' : '道具师'}`,
      section: '服务专区',
      sectionIcon: '💄',
      sectionColor: 'from-cyan-500 to-blue-500',
      author: s.nickname,
      createdAt: s.createdAt,
      views: 0,
      likes: 0,
    }));

    // 转换商品数据为帖子格式
    const productPosts: Post[] = products.map(p => ({
      id: p.id,
      title: p.title,
      section: '交易专区',
      sectionIcon: '🔄',
      sectionColor: 'from-amber-500 to-orange-500',
      author: p.seller,
      createdAt: p.createdAt,
      views: 0,
      likes: 0,
      price: p.price,
    }));

    // 合并所有帖子
    const allPosts = [...posts, ...servicePosts, ...productPosts];
    
    // 显示所有四个专区
    const validSections = ['漫展专区', 'COS专区', '服务专区', '交易专区'];
    const sectionPosts = allPosts.filter(post => validSections.includes(post.section));
    
    if (activeSection === 'all') {
      return sectionPosts;
    }
    return sectionPosts.filter(post => post.section === activeSection);
  }, [posts, services, products, activeSection]);

  // 热门话题管理相关函数 - 实时更新
  const addHotTopic = (postId: string, type: 'post' | 'convention' = 'post') => {
    if (!postId || pinnedHotTopics.length >= 4) return;
    if (pinnedHotTopics.some(t => t.postId === postId && t.type === type)) return;
    const newTopics = [...pinnedHotTopics, { id: `p${Date.now()}`, postId, type }];
    setPinnedHotTopics(newTopics);
    savePinnedTopics(newTopics);
    setNewHotTopicPostId('');
    // 触发自定义事件通知其他组件更新（同一标签页内同步）
    window.dispatchEvent(new Event('pinnedTopicsChanged'));
  };

  const removeHotTopic = (topicId: string) => {
    // 找到要移除的话题
    const topicToRemove = pinnedHotTopics.find(t => t.id === topicId);
    if (!topicToRemove) {
      console.error('Topic not found:', topicId);
      return;
    }
    
    // 从置顶列表中移除
    const newPinnedTopics = pinnedHotTopics.filter(t => t.id !== topicId);
    
    // 立即直接保存到 localStorage（不依赖状态更新）
    try {
      localStorage.setItem('pinnedHotTopics', JSON.stringify(newPinnedTopics));
      console.log('Saved to localStorage:', newPinnedTopics);
    } catch (e) {
      console.error('Failed to save:', e);
    }
    
    // 更新 React 状态
    setPinnedHotTopics(newPinnedTopics);
    
    // 如果有实际的 postId，将其添加到已移除列表
    if (topicToRemove.postId) {
      const newRemovedIds = [...removedPostIds, topicToRemove.postId];
      try {
        localStorage.setItem('removedHotPostIds', JSON.stringify(newRemovedIds));
      } catch (e) {
        console.error('Failed to save removed ids:', e);
      }
      setRemovedPostIds(newRemovedIds);
    }
    
    // 触发自定义事件通知其他组件更新（同一标签页内同步）
    window.dispatchEvent(new Event('pinnedTopicsChanged'));
    console.log('Removed topic:', topicToRemove.postId);
  };

  // 手动刷新帖子数据（包括COS、服务、商品）
  // 手动刷新所有数据（从 Supabase 加载）
  const refreshPosts = () => {
    const loadAllData = async () => {
      try {
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
        
        setPosts(formattedPosts);
        setConventions(formattedConventions);
        setLastUpdate(new Date());
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    };
    loadAllData();
  };

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    
    // 监听用户变化
    const handleUserChange = () => {
      window.location.reload();
    };
    window.addEventListener('userChanged', handleUserChange);

    // 监听帖子数据变化
    const handlePostsChange = () => {
      const freshPosts = loadPosts();
      const freshServices = loadServices();
      const freshProducts = loadProducts();
      const freshCosWorks = loadCosWorks();
      setPosts(freshPosts);
      setServices(freshServices);
      setProducts(freshProducts);
      setCosWorks(freshCosWorks);
      setLastUpdate(new Date());
      loadStats();
    };
    window.addEventListener('postsChanged', handlePostsChange);
    window.addEventListener('cosWorksChanged', handlePostsChange);
    window.addEventListener('servicesChanged', handlePostsChange);
    window.addEventListener('productsChanged', handlePostsChange);

    // 监听 storage 变化（其他标签页修改时）
    const handleStorage = () => {
      const freshPosts = loadPosts();
      const freshServices = loadServices();
      const freshProducts = loadProducts();
      const freshCosWorks = loadCosWorks();
      setPosts(freshPosts);
      setServices(freshServices);
      setProducts(freshProducts);
      setCosWorks(freshCosWorks);
      setLastUpdate(new Date());
      loadStats();
    };
    window.addEventListener('storage', handleStorage);

    // 监听统计数据变化
    const handleStatsChange = () => {
      loadStats();
    };
    window.addEventListener('statsChanged', handleStatsChange);
    
    // 初始加载（使用 ref 防止 StrictMode 重复计数）
    refreshPosts();
    loadStats();
    if (!hasIncrementedViews.current) {
      hasIncrementedViews.current = true;
      incrementPageViews();
    }
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('postsChanged', handlePostsChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('statsChanged', handleStatsChange);
    };
  }, []);

  // 每次页面可见时刷新数据
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStats();
        const freshPosts = loadPosts();
        setPosts(freshPosts);
        // 刷新热门话题数据
        const freshPinnedTopics = loadPinnedTopics();
        setPinnedHotTopics(freshPinnedTopics);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 定期刷新实时浏览量
  useEffect(() => {
    // 获取所有热门帖子的实时浏览量
    const updateRealtimeViews = () => {
      const viewsData: Record<string, number> = {};
      
      // 从 pinnedHotTopics 获取所有需要获取浏览量的帖子
      pinnedHotTopics.forEach(topic => {
        if (topic.type !== 'convention') {
          const views = realtimeViews.getViews(topic.postId);
          if (views > 0) {
            viewsData[topic.postId] = views;
          }
        }
      });
      
      setRealtimeViewsData(viewsData);
    };
    
    // 初始加载
    updateRealtimeViews();
    
    // 每2秒刷新一次
    const interval = setInterval(updateRealtimeViews, 2000);
    
    // 监听浏览量更新事件
    const handleViewsUpdated = () => {
      updateRealtimeViews();
    };
    window.addEventListener('realtime:views:updated', handleViewsUpdated);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('realtime:views:updated', handleViewsUpdated);
    };
  }, [pinnedHotTopics]);

  // 监听 pinnedHotTopics 变化（跨页面同步）
  useEffect(() => {
    const handlePinnedTopicsChange = () => {
      const freshPinnedTopics = loadPinnedTopics();
      setPinnedHotTopics(freshPinnedTopics);
    };
    window.addEventListener('storage', handlePinnedTopicsChange);
    // 也监听自定义事件
    window.addEventListener('pinnedTopicsChanged', handlePinnedTopicsChange);
    return () => {
      window.removeEventListener('storage', handlePinnedTopicsChange);
      window.removeEventListener('pinnedTopicsChanged', handlePinnedTopicsChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    
    // 监听用户变化
    const handleUserChange = () => {
      window.location.reload();
    };
    window.addEventListener('userChanged', handleUserChange);

    // 监听帖子数据变化（包括服务、商品）
    const handlePostsChange = () => {
      const freshPosts = loadPosts();
      const freshServices = loadServices();
      const freshProducts = loadProducts();
      setPosts(freshPosts);
      setServices(freshServices);
      setProducts(freshProducts);
      setLastUpdate(new Date());
    };
    window.addEventListener('postsChanged', handlePostsChange);

    // 监听 storage 变化（其他标签页修改时）
    const handleStorage = () => {
      const freshPosts = loadPosts();
      const freshServices = loadServices();
      const freshProducts = loadProducts();
      setPosts(freshPosts);
      setServices(freshServices);
      setProducts(freshProducts);
      setLastUpdate(new Date());
    };
    window.addEventListener('storage', handleStorage);
    
    // 初始加载
    refreshPosts();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('userChanged', handleUserChange);
      window.removeEventListener('postsChanged', handlePostsChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Stars />

      {/* 主内容 */}
      <main className="relative z-10 pt-24">
        
          {/* Hero区域 - 固定不滚动 */}
          <section className="text-center mb-16 px-6">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-shimmer">
              <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                贵阳二次元
              </span>
              <br />
              <span className="text-white">COSponsor交流平台</span>
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              专为贵阳二次元同好打造的交流社区，漫展资讯、COS分享、服务对接、闲置交易一站式解决
            </p>
          </section>

          {/* 可滚动内容 */}
          <div className="max-w-7xl mx-auto px-6 pb-20">
          
          {/* 全宽专区卡片 */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
            {sections.map((section, index) => (
              <Link
                key={section.path}
                to={section.path}
                className="anime-card group"
                style={{ 
                  animationDelay: `${index * 0.15}s`,
                  '--glow-color': index === 0 ? '#ec4899' : 
                                   index === 1 ? '#8b5cf6' : 
                                   index === 2 ? '#06b6d4' : '#f59e0b'
                } as React.CSSProperties}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${section.color} opacity-10 group-hover:opacity-20 transition-opacity rounded-3xl`} />
                <div className="relative flex items-center gap-6 p-8">
                  <div className="text-6xl group-hover:scale-125 group-hover:rotate-6 transition-all duration-300">
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-white/60 group-hover:text-white/80 transition-colors">
                      {section.desc}
                    </p>
                  </div>
                  <div className="text-3xl text-white/30 group-hover:text-white group-hover:translate-x-2 transition-all">
                    →
                  </div>
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </section>

          {/* 热门话题 */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl animate-pulse">🔥</span>
                热门话题
              </h2>
              {/* 仅站主可见管理按钮 */}
              {isAdmin && (
                <button
                  onClick={() => {
                    refreshPosts(); // 打开时刷新数据
                    setShowHotTopicManager(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all"
                >
                  <Settings className="w-4 h-4" />
                  管理热门
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hotTopics.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-white/50">
                  暂无热门话题，快去发布漫展或帖子吧！
                </div>
              ) : hotTopics.map((topic, index) => {
                const isConvention = topic.type === 'convention';
                const post = !isConvention ? topic.data as Post : null;
                const convention = isConvention ? topic.data as Convention : null;
                const topicId = isConvention ? convention?.id : post?.id;
                const title = isConvention ? convention?.title : post?.title;
                const isPinned = pinnedHotTopics.some(t => t.postId === topicId && t.type === topic.type);
                
                // 根据类型确定标签样式
                let sectionLabel = '';
                let sectionStyle = 'bg-gradient-to-r from-violet-500 to-purple-500 text-white';
                if (isConvention) {
                  sectionLabel = '🎭 漫展';
                  sectionStyle = 'bg-gradient-to-r from-pink-500 to-rose-500 text-white';
                } else if (topic.type === 'cos') {
                  sectionLabel = '📸 COS';
                  sectionStyle = 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white';
                } else if (topic.type === 'service') {
                  sectionLabel = '🛠️ 服务';
                  sectionStyle = 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
                } else if (topic.type === 'trading') {
                  sectionLabel = '💰 交易';
                  sectionStyle = 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
                } else {
                  sectionLabel = post?.section || '帖子';
                }
                
                return (
                  <Link
                    key={`${topic.type}-${topicId}`}
                    to={
                      isConvention ? `/convention/${topicId}` :
                      topic.type === 'cos' ? `/cos/${topicId}` :
                      topic.type === 'service' ? `/service/${topicId}` :
                      topic.type === 'trading' ? `/trading/${topicId}` :
                      `/post/${topicId}`
                    }
                    className="anime-card cursor-pointer group"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                        index === 1 ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                        index === 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                        'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-medium group-hover:text-pink-400 transition-colors">
                          {title}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${sectionStyle}`}>
                            {sectionLabel}
                          </span>
                          {isConvention && convention && (
                            <span className="text-sm text-white/50 flex items-center gap-1">
                              {convention.location}
                            </span>
                          )}
                          {!isConvention && post && (
                            <span className="text-sm text-white/50 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {(realtimeViewsData[post.id] || post.views || 0).toLocaleString()} 浏览
                            </span>
                          )}
                        </div>
                      </div>
                      {/* 置顶标签 - 仅站主可见 */}
                      {isAdmin && isPinned && (
                        <div className="px-2 py-1 bg-pink-500/20 text-pink-400 rounded text-xs">
                          置顶
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* 浏览量排行榜 - COS专区实时排行（只显示前5） */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">📊</span>
                COS专区浏览量排行榜
              </h2>
              <span className="text-white/40 text-xs">实时更新</span>
            </div>
            
            <div className="bg-dark-50 rounded-2xl p-4 border border-white/5">
              <div className="space-y-2">
                {cosWorks
                  .filter(w => w.status === 'approved')
                  .sort((a, b) => (b.views || 0) - (a.views || 0))
                  .slice(0, 5)
                  .map((work, index) => {
                    const isPinned = pinnedHotTopics.some(t => t.postId === work.id && t.type === 'cos');
                    return (
                      <Link
                        key={work.id}
                        to={`/cos/${work.id}`}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded text-white text-xs flex items-center justify-center font-bold ${
                            index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                            index === 1 ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                            index === 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                            'bg-white/20'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="flex flex-col">
                            <span className={`text-sm ${isPinned ? 'text-cyan-400' : 'text-white/80'}`}>
                              {work.title}
                            </span>
                            <span className="text-xs text-white/40">{work.authorName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPinned && (
                            <span className="text-xs px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded">置顶</span>
                          )}
                          <span className="text-cyan-400 text-sm">{work.views?.toLocaleString() || 0}</span>
                          <span className="text-white/40 text-xs">浏览</span>
                        </div>
                      </Link>
                    );
                  })}
                {cosWorks.filter(w => w.status === 'approved').length === 0 && (
                  <p className="text-white/30 text-sm text-center py-6">暂无COS作品</p>
                )}
              </div>
            </div>
          </section>

          {/* 热门话题管理弹窗 */}
          {showHotTopicManager && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-dark-100 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    热门话题管理
                  </h3>
                  <button
                    onClick={() => setShowHotTopicManager(false)}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* 紧急重置按钮 */}
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-xs mb-2">⚠️ 如果无法正常删除，可使用紧急重置</p>
                  <button
                    onClick={() => {
                      if (confirm('确定要紧急重置所有热门话题吗？这将清除所有置顶话题。')) {
                        localStorage.removeItem('pinnedHotTopics');
                        localStorage.removeItem('removedHotPostIds');
                        setPinnedHotTopics([]);
                        setRemovedPostIds([]);
                        alert('已重置所有热门话题，请刷新页面');
                        window.location.reload();
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                  >
                    紧急重置热门话题
                  </button>
                </div>
                
                {/* 当前热门话题列表 */}
                <div className="mb-6">
                  <h4 className="text-white/70 text-sm mb-3">当前热门话题（{pinnedHotTopics.length}/4）</h4>
                  <div className="space-y-2">
                    {pinnedHotTopics.length === 0 ? (
                      <p className="text-white/50 text-sm text-center py-4">暂无热门话题</p>
                    ) : (
                      pinnedHotTopics.map((topic, index) => {
                        // 获取话题数据
                        let data: Post | Convention | null = null;
                        let title = '未知';
                        let badgeColor = 'bg-gray-500/20 text-gray-400';
                        let badgeText = '未知';
                        
                        if (topic.type === 'post') {
                          data = posts.find(p => p.id === topic.postId) || null;
                          title = (data as Post)?.title || '未知';
                          badgeColor = 'bg-violet-500/20 text-violet-400';
                          badgeText = '帖子';
                        } else if (topic.type === 'convention') {
                          data = conventions.find(c => c.id === topic.postId) || null;
                          title = (data as Convention)?.title || '未知';
                          badgeColor = 'bg-pink-500/20 text-pink-400';
                          badgeText = '漫展';
                        } else if (topic.type === 'cos') {
                          const cosWork = cosWorks.find(w => w.id === topic.postId);
                          title = cosWork?.title || '未知';
                          badgeColor = 'bg-cyan-500/20 text-cyan-400';
                          badgeText = 'COS';
                        } else if (topic.type === 'service') {
                          const service = services.find(s => s.id === topic.postId);
                          const categoryLabel = service?.category === 'makeup' ? '妆娘' : 
                                               service?.category === 'wig' ? '毛娘' : 
                                               service?.category === 'photographer' ? '摄影师' : '道具师';
                          title = service ? `${service.nickname} - ${categoryLabel}` : '未知';
                          badgeColor = 'bg-amber-500/20 text-amber-400';
                          badgeText = '服务';
                        } else if (topic.type === 'trading') {
                          const product = products.find(p => p.id === topic.postId);
                          title = product?.title || '未知';
                          badgeColor = 'bg-emerald-500/20 text-emerald-400';
                          badgeText = '交易';
                        }
                        
                        return (
                          <div key={topic.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded text-white text-sm flex items-center justify-center ${
                                index === 0 ? 'bg-gradient-to-r from-pink-500 to-rose-500' :
                                index === 1 ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                                index === 2 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' :
                                'bg-gradient-to-r from-amber-500 to-orange-500'
                              }`}>
                                {index + 1}
                              </span>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-white text-sm truncate max-w-[180px]">{title}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${badgeColor}`}>
                                    {badgeText}
                                  </span>
                                </div>
                                <span className="text-xs text-pink-400">📌 置顶中</span>
                              </div>
                            </div>
                            <button
                              onClick={() => removeHotTopic(topic.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="移除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {/* 添加漫展到热门 */}
                <div className="mb-4">
                  <h4 className="text-white/70 text-sm mb-3">添加漫展到热门</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={newHotTopicPostId}
                        onChange={(e) => setNewHotTopicPostId(e.target.value)}
                        className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500 appearance-none"
                        style={{ paddingRight: '12px' }}
                      >
                        <option value="">-- 选择漫展 --</option>
                        {conventions
                          .filter(c => !pinnedHotTopics.some(t => t.postId === c.id && t.type === 'convention'))
                          .map(convention => (
                            <option key={convention.id} value={convention.id} style={{ background: '#1e293b', color: '#fff' }}>
                              {convention.title} ({convention.location})
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (newHotTopicPostId) {
                          addHotTopic(newHotTopicPostId, 'convention');
                          setNewHotTopicPostId('');
                        }
                      }}
                      disabled={!newHotTopicPostId}
                      className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>
                
                {/* 添加COS到热门 */}
                <div className="mb-4">
                  <h4 className="text-white/70 text-sm mb-3">添加COS到热门</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={newHotTopicPostId}
                        onChange={(e) => setNewHotTopicPostId(e.target.value)}
                        className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none"
                        style={{ paddingRight: '12px' }}
                      >
                        <option value="">-- 选择COS --</option>
                        {cosWorks
                          .filter(w => w.status === 'approved' && !pinnedHotTopics.some(t => t.postId === w.id && t.type === 'cos'))
                          .map(work => (
                            <option key={work.id} value={work.id} style={{ background: '#1e293b', color: '#fff' }}>
                              {work.title} ({work.views || 0}浏览)
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (newHotTopicPostId) {
                          addHotTopic(newHotTopicPostId, 'cos');
                          setNewHotTopicPostId('');
                        }
                      }}
                      disabled={!newHotTopicPostId}
                      className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>
                
                {/* 添加服务到热门 */}
                <div className="mb-4">
                  <h4 className="text-white/70 text-sm mb-3">添加服务到热门</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={newHotTopicPostId}
                        onChange={(e) => setNewHotTopicPostId(e.target.value)}
                        className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none"
                        style={{ paddingRight: '12px' }}
                      >
                        <option value="">-- 选择服务 --</option>
                        {services
                          .filter(s => s.status === 'approved' && !pinnedHotTopics.some(t => t.postId === s.id && t.type === 'service'))
                          .map(service => (
                            <option key={service.id} value={service.id} style={{ background: '#1e293b', color: '#fff' }}>
                              {service.nickname} - {service.category}
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (newHotTopicPostId) {
                          addHotTopic(newHotTopicPostId, 'service');
                          setNewHotTopicPostId('');
                        }
                      }}
                      disabled={!newHotTopicPostId}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>
                
                {/* 添加交易到热门 */}
                <div className="mb-4">
                  <h4 className="text-white/70 text-sm mb-3">添加交易到热门</h4>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={newHotTopicPostId}
                        onChange={(e) => setNewHotTopicPostId(e.target.value)}
                        className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                        style={{ paddingRight: '12px' }}
                      >
                        <option value="">-- 选择交易 --</option>
                        {products
                          .filter(p => p.status === 'approved' && !pinnedHotTopics.some(t => t.postId === p.id && t.type === 'trading'))
                          .map(product => (
                            <option key={product.id} value={product.id} style={{ background: '#1e293b', color: '#fff' }}>
                              {product.title} (¥{product.price})
                            </option>
                          ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        if (newHotTopicPostId) {
                          addHotTopic(newHotTopicPostId, 'trading');
                          setNewHotTopicPostId('');
                        }
                      }}
                      disabled={!newHotTopicPostId}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
                    >
                      添加
                    </button>
                  </div>
                </div>
                
                {pinnedHotTopics.length >= 4 && (
                  <p className="text-amber-400 text-xs mt-4">已达最大数量(4个)，如需添加请先移除已有话题</p>
                )}
              </div>
            </div>
          )}

          {/* 最新帖子 - 漫展和COS专区实时更新 */}
          <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl animate-pulse">📝</span>
                最新帖子
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-white/40 text-xs">
                  更新: {lastUpdate.toLocaleTimeString()}
                </span>
                <button
                  onClick={refreshPosts}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white text-sm transition-all"
                  title="刷新帖子"
                >
                  <RefreshCw className="w-4 h-4" />
                  刷新
                </button>
              </div>
            </div>
            
            {/* 专区标签筛选 - 全部四个专区 */}
            <div className="flex flex-wrap gap-3 mb-6">
              {['全部', '漫展专区', 'COS专区', '服务专区', '交易专区'].map((label) => (
                <button
                  key={label}
                  onClick={() => setActiveSection(label === '全部' ? 'all' : label)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    activeSection === (label === '全部' ? 'all' : label)
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  {label === '漫展专区' ? '🎭 漫展' : 
                   label === 'COS专区' ? '📸 COS' :
                   label === '服务专区' ? '💄 服务' :
                   label === '交易专区' ? '🔄 交易' : label}
                </button>
              ))}
            </div>
            
            {/* 帖子列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map((post, index) => (
                <div
                  key={post.id}
                  className="anime-card cursor-pointer group"
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="p-5">
                    {/* 专区标签 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{post.sectionIcon}</span>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${post.sectionColor} text-white`}>
                          {post.section}
                        </span>
                      </div>
                    </div>
                    
                    {/* 标题 */}
                    <Link to={sectionPaths[post.section]}>
                      <h4 className="text-white font-medium group-hover:text-pink-400 transition-colors mb-3 line-clamp-2">
                        {post.title}
                      </h4>
                    </Link>
                    
                    {/* 元信息 */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3 text-white/50">
                        <span className="flex items-center gap-2">
                          <UserAvatar username={post.author} />
                          {post.author}
                        </span>
                        <span>{post.createdAt}</span>
                      </div>
                      
                      {/* 附加信息：价格 */}
                      <div className="flex items-center gap-2">
                        {post.price !== undefined && (
                          <span className="text-red-400 font-bold">
                            ¥{post.price}
                          </span>
                        )}
                        {post.date !== undefined && (
                          <span className="text-cyan-400">
                            📅 {post.date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredPosts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-white/50">暂无帖子</p>
              </div>
            )}
          </section>

          {/* 统计数据 */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { number: stats.userCount.toLocaleString(), label: '注册用户', icon: '👥' },
              { number: stats.postCount.toLocaleString(), label: '帖子总数', icon: '📝' },
              { number: stats.conventionCount.toLocaleString(), label: '漫展活动', icon: '🎭' },
              { number: stats.pageViews.toLocaleString(), label: '网站浏览', icon: '👁️' },
            ].map((stat, index) => (
              <div 
                key={stat.label}
                className="anime-card text-center py-8"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="text-4xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </section>

          {/* 免责声明 */}
          <section className="mt-16 text-center">
            <div className="anime-card py-10 px-8">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-3xl">⚠️</span>
                <h3 className="text-xl font-bold text-white">免责声明</h3>
              </div>
              <div className="space-y-4 text-left max-w-3xl mx-auto">
                <div className="flex gap-3">
                  <span className="text-pink-400 font-bold">1.</span>
                  <p className="text-white/60 text-sm leading-relaxed">
                    <strong className="text-white/80">平台性质：</strong>本平台为贵阳二次元爱好者提供信息交流服务，用户发布的任何内容均不代表本平台立场。
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-pink-400 font-bold">2.</span>
                  <p className="text-white/60 text-sm leading-relaxed">
                    <strong className="text-white/80">交易风险：</strong>平台上的商品交易、服务对接等行为由用户自行负责，本平台不对任何交易纠纷承担法律责任。
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-pink-400 font-bold">3.</span>
                  <p className="text-white/60 text-sm leading-relaxed">
                    <strong className="text-white/80">内容审核：</strong>本平台会尽力审核内容，但对用户上传的信息真实性不作保证，请用户自行辨别。
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="text-pink-400 font-bold">4.</span>
                  <p className="text-white/60 text-sm leading-relaxed">
                    <strong className="text-white/80">防骗提示：</strong>请勿轻信低价诱惑，谨防网络诈骗。如遇可疑情况，请及时报警处理。
                  </p>
                </div>
              </div>
            </div>
          </section>

          </div>
        </main>

        {/* 底部渐变 */}
        <div className="fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-20" />
      </div>
    );
  };

  export default HomePage;

// 帖子和统计更新工具函数（供其他页面调用）
export const notifyPostsChanged = () => {
  window.dispatchEvent(new Event('postsChanged'));
  window.dispatchEvent(new Event('statsChanged'));
};

export const notifyStatsChanged = () => {
  window.dispatchEvent(new Event('statsChanged'));
};

// 全局热门话题重置函数 - 可在控制台调用
(window as any).resetHotTopics = () => {
  localStorage.removeItem('pinnedHotTopics');
  localStorage.removeItem('removedHotPostIds');
  window.location.reload();
};
