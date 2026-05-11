import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Eye, TrendingUp, Calendar, MapPin, Shield, Edit2, Trash2, X, Clock, AlertCircle, Star, Phone, ArrowLeft, ChevronLeft, ChevronRight, MessageCircle, Send, User, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getUserByUsername, getCurrentUser, isAdmin } from '@/lib/auth';
import { cosCategories } from '@/types';
import { serviceCategories } from '@/types';
import { productCategories } from '@/types';
import { cn } from '@/lib/utils';
import { uploadToImgBB } from '@/lib/imageUpload';
import { 
  realtimeViews, 
  realtimeAvatars, 
  subscribeToEvent,
  REALTIME_EVENTS 
} from '@/lib/realtime';

// 评论数据结构 - 与CosCommentsPage保持一致
interface Comment {
  id: string;
  workId: string;
  workTitle?: string;
  authorName: string;
  authorId?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string;
}

// 评论存储相关函数 - 使用与CosCommentsPage相同的存储键
const COMMENTS_STORAGE_KEY = 'cosComments';

const getCommentsFromStorage = (workId: string): Comment[] => {
  try {
    const saved = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (saved) {
      const allComments = JSON.parse(saved);
      return allComments.filter((c: Comment) => c.workId === workId);
    }
  } catch (e) {
    console.error('Failed to load comments:', e);
  }
  return [];
};

const saveCommentToStorage = (comment: Comment): void => {
  try {
    const saved = localStorage.getItem(COMMENTS_STORAGE_KEY);
    const allComments = saved ? JSON.parse(saved) : [];
    allComments.push(comment);
    localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(allComments));
  } catch (e) {
    console.error('Failed to save comment:', e);
  }
};

const deleteCommentFromStorage = (commentId: string): void => {
  try {
    const saved = localStorage.getItem(COMMENTS_STORAGE_KEY);
    if (saved) {
      const allComments = JSON.parse(saved);
      const filtered = allComments.filter((c: Comment) => c.id !== commentId);
      localStorage.setItem(COMMENTS_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.error('Failed to delete comment:', e);
  }
};

// 获取用户头像
const getUserAvatar = (authorId: string): string | undefined => {
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      if (user.id === authorId) {
        return user.avatar;
      }
    }
  } catch (e) {
    // 忽略错误
  }
  return undefined;
};

// 格式化时间
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

