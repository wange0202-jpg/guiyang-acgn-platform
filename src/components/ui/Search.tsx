import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Eye, Heart, Calendar, MapPin, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getUserByUsername, getUsers } from '@/lib/auth';

// 用户头像组件
interface UserAvatarProps {
  username: string;
  size?: 'sm' | 'md' | 'lg';
}

const UserAvatar: React.FC<UserAvatarProps> = ({ username, size = 'sm' }) => {
  const user = getUserByUsername(username);
  const sizeClasses = {
    sm: 'w-4 h-4 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm'
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

// 统一搜索结果类型
interface SearchResult {
  id: string;
  title: string;
  type: 'post' | 'cos' | 'service' | 'product' | 'convention' | 'user';
  section: string;
  sectionIcon: string;
  sectionColor: string;
  author: string;
  authorAvatar?: string;
  createdAt: string;
  views?: number;
  likes?: number;
  price?: number;
  date?: string;
  location?: string;
  description?: string;
  userAvatar?: string;
  userRole?: string;
}

// 专区配置
const sections = [
  { id: 'all', label: '全部', icon: '🌐', color: 'from-gray-500 to-gray-600' },
  { id: 'user', label: '用户', icon: '👤', color: 'from-green-500 to-emerald-500' },
  { id: '漫展专区', label: '漫展', icon: '🎭', color: 'from-pink-500 to-rose-500' },
  { id: 'COS专区', label: 'COS', icon: '📸', color: 'from-violet-500 to-purple-500' },
  { id: '服务专区', label: '服务', icon: '💄', color: 'from-cyan-500 to-blue-500' },
  { id: '交易专区', label: '交易', icon: '🔄', color: 'from-amber-500 to-orange-500' },
];

// 专区类型映射
const sectionTypeMap: Record<string, string> = {
  '漫展专区': 'convention',
  'COS专区': 'cos',
  '服务专区': 'service',
  '交易专区': 'product',
};

// 帖子类型对应的跳转路径
const sectionPaths: Record<string, string> = {
  '漫展专区': '/convention',
  'COS专区': '/cos',
  '服务专区': '/service',
  '交易专区': '/trading',
};

// 加载帖子数据
const loadPosts = (): SearchResult[] => {
  try {
    const saved = localStorage.getItem('posts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((post: any) => ({
          ...post,
          type: 'post' as const,
          section: post.section || '漫展专区',
          sectionIcon: post.sectionIcon || '📝',
          sectionColor: post.sectionColor || 'from-pink-500 to-rose-500'
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
  return [];
};

// 加载COS作品数据
const loadCosWorks = (): SearchResult[] => {
  try {
    const saved = localStorage.getItem('cosWorks');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((work: any) => ({
          id: work.id,
          title: work.title,
          type: 'cos' as const,
          section: 'COS专区',
          sectionIcon: '📸',
          sectionColor: 'from-violet-500 to-purple-500',
          author: work.author?.username || work.authorName || '未知',
          authorAvatar: work.author?.avatar,
          createdAt: work.createdAt,
          likes: work.likes,
          description: work.description
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load cos works:', e);
  }
  return [];
};

// 加载服务数据
const loadServices = (): SearchResult[] => {
  try {
    const saved = localStorage.getItem('services');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((service: any) => ({
          id: service.id,
          title: service.title,
          type: 'service' as const,
          section: '服务专区',
          sectionIcon: '💄',
          sectionColor: 'from-cyan-500 to-blue-500',
          author: service.nickname || service.authorName || '未知',
          createdAt: service.createdAt,
          price: service.priceRange,
          location: service.location,
          description: service.description
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load services:', e);
  }
  return [];
};

// 加载商品数据
const loadProducts = (): SearchResult[] => {
  try {
    const saved = localStorage.getItem('products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((product: any) => ({
          id: product.id,
          title: product.title,
          type: 'product' as const,
          section: '交易专区',
          sectionIcon: '🔄',
          sectionColor: 'from-amber-500 to-orange-500',
          author: product.seller?.username || product.authorName || '未知',
          createdAt: product.createdAt,
          price: product.price,
          description: product.description
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load products:', e);
  }
  return [];
};

// 加载漫展数据
const loadConventions = (): SearchResult[] => {
  try {
    const saved = localStorage.getItem('conventions');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.map((convention: any) => ({
          id: convention.id,
          title: convention.title,
          type: 'convention' as const,
          section: '漫展专区',
          sectionIcon: '🎭',
          sectionColor: 'from-pink-500 to-rose-500',
          author: convention.organizer || '未知',
          createdAt: convention.createdAt,
          date: convention.startDate && convention.endDate ? `${convention.startDate} - ${convention.endDate}` : convention.startDate,
          location: convention.location,
          description: convention.description
        }));
      }
    }
  } catch (e) {
    console.error('Failed to load conventions:', e);
  }
  return [];
};

// 加载用户数据
const loadUsers = (): SearchResult[] => {
  try {
    const users = getUsers();
    return users.map((user) => ({
      id: user.id,
      title: user.username,
      type: 'user' as const,
      section: '用户',
      sectionIcon: '👤',
      sectionColor: 'from-green-500 to-emerald-500',
      author: user.username,
      authorAvatar: user.avatar,
      userAvatar: user.avatar,
      userRole: user.role,
      createdAt: user.createdAt,
      description: user.role === 'admin' ? '管理员' : '普通用户'
    }));
  } catch (e) {
    console.error('Failed to load users:', e);
  }
  return [];
};

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allData, setAllData] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载所有数据
  useEffect(() => {
    const loadAllData = () => {
      const posts = loadPosts();
      const cosWorks = loadCosWorks();
      const services = loadServices();
      const products = loadProducts();
      const conventions = loadConventions();
      const users = loadUsers();
      
      setAllData([...users, ...posts, ...cosWorks, ...services, ...products, ...conventions]);
    };
    
    loadAllData();
  }, []);

  // 每次打开时聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 实时搜索
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    let filtered = allData.filter(item =>
      item.title.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );

    // 按专区筛选
    if (selectedSection !== 'all') {
      if (selectedSection === 'user') {
        filtered = filtered.filter(item => item.type === 'user');
      } else {
        filtered = filtered.filter(item => item.section === selectedSection);
      }
    }

    // 按相关性排序（标题匹配优先）
    filtered.sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(query);
      const bTitle = b.title.toLowerCase().includes(query);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return (b.views || 0) - (a.views || 0);
    });

    setSearchResults(filtered.slice(0, 10));
  }, [searchQuery, selectedSection, allData]);

  // ESC 键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // 监听数据变化
  useEffect(() => {
    const loadAllData = () => {
      const posts = loadPosts();
      const cosWorks = loadCosWorks();
      const services = loadServices();
      const products = loadProducts();
      const conventions = loadConventions();
      const users = loadUsers();
      setAllData([...users, ...posts, ...cosWorks, ...services, ...products, ...conventions]);
    };

    const handleDataChange = () => loadAllData();
    window.addEventListener('postsChanged', handleDataChange);
    window.addEventListener('userChanged', handleDataChange);
    window.addEventListener('storage', handleDataChange);
    return () => {
      window.removeEventListener('postsChanged', handleDataChange);
      window.removeEventListener('userChanged', handleDataChange);
      window.removeEventListener('storage', handleDataChange);
    };
  }, []);

  // 获取跳转路径
  const getPath = (result: SearchResult): string => {
    if (result.type === 'user') {
      return `/profile/${result.author}`;
    }
    if (result.type === 'post') {
      return sectionPaths[result.section] || '/';
    }
    if (result.type === 'convention') {
      return `/convention/${result.id}`;
    }
    if (result.type === 'cos') {
      return `/cos/${result.id}`;
    }
    if (result.type === 'service') {
      return `/service/${result.id}`;
    }
    if (result.type === 'product') {
      return `/trading/${result.id}`;
    }
    return '/';
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-transparent backdrop-blur-sm z-[200] flex items-start justify-center pt-20 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl bg-dark-100 rounded-2xl shadow-2xl border border-white/10 overflow-hidden animate-fade-in">
        {/* 搜索输入框 */}
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSearchQuery(searchQuery.trim());
                }
              }}
              placeholder="搜索用户、作品、服务..."
              className="w-full bg-slate-800/50 text-white placeholder-slate-400 rounded-xl pl-12 pr-24 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-1.5 text-slate-400 hover:text-white transition-colors"
                  title="清除"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setSearchQuery(searchQuery.trim())}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                搜索
              </button>
            </div>
          </div>
        </div>

        {/* 专区标签筛选 */}
        <div className="p-4 border-b border-white/10">
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setSelectedSection(section.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                  selectedSection === section.id
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                )}
              >
                <span className="mr-1.5">{section.icon}</span>
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[400px] overflow-y-auto">
          {searchQuery.trim() === '' ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">输入关键词开始搜索</p>
              <p className="text-slate-500 text-sm mt-1">支持用户名、作品、作者搜索</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400">未找到相关内容</p>
              <p className="text-slate-500 text-sm mt-1">试试其他关键词或切换专区</p>
            </div>
          ) : (
            <div className="p-2">
              <div className="text-xs text-slate-500 px-3 py-2">
                找到 {searchResults.length} 个结果
              </div>
              {searchResults.map((result) => (
                <Link
                  key={`${result.type}-${result.id}`}
                  to={getPath(result)}
                  onClick={onClose}
                  className="block p-3 rounded-lg hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* 专区标签 */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{result.sectionIcon}</span>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full bg-gradient-to-r text-white',
                          result.sectionColor
                        )}>
                          {result.section}
                        </span>
                        {result.userRole === 'admin' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                            管理员
                          </span>
                        )}
                      </div>
                      {/* 标题 */}
                      <h4 className="text-white font-medium group-hover:text-pink-400 transition-colors line-clamp-1">
                        {result.title}
                      </h4>
                      {/* 元信息 */}
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        {result.type === 'user' ? (
                          <>
                            <span className="flex items-center gap-1.5">
                              {result.userAvatar ? (
                                <img 
                                  src={result.userAvatar} 
                                  alt={result.author} 
                                  className="w-4 h-4 rounded-full object-cover"
                                />
                              ) : (
                                <UserIcon className="w-4 h-4" />
                              )}
                              <span className="text-green-400">@{result.author}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              加入于 {result.createdAt}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="flex items-center gap-1.5">
                              <UserAvatar username={result.author} size="sm" />
                              {result.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {result.createdAt}
                            </span>
                            {result.views !== undefined && (
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {result.views}
                              </span>
                            )}
                            {result.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {result.location}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {/* 价格/日期/点赞 */}
                    <div className="flex flex-col items-end gap-1">
                      {result.type === 'user' && (
                        <div className="text-green-400 text-xs">
                          查看主页
                        </div>
                      )}
                      {result.price !== undefined && (
                        <div className="text-red-400 font-bold">
                          ¥{result.price}
                        </div>
                      )}
                      {result.date && (
                        <div className="text-cyan-400 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {result.date}
                        </div>
                      )}
                      {result.likes !== undefined && (
                        <div className="text-pink-400 text-xs flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          {result.likes}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="p-3 border-t border-white/10 bg-slate-800/30">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>按 ESC 关闭</span>
            <span>支持用户、作品、作者搜索</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export function SearchButton() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // 监听自定义事件来打开搜索框
  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener('openSearch', handleOpenSearch);
    return () => window.removeEventListener('openSearch', handleOpenSearch);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsSearchOpen(true)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-100 transition-colors"
        title="搜索"
      >
        <Search className="w-5 h-5" />
      </button>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

export default SearchButton;
