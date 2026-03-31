# Color City 色彩之城 🎨

色彩之城是一个以探索和收集**中国传统颜色**为主题的全栈 Web 应用。通过结合图像识别技术与现代 Web 框架，让用户在日常生活中发现、打卡并收集属于自己的传统色。

## ✨ 核心功能

- 🎲 **每日抽色**：每天随机抽取专属的中国传统色（支持排除已打卡颜色），生成绝美色卡并可一键分享给好友。
- 📸 **识色打卡**：支持批量上传照片，后端通过 OpenCV 智能分析照片像素，识别是否包含目标颜色。匹配度达标即可成功打卡！
- 🖼️ **色彩图鉴**：浏览 700+ 种中国传统颜色，支持全局搜索。优先展示已打卡的颜色，并在详情页生成你的专属打卡照片墙。
- 🔐 **用户系统**：完整的注册、登录及 JWT 鉴权体系，每个人的打卡记录与颜色推荐均独立存储。
- 🌐 **一键分享**：生成精美的免登录分享页，让朋友感受传统色彩的魅力。

---

## 🛠️ 技术栈

### 后端 (Backend)
- **框架**: FastAPI (Python)
- **数据库**: SQLite + SQLAlchemy (WAL 并发模式)
- **图像处理**: OpenCV (opencv-python-headless) + NumPy 矩阵向量化运算
- **认证**: JWT (python-jose) + Bcrypt 密码加密

### 前端 (Frontend)
- **框架**: Next.js 14 (React) + TypeScript
- **样式**: Tailwind CSS
- **组件库**: Radix UI + Lucide Icons
- **交互设计**: Framer Motion 风格的平滑过渡与动画

---

## 🚀 快速开始

### 1. 后端环境配置
要求: Python 3.9+
```bash
# 1. 创建并激活虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 2. 安装依赖
pip install fastapi uvicorn sqlalchemy pydantic python-multipart "passlib[bcrypt]" "python-jose[cryptography]" opencv-python-headless numpy requests "bcrypt==4.0.1"

# 3. 初始化数据库 (解析 color_chinese.md 导入 759 种颜色)
python scripts/init_db.py

# 4. 启动后端服务 (默认运行在 8000 端口，生产环境部署脚本配置为 5120)
uvicorn main:app --reload --port 8000
```

### 2. 前端环境配置
要求: Node.js 18+ & pnpm
```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器 (默认运行在 3000 端口)
pnpm run dev
```

---

## 📦 生产环境部署 (Systemd)

项目内置了针对 Linux (Systemd) 系统的便捷管理脚本 `manage.sh`，可一键将前后端注册为系统后台服务。

1. **构建前端代码**：
   ```bash
   cd frontend
   pnpm run build
   cd ..
   ```
2. **安装并启动服务**：
   ```bash
   # 必须使用 root 或 sudo 权限
   sudo ./manage.sh install   # 安装并设置开机自启
   sudo ./manage.sh start     # 启动前后端服务
   ```
   *此时，后端将运行在 `5120` 端口，前端运行在 `5125` 端口。*

3. **管理指令**：
   ```bash
   sudo ./manage.sh stop         # 停止服务
   sudo ./manage.sh restart      # 重启服务
   sudo ./manage.sh status       # 查看服务状态
   sudo ./manage.sh log-backend  # 实时查看后端日志
   sudo ./manage.sh log-frontend # 实时查看前端日志
   ```

---

## 📁 目录结构

```text
color-city/
├── data/                  # 数据库相关
│   ├── database.py        # SQLAlchemy 配置与连接
│   └── model.py           # 数据表模型 (User, Color, UserPhoto, DailyRecommendation)
├── frontend/              # Next.js 前端项目
│   ├── app/               # 页面路由 (首页, /colors, /detect, /draw, /share, 等)
│   ├── components/        # 可复用 UI 组件 (ColorCard, BottomNav, Switch 等)
│   └── lib/               # 核心逻辑 (api.ts: 请求拦截与 API 封装)
├── routers/               # FastAPI 路由模块
│   ├── colors.py          # 颜色查询、推荐、抽奖及照片打卡接口
│   └── users.py           # 用户注册、登录及信息管理接口
├── scripts/               # 脚本工具
│   └── init_db.py         # 数据库初始化与 Markdown 解析脚本
├── service/               # Systemd 部署配置
│   ├── color-city-backend.service
│   └── color-city-frontend.service
├── utils/                 # 后端工具函数
│   ├── auth.py            # JWT 签发与验证
│   └── image_processing.py# OpenCV 图像颜色相似度识别算法
├── main.py                # FastAPI 主入口与 CORS/静态文件挂载
├── manage.sh              # 生产环境一键部署与管理脚本
├── schemas.py             # Pydantic 数据验证模型
└── color_chinese.md       # 中国传统颜色原始数据字典
```

## 🧠 核心算法：颜色识别原理

后端在判断上传照片是否包含指定颜色时，并未采用耗时的逐像素遍历，而是利用了 **NumPy 的矩阵向量化运算**：
1. 将照片解码为 RGB 三维矩阵，将目标颜色的 Hex 转换为 RGB 坐标点。
2. 利用广播机制，一次性计算全图所有像素点与目标颜色点在 RGB 三维空间中的 **欧氏距离 (Euclidean Distance)**。
3. 配合容差阈值 (`tolerance`) 过滤出匹配的像素，最终通过计算匹配像素的**百分比**（忽略绝对分辨率差异）来判断打卡是否成功。这种方式能将千万级像素的高清大图检测时间压缩至毫秒级。

---
*Created with ❤️ by Color City Team*