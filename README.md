# 🖼️ 纯前端图片压缩工具 | Pure Frontend Image Compressor

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)

一个现代化的**纯前端**图片压缩工具，支持多种图片格式，提供批量处理、预览对比等功能。无需服务器，所有处理都在浏览器中完成，确保您的图片隐私安全。

[🚀 **在线体验**](https://shanelin233.github.io/image-compressor) | [📖 **使用文档**](#使用方法) | [🛠️ **本地部署**](#快速开始)

## 📸 界面预览

### 步骤指导界面
<div align="center">
  <img src="docs/images/step-indicator.png" alt="步骤指导" width="600">
</div>

### 文件预览和管理
<div align="center">
  <img src="docs/images/file-preview.png" alt="文件预览" width="600">
</div>

### 压缩结果展示
<div align="center">
  <img src="docs/images/compression-result.png" alt="压缩结果" width="600">
</div>

## ✨ 功能特性

### 🎯 核心功能
- **多格式支持**: JPEG、PNG、WebP、AVIF格式
- **批量处理**: 支持拖拽多文件同时压缩
- **智能压缩**: 基于Canvas API的高质量压缩算法
- **尺寸限制**: 可设置最大宽高，自动等比缩放
- **质量调节**: 0.1-1.0质量滑块，精确控制压缩率

### 🔧 高级特性
- **Web Worker优化**: 大图片处理不卡顿主线程
- **EXIF处理**: 自动去除元数据，纠正图片旋转
- **格式转换**: 支持输出格式转换
- **内存管理**: 智能内存清理，避免内存泄漏

### 📱 用户体验
- **拖拽上传**: 直观的拖拽操作
- **实时预览**: 原图vs压缩图对比
- **进度显示**: 实时压缩进度条
- **批量下载**: 单张下载或ZIP打包
- **响应式设计**: 完美适配移动端
- **主题切换**: 自动暗色/浅色主题

## 🚀 快速开始

### 在线使用
点击这里在 [StackBlitz](https://stackblitz.com/) 上直接打开使用：

```bash
# 克隆项目
git clone https://github.com/your-repo/image-compressor.git
cd image-compressor

# 安装依赖
npm install

# 编译TypeScript
npm run build

# 启动本地服务器
npm run serve
```

### 单文件使用
直接下载 `index.html` 文件，双击即可在浏览器中打开使用。

## 🎯 使用方法

1. **选择图片**: 拖拽图片到上传区域或点击"选择文件"按钮
2. **设置参数**:
   - 调整压缩质量 (建议0.6-0.8)
   - 设置最大宽高限制
   - 选择输出格式
3. **开始压缩**: 点击"开始压缩"按钮
4. **查看结果**: 每张图片显示压缩前后对比
5. **下载图片**: 单张下载或批量打包ZIP

## ⚙️ 技术实现

### 核心技术
- **TypeScript**: 类型安全的JavaScript开发
- **Canvas API**: 图片处理和压缩
- **Web Worker**: 多线程处理优化
- **File API**: 文件读取和处理
- **JSZip**: 批量打包下载

### 性能优化
- **Web Worker**: 大图片处理不阻塞UI
- **内存管理**: 及时清理URL对象
- **渐进式处理**: 批量图片逐个处理
- **错误处理**: 完善的错误提示和恢复

### 浏览器支持
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 📊 压缩效果

| 原图大小 | 压缩设置 | 压缩后大小 | 压缩率 |
|---------|---------|-----------|--------|
| 5.2MB   | 质量0.8  | 1.3MB     | 75%    |
| 2.8MB   | 质量0.7  | 0.8MB     | 71%    |
| 8.1MB   | 质量0.6  | 2.1MB     | 74%    |

## 🔧 配置选项

### 压缩质量
- 范围: 0.1 - 1.0
- 推荐: 0.6 - 0.8
- 影响: 数值越小，压缩率越高，画质越低

### 尺寸限制
- 最大宽度: 100-8000px
- 最大高度: 100-8000px
- 作用: 自动等比缩放，保持图片比例

### 输出格式
- 保持原格式
- JPEG: 通用格式，适合照片
- PNG: 支持透明度，适合图标
- WebP: 现代格式，更小体积
- AVIF: 最新格式，最佳压缩率

## 🚨 注意事项

1. **文件大小限制**: 单张图片最大50MB
2. **批量限制**: 一次最多处理20张图片
3. **内存使用**: 处理大图片时可能需要较多内存
4. **浏览器兼容性**: 建议使用现代浏览器

## 🛠️ 技术栈

- **前端框架**: 原生 JavaScript + TypeScript
- **图片处理**: Canvas API + OffscreenCanvas
- **多线程**: Web Workers
- **文件处理**: File API + Blob API
- **打包下载**: JSZip
- **样式**: CSS3 + CSS Variables
- **构建工具**: TypeScript Compiler

## 🏗️ 项目结构

```
image-compressor/
├── index.html          # 主页面
├── app.ts              # 主要逻辑 (TypeScript)
├── app.js              # 编译后的 JavaScript
├── worker.ts           # Web Worker (TypeScript)
├── worker.js           # 编译后的 Worker JavaScript
├── style.css           # 样式文件
├── package.json        # 项目配置
├── tsconfig.json       # TypeScript 配置
├── single-file.html    # 单文件版本 (可选)
└── README.md           # 项目说明
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进这个项目！

### 开发环境设置

1. **克隆项目**
   ```bash
   git clone https://github.com/shanelin233/image-compressor.git
   cd image-compressor
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **开发模式**
   ```bash
   # 编译 TypeScript
   npm run build

   # 监听文件变化 (开发模式)
   npm run dev

   # 启动本地服务器
   npm run serve
   ```

### 提交规范

- 🐛 `fix:` 修复 bug
- ✨ `feat:` 新功能
- 📝 `docs:` 文档更新
- 💄 `style:` 样式调整
- ♻️ `refactor:` 重构代码
- ⚡ `perf:` 性能优化

## 📄 许可证

本项目采用 [MIT License](LICENSE) - 详见 LICENSE 文件

## 🙏 致谢

- [JSZip](https://stuk.github.io/jszip/) - ZIP文件生成库
- [TypeScript](https://www.typescriptlang.org/) - 类型安全的 JavaScript
- [MDN Web Docs](https://developer.mozilla.org/) - Web API 文档参考

## 🌟 支持项目

如果这个项目对你有帮助，请考虑：

- ⭐ 给项目点个 Star
- 🐛 报告 Bug 或提出改进建议
- 🔀 提交 Pull Request
- 📢 分享给其他人

---

<div align="center">
  <p>用 ❤️ 制作 | Made with ❤️</p>
  <p>
    <a href="#top">回到顶部 ⬆️</a>
  </p>
</div>