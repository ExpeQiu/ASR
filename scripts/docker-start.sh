#!/bin/bash

# Docker启动脚本
# 用于启动Docker容器

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
check_command docker
check_command docker-compose

# 设置工作目录为项目根目录
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)
print_info "项目根目录: $PROJECT_ROOT"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    print_warn ".env文件不存在，将使用默认配置"
    print_warn "正在创建.env文件..."
    cp .env.example .env 2>/dev/null || echo "# 阿里云语音识别API配置
DASHSCOPE_API_KEY=your_api_key_here

# 服务端口配置
FRONTEND_PORT=3000
BACKEND_PORT=8000

# API路径配置
API_BASE_URL=http://localhost:8000/api" > .env
    print_warn "已创建.env文件，请编辑并填写正确的配置信息"
    print_warn "特别是DASHSCOPE_API_KEY必须配置"
fi

# 创建必要的目录
mkdir -p logs uploads

# 启动Docker容器
print_info "启动Docker容器..."
cd scripts || exit 1
docker-compose up -d

if [ $? -ne 0 ]; then
    print_error "Docker容器启动失败"
    exit 1
fi

print_info "Docker容器已启动"
docker-compose ps

# 显示服务访问信息
print_info "服务已启动:"
print_info "后端服务: http://localhost:${BACKEND_PORT:-8000}"
print_info "前端服务: http://localhost:${FRONTEND_PORT:-3000}"
print_info "健康检查: http://localhost:${BACKEND_PORT:-8000}/health"

exit 0 