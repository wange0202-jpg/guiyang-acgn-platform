import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Settings, Edit2, Calendar, MessageCircle, LogOut, Shield, ArrowLeft, Camera, Save, X, Lock, Trash2, Users, UserMinus, AlertTriangle, User } from 'lucide-react';
import { getCurrentUser, logout, updateUserProfile, getUserByUsername, getUsers, deleteUser, formatDateTime } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { uploadToImgBB } from '@/lib/imageUpload';
import { 
  realtimeViews,
  subscribeToEvent, 
  REALTIME_EVENTS 
} from '@/lib/realtime';

// 用户类型定义
interface User {
  id: string;
  account: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
  avatar?: string;
  createdAt: string;
}

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

// 从 localStorage 加载帖子数据
const loadPosts = (): Post[] => {
  try {
    const saved = localStorage.getItem('posts');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load posts:', e);
  }
  return [];
};

// 从 localStorage 加载COS作品数据
const loadCosWorks = () => {
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

// 从 localStorage 加载服务数据
const loadServices = () => {
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

// 从 localStorage 加载产品数据
const loadProducts = () => {
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

// 从 localStorage 加载漫展数据
const loadConventions = () => {
  try {
    const saved = localStorage.getItem('conventions');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load conventions:', e);
  }
  return [];
};

// 加载所有类型的帖子（用于显示点赞的帖子）
const loadAllPosts = (): Post[] => {
  const posts = loadPosts();
  const cosWorks = loadCosWorks();
  const services = loadServices();
  const products = loadProducts();
  const conventions = loadConventions();
  
  // 将其他类型的数据转换为统一格式
  const cosPosts: Post[] = cosWorks.map((work: any) => ({
    id: work.id,
    title: work.title || work.description,
    section: 'COS专区',
    sectionIcon: '📸',
    sectionColor: 'from-violet-500 to-purple-500',
    author: work.authorName || work.author || '未知',  // 优先使用 authorName
    authorId: work.authorId,
    createdAt: work.createdAt || new Date().toISOString(),
    views: work.views || 0,
    likes: work.likes || 0,
    images: work.images,
    coverImage: work.coverImage,
    type: 'cos'
  }));
  
  const servicePosts: Post[] = services.map((service: any) => ({
    id: service.id,
    title: service.title,
    section: '服务专区',
    sectionIcon: '💄',
    sectionColor: 'from-cyan-500 to-blue-500',
    author: service.nickname || service.author || '未知',  // 优先使用 nickname
    authorId: service.authorId,
    createdAt: service.createdAt || new Date().toISOString(),
    views: service.views || 0,
    likes: service.likes || 0,
    price: service.price,
    type: 'service'
  }));
  
  const productPosts: Post[] = products.map((product: any) => ({
    id: product.id,
    title: product.title,
    section: '交易专区',
    sectionIcon: '🔄',
    sectionColor: 'from-amber-500 to-orange-500',
    author: product.seller || product.author || '未知',  // 优先使用 seller
    authorId: product.authorId,
    createdAt: product.createdAt || new Date().toISOString(),
    views: product.views || 0,
    likes: product.likes || 0,
    price: product.price,
    location: product.location,
    type: 'product'
  }));
  
  const conventionPosts: Post[] = conventions.map((convention: any) => ({
    id: convention.id,
    title: convention.title,
    section: '漫展专区',
    sectionIcon: '🎭',
    sectionColor: 'from-pink-500 to-rose-500',
    author: convention.creatorUsername || '未知',
    authorId: convention.creatorId,
    createdAt: convention.createdAt || new Date().toISOString(),
    views: convention.views || 0,
    date: convention.startDate ? `${convention.startDate} ~ ${convention.endDate}` : undefined,
    location: convention.location,
    type: 'convention'
  }));
  
  return [...posts, ...cosPosts, ...servicePosts, ...productPosts, ...conventionPosts];
};

// 专区路径映射
const sectionPaths: Record<string, string> = {
  '漫展专区': '/convention',
  'COS专区': '/cos',
  '服务专区': '/service',
  '交易专区': '/trading',
};

// 帖子详情页路径映射（用于我的帖子跳转）
const postDetailPaths: Record<string, string> = {
  '漫展专区': '/convention',
  'COS专区': '/cos',
  '服务专区': '/service',
  '交易专区': '/trading',
};

// 专区颜色
const sectionColors: Record<string, string> = {
  '漫展专区': 'from-pink-500 to-rose-500',
  'COS专区': 'from-violet-500 to-purple-500',
  '服务专区': 'from-cyan-500 to-blue-500',
  '交易专区': 'from-amber-500 to-orange-500',
};

// 专区图标
const sectionIcons: Record<string, string> = {
  '漫展专区': '🎭',
  'COS专区': '📸',
  '服务专区': '💄',
  '交易专区': '🔄',
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();
  const currentUser = getCurrentUser();
  const [activeTab, setActiveTab] = useState<'posts' | 'settings' | 'userManagement'>('posts');
  const [posts, setPosts] = useState<Post[]>([]);
  
  // 用户管理相关状态
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // 编辑用户名状态
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // 头像上传状态
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 个人主页用户（从 Supabase 异步加载）
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // 加载个人主页用户（从 Supabase 异步获取）
  useEffect(() => {
    const loadProfileUser = async () => {
      setIsLoadingProfile(true);
      try {
        if (username) {
          // 从 Supabase profiles 表按 username 查找
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', decodeURIComponent(username))
            .single();

          if (data && !error) {
            const { data: { user } } = await supabase.auth.getUser();
            const userObj: User = {
              id: data.id,
              account: data.username,
              username: data.username,
              avatar: data.avatar_url || undefined,
              role: data.role,
              createdAt: data.created_at || '',
            };
            setProfileUser(userObj);
          } else {
            setProfileUser(null);
          }
        } else {
          // 没有用户名参数，显示当前登录用户
          setProfileUser(currentUser);
        }
      } catch (e) {
        console.error('Load profile user failed:', e);
        setProfileUser(null);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfileUser();
  }, [username, currentUser]);

  // 是否是查看自己的主页
  const isOwnProfile = !username || (currentUser && decodeURIComponent(username) === currentUser.username);

  // 获取该用户的帖子（所有专区）
  const userPosts = useMemo(() => {
    if (!profileUser) return [];
    const allPosts = loadAllPosts();
    return allPosts.filter(post => post.author === profileUser.username);
  }, [profileUser, posts]);

  // 用户统计数据 - 实时计算
  const userStats = useMemo(() => {
    // 重新从localStorage加载最新帖子数据（所有专区）
    const latestPosts = loadAllPosts();
    const latestUserPosts = profileUser ? latestPosts.filter(post => post.author === profileUser.username) : [];
    
    return {
      postCount: latestUserPosts.length,
    };
  }, [profileUser?.username, posts]);

  // 加载帖子数据
  useEffect(() => {
    const loadData = () => {
      setPosts(loadPosts());
    };
    loadData();

    // 监听帖子数据变化（所有专区）
    const handlePostsChange = () => loadData();
    window.addEventListener('postsChanged', handlePostsChange);
    window.addEventListener('cosWorksChanged', handlePostsChange);
    window.addEventListener('servicesChanged', handlePostsChange);
    window.addEventListener('productsChanged', handlePostsChange);
    window.addEventListener('conventionsChanged', handlePostsChange);
    window.addEventListener('storage', handlePostsChange);

    return () => {
      window.removeEventListener('postsChanged', handlePostsChange);
      window.removeEventListener('cosWorksChanged', handlePostsChange);
      window.removeEventListener('servicesChanged', handlePostsChange);
      window.removeEventListener('productsChanged', handlePostsChange);
      window.removeEventListener('conventionsChanged', handlePostsChange);
      window.removeEventListener('storage', handlePostsChange);
    };
  }, []);

  // 加载和监听所有用户数据（实时更新 - 用于人员管理）
  useEffect(() => {
    const loadAllUsers = () => {
      setAllUsers(getUsers());
    };
    loadAllUsers();

    const handleUsersChange = () => loadAllUsers();
    window.addEventListener('userChanged', handleUsersChange);
    window.addEventListener('storage', handleUsersChange);

    return () => {
      window.removeEventListener('userChanged', handleUsersChange);
      window.removeEventListener('storage', handleUsersChange);
    };
  }, []);

  // 初始化编辑用户名
  useEffect(() => {
    if (currentUser && isOwnProfile && !isEditingUsername) {
      setEditUsername(currentUser.username);
    }
  }, [currentUser, isOwnProfile, isEditingUsername]);

  // 查看他人主页但未登录时跳转
  useEffect(() => {
    if (!isOwnProfile && !currentUser) {
      navigate('/auth');
    }
  }, [isOwnProfile, currentUser, navigate]);

  // 监听用户变化，更新头像预览
  useEffect(() => {
    if (currentUser && isOwnProfile) {
      setPreviewAvatar(currentUser.avatar || null);
    }
  }, [currentUser, isOwnProfile]);

  const handleLogout = () => {
    logout();
    window.dispatchEvent(new Event('userChanged'));
    navigate('/');
  };

  // 保存用户名
  const handleSaveUsername = () => {
    const trimmedUsername = editUsername.trim();
    
    // 验证用户名
    if (!trimmedUsername) {
      setUsernameError('用户名不能为空');
      return;
    }
    if (trimmedUsername.length < 2) {
      setUsernameError('用户名至少2个字符');
      return;
    }
    if (trimmedUsername.length > 20) {
      setUsernameError('用户名最多20个字符');
      return;
    }

    if (currentUser) {
      updateUserProfile(currentUser.id, { username: trimmedUsername });
      setIsEditingUsername(false);
      setUsernameError('');
      // 刷新页面以更新所有显示
      window.location.reload();
    }
  };

  // 取消编辑用户名
  const handleCancelEditUsername = () => {
    setEditUsername(currentUser?.username || '');
    setIsEditingUsername(false);
    setUsernameError('');
  };

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小（最大2MB）
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // 上传到图床，获取 URL
      const avatarUrl = await uploadToImgBB(file);
      setPreviewAvatar(avatarUrl);
      
      if (currentUser) {
        updateUserProfile(currentUser.id, { avatar: avatarUrl });
      }
      
      setIsUploadingAvatar(false);
    } catch (error) {
      console.error('头像上传失败:', error);
      alert('头像上传失败，请重试');
      setIsUploadingAvatar(false);
    }
  };

  // 删除头像
  const handleRemoveAvatar = () => {
    setPreviewAvatar(null);
    if (currentUser) {
      updateUserProfile(currentUser.id, { avatar: undefined });
    }
  };

  // 删除用户并清除其发布的所有内容
  const handleDeleteUser = (user: User) => {
    // 删除该用户的所有帖子
    const allPosts = loadPosts();
    const remainingPosts = allPosts.filter(post => post.author !== user.username);
    localStorage.setItem('posts', JSON.stringify(remainingPosts));
    window.dispatchEvent(new Event('postsChanged'));
    
    // 删除用户
    const success = deleteUser(user.id);
    if (success) {
      setAllUsers(getUsers());
      setDeleteTarget(null);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-20 flex items-center justify-center">
        <div className="anime-card p-12 text-center max-w-md mx-auto">
          <User className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <p className="text-white/70 text-lg mb-6">请先登录后查看个人主页</p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors"
          >
            <User className="w-5 h-5" />
            去登录
          </Link>
        </div>
      </div>
    );
  }

  // 加载中
  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-20 flex items-center justify-center">
        <div className="text-white/70 text-lg">加载中...</div>
      </div>
    );
  }

  // 用户不存在
  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="anime-card p-12 text-center">
            <User className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-white/70 text-lg mb-6">该用户不存在</p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              返回
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* 用户信息卡片 */}
        <div className="anime-card p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* 头像 */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center overflow-hidden">
                {previewAvatar ? (
                  <img 
                    src={previewAvatar} 
                    alt="头像" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-4xl font-bold">
                    {profileUser?.username.charAt(0) || '?'}
                  </span>
                )}
              </div>
              {profileUser?.role === 'admin' && (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>

            {/* 用户信息 */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">
                  {profileUser?.username || '未知用户'}
                </h1>
                {profileUser?.role === 'admin' && (
                  <span className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm font-medium">
                    站主
                  </span>
                )}
              </div>
              {isOwnProfile && profileUser && (
                <p className="text-white/50 text-sm mb-4">
                  账号: {profileUser.account}
                </p>
              )}
              
              {/* 统计数据 */}
              <div className="flex items-center gap-6">
                <div className="min-w-[60px] text-center">
                  <div className="text-2xl font-bold text-white">{userStats.postCount}</div>
                  <div className="text-sm text-white/50">帖子</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 标签页 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setActiveTab('posts')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'posts'
                ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            <MessageCircle className="w-5 h-5 inline mr-2" />
            我的帖子
          </button>
          {isOwnProfile && (
            <>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <Settings className="w-5 h-5 inline mr-2" />
                账号设置
              </button>
              {/* 人员管理 - 仅站主可见 */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('userManagement')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                    activeTab === 'userManagement'
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25'
                      : 'bg-white/10 text-white/70 hover:bg-white/20'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  人员管理
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                    {allUsers.filter(u => u.role === 'user').length}
                  </span>
                </button>
              )}
            </>
          )}
        </div>

        {/* 标签页内容 */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            {userPosts.length === 0 ? (
              <div className="anime-card p-12 text-center">
                <MessageCircle className="w-16 h-16 text-slate-500 mx-auto mb-4" />
                <p className="text-white/50 text-lg mb-4">还没有发布过帖子</p>
                <Link
                  to="/convention"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors"
                >
                  <Edit2 className="w-5 h-5" />
                  去发布帖子
                </Link>
              </div>
            ) : (
              userPosts.map((post) => {
                // 根据帖子类型构建跳转链接
                const getPostLink = () => {
                  switch (post.section) {
                    case 'COS专区':
                      return `/cos/${post.id}`;
                    case '服务专区':
                      return `/service/${post.id}`;
                    case '交易专区':
                      return `/trading/${post.id}`;
                    case '漫展专区':
                      return `/convention/${post.id}`;
                    default:
                      return sectionPaths[post.section] || '/';
                  }
                };
                
                // 获取图片
                const getPostImage = () => {
                  if ((post as any).coverImage) return (post as any).coverImage;
                  if ((post as any).images && (post as any).images.length > 0) return (post as any).images[0];
                  if ((post as any).image) return (post as any).image;
                  return null;
                };
                
                const postImage = getPostImage();
                
                return (
                  <Link
                    key={post.id}
                    to={getPostLink()}
                    className="anime-card block p-5 hover:scale-[1.02] transition-transform"
                  >
                    <div className="flex items-start gap-4">
                      {/* 图片 */}
                      {postImage && (
                        <img 
                          src={postImage} 
                          alt={post.title}
                          className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        {/* 专区标签 */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{sectionIcons[post.section]}</span>
                          <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${sectionColors[post.section]} text-white`}>
                            {post.section}
                          </span>
                        </div>
                        {/* 标题 */}
                        <h3 className="text-white font-medium text-lg mb-2">
                          {post.title}
                        </h3>
                        {/* 元信息 */}
                        <div className="flex items-center gap-4 text-sm text-white/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {post.createdAt}
                          </span>
                        </div>
                      </div>
                      {/* 价格 */}
                      {post.price !== undefined && (
                        <div className="text-red-400 font-bold text-xl">
                          ¥{post.price}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'settings' && isOwnProfile && (
          <div className={`anime-card p-6 space-y-6 ${isEditingUsername ? 'transform-none' : ''}`}>
            {/* 头像设置 */}
            <div>
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-pink-400" />
                头像设置
              </h3>
              <div className="flex items-center gap-6">
                {/* 头像预览 */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center overflow-hidden border-2 border-white/20">
                    {previewAvatar ? (
                      <img 
                        src={previewAvatar} 
                        alt="头像" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {currentUser?.username.charAt(0) || '?'}
                      </span>
                    )}
                  </div>
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                
                {/* 上传按钮 */}
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm cursor-pointer relative z-10"
                  >
                    {isUploadingAvatar ? '上传中...' : '上传新头像'}
                  </button>
                  {previewAvatar && (
                    <button
                      onClick={handleRemoveAvatar}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors text-sm cursor-pointer relative z-10"
                    >
                      恢复默认
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 用户名设置 */}
            <div className="pt-4 border-t border-white/10 edit-section">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-pink-400" />
                用户名设置
              </h3>
              
              {isEditingUsername ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => {
                        setEditUsername(e.target.value);
                        setUsernameError('');
                      }}
                      onInput={(e) => {
                        setEditUsername((e.target as HTMLInputElement).value);
                        setUsernameError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveUsername();
                        }
                        if (e.key === 'Escape') {
                          handleCancelEditUsername();
                        }
                      }}
                      className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      style={{ 
                        zIndex: 9999,
                        position: 'relative',
                        userSelect: 'text',
                        pointerEvents: 'auto',
                        WebkitUserSelect: 'text',
                       MozUserSelect: 'text',
                        msUserSelect: 'text'
                      }}
                      placeholder="输入新用户名"
                      maxLength={20}
                      autoFocus
                    />
                    <button
                      onClick={handleSaveUsername}
                      className="p-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors cursor-pointer relative z-10"
                      title="保存"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancelEditUsername}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg transition-colors cursor-pointer relative z-10"
                      title="取消"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {usernameError && (
                    <p className="text-red-400 text-sm">{usernameError}</p>
                  )}
                  <p className="text-white/40 text-xs">2-20个字符，支持中文、英文、数字</p>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/70 text-sm mb-1">当前用户名</p>
                    <p className="text-white font-medium">{currentUser?.username}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditUsername(currentUser?.username || '');
                      setIsEditingUsername(true);
                    }}
                    className="px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors text-sm cursor-pointer relative z-10"
                  >
                    修改用户名
                  </button>
                </div>
              )}
            </div>

            {/* 账号信息（只读） */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-pink-400" />
                账号信息
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">账号</span>
                  <span className="text-white font-medium">{currentUser?.account}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70">身份</span>
                  <span className={currentUser?.role === 'admin' ? 'text-pink-400 font-medium' : 'text-white font-medium'}>
                    {currentUser?.role === 'admin' ? '站主' : '普通用户'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <span className="text-white/70 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    密码
                  </span>
                  <span className="text-white/50 text-sm">不支持修改</span>
                </div>
              </div>
            </div>

            {/* 退出登录 */}
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors cursor-pointer relative z-10"
              >
                <LogOut className="w-5 h-5" />
                退出登录
              </button>
            </div>
          </div>
        )}

        {/* 人员管理 - 仅站主可见 */}
        {activeTab === 'userManagement' && isOwnProfile && currentUser?.role === 'admin' && (
          <div className="space-y-4">
            {/* 统计信息 */}
            <div className="anime-card p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">用户总数</p>
                  <p className="text-white/50 text-sm">包含站主</p>
                </div>
              </div>
              <div className="text-2xl font-bold text-pink-400">{allUsers.length}</div>
            </div>

            {/* 用户列表 */}
            <div className="anime-card p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-pink-400" />
                注册用户列表
              </h3>
              
              {allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                  <p className="text-white/50">暂无注册用户</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {allUsers.map((user) => {
                    const userPostCount = loadPosts().filter(post => post.author === user.username).length;
                    const isCurrentUser = currentUser?.id === user.id;
                    
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-4 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                      >
                        {/* 用户头像 */}
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-bold text-lg">{user.username.charAt(0)}</span>
                          )}
                        </div>
                        
                        {/* 用户信息 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-white font-medium truncate">{user.username}</p>
                            {user.role === 'admin' && (
                              <span className="px-2 py-0.5 bg-pink-500/20 text-pink-400 rounded-full text-xs font-medium flex-shrink-0">
                                站主
                              </span>
                            )}
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs flex-shrink-0">
                                当前
                              </span>
                            )}
                          </div>
                          <p className="text-white/50 text-sm">
                            账号: {user.account} | 注册时间: {formatDateTime(user.createdAt)}
                          </p>
                          <p className="text-white/50 text-sm">
                            发布帖子: <span className="text-pink-400">{userPostCount}</span> 篇
                          </p>
                        </div>
                        
                        {/* 操作按钮 */}
                        <div className="flex-shrink-0">
                          {user.role === 'admin' ? (
                            <span className="text-white/30 text-sm">无法操作</span>
                          ) : isCurrentUser ? (
                            <span className="text-white/30 text-sm">当前用户</span>
                          ) : (
                            <button
                              onClick={() => setDeleteTarget(user)}
                              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200/80">
                  <p className="font-medium mb-1">删除用户须知</p>
                  <ul className="list-disc list-inside space-y-1 text-amber-200/60">
                    <li>删除用户将同时删除该用户发布的所有帖子</li>
                    <li>删除后无法恢复，请谨慎操作</li>
                    <li>站主账号无法被删除</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除用户确认弹窗 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-slate-800 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 弹窗头部 */}
            <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-red-500/10">
              <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <UserMinus className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">确认删除用户</h3>
                <p className="text-red-400 text-sm">此操作不可撤销</p>
              </div>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center overflow-hidden">
                  {deleteTarget.avatar ? (
                    <img src={deleteTarget.avatar} alt={deleteTarget.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white font-bold text-2xl">{deleteTarget.username.charAt(0)}</span>
                  )}
                </div>
                <div>
                  <p className="text-white font-medium text-lg">{deleteTarget.username}</p>
                  <p className="text-white/50 text-sm">账号: {deleteTarget.account}</p>
                  <p className="text-white/50 text-sm">注册时间: {formatDateTime(deleteTarget.createdAt)}</p>
                </div>
              </div>

              {/* 影响范围 */}
              <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                <p className="text-white font-medium mb-2">删除将影响以下内容：</p>
                <ul className="space-y-2 text-sm text-white/70">
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    用户账号将被永久删除
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    该用户发布的所有帖子将被删除
                  </li>
                </ul>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteTarget)}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" />
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
