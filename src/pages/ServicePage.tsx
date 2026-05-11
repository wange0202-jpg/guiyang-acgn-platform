import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Star, MapPin, Phone, MessageCircle, User, X, Clock, AlertCircle, Upload, Trash2, ZoomIn, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Service, serviceCategories } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { getCurrentUser } from '@/lib/auth'
import { uploadToImgBB } from '@/lib/imageUpload'
import { realtimeAvatars, subscribeToEvent, REALTIME_EVENTS } from '@/lib/realtime'

// 发布成功提示弹窗
function PublishSuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-dark-50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-white/10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">提交成功！</h3>
        <p className="text-slate-300 mb-4">
          您的服务已提交，等待站主审核
        </p>
        <div className="bg-dark-100 rounded-xl p-4 mb-6 text-left">
          <div className="text-sm text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核通过后，服务将公开展示</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核结果会通过页面提示告知您</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>如有拒绝，会显示拒绝原因</span>
            </div>
          </div>
        </div>
        <Button onClick={onClose} className="w-full gradient-primary">
          我知道了
        </Button>
      </div>
    </div>
  );
}

// 服务状态
type ServiceStatus = 'pending' | 'approved' | 'rejected'

// 服务数据结构
interface ServicePost {
  id: string
  category: 'makeup' | 'wig' | 'photographer' | 'props'
  title: string
  nickname: string
  authorId?: string
  avatar?: string
  qq: string
  wechat: string
  description: string
  priceRange: string
  images: string[]
  rating: number
  reviewCount: number
  status: ServiceStatus
  createdAt: string
  rejectedReason?: string
}

