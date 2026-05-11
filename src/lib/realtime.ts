// 实时数据同步服务 - Supabase 版本（兼容旧 API）
// 使用 Supabase 数据库 + Realtime 订阅

import { supabase } from './supabase'

// ============================================================
// 事件名称常量（兼容旧代码）
// ============================================================
export const REALTIME_EVENTS = {
  VIEWS_UPDATED: 'realtime:views:updated',
  POST_UPDATED: 'realtime:post:updated',
  POST_CREATED: 'realtime:post:created',
  POST_DELETED: 'realtime:post:deleted',
  USER_UPDATED: 'realtime:user:updated',
  COMMENT_ADDED: 'realtime:comment:added',
};

// ============================================================
// 实时浏览量数据管理（兼容旧 API）
// ============================================================
export const realtimeViews = {
  // 获取帖子的浏览数（先读缓存，后台同步 Supabase）
  getViews: (postId: string): number => {
    try {
      const saved = localStorage.getItem('postViews');
      if (saved) {
        const views = JSON.parse(saved);
        return views[postId] || 0;
      }
    } catch (e) {}
    return 0;
  },

  // 设置帖子的浏览数
  setViews: (postId: string, count: number) => {
    try {
      const saved = localStorage.getItem('postViews');
      const views = saved ? JSON.parse(saved) : {};
      views[postId] = count;
      localStorage.setItem('postViews', JSON.stringify(views));
      broadcastEvent(REALTIME_EVENTS.VIEWS_UPDATED, { postId, count });
    } catch (e) {
      console.error('Failed to set views:', e);
    }
  },

  // 增加浏览数
  incrementViews: (postId: string): number => {
    const current = realtimeViews.getViews(postId);
    const newCount = current + 1;
    realtimeViews.setViews(postId, newCount);

    // 后台同步到 Supabase
    supabase
      .from('conventions')
      .update({ view_count: newCount })
      .eq('id', postId)
      .then(() => {})
      .catch(() => {});

    return newCount;
  },
};

// ============================================================
// 用户头像数据管理（兼容旧 API）
// ============================================================
export const realtimeAvatars = {
  getAvatar: (userId: string): string | null => {
    try {
      const saved = localStorage.getItem('userAvatars');
      if (saved) {
        const avatars = JSON.parse(saved);
        return avatars[userId] || null;
      }
    } catch (e) {}
    return null;
  },

  setAvatar: (userId: string, avatarUrl: string) => {
    try {
      const saved = localStorage.getItem('userAvatars');
      const avatars = saved ? JSON.parse(saved) : {};
      avatars[userId] = avatarUrl;
      localStorage.setItem('userAvatars', JSON.stringify(avatars));
      broadcastEvent(REALTIME_EVENTS.USER_UPDATED, { userId, avatarUrl });
    } catch (e) {
      console.error('Failed to set avatar:', e);
    }
  },

  getAvatars: (userIds: string[]): Record<string, string | null> => {
    const result: Record<string, string | null> = {};
    userIds.forEach(id => {
      result[id] = realtimeAvatars.getAvatar(id);
    });
    return result;
  },
};

// ============================================================
// 帖子数据管理（兼容旧 API）
// ============================================================
export const realtimePosts = {
  getPost: (postId: string): any | null => {
    try {
      const saved = localStorage.getItem('allPosts');
      if (saved) {
        const posts = JSON.parse(saved);
        return posts.find((p: any) => p.id === postId) || null;
      }
    } catch (e) {}
    return null;
  },

  updatePost: (postId: string, updates: any) => {
    try {
      const sections = ['cosWorks', 'services', 'products'];
      sections.forEach(section => {
        const saved = localStorage.getItem(section);
        if (saved) {
          const items = JSON.parse(saved);
          const index = items.findIndex((item: any) => item.id === postId);
          if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            localStorage.setItem(section, JSON.stringify(items));
          }
        }
      });

      const allSaved = localStorage.getItem('allPosts');
      if (allSaved) {
        const posts = JSON.parse(allSaved);
        const index = posts.findIndex((p: any) => p.id === postId);
        if (index !== -1) {
          posts[index] = { ...posts[index], ...updates };
          localStorage.setItem('allPosts', JSON.stringify(posts));
        }
      }

      broadcastEvent(REALTIME_EVENTS.POST_UPDATED, { postId, updates });
      ['cosWorks', 'services', 'products'].forEach(section => {
        window.dispatchEvent(new Event(`${section}Changed`));
      });
    } catch (e) {
      console.error('Failed to update post:', e);
    }
  },
};

// ============================================================
// 事件广播和监听（兼容旧 API）
// ============================================================
export const broadcastEvent = (event: string, data: any) => {
  try {
    localStorage.setItem(`last_${event}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Broadcast event failed:', e);
  }
};

export const subscribeToEvent = (event: string, callback: (data: any) => void) => {
  const handler = (e: CustomEvent) => {
    callback(e.detail);
  };
  window.addEventListener(event, handler as EventListener);

  const storageHandler = (e: StorageEvent) => {
    if (e.key === `last_${event}` && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed.data);
      } catch (err) {}
    }
  };
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener(event, handler as EventListener);
    window.removeEventListener('storage', storageHandler);
  };
};

// ============================================================
// Supabase Realtime 订阅（新增功能）
// ============================================================

// 订阅漫展数据变化
export const subscribeToConventions = (callback: (conventions: any[]) => void) => {
  const channel = supabase
    .channel('conventions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conventions' },
      async () => {
        const { data } = await supabase
          .from('conventions')
          .select('*')
          .order('created_at', { ascending: false });
        callback(data || []);
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// 订阅 COS 作品变化
export const subscribeToCosWorks = (callback: (works: any[]) => void) => {
  const channel = supabase
    .channel('cos-works-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'cos_works' },
      async () => {
        const { data } = await supabase
          .from('cos_works')
          .select('*')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        callback(data || []);
        // 同时触发旧的事件
        window.dispatchEvent(new Event('cosWorksChanged'));
      }
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
};

// ============================================================
// Hook for React components（兼容旧 API）
// ============================================================
export const useRealtime = () => {
  return {
    subscribeToEvent,
    broadcastEvent,
    realtimeViews,
    realtimeAvatars,
    realtimePosts,
    REALTIME_EVENTS,
  };
};
