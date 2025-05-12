# 语音转文字工具

![版本](https://img.shields.io/badge/版本-1.0.0-blue)
![许可证](https://img.shields.io/badge/许可证-MIT-green)

一款高效、易用的语音转文字工具，支持多种音频格式，并提供灵活的输出模板和导出选项。

## 功能特点

- **多格式支持**：支持MP3、WAV、M4A、FLAC等常见音频格式
- **简洁界面**：直观的拖放上传界面，友好的用户体验
- **实时进度**：清晰展示文件上传和转录进度
- **多样化输出**：支持不同输出模板，如纯文本、带时间戳、说话人分离等
- **灵活导出**：支持复制文本、下载TXT、DOCX、PDF等多种格式
- **批量处理**：支持同时上传并处理多个音频文件

## 快速开始

### 安装

1. 克隆仓库
```bash
git clone https://github.com/yourusername/AIsound.git
cd AIsound
```

2. 安装依赖
```bash
# 前端依赖
cd frontend
npm install

# 后端依赖
cd ../backend
npm install
```

3. 配置环境变量
```bash
# 在项目根目录创建.env文件
cp .env.example .env
# 编辑.env文件，填入必要的配置信息，特别是DASHSCOPE_API_KEY
```

### 部署方式

#### 方式一：本地直接部署

1. 使用部署脚本
```bash
# 确保脚本有执行权限
chmod +x scripts/*.sh

# 执行部署前环境检查
./scripts/deployment-check.sh

# 执行部署脚本
./scripts/deploy.sh
```

2. 访问应用
   - 前端：http://localhost:3000
   - 后端API：http://localhost:8000/api/v1
   - 健康检查：http://localhost:8000/health

#### 方式二：使用Docker部署

1. 启动Docker容器
```bash
# 确保脚本有执行权限
chmod +x scripts/*.sh

# 启动Docker容器
./scripts/docker-start.sh
```

2. 访问应用
   - 前端：http://localhost:3000
   - 后端API：http://localhost:8000/api/v1
   - 健康检查：http://localhost:8000/health

3. 停止Docker容器
```bash
./scripts/docker-stop.sh
```

### 服务管理

使用服务监控脚本管理服务：

```bash
# 查看服务状态
./scripts/service-monitor.sh status

# 启动服务
./scripts/service-monitor.sh start

# 停止服务
./scripts/service-monitor.sh stop

# 重启服务
./scripts/service-monitor.sh restart

# 查看日志
./scripts/service-monitor.sh logs

# 清理临时文件
./scripts/service-monitor.sh clean

# 查看帮助
./scripts/service-monitor.sh help
```

### 故障排查

如果部署过程中遇到问题，可以使用诊断脚本：

```bash
./scripts/debug-deployment.sh
```

该脚本会检查系统环境、服务状态、端口占用等情况，并提供故障排查建议。

### 数据初始化

初始化示例数据（可选）：

```bash
node scripts/seed-data.js
```

清理示例数据：

```bash
node scripts/clean-seed-data.js
```

## 使用指南

### 上传文件
1. 点击上传区域或将文件拖拽至该区域
2. 支持一次选择多个文件
3. 文件大小限制为50MB

### 处理文件
1. 上传完成后，点击"开始全部转录"按钮
2. 观察文件列表中的进度条和状态更新
3. 处理完成后，文件状态会更新为"已完成"

### 查看结果
1. 点击文件列表中的任意已完成文件
2. 右侧面板将显示转录结果
3. 可选择不同输出模板查看格式化后的文本

### 导出结果
1. 使用"复制文本"按钮复制到剪贴板
2. 或使用下载按钮，选择需要的格式（TXT/DOCX/PDF）

## 系统架构

本应用采用前后端分离架构：

- **前端**：HTML5 + CSS3 + JavaScript，简洁高效的单页面应用
- **后端**：Node.js + Express.js，提供REST API服务
- **API集成**：集成阿里云语音识别服务，进行高质量语音转文字

详细的技术文档请参考 [tech.md](./tech.md)。

## 开发指南

如需参与开发或进行二次开发，请参考 [guide.md](./guide.md)。

### 项目结构
```
AIsound/
├── frontend/                # 前端代码
│   ├── src/                 # 源代码
│   ├── public/              # 静态资源
│   └── package.json         # 前端依赖配置
├── backend/                 # 后端代码
│   ├── controllers/         # 控制器
│   ├── middlewares/         # 中间件
│   ├── models/              # 数据模型
│   ├── routes/              # API路由
│   ├── services/            # 业务逻辑服务
│   ├── utils/               # 工具函数
│   ├── uploads/             # 上传文件存储目录
│   └── server.js            # 服务器入口
├── scripts/                 # 部署和管理脚本
│   ├── deployment-check.sh  # 部署前环境检查
│   ├── deploy.sh            # 自动化部署脚本
│   ├── docker-start.sh      # Docker启动脚本
│   ├── docker-stop.sh       # Docker停止脚本
│   ├── debug-deployment.sh  # 部署问题诊断脚本
│   ├── service-monitor.sh   # 服务监控脚本
│   ├── seed-data.js         # 数据初始化脚本
│   └── clean-seed-data.js   # 清理示例数据脚本
├── docs/                    # 项目文档
├── logs/                    # 日志文件
├── .env.example             # 环境变量示例
└── .env                     # 环境变量配置
```

## API文档

API接口设计遵循RESTful规范，详细信息请参考 [api-design.md](./api-design.md)。

主要端点：
- `POST /api/v1/files` - 上传音频文件
- `POST /api/v1/transcriptions` - 开始转录处理
- `GET /api/v1/transcriptions/{id}` - 获取转录状态
- `GET /api/v1/transcriptions/{id}/result` - 获取转录结果

## 测试

测试计划和测试用例请参考 [test-plan.md](./test-plan.md)。

运行测试：
```bash
# 运行前端测试
cd frontend
npm test

# 运行后端测试
cd backend
npm test
```

## 许可证

本项目采用 MIT 许可证。详情请查看 [LICENSE](../LICENSE) 文件。

## 联系与支持

- 问题反馈：请提交 GitHub Issues
- 技术支持：support@example.com

## 更新日志

有关版本更新的详细信息，请参考 [update.md](./update.md)。 