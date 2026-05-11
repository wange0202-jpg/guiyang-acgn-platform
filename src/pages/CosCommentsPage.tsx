import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Send, Clock, Check, X, Trash2, User, ArrowLeft, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar'
import { getCurrentUser, isAdmin } from '@/lib/auth'

// 评论状态
type CommentStatus = 'pending' | 'approved' | 'rejected'

// 评论数据结构
interface Comment {
  id: string
  workId: string
  workTitle: string
  authorName: string
  authorId?: string
  authorAvatar?: string
  content: string
  status: CommentStatus
  createdAt: string
  rejectedReason?: string
}

// 加载评论数据
const loadComments = (): Comment[] => {
  try {
    const saved = localStorage.getItem('cosComments')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load comments:', e)
  }
  return []
}

// 保存评论数据
const saveComments = (comments: Comment[]) => {
  try {
    localStorage.setItem('cosComments', JSON.stringify(comments))
  } catch (e) {
    // 如果存储空间不足，尝试清理旧数据
    if ((e as Error).name === 'QuotaExceededError') {
      console.warn('存储空间不足，开始清理旧评论...');
      cleanupOldComments(comments);
    } else {
      console.error('Failed to save comments:', e);
    }
  }
}

// 清理旧评论 - 保留最近的评论
const cleanupOldComments = (newComments: Comment[]) => {
  try {
    // 方案1：只保留新提交的这条评论
    if (newComments.length > 0) {
      const latestComment = newComments[0];
      localStorage.setItem('cosComments', JSON.stringify([latestComment]));
      console.log('存储空间不足，仅保存最新评论');
      alert('存储空间已满，旧数据已清理');
      return;
    }
  } catch (e) {
    console.error('清理评论失败:', e);
    try {
      localStorage.setItem('cosComments', '[]');
    } catch (e2) {
      console.error('无法清空存储:', e2);
    }
  }
}

// 加载COS作品数据（用于获取作品标题）
const loadCosWorks = (): any[] => {
  try {
    const saved = localStorage.getItem('cosWorks')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (e) {
    console.error('Failed to load cos works:', e)
  }
  return []
}

// 获取用户昵称
const getUserNickname = (): string => {
  try {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      const user = JSON.parse(saved)
      return user.username || user.nickname || '匿名用户'
    }
  } catch (e) {
    console.error('Failed to get user:', e)
  }
  return '匿名用户'
}

// 获取用户头像
const getUserAvatar = (): string | undefined => {
  try {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      const user = JSON.parse(saved)
      return user.avatar
    }
  } catch (e) {
    console.error('Failed to get user avatar:', e)
  }
  return undefined
}

