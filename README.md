<div align="center">

# ✦ Cyber Oracle ✦

**一个基于手势控制的 3D 占卜体验应用，由 AI 驱动**

[![Vite](https://img.shields.io/badge/Vite-6.4.1-646cff?logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Hand%20Landmarker-00a8e8)](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker)
[![License](https://img.shields.io/badge/License-MIT-ffffff)](LICENSE)

---

![演示动图](public/demo.gif)

**在线体验：** [https://hzsgesture-seven.vercel.app](https://hzsgesture-seven.vercel.app)

---

## ✨ 特性

| 特性 | 描述 |
|------|------|
| 🎯 **实时手势追踪** | 使用 MediaPipe HandLandmarker 实现 30+ FPS 手势识别 |
| 👋 **手势控制** | 摊开手掌浏览卡片，握拳揭示答案 |
| 🔒 **隐私优先** | 所有推理在浏览器本地运行——摄像头数据不会上传 |
| 📱 **跨平台兼容** | 支持任何现代浏览器和设备 |
| 🎮 **沉浸式 3D 界面** | CSS3D 变换 + 粒子特效 + 流畅动画 |
| 🤖 **AI 集成** | 已集成 Gemini API，支持智能问答 |

---

## 🚀 快速开始

### 环境要求

- **Node.js**: v18.0.0 或更高版本
- **操作系统**: Windows / macOS / Linux
- **浏览器**: Chrome/Edge (推荐) / Firefox / Safari (需 HTTPS)
- **硬件**: 需配备摄像头

### 1. 克隆项目

```bash
# 克隆仓库
git clone https://github.com/yourusername/cyber-oracle.git
cd cyber-oracle
```

### 2. 安装依赖

```bash
# 安装项目依赖
npm install
```

### 3. 配置环境变量（可选）

若需启用 AI 问答功能，需配置 Gemini API Key：

```bash
# 创建环境变量文件
cp .env.local.example .env.local

# 编辑 .env.local，添加：
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. 启动开发服务器

```bash
# 启动开发服务器
npm run dev
```

### 5. 访问应用

在浏览器中打开 [http://localhost:3000](http://localhost:3000)

> ⚠️ **注意**: 首次访问需允许摄像头权限以启用手势识别功能

---

## 📦 依赖说明

### 核心依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| [Vite](https://vitejs.dev/) | ^6.2.0 | 构建工具与开发服务器 |
| [TypeScript](https://www.typescriptlang.org/) | ~5.8.2 | 类型安全的 JavaScript 超集 |

### 运行时依赖（CDN 加载）

| 依赖 | 用途 |
|------|------|
| [@mediapipe/tasks-vision](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) | 手部关键点检测与手势识别 |
| [Gemini API](https://ai.google.dev/gemini-api) | AI 问答功能（可选） |

### 安装命令

```bash
npm install
```

---

## 🏗️ 项目架构

```
cyber-oracle/
├── index.html          # 入口文件 + 样式定义
├── index.js            # 核心逻辑（手势识别、渲染、粒子）
├── index.tsx           # 旧版入口（已废弃）
├── vite.config.ts      # Vite 配置
├── .env.local          # 环境变量
└── public/             # 静态资源
    └── demo.gif        # ← 在此放置你的演示动图
```

### 核心模块（位于 `index.js`）

| 模块 | 位置 | 职责 |
|------|------|------|
| **手势识别** | `init()` → `predictWebcam()` → `processLandmarks()` | MediaPipe 集成、关键点提取、手势分类 |
| **3D 轮播** | `renderCarousel()` | CSS3D 卡片布局、滚动物理效果、呼吸动画 |
| **粒子系统** | `initParticles()` → `renderParticles()` | Canvas 背景粒子特效 |
| **状态机** | 第 26-38 行 | 手势置信度追踪、揭示/重置逻辑 |

---

## 📖 工作原理

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│   摄像头    │────▶│  MediaPipe      │────▶│  关键点      │
│   视频流    │     │  HandLandmarker │     │  提取器      │
└─────────────┘     └─────────────────┘     └──────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    处理手部关键点                            │
│  • 检测手指伸展状态（指尖 vs PIP 关节）                      │
│  • 手势分类：OPEN_PALM (≥3手指) / FIST (≤1手指)             │
│  • 随时间追踪置信度（滞后处理）                              │
└─────────────────────────────────────────────────────────────┘
                                                   │
                              ┌────────────────────┴────────────────────┐
                              ▼                                         ▼
                    ┌─────────────────┐                      ┌─────────────────┐
                    │    摊开手掌     │                      │     握拳        │
                    │   浏览模式      │                      │   揭示模式      │
                    │   滚动卡片      │                      │   翻转并展示    │
                    │                 │                      │   答案          │
                    └─────────────────┘                      └─────────────────┘
```

---

## ⚠️ 注意事项

- **需要摄像头权限**：应用需要访问摄像头以进行手势识别
- **HTTPS 环境要求**：现代浏览器要求 HTTPS 环境才能访问摄像头（`localhost` 除外）
- **建议使用 GPU**：HandLandmarker 使用 GPU 委托以获得最佳性能
- **光照条件**：在光线良好的环境下效果最佳

---

## 📝 开源协议

MIT License —— 详情请查看 [LICENSE](LICENSE)

---

<div align="center">

**用 ✨ 和手势创造**

</div>
