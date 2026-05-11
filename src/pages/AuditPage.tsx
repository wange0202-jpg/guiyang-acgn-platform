import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, X, Trash2, Clock, Shield, Eye, ExternalLink } from 'lucide-react';
import { isAdmin } from '@/lib/auth';

// 详情弹窗组件
function DetailModal({ 
  isOpen, 
  onClose, 
  type, 
  data 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  type: 'cos' | 'service' | 'trading';
  data: any;
}) {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-dark-50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">
            {type === 'cos' && '📸 COS作品详情'}
            {type === 'service' && '💄 服务详情'}
            {type === 'trading' && '🔄 商品详情'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* COS作品详情 */}
          {type === 'cos' && (
            <div className="space-y-6">
              {/* 图片画廊 */}
              {data.images && data.images.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">作品图片 ({data.images.length}张)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`作品图片 ${idx + 1}`} 
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <a 
                          href={img} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
                        >
                          <ExternalLink className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 基本信息 */}
              <div className="bg-dark-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">作品名称</span>
                  <span className="text-white font-medium">{data.title || '无标题'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">作者</span>
                  <span className="text-pink-400">{data.authorName || '未知'}</span>
                </div>
                {data.character && (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">角色</span>
                    <span className="text-violet-400">{data.character}</span>
                  </div>
                )}
                {data.game && (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">作品来源</span>
                    <span className="text-cyan-400">{data.game}</span>
                  </div>
                )}
                {data.tags && data.tags.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="text-slate-400 w-20">标签</span>
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map((tag: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="text-slate-400 w-20">发布时间</span>
                  <span className="text-slate-300">{new Date(data.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              
              {/* 详细描述 */}
              <div>
                <h3 className="text-white font-medium mb-3">详细描述</h3>
                <div className="bg-dark-100 rounded-xl p-4">
                  <p className="text-slate-300 whitespace-pre-wrap">{data.description || '暂无描述'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 服务详情 */}
          {type === 'service' && (
            <div className="space-y-6">
              {/* 服务图片 */}
              {data.images && data.images.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">服务图片</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`服务图片 ${idx + 1}`} 
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <a 
                          href={img} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
                        >
                          <ExternalLink className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 基本信息 */}
              <div className="bg-dark-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">服务者</span>
                  <span className="text-cyan-400">{data.nickname || '未知'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">服务类别</span>
                  <span className="text-cyan-400">{data.category || '未分类'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">价格区间</span>
                  <span className="text-green-400 font-bold">{data.priceRange || '未定价'}</span>
                </div>
                {(data.qq || data.wechat) ? (
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {data.qq && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-14">QQ</span>
                        <span className="text-slate-300">{data.qq}</span>
                      </div>
                    )}
                    {data.wechat && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 w-14">微信</span>
                        <span className="text-slate-300">{data.wechat}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">联系方式</span>
                    <span className="text-slate-500">未提供</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">发布时间</span>
                  <span className="text-slate-300">{new Date(data.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              
              {/* 服务描述 */}
              <div>
                <h3 className="text-white font-medium mb-3">服务详情</h3>
                <div className="bg-dark-100 rounded-xl p-4">
                  <p className="text-slate-300 whitespace-pre-wrap">{data.description || '暂无描述'}</p>
                </div>
              </div>
              
              {/* 服务范围 */}
              {data.serviceScope && (
                <div>
                  <h3 className="text-white font-medium mb-3">服务范围</h3>
                  <div className="bg-dark-100 rounded-xl p-4">
                    <p className="text-slate-300 whitespace-pre-wrap">{data.serviceScope}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* 商品详情 */}
          {type === 'trading' && (
            <div className="space-y-6">
              {/* 商品图片 */}
              {data.images && data.images.length > 0 && (
                <div>
                  <h3 className="text-white font-medium mb-3">商品图片 ({data.images.length}张)</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {data.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={img} 
                          alt={`商品图片 ${idx + 1}`} 
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <a 
                          href={img} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-lg"
                        >
                          <ExternalLink className="w-6 h-6 text-white" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* 基本信息 */}
              <div className="bg-dark-100 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">商品名称</span>
                  <span className="text-white font-medium">{data.title || '无标题'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">卖家</span>
                  <span className="text-amber-400">{data.seller || '未知'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">商品价格</span>
                  <span className="text-red-400 font-bold text-2xl">¥{data.price || 0}</span>
                </div>
                {data.originalPrice && (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">原价</span>
                    <span className="text-slate-500 line-through">¥{data.originalPrice}</span>
                  </div>
                )}
                {data.condition && (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">新旧程度</span>
                    <span className="text-slate-300">{data.condition}</span>
                  </div>
                )}
                {data.category && (
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 w-20">商品分类</span>
                    <span className="text-amber-400">{data.category}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 w-20">发布时间</span>
                  <span className="text-slate-300">{new Date(data.createdAt).toLocaleString('zh-CN')}</span>
                </div>
              </div>
              
              {/* 商品描述 */}
              <div>
                <h3 className="text-white font-medium mb-3">商品描述</h3>
                <div className="bg-dark-100 rounded-xl p-4">
                  <p className="text-slate-300 whitespace-pre-wrap">{data.description || '暂无描述'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 加载数据
const loadCosWorks = () => {
  try {
    const saved = localStorage.getItem('cosWorks');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};
const loadServices = () => {
  try {
    const saved = localStorage.getItem('services');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};
const loadProducts = () => {
  try {
    const saved = localStorage.getItem('products');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};
const loadComments = () => {
  try {
    const saved = localStorage.getItem('cosComments');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

// 审核操作
const handleApprove = (section: string, id: string) => {
  const keyMap: Record<string, string> = { cos: 'cosWorks', service: 'services', trading: 'products' };
  const storageKey = keyMap[section];
  if (!storageKey) return;
  const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updated = data.map((item: any) => item.id === id ? { ...item, status: 'approved' } : item);
  localStorage.setItem(storageKey, JSON.stringify(updated));
  window.dispatchEvent(new Event('cosWorksChanged'));
  window.dispatchEvent(new Event('servicesChanged'));
  window.dispatchEvent(new Event('productsChanged'));
};

const handleReject = (section: string, id: string) => {
  const reason = prompt('请输入拒绝原因：');
  if (!reason) return;
  const keyMap: Record<string, string> = { cos: 'cosWorks', service: 'services', trading: 'products' };
  const storageKey = keyMap[section];
  if (!storageKey) return;
  const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updated = data.map((item: any) => item.id === id ? { ...item, status: 'rejected', rejectedReason: reason } : item);
  localStorage.setItem(storageKey, JSON.stringify(updated));
  window.dispatchEvent(new Event('cosWorksChanged'));
  window.dispatchEvent(new Event('servicesChanged'));
  window.dispatchEvent(new Event('productsChanged'));
};

const handleDelete = (section: string, id: string) => {
  if (!confirm('确定要删除吗？')) return;
  if (section === 'comments') {
    const data = JSON.parse(localStorage.getItem('cosComments') || '[]');
    const updated = data.filter((item: any) => item.id !== id);
    localStorage.setItem('cosComments', JSON.stringify(updated));
    window.dispatchEvent(new Event('commentsChanged'));
    return;
  }
  const keyMap: Record<string, string> = { cos: 'cosWorks', service: 'services', trading: 'products' };
  const storageKey = keyMap[section];
  if (!storageKey) return;
  const data = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updated = data.filter((item: any) => item.id !== id);
  localStorage.setItem(storageKey, JSON.stringify(updated));
  window.dispatchEvent(new Event('cosWorksChanged'));
  window.dispatchEvent(new Event('servicesChanged'));
  window.dispatchEvent(new Event('productsChanged'));
};

// 评论审核操作
const handleApproveComment = (commentId: string) => {
  const comments = loadComments();
  const updated = comments.map(c => c.id === commentId ? { ...c, status: 'approved' } : c);
  localStorage.setItem('cosComments', JSON.stringify(updated));
  window.dispatchEvent(new Event('commentsChanged'));
};

const handleRejectComment = (commentId: string) => {
  const reason = prompt('请输入拒绝原因：');
  if (!reason) return;
  const comments = loadComments();
  const updated = comments.map(c => c.id === commentId ? { ...c, status: 'rejected', rejectedReason: reason } : c);
  localStorage.setItem('cosComments', JSON.stringify(updated));
  window.dispatchEvent(new Event('commentsChanged'));
};

export default function AuditPage() {
  const [activeSection, setActiveSection] = useState<'cos' | 'service' | 'trading' | 'comments'>('cos');
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 详情弹窗状态
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    type: 'cos' | 'service' | 'trading';
    data: any;
  }>({ isOpen: false, type: 'cos', data: null });

  const userIsAdmin = isAdmin();

  useEffect(() => {
    const handleChange = () => setRefreshKey(k => k + 1);
    window.addEventListener('cosWorksChanged', handleChange);
    window.addEventListener('servicesChanged', handleChange);
    window.addEventListener('productsChanged', handleChange);
    window.addEventListener('commentsChanged', handleChange);
    window.addEventListener('storage', handleChange);
    return () => {
      window.removeEventListener('cosWorksChanged', handleChange);
      window.removeEventListener('servicesChanged', handleChange);
      window.removeEventListener('productsChanged', handleChange);
      window.removeEventListener('commentsChanged', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  // 获取待审核数量
  const getCounts = () => {
    const cos = loadCosWorks().filter((w: any) => w.status === 'pending').length;
    const services = loadServices().filter((s: any) => s.status === 'pending').length;
    const products = loadProducts().filter((p: any) => p.status === 'pending').length;
    const comments = loadComments().filter((c: any) => c.status === 'pending').length;
    return { cos, services, products, comments, total: cos + services + products + comments };
  };

  const counts = getCounts();

  if (!userIsAdmin) {
    return (
      <div className="min-h-screen pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-dark-50 rounded-2xl p-12">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">无权限访问</h2>
            <p className="text-slate-400">只有站主才能访问审核页面</p>
            <Link to="/" className="inline-block mt-6 px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl transition-colors">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/" 
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">内容审核</h1>
            <p className="text-slate-400">审核用户提交的内容</p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setActiveSection('cos')}
            className={`p-4 rounded-xl border transition-all ${
              activeSection === 'cos' 
                ? 'bg-violet-500/20 border-violet-500/50' 
                : 'bg-dark-50 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="text-3xl mb-2">📸</div>
            <div className="text-white font-bold text-xl">{counts.cos}</div>
            <div className="text-slate-400 text-sm">COS作品</div>
          </button>
          <button
            onClick={() => setActiveSection('service')}
            className={`p-4 rounded-xl border transition-all ${
              activeSection === 'service' 
                ? 'bg-cyan-500/20 border-cyan-500/50' 
                : 'bg-dark-50 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="text-3xl mb-2">💄</div>
            <div className="text-white font-bold text-xl">{counts.services}</div>
            <div className="text-slate-400 text-sm">服务</div>
          </button>
          <button
            onClick={() => setActiveSection('trading')}
            className={`p-4 rounded-xl border transition-all ${
              activeSection === 'trading' 
                ? 'bg-amber-500/20 border-amber-500/50' 
                : 'bg-dark-50 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="text-3xl mb-2">🔄</div>
            <div className="text-white font-bold text-xl">{counts.products}</div>
            <div className="text-slate-400 text-sm">商品</div>
          </button>
          <button
            onClick={() => setActiveSection('comments')}
            className={`p-4 rounded-xl border transition-all ${
              activeSection === 'comments' 
                ? 'bg-pink-500/20 border-pink-500/50' 
                : 'bg-dark-50 border-white/5 hover:border-white/20'
            }`}
          >
            <div className="text-3xl mb-2">💬</div>
            <div className="text-white font-bold text-xl">{counts.comments}</div>
            <div className="text-slate-400 text-sm">评论</div>
          </button>
        </div>

        {/* 待审核列表 */}
        <div className="space-y-4">
          {/* COS作品审核 */}
          {activeSection === 'cos' && (() => {
            const items = loadCosWorks().filter((w: any) => w.status === 'pending');
            if (items.length === 0) {
              return (
                <div className="bg-dark-50 rounded-2xl p-12 text-center">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">COS作品暂无待审核内容</p>
                </div>
              );
            }
            return items.map((work: any) => (
              <div key={work.id} className="bg-dark-50 rounded-2xl p-6 border border-white/5">
                <div className="flex gap-6">
                  <img src={work.images[0]} alt={work.title} className="w-32 h-32 object-cover rounded-xl" />
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-xl mb-2">{work.title}</h3>
                    <p className="text-slate-400 text-sm mb-2">作者：{work.authorName}</p>
                    <p className="text-slate-300 line-clamp-2">{work.description}</p>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setDetailModal({ isOpen: true, type: 'cos', data: work })}
                        className="px-6 py-2 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 查看详情
                      </button>
                      <button 
                        onClick={() => handleApprove('cos', work.id)} 
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4" /> 通过
                      </button>
                      <button 
                        onClick={() => handleReject('cos', work.id)} 
                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" /> 拒绝
                      </button>
                      <button 
                        onClick={() => handleDelete('cos', work.id)} 
                        className="px-6 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}

          {/* 服务审核 */}
          {activeSection === 'service' && (() => {
            const items = loadServices().filter((s: any) => s.status === 'pending');
            if (items.length === 0) {
              return (
                <div className="bg-dark-50 rounded-2xl p-12 text-center">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">服务暂无待审核内容</p>
                </div>
              );
            }
            return items.map((service: any) => (
              <div key={service.id} className="bg-dark-50 rounded-2xl p-6 border border-white/5">
                <div className="flex gap-6">
                  <div className="w-32 h-32 bg-cyan-500/20 rounded-xl flex items-center justify-center text-6xl">
                    💄
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-xl mb-2">{service.nickname} - {service.category}</h3>
                    <p className="text-cyan-400 font-medium mb-2">价格：{service.priceRange}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-sm mb-2">
                      {service.qq && <span>Q：{service.qq}</span>}
                      {service.wechat && <span>微：{service.wechat}</span>}
                      {!service.qq && !service.wechat && <span>联系方式：未提供</span>}
                    </div>
                    <p className="text-slate-300 line-clamp-2">{service.description}</p>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setDetailModal({ isOpen: true, type: 'service', data: service })}
                        className="px-6 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 查看详情
                      </button>
                      <button 
                        onClick={() => handleApprove('service', service.id)} 
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4" /> 通过
                      </button>
                      <button 
                        onClick={() => handleReject('service', service.id)} 
                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" /> 拒绝
                      </button>
                      <button 
                        onClick={() => handleDelete('service', service.id)} 
                        className="px-6 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}

          {/* 交易审核 */}
          {activeSection === 'trading' && (() => {
            const items = loadProducts().filter((p: any) => p.status === 'pending');
            if (items.length === 0) {
              return (
                <div className="bg-dark-50 rounded-2xl p-12 text-center">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">商品暂无待审核内容</p>
                </div>
              );
            }
            return items.map((product: any) => (
              <div key={product.id} className="bg-dark-50 rounded-2xl p-6 border border-white/5">
                <div className="flex gap-6">
                  <img src={product.images[0]} alt={product.title} className="w-32 h-32 object-cover rounded-xl" />
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-xl mb-2">{product.title}</h3>
                    <p className="text-red-400 font-bold text-2xl mb-2">¥{product.price}</p>
                    <p className="text-slate-400 text-sm mb-2">卖家：{product.seller}</p>
                    <p className="text-slate-300 line-clamp-2">{product.description}</p>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setDetailModal({ isOpen: true, type: 'trading', data: product })}
                        className="px-6 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> 查看详情
                      </button>
                      <button 
                        onClick={() => handleApprove('trading', product.id)} 
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4" /> 通过
                      </button>
                      <button 
                        onClick={() => handleReject('trading', product.id)} 
                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" /> 拒绝
                      </button>
                      <button 
                        onClick={() => handleDelete('trading', product.id)} 
                        className="px-6 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}

          {/* 评论审核 */}
          {activeSection === 'comments' && (() => {
            const items = loadComments().filter((c: any) => c.status === 'pending');
            if (items.length === 0) {
              return (
                <div className="bg-dark-50 rounded-2xl p-12 text-center">
                  <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">评论暂无待审核内容</p>
                </div>
              );
            }
            return items.map((comment: any) => (
              <div key={comment.id} className="bg-dark-50 rounded-2xl p-6 border border-white/5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center">
                    {comment.authorAvatar ? (
                      <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <span className="text-white font-bold">{comment.authorName?.charAt(0) || '?'}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{comment.authorName}</span>
                      <span className="text-slate-500">评论了</span>
                      <Link to={`/cos/${comment.workId}`} className="text-violet-400 hover:underline">
                        {comment.workTitle}
                      </Link>
                    </div>
                    <p className="text-slate-300 mb-3">{comment.content}</p>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleApproveComment(comment.id)} 
                        className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Check className="w-4 h-4" /> 通过
                      </button>
                      <button 
                        onClick={() => handleRejectComment(comment.id)} 
                        className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <X className="w-4 h-4" /> 拒绝
                      </button>
                      <button 
                        onClick={() => handleDelete('comments', comment.id)} 
                        className="px-6 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>

        {/* 详情弹窗 */}
        <DetailModal
          isOpen={detailModal.isOpen}
          onClose={() => setDetailModal({ ...detailModal, isOpen: false })}
          type={detailModal.type}
          data={detailModal.data}
        />
      </div>
    </div>
  );
}
