# 贵阳二次元Cosponsor交流平台

> 贵阳本地最大的二次元文化交流社区

## 功能特性

### 四大专区
- **漫展专区**: 贵阳漫展信息汇总，站主发布，用户浏览
- **COS专区**: COS、汉服、洛丽塔、JK、皮套作品展示
- **服务专区**: 妆娘、毛娘、摄影师、道具师服务预约
- **交易专区**: C服、假发、道具、周边二手交易

## 技术栈

- React 18 + TypeScript
- Vite 构建工具
- Tailwind CSS 3.4
- shadcn/ui 组件库
- React Router DOM
- Lucide Icons

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 查看应用。

### 构建生产版本

```bash
npm run build
```

构建产物将在 `dist/` 目录生成。

## 项目结构

```
src/
├── components/     # React 组件
│   ├── ui/        # UI基础组件
│   └── layout/    # 布局组件
├── pages/         # 页面组件
├── types/         # TypeScript类型定义
└── lib/           # 工具函数
```

## 设计规范

详见 [SPEC.md](./SPEC.md)

## 部署说明

构建后的 `dist/` 目录可直接部署到任意静态托管服务：

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- 腾讯云COS/EdgeOne Pages

## License

MIT
