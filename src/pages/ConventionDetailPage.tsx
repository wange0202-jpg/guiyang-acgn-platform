import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, Share2, Calendar, MapPin, Building, X, ChevronLeft, ChevronRight, ZoomIn, Eye, Edit2, Trash2, Upload, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getEventStatus, getStatusLabel, getStatusColor, formatDateRange } from '@/lib/utils'
import { Convention } from '@/types'
import { uploadToImgBB } from '@/lib/imageUpload'

// 从 localStorage 获取带统计数据的漫展列表
const getConventionsWithStats = (): Convention[] => {
  const saved = localStorage.getItem('conventions')
  return saved ? JSON.parse(saved) : []
}

// 检查 localStorage 可用空间
const checkLocalStorageQuota = (): { available: boolean; usedPercent: number } => {
  try {
    let total = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage.getItem(key)?.length || 0
      }
    }
    // 粗略估算：每个字符约 2 字节，5MB = 5242880 字符
    const maxSize = 5242880
    const usedPercent = (total / maxSize) * 100
    return { available: total < maxSize * 0.9, usedPercent }
  } catch {
    return { available: true, usedPercent: 0 }
  }
}

// 安全保存到 localStorage
const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded')
      return false
    }
    throw e
  }
}

// 更新漫展统计
const updateConventionStats = (id: string, updates: { views?: number; wants?: string[] }) => {
  const conventions = getConventionsWithStats()
  const index = conventions.findIndex((c) => c.id === id)
  if (index !== -1) {
    if (updates.views !== undefined) {
      conventions[index].views = updates.views
    }
    if (updates.wants !== undefined) {
      conventions[index].wants = updates.wants
    }
    safeSetItem('conventions', JSON.stringify(conventions))
  }
}

// 删除漫展
const deleteConvention = (id: string) => {
  const conventions = getConventionsWithStats()
  const filtered = conventions.filter((c) => c.id !== id)
  safeSetItem('conventions', JSON.stringify(filtered))
}

