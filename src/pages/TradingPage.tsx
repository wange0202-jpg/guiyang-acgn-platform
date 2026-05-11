import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Tag, Package, User, X, Clock, AlertCircle, Upload, Trash2, ZoomIn, Loader2, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Product, productCategories } from '@/types'
import { getCurrentUser } from '@/lib/auth'
import { uploadToImgBB } from '@/lib/imageUpload'

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
          您的商品已提交，等待站主审核
        </p>
        <div className="bg-dark-100 rounded-xl p-4 mb-6 text-left">
          <div className="text-sm text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核通过后，商品将公开展示</span>
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

// 商品状态
type ProductStatus = 'pending' | 'approved' | 'rejected'

// 商品数据结构
interface ProductPost {
  id: string
  title: string
  category: 'costume' | 'wig' | 'props' | 'merchandise'
  price: number
  condition: '全新' | '几乎全新' | '轻微使用痕迹' | '有明显使用痕迹'
  images: string[]
  description: string
  seller: string
  authorId?: string
  qq: string
  wechat: string
  status: ProductStatus
  createdAt: string
  rejectedReason?: string
}

// 加载商品数据
const loadProducts = (): ProductPost[] => {
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

// 保存商品数据
const saveProducts = (products: ProductPost[]) => {
  try {
    localStorage.setItem('products', JSON.stringify(products));
  } catch (e) {
    // 如果存储空间不足，尝试清理旧数据
    if ((e as Error).name === 'QuotaExceededError') {
      console.warn('存储空间不足，开始清理旧数据...');
      cleanupOldProducts(products);
    } else {
      console.error('Failed to save products:', e);
    }
  }
};

// 清理旧数据 - 保留最近的商品
const cleanupOldProducts = (newProducts: ProductPost[]) => {
  try {
    // 方案1：只保留新提交的这条商品
    if (newProducts.length > 0) {
      const latestProduct = {
        ...newProducts[0],
        images: newProducts[0].images.slice(0, 3) // 只保留3张图片
      };
      localStorage.setItem('products', JSON.stringify([latestProduct]));
      console.log('存储空间不足，仅保存最新商品');
      alert('存储空间已满，旧数据已清理');
      return;
    }
  } catch (e) {
    console.error('清理数据失败:', e);
    try {
      localStorage.setItem('products', '[]');
    } catch (e2) {
      console.error('无法清空存储:', e2);
    }
  }
};

export default function TradingPage() {
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [products, setProducts] = useState<ProductPost[]>(loadProducts)
  const [showForm, setShowForm] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [newProduct, setNewProduct] = useState({
    title: '',
    category: 'costume' as ProductPost['category'],
    price: 0,
    condition: '全新' as ProductPost['condition'],
    description: '',
    seller: '',
    qq: '',
    wechat: '',
  })
  // 图片上传相关状态
  const [images, setImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null)
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null)
  const maxImages = 9

  // 监听 storage 变化
  useEffect(() => {
    const handleStorage = () => {
      setProducts(loadProducts());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const filteredProducts = activeCategory === 'all'
    ? products.filter(p => p.status === 'approved')
    : products.filter(product => product.category === activeCategory && product.status === 'approved')

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case '全新': return 'bg-emerald-500'
      case '几乎全新': return 'bg-cyan-500'
      case '轻微使用痕迹': return 'bg-amber-500'
      case '有明显使用痕迹': return 'bg-orange-500'
      default: return 'bg-slate-500'
    }
  }

  // 获取当前用户
  const currentUser = getCurrentUser()

  // 发布新商品
  const handleSubmit = () => {
    if (!newProduct.title || !newProduct.price || !newProduct.seller) {
      alert('请填写必填信息');
      return;
    }
    if (!newProduct.qq && !newProduct.wechat) {
      alert('请填写QQ或微信联系方式');
      return;
    }

    const finalImages = images.length > 0 
      ? images 
      : [`https://picsum.photos/seed/${Date.now()}/400/400`];

    const product: ProductPost = {
      id: `t${Date.now()}`,
      ...newProduct,
      authorId: currentUser?.id,
      images: finalImages,
      status: 'pending',
      createdAt: new Date().toLocaleDateString('zh-CN'),
    };

    const updatedProducts = [product, ...products];
    setProducts(updatedProducts);
    saveProducts(updatedProducts);
    // 触发更新事件
    window.dispatchEvent(new Event('productsChanged'));
    setShowForm(false);
    setNewProduct({
      title: '',
      category: 'costume',
      price: 0,
      condition: '全新',
      description: '',
      seller: '',
      qq: '',
      wechat: '',
    });
    setImages([]);
    // 显示成功提示
    setShowSuccessModal(true);
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

  const categories = [
    { key: 'all', label: '全部' },
    ...Object.entries(productCategories).map(([key, label]) => ({ key, label })),
  ]

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">交易专区</h1>
            <p className="text-slate-400">C服、假发、道具、周边，好物低价转</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="gradient-primary">
            <Plus className="w-4 h-4 mr-2" />
            发布商品
          </Button>
        </div>

        {/* 用户发布的待审核/已拒绝商品 */}
        {(() => {
          const userId = currentUser?.id
          const userPending = products.filter(p => p.authorId === userId && p.status === 'pending')
          const userRejected = products.filter(p => p.authorId === userId && p.status === 'rejected')
          
          if (userPending.length === 0 && userRejected.length === 0) return null
          
          return (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                我的发布
              </h3>
              
              {/* 待审核商品 */}
              {userPending.length > 0 && (
                <div className="mb-4">
                  <p className="text-amber-400 text-sm mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    待审核 ({userPending.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userPending.map(product => (
                      <Link
                        key={product.id}
                        to={`/trading/${product.id}`}
                        className="bg-dark-50 rounded-xl overflow-hidden border border-amber-500/30 hover:border-amber-500/50 transition-all"
                      >
                        <div className="relative aspect-video">
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-amber-500 text-white text-xs">
                            待审核
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-white text-sm font-medium line-clamp-1">{product.title}</h4>
                          <p className="text-red-400 text-sm font-bold">¥{product.price}</p>
                          <p className="text-slate-400 text-xs mt-1">点击进入编辑或删除</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* 已拒绝商品 */}
              {userRejected.length > 0 && (
                <div>
                  <p className="text-red-400 text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    未通过审核 ({userRejected.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userRejected.map(product => (
                      <Link
                        key={product.id}
                        to={`/trading/${product.id}`}
                        className="bg-dark-50 rounded-xl overflow-hidden border border-red-500/30 hover:border-red-500/50 transition-all"
                      >
                        <div className="relative aspect-video">
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover opacity-60" />
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-red-500 text-white text-xs">
                            未通过
                          </div>
                        </div>
                        <div className="p-3">
                          <h4 className="text-white text-sm font-medium line-clamp-1">{product.title}</h4>
                          <p className="text-red-400 text-sm font-bold">¥{product.price}</p>
                          {product.rejectedReason && (
                            <p className="text-red-400 text-xs mt-1">原因：{product.rejectedReason}</p>
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
                  ? 'bg-amber-500 text-white'
                  : 'bg-dark-50 text-slate-400 hover:bg-dark-100'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Link
              key={product.id}
              to={`/trading/${product.id}`}
              className="bg-dark-50 rounded-2xl overflow-hidden border border-white/5 hover:border-amber-500/30 transition-all duration-300 card-hover"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs text-white font-medium',
                    getConditionColor(product.condition)
                  )}>
                    {product.condition}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 rounded-full text-xs text-white bg-black/50">
                    {productCategories[product.category]}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-white font-bold mb-2 line-clamp-2">{product.title}</h3>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-2xl font-bold text-red-400">¥{product.price}</span>
                </div>
                <p className="text-slate-400 text-sm line-clamp-2 mb-3">{product.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="w-4 h-4" />
                    <span>{product.seller}</span>
                  </div>
                  <span className="text-slate-500">{product.createdAt}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">暂无商品</p>
            <p className="text-slate-600 text-sm mt-2">点击上方"发布商品"添加</p>
          </div>
        )}
      </div>

      {/* 发布表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-100 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">发布商品</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">商品名称 *</label>
                <input
                  type="text"
                  value={newProduct.title}
                  onChange={(e) => setNewProduct({...newProduct, title: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入商品名称"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">商品类别 *</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({...newProduct, category: e.target.value as ProductPost['category']})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                >
                  {Object.entries(productCategories).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">价格 *</label>
                <input
                  type="number"
                  value={newProduct.price || ''}
                  onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入价格"
                />
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">新旧程度 *</label>
                <select
                  value={newProduct.condition}
                  onChange={(e) => setNewProduct({...newProduct, condition: e.target.value as ProductPost['condition']})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                >
                  <option value="全新">全新</option>
                  <option value="几乎全新">几乎全新</option>
                  <option value="轻微使用痕迹">轻微使用痕迹</option>
                  <option value="有明显使用痕迹">有明显使用痕迹</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">卖家昵称 *</label>
                <input
                  type="text"
                  value={newProduct.seller}
                  onChange={(e) => setNewProduct({...newProduct, seller: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                  placeholder="请输入您的昵称"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 text-sm mb-2">QQ</label>
                  <input
                    type="text"
                    value={newProduct.qq}
                    onChange={(e) => setNewProduct({...newProduct, qq: e.target.value})}
                    className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                    placeholder="请输入QQ号"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 text-sm mb-2">微信</label>
                  <input
                    type="text"
                    value={newProduct.wechat}
                    onChange={(e) => setNewProduct({...newProduct, wechat: e.target.value})}
                    className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                    placeholder="请输入微信号"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">商品描述</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-24 resize-none"
                  placeholder="请描述商品的详细情况"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  商品图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
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
                        dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900" : "",
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
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded font-medium">封面</span>
                      )}
                    </div>
                  ))}
                  {images.length < maxImages && (
                    <label className={cn(
                      "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-amber-500 cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50",
                      isUploading && "cursor-not-allowed opacity-50"
                    )}>
                      {isUploading ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
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
