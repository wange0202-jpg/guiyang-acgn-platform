import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, User, Shield, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { SearchButton } from '@/components/ui/Search'
import { getCurrentUser, initDefaultUsers, isAdmin } from '@/lib/auth'

const navItems = [
  { path: '/', label: '首页' },
  { path: '/convention', label: '漫展专区' },
  { path: '/cos', label: 'COS专区' },
  { path: '/service', label: '服务专区' },
  { path: '/trading', label: '交易专区' },
]

// 加载待审核数量
const getPendingCount = () => {
  try {
    const cos = JSON.parse(localStorage.getItem('cosWorks') || '[]').filter((w: any) => w.status === 'pending').length;
    const services = JSON.parse(localStorage.getItem('services') || '[]').filter((s: any) => s.status === 'pending').length;
    const products = JSON.parse(localStorage.getItem('products') || '[]').filter((p: any) => p.status === 'pending').length;
    const comments = JSON.parse(localStorage.getItem('cosComments') || '[]').filter((c: any) => c.status === 'pending').length;
    return cos + services + products + comments;
  } catch { return 0; }
};

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(getCurrentUser())
  const [pendingCount, setPendingCount] = useState(0)
  const location = useLocation()
  const navigate = useNavigate()

  // 是否显示返回按钮（非首页时显示）
  const showBackButton = location.pathname !== '/'

  useEffect(() => {
    // 初始化默认用户
    initDefaultUsers();
    // 监听用户状态变化
    const handleStorage = () => {
      setCurrentUser(getCurrentUser());
    };
    window.addEventListener('storage', handleStorage);
    // 也监听自定义事件（用于同页面刷新）
    window.addEventListener('userChanged', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('userChanged', handleStorage);
    };
  }, []);

  // 实时更新待审核数量
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(getPendingCount());
    };
    updatePendingCount();
    
    window.addEventListener('cosWorksChanged', updatePendingCount);
    window.addEventListener('servicesChanged', updatePendingCount);
    window.addEventListener('productsChanged', updatePendingCount);
    window.addEventListener('commentsChanged', updatePendingCount);
    window.addEventListener('storage', updatePendingCount);
    
    return () => {
      window.removeEventListener('cosWorksChanged', updatePendingCount);
      window.removeEventListener('servicesChanged', updatePendingCount);
      window.removeEventListener('productsChanged', updatePendingCount);
      window.removeEventListener('commentsChanged', updatePendingCount);
      window.removeEventListener('storage', updatePendingCount);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] bg-slate-900/95 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-white leading-tight">贵阳二次元</h1>
              <p className="text-xs text-slate-400">Cosponsor交流平台</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:text-white hover:bg-dark-100'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Search & User */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-100 transition-colors"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <SearchButton />
            
            {/* 用户区域 */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {/* 站主审核按钮 - 仅站主可见 */}
                {currentUser.role === 'admin' && (
                  <Link
                    to="/audit"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 transition-colors relative"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm hidden sm:block">审核</span>
                    {pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </Link>
                )}
                <Link
                  to={`/profile/${encodeURIComponent(currentUser.username)}`}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center overflow-hidden">
                    {currentUser.avatar ? (
                      <img 
                        src={currentUser.avatar} 
                        alt={currentUser.username} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xs font-bold">
                        {currentUser.username.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span className="text-white text-sm hidden sm:block">
                    {currentUser.username}
                    {currentUser.role === 'admin' && (
                      <Shield className="inline-block w-3 h-3 ml-1 text-pink-400" />
                    )}
                  </span>
                </Link>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="ghost" size="sm" className="hidden sm:flex gap-2">
                  <User className="w-4 h-4" />
                  登录
                </Button>
                <Button variant="ghost" size="icon" className="sm:hidden">
                  <User className="w-5 h-5" />
                </Button>
              </Link>
            )}
            
            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-100 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-white/5 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-slate-300 hover:text-white hover:bg-dark-100'
                )}
              >
                {item.label}
              </Link>
            ))}
            {currentUser ? (
              <Link
                to={`/profile/${encodeURIComponent(currentUser.username)}`}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-pink-400 hover:bg-dark-100 transition-colors"
              >
                <User className="w-5 h-5" />
                我的主页
              </Link>
            ) : (
              <Link
                to="/auth"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-pink-400 hover:bg-dark-100 transition-colors"
              >
                <User className="w-5 h-5" />
                登录 / 注册
              </Link>
            )}
          </nav>
        )}
      </div>
    </header>
  )
}
