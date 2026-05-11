import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, MessageCircle, Plus, User, X, Upload, Trash2, ZoomIn, Loader2, Image as ImageIcon, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { cosCategories, CosCategory } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { uploadToImgBB } from '@/lib/imageUpload'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { realtimeViews, subscribeToEvent, REALTIME_EVENTS } from '@/lib/realtime'

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
          您的作品已提交，等待站主审核
        </p>
        <div className="bg-dark-100 rounded-xl p-4 mb-6 text-left">
          <div className="text-sm text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核通过后，作品将公开展示</span>
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

// COS作品状态
type CosWorkStatus = 'pending' | 'approved' | 'rejected'

// COS作品数据结构
interface CosWorkPost {
  id: string
  title: string
  category: CosCategory
  images: string[]
  description: string
  authorName: string
  authorId?: string
  authorAvatar?: string
  likes: number
  status: CosWorkStatus
  createdAt: string
  rejectedReason?: string
}

// 加载COS作品数据
const loadCosWorks = (): CosWorkPost[] => {
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

// 保存COS作品数据
const saveCosWorks = (works: CosWorkPost[]) => {
  try {
    localStorage.setItem('cosWorks', JSON.stringify(works));
  } catch (e) {
    // 如果存储空间不足，尝试清理旧数据
    if ((e as Error).name === 'QuotaExceededError') {
      console.warn('存储空间不足，开始清理旧数据...');
      cleanupOldCosWorks(works);
    } else {
      console.error('Failed to save cos works:', e);
    }
  }
};

// 清理旧数据 - 保留最近的作品
const cleanupOldCosWorks = (newWorks: CosWorkPost[]) => {
  try {
    // 方案1：只保留新提交的这条作品
    if (newWorks.length > 0) {
      const latestWork = newWorks[0]; // 新作品在最前面
      const cleanedWork = {
        ...latestWork,
        images: latestWork.images.slice(0, 3) // 只保留3张图片
      };
      localStorage.setItem('cosWorks', JSON.stringify([cleanedWork]));
      console.log('存储空间不足，仅保存最新作品');
      alert('存储空间已满，旧数据已清理');
      return;
    }
  } catch (e) {
    console.error('清理数据失败:', e);
    // 如果还是失败，直接清空
    try {
      localStorage.setItem('cosWorks', '[]');
    } catch (e2) {
      console.error('无法清空存储:', e2);
    }
  }
};

// COS分类图标映射
const cosCategoryIcons: Record<string, string> = {
  cos: '📷',
  hanfu: '👘',
  lolita: '🎀',
  jk: '🎒',
  kigurumi: '🐻',
  teamBuilding: '🚩',
}

export default function CosPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [works, setWorks] = useState<CosWorkPost[]>([])
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newWork, setNewWork] = useState({
    title: '',
    category: 'cos' as CosCategory,
    description: '',
  })
  // 图片上传相关状态
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null)
  const maxImages = 9

  // 获取当前用户
  const currentUser = getCurrentUser()
  const userIsAdmin = isAdmin()
  const userId = currentUser?.id

  // 监听 storage 变化
  useEffect(() => {
    const handleStorage = () => {
      setWorks(loadCosWorks());
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cosWorksChanged', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cosWorksChanged', handleStorage);
    };
  }, []);

  // 订阅实时浏览量更新
  useEffect(() => {
    const unsubscribe = subscribeToEvent(REALTIME_EVENTS.VIEWS_UPDATED, () => {
      // 浏览量变化时刷新数据
      setWorks(loadCosWorks());
    });
    return unsubscribe;
  }, []);

  // 获取实时浏览数
  const getRealtimeViews = (workId: string, baseViews: number): number => {
    return realtimeViews.getViews(workId) || baseViews;
  }

  const categories = [
    { key: 'all', label: '全部', icon: '📸' },
    ...Object.entries(cosCategories).map(([key, label]) => ({ 
      key, 
      label, 
      icon: cosCategoryIcons[key] || '📷' 
    })),
  ]

  // 根据用户角色过滤作品列表
  const getVisibleWorks = () => {
    if (userIsAdmin) {
      // 管理员看到所有已审核通过的作品
      return works.filter(work => work.status === 'approved')
    }
    // 普通用户看到已审核通过的作品
    return works.filter(work => work.status === 'approved')
  }

  // 获取当前用户的待审核作品
  const getPendingWorks = () => {
    if (!userId) return []
    return works.filter(work => work.authorId === userId && work.status === 'pending')
  }

  // 获取当前用户的已拒绝作品
  const getRejectedWorks = () => {
    if (!userId) return []
    return works.filter(work => work.authorId === userId && work.status === 'rejected')
  }

  const filteredWorks = activeCategory === 'all'
    ? getVisibleWorks()
    : getVisibleWorks().filter(work => work.category === activeCategory)

  // 获取用户昵称
  const getUserNickname = (): string => {
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        const user = JSON.parse(saved);
        return user.username || user.nickname || '匿名用户';
      }
    } catch (e) {
      console.error('Failed to get user:', e);
    }
    return '匿名用户';
  };

  // 获取用户头像
  const getUserAvatar = (): string | undefined => {
    try {
      const saved = localStorage.getItem('currentUser');
      if (saved) {
        const user = JSON.parse(saved);
        return user.avatar;
      }
    } catch (e) {
      console.error('Failed to get user avatar:', e);
    }
    return undefined;
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

  // 发布新作品
  const handleSubmit = () => {
    if (!newWork.title || !newWork.description) {
      alert('请填写标题和描述');
      return;
    }

    const finalImages = images.length > 0 
      ? images 
      : [`https://picsum.photos/seed/${Date.now()}/600/800`];

    const work: CosWorkPost = {
      id: `cos${Date.now()}`,
      title: newWork.title,
      category: newWork.category,
      images: finalImages,
      description: newWork.description,
      authorName: getUserNickname(),
      authorId: userId,
      authorAvatar: getUserAvatar(),
      likes: 0,
      status: 'pending', // 默认待审核状态
      createdAt: new Date().toLocaleDateString('zh-CN'),
    };

    const updatedWorks = [work, ...works];
    setWorks(updatedWorks);
    saveCosWorks(updatedWorks);
    setShowPublishModal(false);
    setNewWork({ title: '', category: 'cos', description: '' });
    setImages([]);
    // 通知其他组件
    window.dispatchEvent(new Event('cosWorksChanged'));
    // 显示成功提示
    setShowSuccessModal(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">COS专区</h1>
            <p className="text-slate-400">分享你的COS作品，展现百变魅力</p>
          </div>
          <Button onClick={() => setShowPublishModal(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            发布作品
          </Button>
        </div>

        {/* 用户待审核/已拒绝作品区域 */}
        {(getPendingWorks().length > 0 || getRejectedWorks().length > 0) && !userIsAdmin && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              我的发布
            </h3>
            
            {/* 待审核作品 */}
            {getPendingWorks().length > 0 && (
              <div className="mb-4">
                <p className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  待审核 ({getPendingWorks().length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getPendingWorks().map(work => (
                    <Link
                      key={work.id}
                      to={`/cos/${work.id}`}
                      className="bg-dark-50 rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-500/50 transition-all"
                    >
                      <div className="relative aspect-video">
                        <img src={work.images[0]} alt={work.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500 text-white text-xs">
                          待审核
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-white text-sm font-medium line-clamp-1">{work.title}</h4>
                        <p className="text-slate-400 text-xs mt-1">点击进入编辑或删除</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 已拒绝作品 */}
            {getRejectedWorks().length > 0 && (
              <div>
                <p className="text-red-400 text-sm mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  未通过审核 ({getRejectedWorks().length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getRejectedWorks().map(work => (
                    <Link
                      key={work.id}
                      to={`/cos/${work.id}`}
                      className="bg-dark-50 rounded-xl overflow-hidden border border-red-500/30 hover:border-red-500/50 transition-all"
                    >
                      <div className="relative aspect-video">
                        <img src={work.images[0]} alt={work.title} className="w-full h-full object-cover opacity-60" />
                        <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                          未通过
                        </div>
                      </div>
                      <div className="p-3">
                        <h4 className="text-white text-sm font-medium line-clamp-1">{work.title}</h4>
                        {work.rejectedReason && (
                          <p className="text-red-400 text-xs mt-1">原因：{work.rejectedReason}</p>
                        )}
                        <p className="text-slate-400 text-xs mt-1">点击修改后重新提交</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                activeCategory === key
                  ? 'bg-violet-500 text-white'
                  : 'bg-dark-50 text-slate-400 hover:bg-dark-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredWorks.map((work) => (
            <Link
              key={work.id}
              to={`/cos/${work.id}`}
              className="group break-inside-avoid bg-dark-50 rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all duration-300 card-hover"
            >
              <div className="relative">
                <img
                  src={work.images[0]}
                  alt={work.title}
                  className="w-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Image count badge */}
                {work.images.length > 1 && (
                  <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
                    +{work.images.length - 1}
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
                  {work.title}
                </h3>
                
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={work.authorAvatar} />
                    <AvatarFallback>
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-slate-400">{work.authorName}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {getRealtimeViews(work.id, work.views || 0)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredWorks.length === 0 && (
          <div className="text-center py-16">
            <p className="text-slate-400">该分类下暂无作品</p>
          </div>
        )}
      </div>

      {/* 发布作品弹窗 */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-100 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">发布COS作品</h3>
              <button onClick={() => setShowPublishModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">作品标题 *</label>
                <input
                  type="text"
                  value={newWork.title}
                  onChange={(e) => setNewWork({...newWork, title: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="如：第一次cos银灰，妆面和后期都自己弄的"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">作品类别 *</label>
                <select
                  value={newWork.category}
                  onChange={(e) => setNewWork({...newWork, category: e.target.value as CosCategory})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                >
                  {Object.entries(cosCategories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>

                <label className="block text-slate-300 text-sm mb-2">作品描述 *</label>
                <textarea
                  value={newWork.description}
                  onChange={(e) => setNewWork({...newWork, description: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-32 resize-none"
                  placeholder="分享你的cos经历、角色、道具制作过程等"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
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
                        dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900" : "",
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
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-500 text-white text-[10px] rounded font-medium">封面</span>
                      )}
                    </div>
                  ))}
                  {images.length < maxImages && (
                    <label className={cn(
                      "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-violet-500 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50",
                      isUploading && "cursor-not-allowed opacity-50"
                    )}>
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
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
  )
}
