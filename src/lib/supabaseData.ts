import { supabase } from './supabase'
import type { User } from './auth'

// ============================================================
// 类型定义（与 Supabase 表结构对应）
// ============================================================

export interface Post {
  id: string
  user_id: string
  title: string
  content: string
  section: 'anime' | 'manga' | 'cos' | 'discussion'
  images?: string[]
  views: number
  likes: number
  comments_count: number
  created_at: string
  // 关联数据（JOIN 查询）
  author?: User
}

export interface Convention {
  id: string
  user_id: string
  title: string
  description: string
  date: string
  end_date?: string
  location: string
  images?: string[]
  link?: string
  views: number
  likes: number
  is_featured: boolean
  is_hot: boolean
  status: 'approved' | 'pending'
  created_at: string
  // 关联数据
  author?: User
}

export interface CosWork {
  id: string
  user_id: string
  title: string
  description: string
  images: string[]
  tags?: string[]
  views: number
  likes: number
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface Service {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  images?: string[]
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface Product {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  images?: string[]
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface Comment {
  id: string
  user_id: string
  target_id: string  // 帖子ID 或 COS作品ID
  target_type: 'post' | 'cos_work'
  content: string
  created_at: string
  author?: User
}

export interface Like {
  id: string
  user_id: string
  target_id: string
  target_type: 'post' | 'convention' | 'cos_work' | 'service' | 'product'
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string  // 关注者
  following_id: string  // 被关注者
  created_at: string
}

// ============================================================
// 帖子 (Posts)
// ============================================================

export const postsApi = {
  // 获取所有帖子
  async getAll(section?: string): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (section) {
      query = query.eq('section', section)
    }

    const { data, error } = await query
    if (error) {
      console.error('Get posts error:', error)
      return []
    }
    return data || []
  },

  // 根据 ID 获取帖子
  async getById(id: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Get post error:', error)
      return null
    }
    return data
  },

  // 创建帖子
  async create(post: Omit<Post, 'id' | 'views' | 'likes' | 'comments_count' | 'created_at'>): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...post,
        views: 0,
        likes: 0,
        comments_count: 0,
      })
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create post error:', error)
      return null
    }
    return data
  },

  // 更新帖子
  async update(id: string, updates: Partial<Post>): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update post error:', error)
      return null
    }
    return data
  },

  // 删除帖子
  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete post error:', error)
      return false
    }
    return true
  },

  // 增加浏览量
  async incrementViews(id: string): Promise<void> {
    const { data } = await supabase
      .from('posts')
      .select('views')
      .eq('id', id)
      .single()

    if (data) {
      await supabase
        .from('posts')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id)
    }
  },

  // 切换点赞
  async toggleLike(postId: string, userId: string): Promise<boolean> {
    // 检查是否已点赞
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', postId)
      .eq('target_type', 'post')
      .single()

    if (data) {
      // 已点赞，取消
      await supabase
        .from('likes')
        .delete()
        .eq('id', data.id)

      // 减少点赞数
      const { data: post } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single()

      if (post) {
        await supabase
          .from('posts')
          .update({ likes: Math.max(0, (post.likes || 1) - 1) })
          .eq('id', postId)
      }
      return false
    } else {
      // 未点赞，添加
      await supabase
        .from('likes')
        .insert({
          user_id: userId,
          target_id: postId,
          target_type: 'post',
        })

      // 增加点赞数
      const { data: post } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single()

      if (post) {
        await supabase
          .from('posts')
          .update({ likes: (post.likes || 0) + 1 })
          .eq('id', postId)
      }
      return true
    }
  },

  // 检查用户是否点赞
  async hasLiked(postId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', postId)
      .eq('target_type', 'post')
      .single()

    return !!data
  },
}

// ============================================================
// 漫展 (Conventions)
// ============================================================

export const conventionsApi = {
  async getAll(status?: string): Promise<Convention[]> {
    let query = supabase
      .from('conventions')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('Get conventions error:', error)
      return []
    }
    return data || []
  },

  async getById(id: string): Promise<Convention | null> {
    const { data, error } = await supabase
      .from('conventions')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Get convention error:', error)
      return null
    }
    return data
  },

  async create(convention: Omit<Convention, 'id' | 'views' | 'likes' | 'created_at'>): Promise<Convention | null> {
    const { data, error } = await supabase
      .from('conventions')
      .insert({
        ...convention,
        views: 0,
        likes: 0,
      })
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create convention error:', error)
      return null
    }
    return data
  },

  async update(id: string, updates: Partial<Convention>): Promise<Convention | null> {
    const { data, error } = await supabase
      .from('conventions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update convention error:', error)
      return null
    }
    return data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('conventions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete convention error:', error)
      return false
    }
    return true
  },

  async incrementViews(id: string): Promise<void> {
    const { data } = await supabase
      .from('conventions')
      .select('views')
      .eq('id', id)
      .single()

    if (data) {
      await supabase
        .from('conventions')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id)
    }
  },

  async toggleLike(conventionId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', conventionId)
      .eq('target_type', 'convention')
      .single()

    if (data) {
      await supabase.from('likes').delete().eq('id', data.id)
      const { data: item } = await supabase.from('conventions').select('likes').eq('id', conventionId).single()
      if (item) await supabase.from('conventions').update({ likes: Math.max(0, (item.likes || 1) - 1) }).eq('id', conventionId)
      return false
    } else {
      await supabase.from('likes').insert({ user_id: userId, target_id: conventionId, target_type: 'convention' })
      const { data: item } = await supabase.from('conventions').select('likes').eq('id', conventionId).single()
      if (item) await supabase.from('conventions').update({ likes: (item.likes || 0) + 1 }).eq('id', conventionId)
      return true
    }
  },
}

