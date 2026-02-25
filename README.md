# ToolBox-Web Frontend

基于 **Next.js 16.1.6** 构建的极简工具箱前端。

## 🛠 技术栈
- **框架**: Next.js 16.1.6 (Turbopack)
- **UI 组件**: Ant Design 6.0
- **字体**: Inter (Google Fonts)
- **图标**: Lucide React + Ant Design Icons
- **样式**: Styled-components & Ant Design ConfigProvider
- **类型**: TypeScript

## 🏗 项目架构
项目采用模块化设计，所有工具均位于 `src/app/tools/` 目录下：
- `src/app/page.tsx`: 工具中心入口。
- `src/app/tools/convert/`: 文档转换工具模块。

## ☁️ 多平台部署支持

项目已针对主流边缘计算平台进行优化，支持代理请求以隐藏后端。

### 1. 腾讯云 EdgeOne Pages / Cloudflare Pages
- **框架预设**: 选择 `Next.js`。
- **构建命令**: `npm run build`。
- **输出目录**: `.next` (或自动检测)。
- **环境变量**: 在平台控制台设置 `BACKEND_API_URL`。
- **优势**: 使用边缘运行时 (`edge`)，全球加速。

### 2. Netlify Pages
- 已内置 `netlify.toml`。
- 直接连接 GitHub 仓库即可。
- 在 `Site settings` -> `Environment variables` 中设置 `BACKEND_API_URL`。

### 3. Vercel
- 默认支持，自动识别。

## ⚙️ 环境配置 (关键)
为了使前端能够与后端 API 通信，且不暴露后端地址，必须在 `Frontend` 根目录下创建 `.env.local` 文件：

```bash
# 示例配置
BACKEND_API_URL=http://your-backend-ip:7860/api
# (可选) 直连下载加速，解决 CDN 代理限速问题
NEXT_PUBLIC_DIRECT_API_URL=http://your-backend-ip:7860/api
```

- **BACKEND_API_URL**: 后端 API 的真实路径（仅服务端可见，用于代理请求）。
- **NEXT_PUBLIC_DIRECT_API_URL**: 前端直连后端的地址。配置后，下载请求将绕过代理直接访问后端，极大提升下载速度。若不配置，默认回退到代理路径。
- **安全保障**: 客户端（浏览器）现在只能看到 `/api/proxy/...`，无法获知真实 IP。
- **日志**: 所有通过代理的错误都会记录在 Vercel / 服务端日志中。

## 🚀 本地开发

1. **安装依赖**:
   ```bash
   npm install
   ```

2. **启动开发服务器**:
   ```bash
   npm run dev
   ```

3. **生产构建**:
   ```bash
   npm run build
   npm start
   ```

## 📱 设计规范
- **极简主义**: 去除多余装饰，聚焦功能实现。
- **移动端优先**: 所有工具必须通过 `antd-style` 的 `useResponsive` 或 AntD `Grid` 实现完美的移动端适配。
- **高性能**: 统一使用字体平滑和 Inter 字体，确保极致的阅读与操作体验。

---
Created by **Jyf0214**
