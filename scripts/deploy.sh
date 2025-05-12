#!/bin/bash

# 语音转文字工具自动化部署脚本
# 用于自动化部署应用

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装"
        exit 1
    fi
}

# 检查必要的命令
check_command node
check_command npm

# 设置工作目录为项目根目录
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)
print_info "项目根目录: $PROJECT_ROOT"

# 检查环境
print_info "执行环境检查..."
bash scripts/deployment-check.sh
if [ $? -ne 0 ]; then
    print_error "环境检查失败，请修复上述问题后重试"
    exit 1
fi
print_info "环境检查通过"

# 创建日志目录
mkdir -p logs
print_info "确保日志目录存在"

# 安装依赖
print_info "安装前端依赖..."
cd frontend || exit 1
npm install
if [ $? -ne 0 ]; then
    print_error "前端依赖安装失败"
    exit 1
fi

print_info "安装后端依赖..."
cd ../backend || exit 1
npm install
if [ $? -ne 0 ]; then
    print_error "后端依赖安装失败"
    exit 1
fi

# 构建前端
print_info "构建前端应用..."
cd ../frontend || exit 1
npm run build
if [ $? -ne 0 ]; then
    print_error "前端构建失败"
    exit 1
fi

# 初始化数据
print_info "初始化基础数据..."
cd .. || exit 1
node scripts/seed-data.js
if [ $? -ne 0 ]; then
    print_warn "数据初始化失败，但将继续部署"
fi

# 启动服务
print_info "启动服务..."

# 检查是否安装了PM2
if command -v pm2 &> /dev/null; then
    print_info "使用PM2启动服务..."
    
    # 停止可能已存在的服务
    pm2 stop aisound-backend 2>/dev/null
    pm2 stop aisound-frontend 2>/dev/null
    
    # 启动后端服务
    cd backend || exit 1
    pm2 start server.js --name aisound-backend
    if [ $? -ne 0 ]; then
        print_error "后端服务启动失败"
        exit 1
    fi
    
    # 启动前端服务（如果需要）
    cd ../frontend || exit 1
    pm2 start "npm run start" --name aisound-frontend
    if [ $? -ne 0 ]; then
        print_error "前端服务启动失败"
        exit 1
    fi
    
    # 保存PM2配置
    pm2 save
    
    print_info "服务已通过PM2启动"
    pm2 status
else
    print_warn "未检测到PM2，使用普通方式启动服务..."
    print_warn "这种方式启动的服务将在终端关闭时停止"
    
    # 启动后端服务
    cd backend || exit 1
    nohup node server.js > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    print_info "后端服务已启动，PID: $BACKEND_PID"
    
    # 启动前端服务
    cd ../frontend || exit 1
    nohup npm run start > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    print_info "前端服务已启动，PID: $FRONTEND_PID"
    
    # 记录PID到文件
    mkdir -p ../logs
    echo $BACKEND_PID > ../logs/backend.pid
    echo $FRONTEND_PID > ../logs/frontend.pid
fi

# 等待服务启动
print_info "等待服务启动..."
sleep 5

# 更新环境变量配置
print_info "更新环境变量配置..."
cd .. || exit 1
bash scripts/update-env.sh
if [ $? -ne 0 ]; then
    print_warn "环境变量更新失败，但将继续部署"
fi

# 获取实际端口
source .env 2>/dev/null
BACKEND_PORT=${BACKEND_PORT:-8000}
FRONTEND_PORT=${FRONTEND_PORT:-1234}

print_info "部署完成!"
print_info "后端服务运行在: http://localhost:${BACKEND_PORT}"
print_info "前端服务运行在: http://localhost:${FRONTEND_PORT}"
print_info "健康检查: http://localhost:${BACKEND_PORT}/health"

exit 0 