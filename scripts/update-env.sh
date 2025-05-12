#!/bin/bash

# 环境变量更新脚本
# 用于自动更新环境变量配置

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

# 设置工作目录为项目根目录
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)
print_info "项目根目录: $PROJECT_ROOT"

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    print_warn ".env文件不存在，将从.env.example创建"
    cp .env.example .env
    if [ $? -ne 0 ]; then
        print_error "创建.env文件失败"
        exit 1
    fi
    print_info "已创建.env文件"
fi

# 检查前端实际运行端口
print_info "检查前端实际运行端口..."
FRONTEND_PORT_ACTUAL=""

# 检查前端日志获取实际端口
if [ -f "logs/frontend.log" ]; then
    PORT_FROM_LOG=$(grep -o "Server running at http://localhost:[0-9]\+" logs/frontend.log | grep -o "[0-9]\+$" | tail -1)
    if [ -n "$PORT_FROM_LOG" ]; then
        FRONTEND_PORT_ACTUAL=$PORT_FROM_LOG
        print_info "从日志中检测到前端运行在端口: $FRONTEND_PORT_ACTUAL"
    fi
fi

# 如果日志中没有找到，检查进程
if [ -z "$FRONTEND_PORT_ACTUAL" ] && command -v lsof &> /dev/null; then
    # 查找可能的前端进程
    FRONTEND_PROCESSES=$(ps aux | grep -E 'parcel.*src/index.html' | grep -v grep)
    if [ -n "$FRONTEND_PROCESSES" ]; then
        # 尝试从lsof获取端口
        FRONTEND_PID=$(echo "$FRONTEND_PROCESSES" | awk '{print $2}' | head -1)
        if [ -n "$FRONTEND_PID" ]; then
            PORT_FROM_LSOF=$(lsof -i -P -n -p $FRONTEND_PID | grep LISTEN | grep -o ":[0-9]\+" | grep -o "[0-9]\+" | head -1)
            if [ -n "$PORT_FROM_LSOF" ]; then
                FRONTEND_PORT_ACTUAL=$PORT_FROM_LSOF
                print_info "从进程中检测到前端运行在端口: $FRONTEND_PORT_ACTUAL"
            fi
        fi
    fi
fi

# 如果仍然没有找到，使用默认端口
if [ -z "$FRONTEND_PORT_ACTUAL" ]; then
    FRONTEND_PORT_ACTUAL=1234
    print_warn "无法检测到前端实际端口，使用默认端口: $FRONTEND_PORT_ACTUAL"
fi

# 获取当前配置的前端端口
FRONTEND_PORT_CONFIG=$(grep "FRONTEND_PORT" .env | cut -d= -f2)

# 如果配置的端口与实际端口不一致，更新配置
if [ "$FRONTEND_PORT_CONFIG" != "$FRONTEND_PORT_ACTUAL" ]; then
    print_warn "配置的前端端口($FRONTEND_PORT_CONFIG)与实际运行端口($FRONTEND_PORT_ACTUAL)不一致"
    print_info "正在更新.env配置..."
    
    # 备份原配置文件
    cp .env .env.bak
    
    # 更新端口配置
    if grep -q "FRONTEND_PORT" .env; then
        # 如果存在FRONTEND_PORT配置，则替换它
        sed -i.tmp "s/FRONTEND_PORT=.*/FRONTEND_PORT=$FRONTEND_PORT_ACTUAL/" .env
        rm -f .env.tmp
    else
        # 如果不存在，则添加配置
        echo "FRONTEND_PORT=$FRONTEND_PORT_ACTUAL" >> .env
    fi
    
    print_info "已更新前端端口配置为: $FRONTEND_PORT_ACTUAL"
    print_info "原配置已备份为: .env.bak"
else
    print_info "前端端口配置正确，无需更新"
fi

print_info "环境变量检查完成"
exit 0 