// 评论区组件
function CommentSection({ workId, workTitle, onCommentCountChange }: { workId: string; workTitle?: string; onCommentCountChange?: (count: number) => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showPendingBadge, setShowPendingBadge] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const currentUser = getCurrentUser();
  const userIsAdmin = isAdmin();

  // 加载评论
  const loadComments = () => {
    const allComments = getCommentsFromStorage(workId);
    // 只显示已审核通过的评论
    const approvedComments = allComments.filter(c => c.status === 'approved');
    setComments(approvedComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    if (onCommentCountChange) {
      onCommentCountChange(approvedComments.length);
    }
  };

  useEffect(() => {
    loadComments();
    
    // 监听评论更新
    const handleUpdate = () => loadComments();
    window.addEventListener('commentsChanged', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('commentsChanged', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [workId]);

  // 检查当前用户是否有待审核评论
  useEffect(() => {
    if (currentUser) {
      const allComments = getCommentsFromStorage(workId);
      const userPending = allComments.filter(c => 
        c.authorId === currentUser.id && 
        c.status === 'pending'
      );
      setPendingCount(userPending.length);
      setShowPendingBadge(userPending.length > 0);
    }
  }, [currentUser, workId]);

  // 提交评论
  const handleSubmit = () => {
    if (!newComment.trim()) {
      alert('请输入评论内容');
      return;
    }
    if (!currentUser) {
      alert('请先登录');
      return;
    }

    const comment: Comment = {
      id: `comment${Date.now()}`,
      workId,
      workTitle: workTitle || '',
      authorName: currentUser.username,
      authorId: currentUser.id,
      authorAvatar: currentUser.avatar,
      content: newComment.trim(),
      createdAt: new Date().toLocaleDateString('zh-CN'),
      status: 'pending', // 默认待审核
    };

    saveCommentToStorage(comment);
    setNewComment('');
    setShowPendingBadge(true);
    setPendingCount(prev => prev + 1);
    
    // 触发更新
    window.dispatchEvent(new Event('commentsChanged'));
    
    alert('评论已提交，等待站主审核后展示');
  };

  // 删除评论
  const handleDelete = (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    deleteCommentFromStorage(commentId);
    loadComments();
    
    // 触发更新
    window.dispatchEvent(new Event('commentsChanged'));
  };

  // 检查是否可以删除评论
  const canDeleteComment = (comment: Comment): boolean => {
    if (!currentUser) return false;
    // 作者可以删除自己的评论
    if (comment.authorId === currentUser.id) return true;
    // 站主可以删除所有人的评论
    if (userIsAdmin) return true;
    return false;
  };

  return (
    <div className="mt-8 p-6 bg-dark-50 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="w-6 h-6 text-violet-400" />
        <h2 className="text-xl font-bold text-white">评论区</h2>
        <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-sm rounded-full">
          {comments.length}条评论
        </span>
        {showPendingBadge && (
          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-sm rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pendingCount}条待审核
          </span>
        )}
      </div>

      {/* 评论输入框 */}
      {currentUser ? (
        <div className="mb-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-white font-medium overflow-hidden">
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.username} className="w-full h-full object-cover" />
              ) : (
                currentUser.username.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="发表你的看法...（评论需站主审核后展示）"
                className="w-full bg-slate-800/50 text-white border border-white/10 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-violet-500/50 transition-colors"
                rows={3}
              />
              <div className="flex justify-end mt-2">
                <Button 
                  onClick={handleSubmit}
                  disabled={!newComment.trim()}
                  className="gradient-primary"
                  size="sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  发表评论
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-slate-800/30 rounded-xl text-center">
          <p className="text-slate-400">
            <Link to="/login" className="text-violet-400 hover:text-violet-300">登录</Link>
            后即可发表评论
          </p>
        </div>
      )}

      {/* 评论列表 */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>暂无评论，快来发表第一条评论吧</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
                {comment.authorAvatar ? (
                  <img src={comment.authorAvatar} alt={comment.authorName} className="w-full h-full object-cover" />
                ) : (
                  comment.authorName.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{comment.authorName}</span>
                  <span className="text-xs text-slate-500">{formatTime(comment.createdAt)}</span>
                </div>
                <p className="text-slate-300 whitespace-pre-wrap">{comment.content}</p>
                {canDeleteComment(comment) && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    删除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// 从localStorage获取用户发布的COS作品
const getCosWorkFromStorage = (id: string) => {
  try {
    const saved = localStorage.getItem('cosWorks');
    if (saved) {
      const works = JSON.parse(saved);
      return works.find((w: any) => w.id === id);
    }
  } catch (e) {
    console.error('Failed to load cos work:', e);
  }
  return null;
};

// 从localStorage获取用户发布的服务
const getServiceFromStorage = (id: string) => {
  try {
    const saved = localStorage.getItem('services');
    if (saved) {
      const services = JSON.parse(saved);
      return services.find((s: any) => s.id === id);
    }
  } catch (e) {
    console.error('Failed to load service:', e);
  }
  return null;
};

// 从localStorage获取用户发布的商品
const getProductFromStorage = (id: string) => {
  try {
    const saved = localStorage.getItem('products');
    if (saved) {
      const products = JSON.parse(saved);
      return products.find((p: any) => p.id === id);
    }
  } catch (e) {
    console.error('Failed to load product:', e);
  }
  return null;
};

// 更新原始数据的浏览量（同步到cosWorks/services/products）
const updateRawDataViews = (postType: string, id: string, views: number) => {
  let storageKey = '';
  switch (postType) {
    case 'cos':
      storageKey = 'cosWorks';
      break;
    case 'service':
      storageKey = 'services';
      break;
    case 'trading':
      storageKey = 'products';
      break;
    default:
      return;
  }

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const items = JSON.parse(saved);
      const index = items.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        items[index].views = views;
        localStorage.setItem(storageKey, JSON.stringify(items));
      }
    }
  } catch (e) {
    console.error('Failed to update views:', e);
  }
};

// 服务类别名称映射
const getServiceCategoryName = (category: string) => {
  const categoryMap: Record<string, string> = {
    makeup: '化妆服务',
    wig: '假发造型',
    photographer: '摄影约拍',
    props: '道具制作'
  };
  return categoryMap[category] || category;
};

// 编辑成功提示弹窗
function EditSuccessModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-dark-50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-white/10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">修改成功！</h3>
        <p className="text-slate-300 mb-4">
          您的修改已提交，等待站主审核
        </p>
        <div className="bg-dark-100 rounded-xl p-4 mb-6 text-left">
          <div className="text-sm text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核通过后，修改内容将公开展示</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400">•</span>
              <span>审核结果会通过页面提示告知您</span>
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

// 删除确认弹窗
function DeleteConfirmModal({ isOpen, onClose, onConfirm, title }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; title: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-dark-50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl border border-white/10">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">确认删除</h3>
        <p className="text-slate-300 mb-6">
          确定要删除作品《{title}》吗？此操作不可撤销。
        </p>
        <div className="flex gap-4">
          <Button onClick={onClose} variant="outline" className="flex-1">
            取消
          </Button>
          <Button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            确认删除
          </Button>
        </div>
      </div>
    </div>
  );
}

// COS编辑表单
function CosEditForm({ work, onSave, onCancel }: { work: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: work.title || '',
    category: work.category || 'cos',
    description: work.description || '',
  });
  const [images, setImages] = useState<string[]>(work.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const maxImages = 9;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const fileArray = Array.from(files);
    const availableSlots = maxImages - images.length;
    const filesToUpload = fileArray.slice(0, availableSlots);
    
    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const url = await uploadToImgBB(filesToUpload[i]);
        newUrls.push(url);
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
      }
      setImages(prev => [...prev, ...newUrls].slice(0, maxImages));
    } catch (error) {
      console.error('上传失败:', error);
      alert('图片上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.description) {
      alert('请填写标题和描述');
      return;
    }
    onSave({ ...formData, images });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-300 text-sm mb-2">作品标题 *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">作品类别 *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-32 resize-none"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">
          图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => {
                setDraggedImageIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverImageIndex(index);
              }}
              onDragLeave={() => {
                setDragOverImageIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedImageIndex !== null && draggedImageIndex !== index) {
                  const newImages = [...images];
                  const [removed] = newImages.splice(draggedImageIndex, 1);
                  newImages.splice(index, 0, removed);
                  setImages(newImages);
                }
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden bg-slate-800 group transition-all cursor-move",
                draggedImageIndex === index ? "opacity-50 scale-95" : "",
                dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900" : ""
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-violet-500 text-white text-[10px] rounded font-medium">封面</span>
              )}
              <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px]">⋮⋮</span>
              </div>
            </div>
          ))}
          {images.length < maxImages && (
            <label className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-violet-500 cursor-pointer flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors",
              isUploading && "cursor-not-allowed opacity-50"
            )}>
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Clock className="w-6 h-6 text-violet-400 animate-spin" />
                  <span className="text-xs text-slate-400 mt-1">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-2xl">+</span>
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
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-amber-400 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          修改后需重新审核才能展示
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button onClick={handleSubmit} className="flex-1 gradient-primary">
          保存修改
        </Button>
      </div>
    </div>
  );
}