// 加载服务数据
const loadServices = (): ServicePost[] => {
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

// 保存服务数据
const saveServices = (services: ServicePost[]) => {
  try {
    localStorage.setItem('services', JSON.stringify(services));
  } catch (e) {
    // 如果存储空间不足，尝试清理旧数据
    if ((e as Error).name === 'QuotaExceededError') {
      console.warn('存储空间不足，开始清理旧数据...');
      cleanupOldServices(services);
    } else {
      console.error('Failed to save services:', e);
    }
  }
};

// 清理旧数据 - 保留最近的服务
const cleanupOldServices = (newServices: ServicePost[]) => {
  try {
    // 方案1：只保留新提交的这条服务
    if (newServices.length > 0) {
      const latestService = newServices[0];
      localStorage.setItem('services', JSON.stringify([latestService]));
      console.log('存储空间不足，仅保存最新服务');
      alert('存储空间已满，旧数据已清理');
      return;
    }
  } catch (e) {
    console.error('清理数据失败:', e);
    try {
      localStorage.setItem('services', '[]');
    } catch (e2) {
      console.error('无法清空存储:', e2);
    }
  }
};

export default function ServicePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [services, setServices] = useState<ServicePost[]>(loadServices)
  const [showForm, setShowForm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newService, setNewService] = useState({
    category: 'makeup' as ServicePost['category'],
    title: '',
    nickname: '',
    avatar: '',
    qq: '',
    wechat: '',
    description: '',
    priceRange: '',
  })
  // 图片上传相关状态
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null)
  const [serviceAvatars, setServiceAvatars] = useState<Record<string, string>>({})
  const maxImages = 9

  // 监听 storage 变化
  useEffect(() => {
    const handleStorage = () => {
      setServices(loadServices());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('servicesChanged', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('servicesChanged', handleStorage);
    };
  }, []);

  // 获取服务发布者的实时头像
  useEffect(() => {
    const updateAvatars = () => {
      const newAvatars: Record<string, string> = {};
      services.forEach(service => {
        if (service.authorId) {
          const avatar = realtimeAvatars.getAvatar(service.authorId);
          if (avatar) {
            newAvatars[service.authorId] = avatar;
          }
        }
      });
      setServiceAvatars(prev => ({ ...prev, ...newAvatars }));
    };
    
    updateAvatars();
    
    // 订阅头像更新事件
    const unsubscribe = subscribeToEvent(REALTIME_EVENTS.USER_UPDATED, (data) => {
      if (data.userId) {
        setServiceAvatars(prev => ({
          ...prev,
          [data.userId]: data.avatarUrl || ''
        }));
      }
    });
    
    return unsubscribe;
  }, [services]);

  // 获取单个服务的头像（优先使用实时头像）
  const getServiceAvatar = (service: ServicePost): string | undefined => {
    if (service.authorId) {
      return serviceAvatars[service.authorId] || service.avatar;
    }
    return service.avatar;
  };

  // 上传图片到 ImgBB
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const fileArray = Array.from(files)
    const availableSlots = maxImages - images.length
    const filesToUpload = fileArray.slice(0, availableSlots)
    
    if (filesToUpload.length === 0) return

    setIsUploading(true)
    setUploadProgress({ current: 0, total: filesToUpload.length })

    try {
      const newUrls: string[] = []
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const url = await uploadToImgBB(filesToUpload[i])
        newUrls.push(url)
        setUploadProgress({ current: i + 1, total: filesToUpload.length })
      }
      
      setImages((prev) => [...prev, ...newUrls].slice(0, maxImages))
    } catch (error) {
      console.error('上传失败:', error)
      alert('图片上传失败，请重试')
    } finally {
      setIsUploading(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const filteredServices = activeCategory === 'all'
    ? services.filter(s => s.status === 'approved')
    : services.filter(service => service.category === activeCategory && service.status === 'approved')

  // 获取当前用户
  const currentUser = getCurrentUser()

  // 发布新服务
  const handleSubmit = () => {
    if (!newService.nickname || (!newService.qq && !newService.wechat) || !newService.description) {
      alert('请填写必填信息（QQ或微信至少填写一项）');
      return;
    }

    const finalImages = images.length > 0 
      ? images 
      : [`https://picsum.photos/seed/${Date.now()}/600/400`];

    // 获取当前用户头像
    const userAvatar = currentUser?.avatar || '';

    const service: ServicePost = {
      id: `s${Date.now()}`,
      ...newService,
      images: finalImages,
      authorId: currentUser?.id,
      avatar: userAvatar,
      rating: 5,
      reviewCount: 0,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('zh-CN'),
    };

    const updatedServices = [service, ...services];
    setServices(updatedServices);
    saveServices(updatedServices);
    // 触发更新事件
    window.dispatchEvent(new Event('servicesChanged'));
    setShowForm(false);
    setNewService({
      category: 'makeup',
      title: '',
      nickname: '',
      avatar: '',
      qq: '',
      wechat: '',
      description: '',
      priceRange: '',
    });
    setImages([]);
    // 显示成功提示
    setShowSuccessModal(true);
  };

  const categories = [
    { key: 'all', label: '全部' },
    ...Object.entries(serviceCategories).map(([key, label]) => ({ key, label })),
  ]

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">服务专区</h1>
            <p className="text-slate-400">妆娘、毛娘、摄影师、道具师，一站式服务</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            发布服务
          </Button>
        </div>

        {/* 用户发布的待审核/已拒绝服务 */}
        {(() => {
          const userId = currentUser?.id
          const userPending = services.filter(s => s.authorId === userId && s.status === 'pending')
          const userRejected = services.filter(s => s.authorId === userId && s.status === 'rejected')
          
          if (userPending.length === 0 && userRejected.length === 0) return null
          
          return (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                我的发布
              </h3>
              
              {/* 待审核服务 */}
              {userPending.length > 0 && (
                <div className="mb-4">
                  <p className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    待审核 ({userPending.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userPending.map(service => (
                      <Link
                        key={service.id}
                        to={`/service/${service.id}`}
                        className="bg-dark-50 rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-500/50 transition-all"
                      >
                        {service.images && service.images.length > 0 && (
                          <div className="relative aspect-video">
                            <img src={service.images[0]} alt={service.title || service.nickname} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500 text-white text-xs">
                              待审核
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-12 h-12 border-2 border-amber-500">
                              <AvatarImage src={getServiceAvatar(service)} />
                              <AvatarFallback className="bg-amber-500/20 text-amber-400 text-lg font-bold">
                                {service.nickname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{service.nickname}</h4>
                              <span className="text-xs text-cyan-400">{serviceCategories[service.category]}</span>
                            </div>
                          </div>
                          {!service.images || service.images.length === 0 && (
                            <div className="px-2 py-1 rounded-full bg-amber-500 text-white text-xs inline-block">
                              待审核
                            </div>
                          )}
                          <p className="text-slate-400 text-xs mt-2">点击进入编辑或删除</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 已拒绝服务 */}
              {userRejected.length > 0 && (
                <div>
                  <p className="text-red-400 text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    未通过审核 ({userRejected.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userRejected.map(service => (
                      <Link
                        key={service.id}
                        to={`/service/${service.id}`}
                        className="bg-dark-50 rounded-xl overflow-hidden border border-red-500/30 hover:border-red-500/50 transition-all"
                      >
                        {service.images && service.images.length > 0 && (
                          <div className="relative aspect-video">
                            <img src={service.images[0]} alt={service.title || service.nickname} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                              未通过
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar className="w-12 h-12 border-2 border-red-500 opacity-60">
                              <AvatarImage src={getServiceAvatar(service)} />
                              <AvatarFallback className="bg-red-500/20 text-red-400 text-lg font-bold">
                                {service.nickname.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="text-white font-medium">{service.nickname}</h4>
                              <span className="text-xs text-cyan-400">{serviceCategories[service.category]}</span>
                            </div>
                          </div>
                          {!service.images || service.images.length === 0 && (
                            <div className="px-2 py-1 rounded-full bg-red-500 text-white text-xs inline-block mb-2">
                              未通过
                            </div>
                          )}
                          {service.rejectedReason && (
                            <p className="text-red-400 text-xs">原因：{service.rejectedReason}</p>
                          )}
                          <p className="text-slate-400 text-xs mt-1">点击修改后重新提交</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeCategory === key
                  ? 'bg-cyan-500 text-white'
                  : 'bg-dark-50 text-slate-400 hover:bg-dark-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <Link
              key={service.id}
              to={`/service/${service.id}`}
              className="bg-dark-50 rounded-2xl overflow-hidden border border-white/5 hover:border-cyan-500/30 transition-all duration-300 card-hover"
            >
              {/* 服务图片 */}
              {service.images && service.images.length > 0 && (
                <div className="relative aspect-video">
                  <img
                    src={service.images[0]}
                    alt={service.title || service.nickname}
                    className="w-full h-full object-cover"
                  />
                  {service.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
                      +{service.images.length - 1}
                    </div>
                  )}
                </div>
              )}
              
              {/* Header */}
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="w-16 h-16 border-2 border-cyan-500">
                    <AvatarImage src={getServiceAvatar(service)} />
                    <AvatarFallback className="bg-cyan-500/20 text-cyan-400 text-xl font-bold">
                      {service.nickname.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">{service.nickname}</h3>
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs">
                      {serviceCategories[service.category]}
                    </div>
                  </div>
                </div>

                {service.title && (
                  <h4 className="text-white font-medium mb-2">{service.title}</h4>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          'w-4 h-4',
                          i < Math.floor(service.rating)
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-600'
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-slate-400">
                    {service.rating} ({service.reviewCount}条评价)
                  </span>
                </div>

                <p className="text-slate-400 text-sm line-clamp-3 mb-4">
                  {service.description}
                </p>

                {/* Price Range */}
                {service.priceRange && (
                  <div className="mb-4">
                    <span className="text-cyan-400 font-bold text-lg">
                      {service.priceRange}
                    </span>
                  </div>
                )}

                {/* Contact */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-400 text-sm mb-4">
                  {service.qq && (
                    <div className="flex items-center gap-1">
                      <span className="text-cyan-400">Q</span>
                      <span>{service.qq}</span>
                    </div>
                  )}
                  {service.wechat && (
                    <div className="flex items-center gap-1">
                      <span className="text-green-400">微</span>
                      <span>{service.wechat}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500">
                  发布于 {service.createdAt}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">暂无服务信息</p>
            <p className="text-slate-600 text-sm mt-2">点击上方"发布服务"添加</p>
          </div>
        )}
      </div>

      {/* 发布表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-100 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">发布服务</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">服务类别 *</label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService({...newService, category: e.target.value as ServicePost['category']})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                >
                  {Object.entries(serviceCategories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">服务标题 *</label>
                <input
                  type="text"
                  value={newService.title}
                  onChange={(e) => setNewService({...newService, title: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="如：专业COS妆娘，擅长各类角色"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">昵称/店名 *</label>
                <input
                  type="text"
                  value={newService.nickname}
                  onChange={(e) => setNewService({...newService, nickname: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入昵称或店名"
                />
              </div>

              {/* QQ */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">QQ</label>
                <input
                  type="text"
                  value={newService.qq}
                  onChange={(e) => setNewService({...newService, qq: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入QQ号"
                />
              </div>

              {/* 微信 */}
              <div>
                <label className="block text-slate-300 text-sm mb-2">微信</label>
                <input
                  type="text"
                  value={newService.wechat}
                  onChange={(e) => setNewService({...newService, wechat: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入微信号"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">价格区间</label>
                <input
                  type="text"
                  value={newService.priceRange}
                  onChange={(e) => setNewService({...newService, priceRange: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="如：50-200元/次"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">服务介绍 *</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="请详细描述您的服务内容、经验、擅长风格等"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  服务图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => {
                        setDraggedImageIndex(index)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => {
                        setDraggedImageIndex(null)
                        setDragOverImageIndex(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverImageIndex(index)
                      }}
                      onDragLeave={() => {
                        setDragOverImageIndex(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (draggedImageIndex !== null && draggedImageIndex !== index) {
                          const newImages = [...images]
                          const [removed] = newImages.splice(draggedImageIndex, 1)
                          newImages.splice(index, 0, removed)
                          setImages(newImages)
                        }
                        setDraggedImageIndex(null)
                        setDragOverImageIndex(null)
                      }}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden group bg-slate-800 transition-all",
                        draggedImageIndex === index ? "opacity-50 scale-95" : "",
                        dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-slate-900" : "",
                        "cursor-move"
                      )}
                    >
                      <img
                        src={img}
                        alt={`上传图片${index + 1}`}
                        className="w-full h-full object-contain"
                        onClick={() => setPreviewImage(img)}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <span className="p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-sm">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </span>
                      </div>
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <span>⋮⋮</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeImage(index)
                        }}
                        className="absolute top-1 right-1 p-1.5 bg-red-500/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                      {index === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-cyan-500 text-white text-[10px] rounded font-medium">封面</span>
                      )}
                    </div>
                  ))}
                  {images.length < maxImages && (
                    <label className={cn(
                      "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-cyan-500 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50",
                      isUploading && "cursor-not-allowed opacity-50"
                    )}>
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                          <span className="text-xs text-slate-400 mt-1">
                            {uploadProgress.current}/{uploadProgress.total}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-500" />
                          <span className="text-xs text-slate-500">添加</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* 图片预览弹窗 */}
              {previewImage && (
                <div
                  className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
                  onClick={() => setPreviewImage(null)}
                >
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-8 h-8" />
                  </button>
                  <img
                    src={previewImage}
                    alt="预览图片"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                </div>
              )}

              {/* 审核提示 */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                  <p className="text-amber-400 text-sm">
                    发布后需站主审核，审核通过后其他用户才能浏览
                  </p>
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full gradient-primary">
                确认发布
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 发布成功提示弹窗 */}
      <PublishSuccessModal 
        isOpen={showSuccessModal} 
        onClose={() => setShowSuccessModal(false)} 
      />
    </div>
  );
}
