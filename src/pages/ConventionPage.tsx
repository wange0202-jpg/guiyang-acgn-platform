import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users, Plus, Clock, Building, X, Image, Upload, Trash2, ZoomIn, Heart, ChevronRight, Loader2 } from 'lucide-react'
import { cn, formatDateRange, getEventStatus, getStatusLabel, getStatusColor } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Convention, conventionCategories } from '@/types'
import { getCurrentUser, isAdmin } from '@/lib/auth'
import { uploadToImgBB } from '@/lib/imageUpload'

// 模拟数据（为空，用户需自行发布）
const mockConventions: Convention[] = []

export default function ConventionPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'ended'>('all')
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [conventions, setConventions] = useState<Convention[]>(() => {
    const saved = localStorage.getItem('conventions')
    return saved ? JSON.parse(saved) : mockConventions
  })

  // 保存草稿数据，防止关闭后丢失编辑内容
  const [draftFormData, setDraftFormData] = useState({
    title: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    organizer: '',
    category: 'guiyang',
    isHot: false,
  })
  const [draftImages, setDraftImages] = useState<string[]>([])

  const currentUser = getCurrentUser()
  const canPublish = currentUser && isAdmin()

  const filteredConventions = conventions.filter((convention) => {
    const status = getEventStatus(convention.startDate, convention.endDate)
    if (filter === 'all') return true
    return status === filter
  }).sort((a, b) => {
    // 热门漫展优先显示
    const aHot = (a as any).isHot ? 1 : 0
    const bHot = (b as any).isHot ? 1 : 0
    return bHot - aHot
  })

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">漫展专区</h1>
            <p className="text-slate-400">贵阳漫展信息一网打尽</p>
          </div>
          {canPublish && (
            <Button onClick={() => setShowPublishModal(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              发布漫展
            </Button>
          )}
        </div>

        {/* Category */}
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(conventionCategories).map(([key, label]) => (
            <button
              key={key}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                key === 'guiyang'
                  ? 'bg-primary text-white'
                  : 'bg-dark-50 text-slate-400 hover:bg-dark-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-8">
          {[
            { key: 'all', label: '全部' },
            { key: 'upcoming', label: '即将开始' },
            { key: 'ongoing', label: '正在进行' },
            { key: 'ended', label: '历史漫展' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                filter === key
                  ? 'bg-secondary text-white'
                  : 'bg-dark-50 text-slate-400 hover:bg-dark-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Convention List */}
        <div className="space-y-6">
          {filteredConventions.map((convention) => {
            const status = getEventStatus(convention.startDate, convention.endDate)
            return (
              <Link
                key={convention.id}
                to={`/convention/${convention.id}`}
                className="group block bg-dark-50 rounded-2xl overflow-hidden border border-white/5 hover:border-primary/30 transition-all duration-300 card-hover"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-80 h-48 md:h-auto relative overflow-hidden">
                    <img
                      src={convention.images[0]}
                      alt={convention.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* 热门徽章和状态标签 */}
                    <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                      {(convention as any).isHot && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center gap-1 shadow-lg whitespace-nowrap">
                          🔥 热门
                        </span>
                      )}
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-bold',
                        getStatusColor(status)
                      )}>
                        {getStatusLabel(status)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 p-6">
                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">
                      {convention.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                      {convention.description}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span>{formatDateRange(convention.startDate, convention.endDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <MapPin className="w-4 h-4 text-secondary" />
                        <span>{convention.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Building className="w-4 h-4 text-accent" />
                        <span>{convention.organizer}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <span className="text-xs text-slate-500">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {convention.createdAt} 发布
                      </span>
                      <span
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          window.location.href = `/convention/${convention.id}`
                        }}
                        className="px-4 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2 min-w-[80px] cursor-pointer"
                      >
                        <span className="mt-[-2px]">查看详情</span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {filteredConventions.length === 0 && (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无漫展信息</p>
          </div>
        )}
      </div>

      {/* 发布漫展模态框 */}
      {showPublishModal && (
        <PublishConventionModal
          draftFormData={draftFormData}
          draftImages={draftImages}
          onClose={() => setShowPublishModal(false)}
          onUpdateDraft={(formData, images) => {
            setDraftFormData(formData)
            setDraftImages(images)
          }}
          onPublish={(newConvention) => {
            const updated = [...conventions, newConvention]
            setConventions(updated)
            localStorage.setItem('conventions', JSON.stringify(updated))
            setShowPublishModal(false)
            // 清空草稿
            setDraftFormData({
              title: '',
              description: '',
              location: '',
              startDate: '',
              endDate: '',
              organizer: '',
              category: 'guiyang',
              isHot: false,
            })
            setDraftImages([])
          }}
        />
      )}
    </div>
  )
}

// 发布漫展模态框组件
interface PublishConventionModalProps {
  draftFormData: {
    title: string
    description: string
    location: string
    startDate: string
    endDate: string
    organizer: string
    category: string
    isHot: boolean
  }
  draftImages: string[]
  onClose: () => void
  onUpdateDraft: (formData: typeof draftFormData, images: string[]) => void
  onPublish: (convention: Convention) => void
}

function PublishConventionModal({ draftFormData, draftImages, onClose, onUpdateDraft, onPublish }: PublishConventionModalProps) {
  const [formData, setFormData] = useState(draftFormData)
  const [images, setImages] = useState<string[]>(draftImages)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null) // 当前拖拽的图片索引
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null) // 拖拽经过的图片索引
  const maxImages = 9

  // 当草稿数据更新时同步状态
  React.useEffect(() => {
    setFormData(draftFormData)
    setImages(draftImages)
  }, [draftFormData, draftImages])

  // 关闭时保存草稿
  const handleClose = () => {
    onUpdateDraft(formData, images)
    onClose()
  }

  // 上传图片到 ImgBB 云端
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const currentUser = localStorage.getItem('currentUser')
    const user = currentUser ? JSON.parse(currentUser) : null
    const newConvention: Convention = {
      id: `c${Date.now()}`,
      ...formData,
      images: images.length > 0 ? images : [`https://picsum.photos/seed/${Date.now()}/800/400`],
      createdAt: new Date().toISOString().split('T')[0],
      creatorId: user?.id,
      creatorUsername: user?.username || '匿名',
    }
    onPublish(newConvention)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-lg bg-dark-100 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">发布漫展</h3>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1">标题</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
              placeholder="请输入漫展标题"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">描述</label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none resize-none"
              rows={3}
              placeholder="请输入漫展描述"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">开始日期</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">结束日期</label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">地点</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
              placeholder="请输入漫展地点"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">主办方</label>
            <input
              type="text"
              required
              value={formData.organizer}
              onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
              placeholder="请输入主办方名称"
            />
          </div>
          {/* 热门漫展选项 */}
          <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-white/10">
            <div>
              <p className="text-sm text-white font-medium">设为热门漫展</p>
              <p className="text-xs text-slate-500">热门漫展将在列表中优先展示</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isHot}
                onChange={(e) => setFormData({ ...formData, isHot: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-pink-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
            </label>
          </div>
          {/* 图片上传 */}
          <div>
            <label className="block text-sm text-slate-300 mb-1">
              图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
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
                    dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-slate-900" : "",
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
                  {/* 拖拽手柄指示 */}
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
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-pink-500 text-white text-[10px] rounded font-medium">封面</span>
                  )}
                </div>
              ))}
              {images.length < maxImages && (
                <label className={cn(
                  "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-pink-500 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50",
                  isUploading && "cursor-not-allowed opacity-50"
                )}>
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
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

            {/* 图片预览弹窗 */}
            {previewImage && (
              <div
                className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-4"
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
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500">{images.length}/{maxImages} 张</p>
              {images.length > 0 && <p className="text-xs text-slate-500">拖拽排序，第一张为封面图</p>}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={handleClose} className="flex-1">
              取消
            </Button>
            <Button type="submit" className="flex-1 gradient-primary">
              发布
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