// 服务编辑表单
function ServiceEditForm({ service, onSave, onCancel }: { service: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    nickname: service.nickname || '',
    category: service.category || 'makeup',
    qq: service.qq || '',
    wechat: service.wechat || '',
    description: service.description || '',
    priceRange: service.priceRange || '',
  });
  const [images, setImages] = useState<string[]>(service.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length && images.length < 9; i++) {
        const url = await uploadToImgBB(files[i]);
        setImages(prev => [...prev, url]);
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('图片上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.nickname || (!formData.qq && !formData.wechat) || !formData.description) {
      alert('请填写必填信息（QQ或微信至少填写一项）');
      return;
    }
    onSave({ ...formData, images });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-300 text-sm mb-2">昵称/店名 *</label>
        <input
          type="text"
          value={formData.nickname}
          onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">服务类别 *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        >
          {Object.entries(serviceCategories).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      {/* QQ */}
      <div>
        <label className="block text-slate-300 text-sm mb-2">QQ</label>
        <input
          type="text"
          value={formData.qq}
          onChange={(e) => setFormData({ ...formData, qq: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        />
      </div>

      {/* 微信 */}
      <div>
        <label className="block text-slate-300 text-sm mb-2">微信</label>
        <input
          type="text"
          value={formData.wechat}
          onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">价格区间</label>
        <input
          type="text"
          value={formData.priceRange}
          onChange={(e) => setFormData({ ...formData, priceRange: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
          placeholder="如：50-200元/次"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">服务介绍 *</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-32 resize-none"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">
          服务图片 <span className="text-slate-500 text-xs">（最多9张，可拖拽排序）</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => {
                setDraggedImageIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverImageIndex(index);
              }}
              onDragLeave={() => {
                setDragOverImageIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedImageIndex !== null && draggedImageIndex !== index) {
                  const newImages = [...images];
                  const [removed] = newImages.splice(draggedImageIndex, 1);
                  newImages.splice(index, 0, removed);
                  setImages(newImages);
                }
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden bg-slate-800 group transition-all cursor-move",
                draggedImageIndex === index ? "opacity-50 scale-95" : "",
                dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-cyan-500" : ""
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-cyan-500 text-white text-[10px] rounded font-medium">封面</span>
              )}
              <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px]">⋮⋮</span>
              </div>
            </div>
          ))}
          {images.length < 9 && (
            <label className="aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-cyan-500 cursor-pointer flex items-center justify-center bg-slate-800/30">
              {isUploading ? (
                <Clock className="w-6 h-6 text-cyan-400 animate-spin" />
              ) : (
                <span className="text-slate-500 text-2xl">+</span>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-amber-400 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          修改后需重新审核才能展示
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button onClick={handleSubmit} className="flex-1 gradient-primary">
          保存修改
        </Button>
      </div>
    </div>
  );
}

// 交易编辑表单
function TradingEditForm({ product, onSave, onCancel }: { product: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    title: product.title || '',
    category: product.category || 'costume',
    price: product.price || 0,
    condition: product.condition || '全新',
    description: product.description || '',
    seller: product.seller || '',
    qq: product.qq || '',
    wechat: product.wechat || '',
  });
  const [images, setImages] = useState<string[]>(product.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverImageIndex, setDragOverImageIndex] = useState<number | null>(null);
  const maxImages = 9;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const availableSlots = maxImages - images.length;
    const filesToUpload = fileArray.slice(0, availableSlots);

    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: filesToUpload.length });

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < filesToUpload.length; i++) {
        const url = await uploadToImgBB(filesToUpload[i]);
        newUrls.push(url);
        setUploadProgress({ current: i + 1, total: filesToUpload.length });
      }
      setImages(prev => [...prev, ...newUrls].slice(0, maxImages));
    } catch (error) {
      console.error('上传失败:', error);
      alert('图片上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.price || !formData.seller) {
      alert('请填写必填信息');
      return;
    }
    if (!formData.qq && !formData.wechat) {
      alert('请填写QQ或微信联系方式');
      return;
    }
    onSave({ ...formData, images });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-slate-300 text-sm mb-2">商品名称 *</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
          placeholder="请输入商品名称"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">商品类别 *</label>
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
        >
          {Object.entries(productCategories).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-300 text-sm mb-2">价格 *</label>
          <input
            type="number"
            value={formData.price || ''}
            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
            placeholder="¥"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-2">新旧程度 *</label>
          <select
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
          >
            <option value="全新">全新</option>
            <option value="几乎全新">几乎全新</option>
            <option value="轻微使用痕迹">轻微使用痕迹</option>
            <option value="有明显使用痕迹">有明显使用痕迹</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">卖家昵称 *</label>
        <input
          type="text"
          value={formData.seller}
          onChange={(e) => setFormData({ ...formData, seller: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
          placeholder="请输入您的昵称"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-slate-300 text-sm mb-2">QQ</label>
          <input
            type="text"
            value={formData.qq}
            onChange={(e) => setFormData({ ...formData, qq: e.target.value })}
            className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
            placeholder="请输入QQ号"
          />
        </div>
        <div>
          <label className="block text-slate-300 text-sm mb-2">微信</label>
          <input
            type="text"
            value={formData.wechat}
            onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
            className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
            placeholder="请输入微信号"
          />
        </div>
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">商品描述</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-24 resize-none"
          placeholder="请描述商品的详细情况"
        />
      </div>
      <div>
        <label className="block text-slate-300 text-sm mb-2">
          商品图片 <span className="text-slate-500 text-xs">（最多{maxImages}张，可拖拽排序）</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              draggable
              onDragStart={(e) => {
                setDraggedImageIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverImageIndex(index);
              }}
              onDragLeave={() => {
                setDragOverImageIndex(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedImageIndex !== null && draggedImageIndex !== index) {
                  const newImages = [...images];
                  const [removed] = newImages.splice(draggedImageIndex, 1);
                  newImages.splice(index, 0, removed);
                  setImages(newImages);
                }
                setDraggedImageIndex(null);
                setDragOverImageIndex(null);
              }}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden bg-slate-800 group transition-all cursor-move",
                draggedImageIndex === index ? "opacity-50 scale-95" : "",
                dragOverImageIndex === index && draggedImageIndex !== index ? "ring-2 ring-amber-500 ring-offset-2 ring-offset-slate-900" : ""
              )}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 right-1 p-1 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              {index === 0 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] rounded font-medium">封面</span>
              )}
              <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px]">⋮⋮</span>
              </div>
            </div>
          ))}
          {images.length < maxImages && (
            <label className={cn(
              "aspect-square rounded-lg border-2 border-dashed border-slate-600 hover:border-amber-500 cursor-pointer flex flex-col items-center justify-center gap-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors",
              isUploading && "cursor-not-allowed opacity-50"
            )}>
              {isUploading ? (
                <div className="flex flex-col items-center">
                  <Clock className="w-6 h-6 text-amber-400 animate-spin" />
                  <span className="text-xs text-slate-400 mt-1">
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
              ) : (
                <span className="text-slate-500 text-2xl">+</span>
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
      <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
        <p className="text-amber-400 text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          修改后需重新审核才能展示
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={onCancel} variant="outline" className="flex-1">
          取消
        </Button>
        <Button onClick={handleSubmit} className="flex-1 gradient-primary">
          保存修改
        </Button>
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  // 获取原始数据
  const [rawData, setRawData] = useState<any>(null);
  const [post, setPost] = useState<any>(null);
  const [postType, setPostType] = useState<'cos' | 'service' | 'trading' | null>(null);
  const [serviceStatus, setServiceStatus] = useState<'pending' | 'rejected' | null>(null);

  // 弹窗状态
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 图片索引和浏览量
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [realTimeViews, setRealTimeViews] = useState(0);
  const [authorAvatar, setAuthorAvatar] = useState<string | null>(null);

  // 加载数据
  useEffect(() => {
    if (!id) return;

    // 尝试从各种数据源获取
    const cosWork = getCosWorkFromStorage(id);
    if (cosWork) {
      setRawData(cosWork);
      setPostType('cos');
      setPost({
        id: cosWork.id,
        title: cosWork.title,
        section: 'COS专区',
        sectionIcon: '📸',
        sectionColor: 'from-violet-500 to-purple-500',
        author: cosWork.authorName || '匿名用户',
        authorId: cosWork.authorId,
        createdAt: cosWork.createdAt,
        views: cosWork.views || 0,
        likes: cosWork.likes || 0,
        description: cosWork.description,
        images: cosWork.images || [],
        category: cosWork.category,
        type: 'cos'
      });
      return;
    }

    const service = getServiceFromStorage(id);
    if (service) {
      // 检查服务审核状态，非approved不允许浏览
      if (service.status !== 'approved') {
        setServiceStatus(service.status);
        setPostType('service');
        return;
      }
      setRawData(service);
      setPostType('service');
      setPost({
        id: service.id,
        title: `${service.nickname} - ${getServiceCategoryName(service.category)}`,
        section: '服务专区',
        sectionIcon: '💄',
        sectionColor: 'from-cyan-500 to-blue-500',
        author: service.nickname || '匿名用户',
        authorId: service.authorId,
        createdAt: service.createdAt,
        views: service.views || 0,
        likes: service.rating || 5,
        description: service.description,
        images: service.images && service.images.length > 0 ? service.images : [],
        priceRange: service.priceRange,
        contact: service.contact,
        qq: service.qq,
        wechat: service.wechat,
        type: 'service'
      });
      return;
    }

    const product = getProductFromStorage(id);
    if (product) {
      setRawData(product);
      setPostType('trading');
      setPost({
        id: product.id,
        title: product.title,
        section: '交易专区',
        sectionIcon: '🔄',
        sectionColor: 'from-amber-500 to-orange-500',
        author: product.seller || '匿名用户',
        authorId: product.authorId,
        createdAt: product.createdAt,
        views: product.views || 0,
        likes: product.likes || 0,
        description: product.description,
        images: product.images || [],
        price: product.price,
        condition: product.condition,
        qq: product.qq,
        wechat: product.wechat,
        type: 'trading'
      });
      return;
    }

    // 硬编码示例数据
    const allPosts = [
      { id: 'cos1', title: '第一次cos银灰，妆面和后期都自己弄的', section: 'COS专区', sectionIcon: '📸', sectionColor: 'from-violet-500 to-purple-500', author: 'Cosplay爱好者', createdAt: '2026-05-08', views: 3567, likes: 328, description: '第一次尝试COS银灰，从妆面到后期都是自己完成的，请大家多多指教！\n\n衣服是找定制工坊做的，质量很不错。假发是自己修剪的造型，虽然有点毛躁但是很有成就感！\n\n希望下次能做得更好~', images: ['https://picsum.photos/seed/cos1/600/900', 'https://picsum.photos/seed/cos1b/600/900'] },
      { id: 's1', title: '专业Cosplay化妆服务，5年经验', section: '服务专区', sectionIcon: '💄', sectionColor: 'from-cyan-500 to-blue-500', author: '小雅化妆师', createdAt: '2026-05-08', views: 1567, likes: 128, price: '100-500元', description: '专业从事COSPLAY化妆5年，擅长各种风格妆面。', images: ['https://picsum.photos/seed/makeup1/400/400'] },
      { id: 't1', title: '明日方舟 能天使cos服全套出售', section: '交易专区', sectionIcon: '🔄', sectionColor: 'from-amber-500 to-orange-500', author: '出坑lofter', createdAt: '2026-05-08', views: 3214, price: 680, condition: '几乎全新', description: '去年漫展买的能天使cos服，只穿过一次，尺码M。', images: ['https://picsum.photos/seed/costume1/400/400'] },
    ];
    const foundPost = allPosts.find(p => p.id === id);
    if (foundPost) {
      setPost(foundPost);
    }
  }, [id]);

  // 设置浏览量（从实时服务获取）
  useEffect(() => {
    if (post && postType) {
      // 获取实时浏览数并增加
      const views = realtimeViews.incrementViews(post.id);
      setRealTimeViews(views);
      // 同时更新原始数据的浏览量
      updateRawDataViews(postType, post.id, views);
    }
  }, [post, postType]);
  
  // 获取作者头像
  useEffect(() => {
    if (post?.authorId) {
      // 先从用户数据获取
      const author = getUserByUsername(post.author);
      if (author?.avatar) {
        setAuthorAvatar(author.avatar);
        realtimeAvatars.setAvatar(post.authorId, author.avatar);
      } else {
        // 从实时服务获取
        const avatar = realtimeAvatars.getAvatar(post.authorId);
        if (avatar) {
          setAuthorAvatar(avatar);
        }
      }
    }
  }, [post?.authorId, post?.author]);
  
  // 订阅实时浏览更新（跨标签页同步）
  useEffect(() => {
    if (!post?.id) return;
    
    // 从localStorage获取最新浏览数
    const currentViews = realtimeViews.getViews(post.id);
    if (currentViews > 0) {
      setRealTimeViews(currentViews);
    }
    
    const unsubscribe = subscribeToEvent(REALTIME_EVENTS.VIEWS_UPDATED, (data) => {
      if (data.postId === post.id) {
        setRealTimeViews(data.count);
      }
    });
    
    return unsubscribe;
  }, [post?.id]);
  
  // 订阅头像更新
  useEffect(() => {
    if (!post?.authorId) return;
    
    const unsubscribe = subscribeToEvent(REALTIME_EVENTS.USER_UPDATED, (data) => {
      if (data.userId === post.authorId && data.avatarUrl) {
        setAuthorAvatar(data.avatarUrl);
      }
    });
    
    return unsubscribe;
  }, [post?.authorId]);
  
  // 定期刷新浏览量（确保跨标签页数据一致）
  useEffect(() => {
    if (!post?.id) return;
    
    const interval = setInterval(() => {
      const views = realtimeViews.getViews(post.id);
      setRealTimeViews(views);
    }, 2000); // 每2秒刷新一次
    
    return () => clearInterval(interval);
  }, [post?.id]);

  // 判断是否为作者
  const isAuthor = currentUser && rawData && currentUser.id === rawData.authorId;

  // 删除处理
  const handleDelete = () => {
    if (!rawData || !postType) return;

    let storageKey = '';
    switch (postType) {
      case 'cos':
        storageKey = 'cosWorks';
        break;
      case 'service':
        storageKey = 'services';
        break;
      case 'trading':
        storageKey = 'products';
        break;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const items = JSON.parse(saved);
        const updated = items.filter((item: any) => item.id !== rawData.id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        
        // 触发更新事件
        window.dispatchEvent(new Event(`${storageKey}Changed`));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.error('删除失败:', e);
      alert('删除失败');
      return;
    }

    setShowDeleteModal(false);
    
    // 跳回列表页
    switch (postType) {
      case 'cos':
        navigate('/cos');
        break;
      case 'service':
        navigate('/service');
        break;
      case 'trading':
        navigate('/trading');
        break;
    }
  };

  // 编辑保存处理
  const handleEditSave = (updatedData: any) => {
    if (!rawData || !postType) return;

    let storageKey = '';
    switch (postType) {
      case 'cos':
        storageKey = 'cosWorks';
        break;
      case 'service':
        storageKey = 'services';
        break;
      case 'trading':
        storageKey = 'products';
        break;
    }

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const items = JSON.parse(saved);
        const index = items.findIndex((item: any) => item.id === rawData.id);
        if (index !== -1) {
          // 更新数据并重置为待审核状态
          items[index] = {
            ...items[index],
            ...updatedData,
            status: 'pending', // 重置为待审核
            rejectedReason: undefined // 清除之前的拒绝原因
          };
          localStorage.setItem(storageKey, JSON.stringify(items));
          
          // 触发更新事件
          window.dispatchEvent(new Event(`${storageKey}Changed`));
          window.dispatchEvent(new Event('storage'));
        }
      }
    } catch (e) {
      console.error('保存失败:', e);
      alert('保存失败');
      return;
    }

    setShowEditModal(false);
    setShowSuccessModal(true);
  };

  if (!post) {
    // 检查是否是服务审核状态
    if (serviceStatus === 'pending') {
      return (
        <div className="min-h-screen pt-24 pb-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-dark-50 rounded-2xl p-8 border border-amber-500/30 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">服务正在审核中</h2>
              <p className="text-slate-400 mb-6">
                该服务正在等待站主审核，审核通过后将公开展示
              </p>
              <Link 
                to="/service" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回服务专区
              </Link>
            </div>
          </div>
        </div>
      );
    }
    
    if (serviceStatus === 'rejected') {
      return (
        <div className="min-h-screen pt-24 pb-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-dark-50 rounded-2xl p-8 border border-red-500/30 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-4">服务未通过审核</h2>
              <p className="text-slate-400 mb-6">
                该服务未通过审核，暂无法查看
              </p>
              <Link 
                to="/service" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                返回服务专区
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen pt-24 pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-white mb-4">帖子不存在</h2>
            <Link to="/" className="text-pink-400 hover:text-pink-300">
              返回首页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 根据类型获取返回链接和文字
  const getBackLink = () => {
    switch (postType) {
      case 'service':
        return { to: '/service', text: '返回服务专区' };
      case 'trading':
        return { to: '/trading', text: '返回交易专区' };
      default:
        return { to: '/cos', text: '返回COS专区' };
    }
  };
  const backLink = getBackLink();

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* 返回按钮 */}
        <Link to={backLink.to} className="inline-flex items-center gap-2 text-slate-400 hover:text-violet-400 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {backLink.text}
        </Link>

        {/* 主内容 - 左右布局 */}
        <div className="bg-dark-50 rounded-2xl overflow-hidden border border-white/5">
          <div className="flex flex-col lg:flex-row">
            {/* 左侧 - 图片区域 */}
            <div className="lg:w-1/2 p-4 bg-slate-900/50">
              {/* 主图 */}
              {post.images && post.images.length > 0 && (
                <div className="relative mb-4">
                  <div
                    className="aspect-[4/3] bg-slate-800 rounded-xl overflow-hidden cursor-pointer relative"
                    onClick={() => post.images.length > 1 && setCurrentImageIndex((prev) => (prev < post.images.length - 1 ? prev + 1 : 0))}
                  >
                    <img
                      src={post.images[currentImageIndex]}
                      alt={post.title}
                      className="w-full h-full object-contain"
                    />
                    {/* 左切换按钮 */}
                    {post.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : post.images.length - 1))
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all opacity-70 hover:opacity-100"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCurrentImageIndex((prev) => (prev < post.images.length - 1 ? prev + 1 : 0))
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-all opacity-70 hover:opacity-100"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                  {/* 图片计数 */}
                  {post.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/50 rounded-full text-white text-xs">
                      {currentImageIndex + 1} / {post.images.length}
                    </div>
                  )}
                </div>
              )}

              {/* 缩略图 */}
              {post.images && post.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {post.images.map((img: string, index: number) => (
                    <div
                      key={index}
                      className={`relative w-full pb-[100%] rounded-lg overflow-hidden cursor-pointer transition-all ${
                        index === currentImageIndex
                          ? 'ring-2 ring-violet-500 opacity-100'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <img
                        src={img}
                        alt={`缩略图 ${index + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 图片数量提示 */}
              {post.images && post.images.length > 0 && (
                <div className="mt-3 text-center text-sm text-slate-500">
                  共 {post.images.length} 张图片，点击主图查看大图，左右箭头切换图片
                </div>
              )}
            </div>

            {/* 右侧 - 详情区域 */}
            <div className="lg:w-1/2 p-6">
              {/* 作者操作按钮（仅作者可见） */}
              {isAuthor && (
                <div className="flex gap-2 mb-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <span className="text-violet-400 text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    这是您发布的作品
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-lg text-sm transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      编辑
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      删除
                    </button>
                  </div>
                </div>
              )}

              {/* 标题 */}
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-xs px-3 py-1 rounded-full bg-gradient-to-r ${post.sectionColor} text-white`}>
                  {post.sectionIcon} {post.section}
                </span>
                <h1 className="text-2xl font-bold text-white">{post.title}</h1>
              </div>

              {/* 简要信息 */}
              <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-white/10">
                {/* 实时头像 */}
                <span className="text-sm text-white/50 flex items-center gap-2">
                  {authorAvatar ? (
                    <img 
                      src={authorAvatar} 
                      alt={post.author}
                      className="w-6 h-6 rounded-full object-cover ring-2 ring-violet-500/50"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-xs text-white">
                      {post.author.charAt(0)}
                    </span>
                  )}
                  {post.author}
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    在线
                  </span>
                </span>
                <span className="text-sm text-white/50 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.createdAt}
                </span>
                {/* 实时浏览量 */}
                <span className="text-sm text-cyan-400 flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span className="font-mono">{realTimeViews.toLocaleString()}</span> 浏览
                </span>
              </div>

              {/* 详细信息卡片 */}
              <div className="space-y-3 mb-6">
                {post.category && cosCategories[post.category] && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-violet-400 font-medium w-20">作品类别</span>
                    <span className="text-white">{cosCategories[post.category]}</span>
                  </div>
                )}
                {post.price !== undefined && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-red-400 font-medium w-20">价格</span>
                    <span className="text-xl font-bold text-red-400">¥{post.price}</span>
                  </div>
                )}
                {post.condition && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-emerald-400 font-medium w-20">新旧程度</span>
                    <span className="text-sm px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded">
                      {post.condition}
                    </span>
                  </div>
                )}
                {post.priceRange && (
                  <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-cyan-400 font-medium w-20">价格区间</span>
                    <span className="text-xl font-bold text-cyan-400">{post.priceRange}</span>
                  </div>
                )}
                {(post.qq || post.wechat) && (
                  <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-slate-800/50 rounded-lg">
                    {post.qq && (
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-medium w-14">QQ</span>
                        <span className="text-slate-300">{post.qq}</span>
                      </div>
                    )}
                    {post.wechat && (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-medium w-14">微信</span>
                        <span className="text-slate-300">{post.wechat}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 正文 */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  作品介绍
                </h3>
                <div className="p-4 bg-slate-800/30 rounded-xl max-h-48 overflow-y-auto">
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {post.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 评论区 */}
        <CommentSection workId={post.id} workTitle={post.title} />
      </div>

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-100 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">编辑内容</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            {postType === 'cos' && rawData && (
              <CosEditForm
                work={rawData}
                onSave={handleEditSave}
                onCancel={() => setShowEditModal(false)}
              />
            )}
            {postType === 'service' && rawData && (
              <ServiceEditForm
                service={rawData}
                onSave={handleEditSave}
                onCancel={() => setShowEditModal(false)}
              />
            )}
            {postType === 'trading' && rawData && (
              <TradingEditForm
                product={rawData}
                onSave={handleEditSave}
                onCancel={() => setShowEditModal(false)}
              />
            )}
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={post.title}
      />

      {/* 编辑成功弹窗 */}
      <EditSuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          navigate(-1);
        }}
      />
    </div>
  );
}