// ============================================================
// COS 作品 (CosWorks)
// ============================================================

export const cosWorksApi = {
  async getAll(status?: string): Promise<CosWork[]> {
    let query = supabase
      .from('cos_works')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('Get cos works error:', error)
      return []
    }
    return data || []
  },

  async getById(id: string): Promise<CosWork | null> {
    const { data, error } = await supabase
      .from('cos_works')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Get cos work error:', error)
      return null
    }
    return data
  },

  async create(work: Omit<CosWork, 'id' | 'views' | 'likes' | 'created_at'>): Promise<CosWork | null> {
    const { data, error } = await supabase
      .from('cos_works')
      .insert({
        ...work,
        views: 0,
        likes: 0,
      })
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create cos work error:', error)
      return null
    }
    return data
  },

  async update(id: string, updates: Partial<CosWork>): Promise<CosWork | null> {
    const { data, error } = await supabase
      .from('cos_works')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update cos work error:', error)
      return null
    }
    return data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('cos_works')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete cos work error:', error)
      return false
    }
    return true
  },

  async incrementViews(id: string): Promise<void> {
    const { data } = await supabase
      .from('cos_works')
      .select('views')
      .eq('id', id)
      .single()

    if (data) {
      await supabase
        .from('cos_works')
        .update({ views: (data.views || 0) + 1 })
        .eq('id', id)
    }
  },

  async toggleLike(workId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('target_id', workId)
      .eq('target_type', 'cos_work')
      .single()

    if (data) {
      await supabase.from('likes').delete().eq('id', data.id)
      const { data: item } = await supabase.from('cos_works').select('likes').eq('id', workId).single()
      if (item) await supabase.from('cos_works').update({ likes: Math.max(0, (item.likes || 1) - 1) }).eq('id', workId)
      return false
    } else {
      await supabase.from('likes').insert({ user_id: userId, target_id: workId, target_type: 'cos_work' })
      const { data: item } = await supabase.from('cos_works').select('likes').eq('id', workId).single()
      if (item) await supabase.from('cos_works').update({ likes: (item.likes || 0) + 1 }).eq('id', workId)
      return true
    }
  },
}

// ============================================================
// 服务 (Services)
// ============================================================

export const servicesApi = {
  async getAll(status?: string): Promise<Service[]> {
    let query = supabase
      .from('services')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('Get services error:', error)
      return []
    }
    return data || []
  },

  async create(service: Omit<Service, 'id' | 'created_at'>): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create service error:', error)
      return null
    }
    return data
  },

  async update(id: string, updates: Partial<Service>): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update service error:', error)
      return null
    }
    return data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete service error:', error)
      return false
    }
    return true
  },
}

// ============================================================
// 商品 (Products)
// ============================================================

export const productsApi = {
  async getAll(status?: string): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) {
      console.error('Get products error:', error)
      return []
    }
    return data || []
  },

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create product error:', error)
      return null
    }
    return data
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update product error:', error)
      return null
    }
    return data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete product error:', error)
      return false
    }
    return true
  },
}

// ============================================================
// 评论 (Comments)
// ============================================================

export const commentsApi = {
  async getByTarget(targetId: string, targetType: 'post' | 'cos_work'): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Get comments error:', error)
      return []
    }
    return data || []
  },

  async create(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment | null> {
    const { data, error } = await supabase
      .from('comments')
      .insert(comment)
      .select(`
        *,
        author:profiles(id, username, avatar_url)
      `)
      .single()

    if (error || !data) {
      console.error('Create comment error:', error)
      return null
    }

    // 更新帖子或作品的评论数
    if (comment.target_type === 'post') {
      const { data: post } = await supabase
        .from('posts')
        .select('comments_count')
        .eq('id', comment.target_id)
        .single()

      if (post) {
        await supabase
          .from('posts')
          .update({ comments_count: (post.comments_count || 0) + 1 })
          .eq('id', comment.target_id)
      }
    }

    return data
  },

  async delete(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete comment error:', error)
      return false
    }
    return true
  },
}

// ============================================================
// 关注 (Follows)
// ============================================================

export const followsApi = {
  async getFollowers(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('following_id', userId)

    if (error) {
      console.error('Get followers error:', error)
      return []
    }
    return data || []
  },

  async getFollowing(userId: string): Promise<Follow[]> {
    const { data, error } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', userId)

    if (error) {
      console.error('Get following error:', error)
      return []
    }
    return data || []
  },

  async toggleFollow(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    if (data) {
      await supabase.from('follows').delete().eq('id', data.id)
      return false
    } else {
      await supabase
        .from('follows')
        .insert({
          follower_id: followerId,
          following_id: followingId,
        })
      return true
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single()

    return !!data
  },
}
