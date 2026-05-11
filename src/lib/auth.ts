import { supabase } from './supabase'

export interface User {
  id: string;
  account: string;
  username: string;
  password?: string; // 仅本地兼容，Supabase 不存储密码
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
}

// ========== 同步读取（兼容旧代码）==========

// 从 localStorage 缓存同步获取当前用户
export const getCurrentUser = (): User | null => {
  try {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to get current user:', e);
  }
  return null;
};

// 检查用户是否已登录（同步）
export const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};

// 检查是否为管理员（同步）
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user !== null && user.role === 'admin';
};

// 根据用户名获取用户（同步，从缓存）
export const getUserByUsername = (username: string): User | null => {
  try {
    const saved = localStorage.getItem('usernames_map');
    if (saved) {
      const map = JSON.parse(saved);
      const userId = map[username];
      if (userId) {
        return getUserById(userId);
      }
    }
  } catch (e) {}
  return null;
};

// 根据用户ID获取用户（同步，从缓存）
export const getUserById = (userId: string): User | null => {
  try {
    const saved = localStorage.getItem('users_cache');
    if (saved) {
      const users = JSON.parse(saved);
      return users[userId] || null;
    }
  } catch (e) {}
  return null;
};

// ========== 异步操作（Supabase）==========

// 初始化：从 Supabase 恢复登录状态
export const initAuth = async (): Promise<User | null> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      localStorage.removeItem('currentUser');
      return null;
    }

    // 获取用户资料
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    const userObj: User = {
      id: profile.id,
      account: user.email || profile.username,
      username: profile.username,
      avatar: profile.avatar_url || undefined,
      role: profile.role,
      createdAt: profile.created_at,
    };

    localStorage.setItem('currentUser', JSON.stringify(userObj));
    return userObj;
  } catch (e) {
    console.error('Init auth failed:', e);
    return null;
  }
};

// 登录
export const login = async (account: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: account,
      password,
    });

    if (error || !data.user) {
      console.error('Login failed:', error?.message);
      return null;
    }

    // 获取用户资料
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (!profile) return null;

    const userObj: User = {
      id: profile.id,
      account: data.user.email || profile.username,
      username: profile.username,
      avatar: profile.avatar_url || undefined,
      role: profile.role,
      createdAt: profile.created_at,
    };

    localStorage.setItem('currentUser', JSON.stringify(userObj));
    return userObj;
  } catch (e) {
    console.error('Login error:', e);
    return null;
  }
};

// 注册
export const register = async (
  email: string,
  username: string,
  password: string,
  role: 'user' | 'admin' = 'user'
): Promise<{ success: boolean; error?: string; user?: User }> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: '注册失败，请重试' };
    }

    // 创建用户资料
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        username,
        role,
        avatar_url: '',
      });

    if (profileError) {
      return { success: false, error: '用户资料创建失败：' + profileError.message };
    }

    const userObj: User = {
      id: data.user.id,
      account: email,
      username,
      role,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem('currentUser', JSON.stringify(userObj));
    return { success: true, user: userObj };
  } catch (e: any) {
    return { success: false, error: e.message || '注册失败' };
  }
};

// 退出登录
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
  localStorage.removeItem('currentUser');
};

// 更新用户资料
export const updateUserProfile = async (
  userId: string,
  updates: { username?: string; avatar?: string }
): Promise<User | null> => {
  try {
    const updateData: any = {};
    if (updates.username !== undefined) updateData.username = updates.username;
    if (updates.avatar !== undefined) updateData.avatar_url = updates.avatar;

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (error) {
      console.error('Update profile failed:', error);
      return null;
    }

    // 重新获取更新后的用户
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    const { data: { user } } = await supabase.auth.getUser();

    const updatedUser: User = {
      id: profile.id,
      account: user?.email || profile.username,
      username: profile.username,
      avatar: profile.avatar_url || undefined,
      role: profile.role,
      createdAt: profile.created_at,
    };

    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    return updatedUser;
  } catch (e) {
    console.error('Update profile error:', e);
    return null;
  }
};

// 检查账号是否已存在（用于注册时实时验证，同步版本）
// Supabase 不支持同步检查邮箱是否存在，故始终返回 false
// 重复注册将由 Supabase signUp 返回错误来处理
export const checkAccountExists = (email: string): boolean => {
  return false;
};

// 获取所有用户（管理员功能，从 Supabase 获取）
export const getUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(p => ({
      id: p.id,
      account: p.username,
      username: p.username,
      avatar: p.avatar_url || undefined,
      role: p.role,
      createdAt: p.created_at,
    }));
  } catch (e) {
    return [];
  }
};

// 删除用户（管理员功能）
export const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    return !error;
  } catch (e) {
    return false;
  }
};

// 获取普通用户列表
export const getNormalUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map(p => ({
      id: p.id,
      account: p.username,
      username: p.username,
      avatar: p.avatar_url || undefined,
      role: p.role,
      createdAt: p.created_at,
    }));
  } catch (e) {
    return [];
  }
};

// 初始化默认用户（兼容旧代码，Supabase 中不需要）
export const initDefaultUsers = () => {
  // Supabase 模式下不需要初始化默认用户
  // 但保留此函数以避免页面报错
  console.log('initDefaultUsers: Supabase mode, skipping...');
};

// 格式化日期
export const formatDateTime = (dateStr: string): string => {
  if (dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  return dateStr;
};