export default function ConventionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0) // 当前主图索引
  const [previewIndex, setPreviewIndex] = useState<number | null>(null) // 预览弹窗索引
  const [wantsToGo, setWantsToGo] = useState(false)
  const [views, setViews] = useState(0)
  const [wantCount, setWantCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false) // 编辑弹窗状态
  const [showShareModal, setShowShareModal] = useState(false) // 分享弹窗状态
  const [editImages, setEditImages] = useState<string[]>([]) // 编辑弹窗中的图片
  const [hasEditedImages, setHasEditedImages] = useState(false) // 是否编辑过图片
  const [isUploading, setIsUploading] = useState(false) // 上传中状态
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 }) // 上传进度
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null) // 当前拖拽的图片索引
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null) // 拖拽经过的图片索引

  // 获取编辑草稿
  const getEditDraft = () => {
    if (!id) return null
    const saved = localStorage.getItem(`editDraft_${id}`)
    return saved ? JSON.parse(saved) : null
  }

  // 保存编辑草稿
  const saveEditDraft = (draft: any) => {
    if (!id) return
    localStorage.setItem(`editDraft_${id}`, JSON.stringify(draft))
  }

  // 清除编辑草稿
  const clearEditDraft = () => {
    if (!id) return
    localStorage.removeItem(`editDraft_${id}`)
  }

  const conventions = getConventionsWithStats()
  const convention = conventions.find((c) => c.id === id)

  // 判断当前用户是否是创建者或管理员
  const currentUser = localStorage.getItem('currentUser')
  const user = currentUser ? JSON.parse(currentUser) : null
  const isCreator = user && (convention?.creatorUsername === user.username || user.role === 'admin')

  // 删除漫展
  const handleDelete = () => {
    if (window.confirm('确定要删除这个漫展吗？')) {
      deleteConvention(id!)
      navigate('/convention')
    }
  }

  // 初始化数据和增加浏览量（每次进入页面都增加）
  useEffect(() => {
    if (!convention || !id) return

    // 设置初始浏览量和想去人数
    const currentViews = (convention as any).views || 0
    const currentWants = (convention as any).wants || []
    
    setViews(currentViews)
    setWantCount(currentWants.length)

    // 每次进入页面都增加浏览量
    updateConventionStats(id!, { views: currentViews + 1 })
    setViews(currentViews + 1)

    // 检查当前用户是否已点过"想去"
    const currentUser = localStorage.getItem('currentUser')
    if (currentUser) {
      const user = JSON.parse(currentUser)
      setWantsToGo(currentWants.includes(user.username))
    }
  }, [id])

  // 切换"我想去"状态
  const toggleWantsToGo = () => {
    if (!convention) return

    const currentUser = localStorage.getItem('currentUser')
    if (!currentUser) {
      alert('请先登录')
      navigate('/auth')
      return
    }

    const user = JSON.parse(currentUser)
    const currentWants = (convention as any).wants || []
    let newWants: string[]

    if (wantsToGo) {
      newWants = currentWants.filter((name: string) => name !== user.username)
      setWantsToGo(false)
      setWantCount(newWants.length)
    } else {
      newWants = [...currentWants, user.username]
      setWantsToGo(true)
      setWantCount(newWants.length)
    }

    updateConventionStats(id!, { wants: newWants })
  }

  if (!convention) {
    return (
      <div className="min-h-screen pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/convention" className="inline-flex items-center gap-2 text-pink-400 hover:text-pink-300 mb-6">
            <ArrowLeft className="w-4 h-4" />
            返回漫展专区
          </Link>
          <div className="text-center py-20 bg-dark-50 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">漫展不存在或已被删除</h2>
            <Button onClick={() => navigate('/convention')} className="gradient-primary">
              返回漫展列表
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const status = getEventStatus(convention.startDate, convention.endDate)
  const images = convention.images || []

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 返回按钮 */}
        <Link to="/convention" className="inline-flex items-center gap-2 text-slate-400 hover:text-pink-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          返回漫展专区
        </Link>

        {/* 主内容 - 左右布局 */}
        <div className="bg-dark-50 rounded-2xl overflow-hidden border border-white/5">
          <div className="flex flex-col lg:flex-row">
            {/* 左侧 - 图片区域 */}
            <div className="lg:w-1/2 p-4 bg-slate-900/50">
              {/* 主图 */}
              {images.length > 0 && (
                <div className="relative mb-4">
                  <div
                    className="aspect-[4/3] bg-slate-800 rounded-xl overflow-hidden cursor-pointer relative"
                    onClick={() => setPreviewIndex(currentIndex)}
                  >
                    <img
                      src={images[currentIndex]}
                      alt={convention.title}
                      className="w-full h-full object-contain"
                    />
                    {/* 左切换按钮 */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all opacity-70 hover:opacity-100"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all opacity-70 hover:opacity-100"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* 图片计数 */}
                  {images.length > 1 && (
                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 rounded-full text-white text-xs">
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}
                  {/* 状态标签 */}
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>
                </div>
              )}

              {/* 缩略图 */}
              {images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, index) => (
                    <div
                      key={index}
                      className={`aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                        index === currentIndex
                          ? 'ring-2 ring-pink-500 opacity-100'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setCurrentIndex(index)}
                    >
                      <img
                        src={img}
                        alt={`缩略图 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 图片数量提示 */}
              {images.length > 0 && (
                <div className="mt-3 text-center text-sm text-slate-500">
                  共 {images.length} 张图片，点击主图查看大图，左右箭头切换图片
                </div>
              )}
            </div>

            {/* 右侧 - 详情区域 */}
            <div className="lg:w-1/2 p-6">
              {/* 标题 */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {(convention as any).isHot && (
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center gap-1 shadow-lg">
                      🔥 热门漫展
                    </span>
                  )}
                  <h1 className="text-2xl font-bold text-white">{convention.title}</h1>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full">
                    <Eye className="w-4 h-4" />
                    <span>{views}</span>
                  </div>
                  {/* 创建者操作按钮 - 更明显的样式 */}
                  {isCreator && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // 从 localStorage 加载草稿或初始化
                          const draft = getEditDraft()
                          if (!draft) {
                            saveEditDraft({
                              title: convention.title,
                              description: convention.description || '',
                              location: convention.location,
                              organizer: convention.organizer,
                              startDate: convention.startDate,
                              endDate: convention.endDate,
                              isHot: (convention as any).isHot === true,
                            })
                          }
                          // 加载草稿中的图片或原始图片
                          const draftImages = draft?.images
                          setEditImages(draftImages !== undefined ? draftImages : (convention.images || []))
                          setHasEditedImages(draftImages !== undefined)
                          setShowEditModal(true)
                        }}
                        className="px-3 py-1.5 text-sm text-pink-400 bg-pink-400/10 hover:bg-pink-400/20 border border-pink-400/30 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>编辑</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="px-3 py-1.5 text-sm text-red-400 bg-red-400/10 hover:bg-red-400/20 border border-red-400/30 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>删除</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* 简要信息 */}
              <div className="flex flex-wrap gap-3 mb-6 pb-4 border-b border-white/10">
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <Building className="w-4 h-4 text-pink-400" />
                  {convention.organizer}
                </span>
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-pink-400" />
                  {formatDateRange(convention.startDate, convention.endDate)}
                </span>
                <span className="text-sm text-slate-400 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  {convention.location}
                </span>
              </div>

              {/* 详细信息卡片 */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-pink-400 font-medium w-20">活动时间</span>
                  <span className="text-white">{convention.startDate} ~ {convention.endDate}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-pink-400 font-medium w-20">活动地点</span>
                  <span className="text-white">{convention.location}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-pink-400 font-medium w-20">主办方</span>
                  <span className="text-white">{convention.organizer}</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <span className="text-pink-400 font-medium w-20">发布时间</span>
                  <span className="text-white">{convention.createdAt}</span>
                </div>
              </div>

              {/* 活动介绍 */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  活动介绍
                </h3>
                <div className="p-4 bg-slate-800/30 rounded-xl max-h-48 overflow-y-auto">
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {convention.description || '暂无活动介绍'}
                  </p>
                </div>
              </div>

              {/* 互动按钮 */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/10">
                <Button
                  onClick={toggleWantsToGo}
                  variant={wantsToGo ? 'default' : 'outline'}
                  className={`flex-1 ${wantsToGo ? 'gradient-primary' : ''}`}
                >
                  <Heart className={`w-4 h-4 mr-2 ${wantsToGo ? 'fill-current' : ''}`} />
                  <span className="mt-[-2px]">{wantsToGo ? '我想去' : '我想去'} {wantCount > 0 && `(${wantCount})`}</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowShareModal(true)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="mt-[-2px]">分享</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 图片预览弹窗 */}
      {previewIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          <button
            onClick={() => setPreviewIndex(null)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-8 h-8" />
          </button>
          
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewIndex((prev) => (prev! > 0 ? prev! - 1 : images.length - 1))
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setPreviewIndex((prev) => (prev! < images.length - 1 ? prev! + 1 : 0))
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
          
          <img
            src={images[previewIndex]}
            alt="预览图片"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 rounded-full text-white text-sm">
              {previewIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && convention && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center"
          onClick={() => {
            // 关闭时保存草稿（包括图片）
            const form = document.getElementById('editForm') as HTMLFormElement
            if (form) {
              const formData = new FormData(form)
              saveEditDraft({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                location: formData.get('location') as string,
                organizer: formData.get('organizer') as string,
                startDate: formData.get('startDate') as string,
                endDate: formData.get('endDate') as string,
                isHot: formData.get('isHot') === 'on',
                images: editImages, // 保存当前图片状态
              })
            }
            setShowEditModal(false)
          }}
        >
          <div
            className="bg-dark-100 rounded-2xl p-6 w-full max-w-lg mx-4 border border-white/10 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">编辑漫展</h3>
              <button
                onClick={() => {
                  // 关闭时保存草稿（包括图片）
                  const form = document.getElementById('editForm') as HTMLFormElement
                  if (form) {
                    const formData = new FormData(form)
                    saveEditDraft({
                      title: formData.get('title') as string,
                      description: formData.get('description') as string,
                      location: formData.get('location') as string,
                      organizer: formData.get('organizer') as string,
                      startDate: formData.get('startDate') as string,
                      endDate: formData.get('endDate') as string,
                      isHot: formData.get('isHot') === 'on',
                      images: editImages, // 保存当前图片状态
                    })
                  }
                  setShowEditModal(false)
                }}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              id="editForm"
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const conventions = getConventionsWithStats()
                const index = conventions.findIndex((c) => c.id === id)
                if (index !== -1) {
                  const isHotValue = formData.get('isHot') === 'on'
                  // 只有在编辑过图片时才使用新图片，否则保留原图
                  const finalImages = hasEditedImages 
                    ? editImages || []
                    : (conventions[index].images || [])
                  conventions[index] = {
                    ...conventions[index],
                    title: formData.get('title') as string,
                    description: formData.get('description') as string,
                    location: formData.get('location') as string,
                    organizer: formData.get('organizer') as string,
                    startDate: formData.get('startDate') as string,
                    endDate: formData.get('endDate') as string,
                    images: finalImages,
                    isHot: isHotValue,
                  }
                  const jsonStr = JSON.stringify(conventions)
                  // 检查存储配额
                  const quota = checkLocalStorageQuota()
                  if (!quota.available) {
                    alert(`存储空间不足！当前已使用 ${quota.usedPercent.toFixed(1)}%。请减少图片数量或删除一些旧漫展后再试。`)
                    return
                  }
                  if (!safeSetItem('conventions', jsonStr)) {
                    alert('存储空间不足！请减少图片数量或删除一些旧漫展后再试。')
                    return
                  }
                  clearEditDraft() // 保存成功后清除草稿
                  setShowEditModal(false)
                  // 延迟刷新以确保状态更新完成
                  setTimeout(() => {
                    window.location.reload()
                  }, 100)
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-slate-300 mb-1">标题</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={(() => {
                    const draft = getEditDraft()
                    return draft?.title ?? convention.title
                  })()}
                  required
                  className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">描述</label>
                <textarea
                  name="description"
                  defaultValue={(() => {
                    const draft = getEditDraft()
                    return draft?.description ?? convention.description ?? ''
                  })()}
                  required
                  rows={5}
                  className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">开始日期</label>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={(() => {
                      const draft = getEditDraft()
                      return draft?.startDate ?? convention.startDate
                    })()}
                    required
                    className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">结束日期</label>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={(() => {
                      const draft = getEditDraft()
                      return draft?.endDate ?? convention.endDate
                    })()}
                    required
                    className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">地点</label>
                <input
                  type="text"
                  name="location"
                  defaultValue={(() => {
                    const draft = getEditDraft()
                    return draft?.location ?? convention.location
                  })()}
                  required
                  className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">主办方</label>
                <input
                  type="text"
                  name="organizer"
                  defaultValue={(() => {
                    const draft = getEditDraft()
                    return draft?.organizer ?? convention.organizer
                  })()}
                  required
                  className="w-full px-4 py-2 bg-slate-800/50 text-white rounded-lg border border-white/10 focus:border-pink-500 focus:outline-none"
                />
              </div>

              {/* 设为热门漫展 */}
              <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">🔥</span>
                  <span className="text-sm text-slate-300">设为热门漫展</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isHot"
                    defaultChecked={(() => {
                      const draft = getEditDraft()
                      return draft?.isHot ?? (convention as any).isHot === true
                    })()}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                </label>
              </div>
              
              {/* 图片上传 */}
              <div>
                <label className="block text-sm text-slate-300 mb-2">图片（最多9张，可拖拽排序）</label>
                <div className="flex flex-wrap gap-2">
                  {/* 已有图片 - 支持拖拽排序 */}
                  {(editImages.length > 0 ? editImages : convention.images || []).map((img, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => {
                        setDraggedImageIndex(idx)
                        setHasEditedImages(true) // 拖拽也是编辑
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => {
                        setDraggedImageIndex(null)
                        setDragOverImageIndex(null)
                      }}
                      onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'move'
                        setDragOverImageIndex(idx)
                      }}
                      onDragLeave={() => {
                        setDragOverImageIndex(null)
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (draggedImageIndex !== null && draggedImageIndex !== idx) {
                          const currentImages = editImages.length > 0 
                            ? editImages 
                            : (convention.images || [])
                          const newImages = [...currentImages]
                          const [removed] = newImages.splice(draggedImageIndex, 1)
                          newImages.splice(idx, 0, removed)
                          setEditImages(newImages)
                          setHasEditedImages(true)
                        }
                        setDraggedImageIndex(null)
                        setDragOverImageIndex(null)
                      }}
                      className={`relative group cursor-move transition-all ${
                        draggedImageIndex === idx ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverImageIndex === idx && draggedImageIndex !== idx 
                          ? 'ring-2 ring-pink-500 ring-offset-2 ring-offset-slate-900' 
                          : ''
                      }`}
                    >
                      <img
                        src={img}
                        alt={`图片 ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      {/* 拖拽手柄指示 */}
                      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <span>⋮⋮</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // 确保 editImages 有值
                          const currentImages = editImages.length > 0 
                            ? editImages 
                            : (convention.images || [])
                          const newImages = currentImages.filter((_, i) => i !== idx)
                          setEditImages(newImages)
                          setHasEditedImages(true) // 标记已编辑图片
                        }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                      {/* 封面标识 */}
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-pink-500 text-white text-[10px] rounded font-medium">
                          封面
                        </span>
                      )}
                    </div>
                  ))}
                  {/* 添加按钮 */}
                  {(editImages.length > 0 ? editImages : convention.images || []).length < 9 && (
                    <label className={`w-20 h-20 border-2 border-dashed border-slate-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 transition-colors ${isUploading ? 'cursor-not-allowed opacity-50' : ''}`}>
                      {isUploading ? (
                        <>
                          <Loader2 className="w-6 h-6 text-pink-400 animate-spin" />
                          <span className="text-xs text-slate-400 mt-1">{uploadProgress.current}/{uploadProgress.total}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-500" />
                          <span className="text-xs text-slate-500 mt-1">添加</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={isUploading}
                        onChange={async (e) => {
                          const files = e.target.files
                          if (!files) return
                          // 确保使用当前最新的图片数组
                          const currentImages = editImages.length > 0 ? editImages : (convention.images || [])
                          if (currentImages.length >= 9) return
                          
                          const fileArray = Array.from(files).slice(0, 9 - currentImages.length)
                          if (fileArray.length === 0) return
                          
                          setIsUploading(true)
                          setUploadProgress({ current: 0, total: fileArray.length })
                          setHasEditedImages(true)
                          
                          try {
                            const newUrls: string[] = []
                            for (let i = 0; i < fileArray.length; i++) {
                              const url = await uploadToImgBB(fileArray[i])
                              newUrls.push(url)
                              setUploadProgress({ current: i + 1, total: fileArray.length })
                            }
                            setEditImages(prev => [...prev, ...newUrls].slice(0, 9))
                          } catch (error) {
                            console.error('上传失败:', error)
                            alert('图片上传失败，请重试')
                          } finally {
                            setIsUploading(false)
                            setUploadProgress({ current: 0, total: 0 })
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">拖拽图片可排序，第一张为封面；点击×删除图片</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowEditModal(false)} className="flex-1">
                  取消
                </Button>
                <Button type="submit" className="flex-1 gradient-primary">
                  保存
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 分享弹窗 */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">分享到</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* QQ分享 */}
              <button
                onClick={() => {
                  const shareUrl = window.location.href
                  const shareTitle = convention?.title || '漫展信息'
                  const shareDesc = convention?.description || ''
                  // 先复制链接
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    // 复制成功后跳转到QQ分享页面
                    window.location.href = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareDesc)}`
                  }).catch(() => {
                    // 复制失败也尝试跳转
                    window.location.href = `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(shareTitle)}&summary=${encodeURIComponent(shareDesc)}`
                  })
                  setShowShareModal(false)
                }}
                className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1.5 14.5c-1.5 0-2.5-.5-3.5-1.5-.5-.5-.8-1.2-.8-1.8 0-.5.3-1.1.8-1.4.3-.2.5-.6.5-1 0-.8-.5-1.3-1.2-1.3-.3 0-.7.1-.8.3-.3.5-.5 1.2-.5 1.8 0 2 1.3 3.6 3 4.2v2.2c0 .5.4.9.9.9h1c.5 0 .9-.4.9-.9v-2.2zm5.5 0c-.5 0-.9.4-.9.9v2.2c0 .5.4.9.9.9h1c.5 0 .9-.4.9-.9v-2.2c1.7-.6 3-2.2 3-4.2 0-.6-.2-1.3-.5-1.8-.1-.2-.5-.3-.8-.3-.7 0-1.2.5-1.2 1.3 0 .4.2.8.5 1 .5.3.8.9.8 1.4 0 .6-.3 1.3-.8 1.8-1 .9-2 1.4-3.5 1.4zm-.5-5.5c.7 0 1.3.5 1.3 1.2 0 .7-.6 1.2-1.3 1.2s-1.3-.5-1.3-1.2c0-.7.6-1.2 1.3-1.2zm-5 0c.7 0 1.3.5 1.3 1.2 0 .7-.6 1.2-1.3 1.2s-1.3-.5-1.3-1.2c0-.7.6-1.2 1.3-1.2z"/>
                  </svg>
                </div>
                <span className="text-sm text-slate-300">QQ</span>
              </button>

              {/* 微信分享 */}
              <button
                onClick={() => {
                  const shareUrl = window.location.href
                  navigator.clipboard.writeText(shareUrl).then(() => {
                    alert('链接已复制到剪贴板，请打开微信粘贴分享')
                  }).catch(() => {
                    alert('分享链接: ' + shareUrl)
                  })
                  setShowShareModal(false)
                }}
                className="flex flex-col items-center gap-2 p-4 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.87c-.135-.004-.272-.012-.407-.012zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </div>
                <span className="text-sm text-slate-300">微信</span>
              </button>
            </div>

            {/* 复制链接按钮 */}
            <button
              onClick={() => {
                const shareUrl = window.location.href
                navigator.clipboard.writeText(shareUrl).then(() => {
                  alert('链接已复制到剪贴板')
                }).catch(() => {
                  prompt('请复制以下链接:', shareUrl)
                })
                setShowShareModal(false)
              }}
              className="w-full mt-4 py-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-slate-300"
            >
              <span>复制链接</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
