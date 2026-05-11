import { supabase } from './supabase'
import type { User } from './auth';

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
  author?: User
}

export interface Convention {
  id: string
  creator_id: string
  title: string
  description: string
  start_date: string
  end_date: string
  location: string
  images?: string[]
  is_hot: boolean
  view_count: number
  likes: number
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface CosWork {
  id: string
  author_id: string
  title: string
  description: string
  images: string[]
  category: string
  view_count: number
  likes: number
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface Service {
  id: string
  provider_id: string
  title: string
  description: string
  price_range: string
  images?: string[]
  status: 'approved' | 'pending'
  created_at: string
  author?: User
}

export interface Product {
  id: string
  seller_id: string
  title: string
  description: string
  price: number
  condition: string
  images?: string[]
  shipping: string
  view_count: number
  status: 'approved' | 'pending' | 'sold'
  created_at: string
  author?: User
}

// ============================================================
// 辅助函数：获取作者信息
// ============================================================
async function fetchAuthor(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .eq('id', userId)
    .single()
  
  if (error || !data) return null
  return {
    id: data.id,
    account: data.username,
    username: data.username,
    avatar: data.avatar_url || undefined,
    role: 'user',
    createdAt: '',
  }
}

// ============================================================
// 帖子 (Posts)
// ============================================================

export const postsApi = {
  async getAll(section?: string): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (section) {
      query = query.eq('section', section)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Get posts error:', error)
      return []
    }
    
    // 获取作者信息
    const postsWithAuthor = await Promise.all(
      (data || []).map(async (item: any) => {
        const author = await fetchAuthor(item.user_id)
        return {
          ...item,
          views: item.views || 0,
          likes: item.likes || 0,
          comments_count: item.comments_count || 0,
          author,
        }
      })
    )
    return postsWithAuthor
  },

  async getById(id: string): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !data) {
      console.error('Get post error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.user_id)
    return {
      ...data,
      views: data.views || 0,
      likes: data.likes || 0,
      comments_count: data.comments_count || 0,
      author,
    }
  },

  async create(post: any): Promise<Post | null> {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        ...post,
        views: 0,
        likes: 0,
        comments_count: 0,
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Create post error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.user_id)
    return {
      ...data,
      views: data.views || 0,
      likes: data.likes || 0,
      comments_count: data.comments_count || 0,
      author,
    }
  },

  async update(id: string, updates: any): Promise<Post | null> {
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
}

// ============================================================
// 漫展 (Conventions)
// ============================================================

export const conventionsApi = {
  async getAll(status?: string): Promise<Convention[]> {
    let query = supabase
      .from('conventions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Get conventions error:', error)
      return []
    }
    
    const conventionsWithAuthor = await Promise.all(
      (data || []).map(async (item: any) => {
        const author = await fetchAuthor(item.creator_id)
        return {
          ...item,
          views: item.view_count || 0,
          likes: item.likes || 0,
          is_featured: item.is_hot || false,
          date: item.start_date,
          end_date: item.end_date,
          author,
        }
      })
    )
    return conventionsWithAuthor
  },

  async getById(id: string): Promise<Convention | null> {
    const { data, error } = await supabase
      .from('conventions')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !data) {
      console.error('Get convention error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.creator_id)
    return {
      ...data,
      views: data.view_count || 0,
      likes: data.likes || 0,
      is_featured: data.is_hot || false,
      date: data.start_date,
      end_date: data.end_date,
      author,
    }
  },

  async create(convention: any): Promise<Convention | null> {
    const { data, error } = await supabase
      .from('conventions')
      .insert({
        ...convention,
        view_count: 0,
        likes: 0,
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Create convention error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.creator_id)
    return {
      ...data,
      views: data.view_count || 0,
      likes: data.likes || 0,
      is_featured: data.is_hot || false,
      date: data.start_date,
      end_date: data.end_date,
      author,
    }
  },

  async update(id: string, updates: any): Promise<Convention | null> {
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
      .select('view_count')
      .eq('id', id)
      .single()
    
    if (data) {
      await supabase
        .from('conventions')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id)
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
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Get cos works error:', error)
      return []
    }
    
    const worksWithAuthor = await Promise.all(
      (data || []).map(async (item: any) => {
        const author = await fetchAuthor(item.author_id)
        return {
          ...item,
          views: item.view_count || 0,
          likes: item.likes || 0,
          tags: item.category ? [item.category] : [],
          author,
        }
      })
    )
    return worksWithAuthor
  },

  async getById(id: string): Promise<CosWork | null> {
    const { data, error } = await supabase
      .from('cos_works')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error || !data) {
      console.error('Get cos work error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.author_id)
    return {
      ...data,
      views: data.view_count || 0,
      likes: data.likes || 0,
      tags: data.category ? [data.category] : [],
      author,
    }
  },

  async create(work: any): Promise<CosWork | null> {
    const { data, error } = await supabase
      .from('cos_works')
      .insert({
        ...work,
        view_count: 0,
        likes: 0,
      })
      .select()
      .single()
    
    if (error || !data) {
      console.error('Create cos work error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.author_id)
    return {
      ...data,
      views: data.view_count || 0,
      likes: data.likes || 0,
      tags: data.category ? [data.category] : [],
      author,
    }
  },

  async update(id: string, updates: any): Promise<CosWork | null> {
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
      .select('view_count')
      .eq('id', id)
      .single()
    
    if (data) {
      await supabase
        .from('cos_works')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id)
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
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Get services error:', error)
      return []
    }
    
    const servicesWithAuthor = await Promise.all(
      (data || []).map(async (item: any) => {
        const author = await fetchAuthor(item.provider_id)
        return {
          ...item,
          price: item.price_range || 0,
          author,
        }
      })
    )
    return servicesWithAuthor
  },

  async create(service: any): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Create service error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.provider_id)
    return {
      ...data,
      price: data.price_range || 0,
      author,
    }
  },

  async update(id: string, updates: any): Promise<Service | null> {
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
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }
    
    const { data, error } = await query
    if (error) {
      console.error('Get products error:', error)
      return []
    }
    
    const productsWithAuthor = await Promise.all(
      (data || []).map(async (item: any) => {
        const author = await fetchAuthor(item.seller_id)
        return {
          ...item,
          views: item.view_count || 0,
          author,
        }
      })
    )
    return productsWithAuthor
  },

  async create(product: any): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single()
    
    if (error || !data) {
      console.error('Create product error:', error)
      return null
    }
    
    const author = await fetchAuthor(data.seller_id)
    return {
      ...data,
      views: data.view_count || 0,
      author,
    }
  },

  async update(id: string, updates: any): Promise<Product | null> {
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
