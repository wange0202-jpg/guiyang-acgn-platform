import React from 'react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="bg-dark-50 border-t border-white/5 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <span className="text-xl font-bold text-white">贵</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">贵阳二次元Cosponsor交流平台</h3>
                <p className="text-sm text-slate-400">贵阳本地最大的二次元文化交流社区</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              为贵阳地区的二次元爱好者提供一个交流漫展信息、分享COS作品、
              寻找专业服务和进行二手交易的综合性平台。
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">快速链接</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/convention" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  漫展专区
                </Link>
              </li>
              <li>
                <Link to="/cos" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  COS专区
                </Link>
              </li>
              <li>
                <Link to="/service" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  服务专区
                </Link>
              </li>
              <li>
                <Link to="/trading" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  交易专区
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">帮助与支持</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  关于我们
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  用户协议
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  隐私政策
                </a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-primary transition-colors text-sm">
                  联系方式
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm">
            © {new Date().getFullYear()} 贵阳二次元Cosponsor交流平台. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
