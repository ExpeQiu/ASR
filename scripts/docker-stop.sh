#!/bin/bash

# Docker停止脚本
# 用于停止Docker容器

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

# 设置工作目录为脚本目录
cd "$(dirname "$0")" || exit 1
print_info "脚本目录: $(pwd)"

# 停止Docker容器
print_info "停止Docker容器..."
docker-compose down

if [ $? -ne 0 ]; then
    print_error "Docker容器停止失败"
    exit 1
fi

print_info "Docker容器已停止"

exit 0 