export default function CosCommentsPage() {
  const [comments, setComments] = useState<Comment[]>(loadComments)
  const [cosWorks, setCosWorks] = useState<any[]>(loadCosWorks)
  const [newComment, setNewComment] = useState({ workId: '', content: '' })
  const [showPublishModal, setShowPublishModal] = useState(false)

  const currentUser = getCurrentUser()
  const userIsAdmin = isAdmin()
  const userId = currentUser?.id

  // 监听数据变化
  useEffect(() => {
    const handleStorage = () => {
      setComments(loadComments())
      setCosWorks(loadCosWorks())
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('cosWorksChanged', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('cosWorksChanged', handleStorage)
    }
  }, [])

  // 获取作品标题
  const getWorkTitle = (workId: string) => {
    const work = cosWorks.find(w => w.id === workId)
    return work?.title || '未知作品'
  }

  // 获取待审核评论数量
  const getPendingCount = () => {
    return comments.filter(c => c.status === 'pending').length
  }

  // 获取当前用户待审核评论
  const getUserPendingComments = () => {
    if (!userId) return []
    return comments.filter(c => c.authorId === userId && c.status === 'pending')
  }

  // 获取当前用户被拒绝评论
  const getUserRejectedComments = () => {
    if (!userId) return []
    return comments.filter(c => c.authorId === userId && c.status === 'rejected')
  }

  // 发布评论
  const handleSubmitComment = () => {
    if (!newComment.workId || !newComment.content.trim()) {
      alert('请选择作品并填写评论内容')
      return
    }

    const comment: Comment = {
      id: `comment${Date.now()}`,
      workId: newComment.workId,
      workTitle: getWorkTitle(newComment.workId),
      authorName: getUserNickname(),
      authorId: userId,
      authorAvatar: getUserAvatar(),
      content: newComment.content.trim(),
      status: 'pending',
      createdAt: new Date().toLocaleDateString('zh-CN'),
    }

    const updatedComments = [comment, ...comments]
    setComments(updatedComments)
    saveComments(updatedComments)
    // 触发更新事件
    window.dispatchEvent(new Event('commentsChanged'));
    setShowPublishModal(false)
    setNewComment({ workId: '', content: '' })
  }

  // 审核操作 - 批准
  const handleApprove = (commentId: string) => {
    const updated = comments.map(c => c.id === commentId ? { ...c, status: 'approved' } : c)
    setComments(updated)
    saveComments(updated)
    window.dispatchEvent(new Event('commentsChanged'));
  }

  // 审核操作 - 拒绝
  const handleReject = (commentId: string) => {
    const reason = prompt('请输入拒绝原因：')
    if (!reason) return
    const updated = comments.map(c => c.id === commentId ? { ...c, status: 'rejected', rejectedReason: reason } : c)
    setComments(updated)
    saveComments(updated)
    window.dispatchEvent(new Event('commentsChanged'));
  }

  // 审核操作 - 删除
  const handleDelete = (commentId: string) => {
    if (!confirm('确定要删除这条评论吗？')) return
    const updated = comments.filter(c => c.id !== commentId)
    setComments(updated)
    saveComments(updated)
    window.dispatchEvent(new Event('commentsChanged'));
  }

  // 根据角色过滤显示的评论
  const getVisibleComments = () => {
    if (userIsAdmin) {
      // 管理员看到所有已审核通过的评论
      return comments.filter(c => c.status === 'approved')
    }
    return comments.filter(c => c.status === 'approved')
  }

  const visibleComments = getVisibleComments()
  const approvedWorks = cosWorks.filter(w => w.status === 'approved')

  return (
    <div className="min-h-screen pt-24 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/cos" 
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">COS评论区</h1>
            <p className="text-slate-400">分享你对COS作品的感受和想法</p>
          </div>
        </div>

        {/* 发布评论按钮 */}
        {currentUser && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="w-full mb-6 p-4 bg-violet-500/20 border border-violet-500/30 rounded-xl text-violet-400 hover:bg-violet-500/30 transition-colors flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            发布评论
          </button>
        )}

        {/* 用户待审核评论提示 */}
        {getUserPendingComments().length > 0 && !userIsAdmin && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-amber-400 font-medium">您有 {getUserPendingComments().length} 条评论正在审核中</p>
                <p className="text-slate-400 text-sm">审核通过后其他用户才能看到</p>
              </div>
            </div>
          </div>
        )}

        {/* 用户被拒绝的评论 */}
        {getUserRejectedComments().length > 0 && !userIsAdmin && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-red-400 font-medium">您的 {getUserRejectedComments().length} 条评论未通过审核</p>
            </div>
            <div className="space-y-2 ml-8">
              {getUserRejectedComments().map(comment => (
                <div key={comment.id} className="text-sm text-slate-400">
                  <span className="text-white">{comment.workTitle}</span>
                  <span className="text-slate-500 ml-2">"{comment.content}"</span>
                  {comment.rejectedReason && <span className="text-red-400"> - 原因：{comment.rejectedReason}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评论区列表 */}
        <div className="space-y-4">
          {visibleComments.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">暂无评论，快来发表第一条评论吧</p>
            </div>
          ) : (
            visibleComments.map(comment => (
              <div key={comment.id} className="bg-dark-50 rounded-xl p-4 border border-white/5">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={comment.authorAvatar} />
                    <AvatarFallback>
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{comment.authorName}</span>
                      <span className="text-slate-500 text-sm">评论了</span>
                      <Link to={`/cos/${comment.workId}`} className="text-violet-400 hover:underline">
                        {comment.workTitle}
                      </Link>
                    </div>
                    <p className="text-slate-300 mb-2">{comment.content}</p>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{comment.createdAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 管理员审核面板 */}
        {userIsAdmin && getPendingCount() > 0 && (
          <div className="mt-8 pt-8 border-t border-white/10">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              待审核评论 ({getPendingCount()})
            </h2>
            <div className="space-y-4">
              {comments.filter(c => c.status === 'pending').map(comment => (
                <div key={comment.id} className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={comment.authorAvatar} />
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-medium">{comment.authorName}</span>
                        <span className="text-slate-500 text-sm">评论了</span>
                        <Link to={`/cos/${comment.workId}`} className="text-violet-400 hover:underline">
                          {comment.workTitle}
                        </Link>
                      </div>
                      <p className="text-slate-300 mb-3">{comment.content}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(comment.id)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                          通过
                        </button>
                        <button
                          onClick={() => handleReject(comment.id)}
                          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                        >
                          <X className="w-4 h-4" />
                          拒绝
                        </button>
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="px-4 py-2 bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 发布评论弹窗 */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-100 rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">发布评论</h3>
              <button 
                onClick={() => setShowPublishModal(false)} 
                className="text-slate-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-2">选择作品 *</label>
                <select
                  value={newComment.workId}
                  onChange={(e) => setNewComment({...newComment, workId: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2"
                >
                  <option value="">请选择作品</option>
                  {approvedWorks.map(work => (
                    <option key={work.id} value={work.id}>{work.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm mb-2">评论内容 *</label>
                <textarea
                  value={newComment.content}
                  onChange={(e) => setNewComment({...newComment, content: e.target.value})}
                  className="w-full bg-slate-800 text-white border border-white/20 rounded-lg px-3 py-2 h-32 resize-none"
                  placeholder="分享你对这部作品的感受..."
                />
              </div>

              {/* 审核提示 */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-400 mt-0.5" />
                  <p className="text-amber-400 text-sm">
                    评论需站主审核，审核通过后其他用户才能看到
                  </p>
                </div>
              </div>

              <button 
                onClick={handleSubmitComment} 
                className="w-full py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                提交评论
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
