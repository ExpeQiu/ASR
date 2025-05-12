# 部署文档

## 部署步骤

### 1. 环境准备
- 确保安装了Node.js (v16.0.0或更高版本)
- 确保安装了npm (最新版本)
- 可选：安装PM2用于进程管理

### 2. 配置环境变量
- 复制`.env.example`为`.env`：`cp .env.example .env`
- 编辑`.env`文件，设置以下参数：
  - `FRONTEND_PORT`：前端服务端口（默认1234）
  - `BACKEND_PORT`：后端服务端口（默认8000）
  - `DASHSCOPE_API_KEY`：阿里云语音识别API密钥

### 3. 执行部署脚本
```bash
# 添加执行权限
chmod +x scripts/deploy.sh

# 执行部署脚本
./scripts/deploy.sh
```

### 4. 验证部署
- 后端服务：http://localhost:8000/health
- 前端服务：http://localhost:1234
- API测试：http://localhost:8000/api/v1

## 常见问题排查

### 端口占用问题
如果端口被占用，可以通过以下命令查看占用进程：
```bash
lsof -i:8000  # 查看8000端口占用
lsof -i:1234  # 查看1234端口占用
```

终止占用进程：
```bash
kill -9 <进程ID>
```

或者修改`.env`文件中的端口配置。

### 服务状态检查
使用服务监控脚本检查状态：
```bash
./scripts/service-monitor.sh status
```

### 日志查看
查看后端日志：
```bash
cat logs/backend.log
```

查看前端日志：
```bash
cat logs/frontend.log
```

### 诊断工具
使用诊断脚本进行全面检查：
```bash
./scripts/debug-deployment.sh
```

## 部署架构

```
+----------------+       +----------------+
|                |       |                |
|  前端服务      |------>|  后端服务      |
|  (端口1234)    |       |  (端口8000)    |
|                |       |                |
+----------------+       +----------------+
                                |
                                v
                         +----------------+
                         |                |
                         |  阿里云API     |
                         |                |
                         +----------------+
```

## 服务管理

### 启动服务
```bash
./scripts/service-monitor.sh start
```

### 停止服务
```bash
./scripts/service-monitor.sh stop
```

### 重启服务
```bash
./scripts/service-monitor.sh restart
```

### 查看日志
```bash
./scripts/service-monitor.sh logs
```

## 故障排除

1. **前端无法连接后端**：
   - 检查后端服务是否正常运行
   - 检查API基础URL配置是否正确
   - 检查网络连接和防火墙设置

2. **上传文件失败**：
   - 检查上传目录权限
   - 检查文件大小是否超过限制
   - 检查支持的文件格式

3. **转录处理失败**：
   - 检查阿里云API密钥是否正确
   - 检查网络连接
   - 查看后端日志获取详细错误信息 