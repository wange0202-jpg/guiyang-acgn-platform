import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, KeyRound, ArrowLeft, Sparkles, AlertCircle, Check } from 'lucide-react';
import { login, register, getCurrentUser, initDefaultUsers, checkAccountExists } from '../lib/auth';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [accountChecked, setAccountChecked] = useState(false);
  const [accountExists, setAccountExists] = useState(false);

  useEffect(() => {
    // 初始化默认用户
    initDefaultUsers();
    
    // 如果已登录，跳转到首页
    if (getCurrentUser()) {
      navigate('/');
    }
  }, [navigate]);

  // 检查账号是否已存在（注册时）
  useEffect(() => {
    if (!isLogin && account.length >= 3) {
      const exists = checkAccountExists(account);
      setAccountExists(exists);
      setAccountChecked(true);
    } else {
      setAccountChecked(false);
      setAccountExists(false);
    }
  }, [account, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        if (!account.trim()) {
          setError('请输入账号');
          setLoading(false);
          return;
        }
        if (!password.trim()) {
          setError('请输入密码');
          setLoading(false);
          return;
        }
        const user = await login(account, password);
        if (user) {
          console.log('Login success:', user);
          navigate('/');
          window.location.reload(); // 刷新页面以更新状态
        } else {
          setError('账号或密码错误');
        }
      } else {
        // 注册
        if (!account.trim()) {
          setError('请输入账号');
          setLoading(false);
          return;
        }
        if (account.length < 3) {
          setError('账号至少3个字符');
          setLoading(false);
          return;
        }
        if (accountExists) {
          setError('该账号已被注册');
          setLoading(false);
          return;
        }
        if (!username.trim()) {
          setError('请输入用户名');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('密码至少6个字符');
          setLoading(false);
          return;
        }
        const result = await register(account, username, password);
        if (result.success && result.user) {
          console.log('Register success:', result.user);
          navigate('/');
          window.location.reload();
        } else {
          setError(result.error || '注册失败');
        }
      }
    } catch (err) {
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* 返回首页 */}
      <Link
        to="/"
        className="fixed top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors z-10"
      >
        <ArrowLeft className="w-5 h-5" />
        返回首页
      </Link>

      {/* 登录/注册卡片 */}
      <div className="relative w-full max-w-md">
        <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-violet-500 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {isLogin ? '欢迎回来' : '加入我们'}
            </h1>
            <p className="text-white/50 mt-2">
              {isLogin ? '登录您的账号' : '创建新账号'}
            </p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 账号 - 登录和注册都需要 */}
            <div>
              <label className="block text-white/70 text-sm mb-2">账号</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="请输入账号"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-10 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
                {/* 账号状态图标 */}
                {!isLogin && accountChecked && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {accountExists ? (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Check className="w-5 h-5 text-green-400" />
                    )}
                  </div>
                )}
              </div>
              {/* 账号提示 */}
              {!isLogin && accountChecked && (
                <p className={`text-xs mt-1 ${accountExists ? 'text-red-400' : 'text-green-400'}`}>
                  {accountExists ? '该账号已被注册' : '账号可用'}
                </p>
              )}
            </div>

            {/* 用户名 - 仅注册时显示 */}
            {!isLogin && (
              <div>
                <label className="block text-white/70 text-sm mb-2">
                  用户名 <span className="text-white/40">(展示名称)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入用户名（其他用户可见）"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">用户名用于在其他用户面前展示，无法用于登录</p>
              </div>
            )}

            <div>
              <label className="block text-white/70 text-sm mb-2">
                密码 {!isLogin && <span className="text-white/40">(请牢记，无法找回)</span>}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </div>
              {!isLogin && (
                <p className="text-amber-400 text-xs mt-1">请牢记密码，平台不提供找回密码功能</p>
              )}
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-violet-500 text-white font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? '处理中...' : (isLogin ? '登 录' : '注 册')}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setAccount('');
                setPassword('');
                setUsername('');
                setAccountChecked(false);
              }}
              className="text-pink-400 hover:text-pink-300 text-sm transition-colors"
            >
              {isLogin ? '还没有账号？立即注册' : '已有账号？立即登录'}
            </button>
          </div>

          {/* 默认账号提示 */}
          {isLogin && (
            <div className="mt-6 p-4 bg-white/5 rounded-xl">
              <p className="text-white/50 text-xs mb-2">测试账号：</p>
              <div className="space-y-1 text-xs text-white/40">
                <p>站主：admin001 / 5201314</p>
                <p>用户：user001 / 5201314</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
