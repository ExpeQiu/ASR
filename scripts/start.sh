1. #!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 项目路径
PROJECT_ROOT=$(pwd)
BACKEND_DIR="${PROJECT_ROOT}/backend"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"

# 默认配置
DEFAULT_BACKEND_PORT=8000
DEFAULT_FRONTEND_PORT=3000
DEFAULT_API_BASE_URL="http://localhost:${DEFAULT_BACKEND_PORT}/api/v1"

# 输出带颜色的消息
function echo_info() {
    echo -e "${BLUE}$1${NC}"
}

function echo_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

function echo_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

function echo_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 检查目录是否存在
function check_directory() {
    if [ ! -d "$1" ]; then
        echo_error "目录不存在: $1"
        mkdir -p "$1"
        echo_success "已创建目录: $1"
    fi
}

# 检查环境变量配置
function check_env_files() {
    echo_info "1. 检查环境变量配置"
    
    # 检查根目录.env文件
    if [ ! -f "${PROJECT_ROOT}/.env" ]; then
        echo_warning "根目录.env文件不存在，将创建默认配置"
        cat > "${PROJECT_ROOT}/.env" << EOF
# 阿里云语音识别API配置
DASHSCOPE_API_KEY=

# 服务端口配置
FRONTEND_PORT=${DEFAULT_FRONTEND_PORT}
BACKEND_PORT=${DEFAULT_BACKEND_PORT}

# API路径配置
API_BASE_URL=${DEFAULT_API_BASE_URL}
EOF
        echo_success "已创建根目录默认配置，后端端口: ${DEFAULT_BACKEND_PORT}"
    fi
    
    # 检查后端目录.env文件
    if [ ! -f "${BACKEND_DIR}/.env" ]; then
        echo_warning "后端目录.env文件不存在，将复制根目录配置"
        cp "${PROJECT_ROOT}/.env" "${BACKEND_DIR}/.env"
        echo_success "已复制根目录配置到后端目录"
    fi
    
    # 检查前端目录.env文件
    if [ ! -f "${FRONTEND_DIR}/.env" ]; then
        echo_warning "前端目录.env文件不存在，将创建默认配置"
        cat > "${FRONTEND_DIR}/.env" << EOF
# 前端配置
FRONTEND_PORT=${DEFAULT_FRONTEND_PORT}
API_BASE_URL=${DEFAULT_API_BASE_URL}
EOF
        echo_success "已创建前端默认配置，API URL: ${DEFAULT_API_BASE_URL}"
    fi
    
    # 确保配置一致性
    ROOT_BACKEND_PORT=$(grep "BACKEND_PORT" "${PROJECT_ROOT}/.env" | cut -d'=' -f2)
    BACKEND_PORT=$(grep "BACKEND_PORT" "${BACKEND_DIR}/.env" | cut -d'=' -f2)
    
    if [ "$ROOT_BACKEND_PORT" != "$BACKEND_PORT" ]; then
        echo_warning "后端端口配置不一致，将统一为 ${DEFAULT_BACKEND_PORT}"
        sed -i '' "s/BACKEND_PORT=.*/BACKEND_PORT=${DEFAULT_BACKEND_PORT}/" "${PROJECT_ROOT}/.env"
        sed -i '' "s/BACKEND_PORT=.*/BACKEND_PORT=${DEFAULT_BACKEND_PORT}/" "${BACKEND_DIR}/.env"
        echo_success "已统一后端端口配置为 ${DEFAULT_BACKEND_PORT}"
    fi
    
    # 更新API基础URL
    API_BASE_URL="http://localhost:${DEFAULT_BACKEND_PORT}/api/v1"
    sed -i '' "s|API_BASE_URL=.*|API_BASE_URL=${API_BASE_URL}|" "${PROJECT_ROOT}/.env"
    sed -i '' "s|API_BASE_URL=.*|API_BASE_URL=${API_BASE_URL}|" "${FRONTEND_DIR}/.env"
    echo_success "已统一API基础URL配置为 ${API_BASE_URL}"
}

# 检查端口占用情况
function check_ports() {
    echo_info "2. 检查端口占用情况"
    
    # 获取配置的端口
    BACKEND_PORT=$(grep "BACKEND_PORT" "${PROJECT_ROOT}/.env" | cut -d'=' -f2)
    FRONTEND_PORT=$(grep "FRONTEND_PORT" "${FRONTEND_DIR}/.env" | cut -d'=' -f2)
    
    # 检查后端端口
    BACKEND_PID=$(lsof -t -i:${BACKEND_PORT} 2>/dev/null)
    if [ ! -z "$BACKEND_PID" ]; then
        echo_warning "后端端口 ${BACKEND_PORT} 已被占用，进程ID: ${BACKEND_PID}"
        read -p "是否终止该进程? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $BACKEND_PID
            echo_success "进程已终止"
        else
            echo_error "端口冲突未解决，服务可能无法正常启动"
        fi
    fi
    
    # 检查前端端口
    FRONTEND_PID=$(lsof -t -i:${FRONTEND_PORT} 2>/dev/null)
    if [ ! -z "$FRONTEND_PID" ]; then
        echo_warning "前端端口 ${FRONTEND_PORT} 已被占用，进程ID: ${FRONTEND_PID}"
        read -p "是否终止该进程? [y/N] " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill -9 $FRONTEND_PID
            echo_success "进程已终止"
        else
            echo_error "端口冲突未解决，服务可能无法正常启动"
        fi
    else
        echo_success "前端端口 ${FRONTEND_PORT} 未被占用"
    fi
}

# 检查项目依赖
function check_dependencies() {
    echo_info "3. 检查项目依赖"
    
    # 检查后端依赖
    echo "检查后端依赖..."
    cd "${BACKEND_DIR}" || exit 1
    if [ ! -d "node_modules" ]; then
        echo_warning "后端依赖未安装，正在安装..."
        npm install
    else
        echo_success "后端依赖已安装"
    fi
    
    # 检查前端依赖
    echo "检查前端依赖..."
    cd "${FRONTEND_DIR}" || exit 1
    if [ ! -d "node_modules" ]; then
        echo_warning "前端依赖未安装，正在安装..."
        npm install
    else
        echo_success "前端依赖已安装"
    fi
    
    cd "${PROJECT_ROOT}" || exit 1
}

# 启动服务
function start_services() {
    echo_info "4. 启动服务"
    
    # 启动后端服务
    echo "启动后端服务..."
    cd "${BACKEND_DIR}" || exit 1
    node server.js > /dev/null 2>&1 &
    BACKEND_PID=$!
    echo_success "后端服务已启动，进程ID: ${BACKEND_PID}"
    
    # 获取后端端口
    BACKEND_PORT=$(grep "BACKEND_PORT" "${PROJECT_ROOT}/.env" | cut -d'=' -f2)
    API_BASE_URL="http://localhost:${BACKEND_PORT}/api/v1"
    echo_info "  API URL: ${API_BASE_URL}"
    echo_info "  健康检查: http://localhost:${BACKEND_PORT}/health"
    
    # 等待后端服务启动
    echo "等待后端服务启动..."
    sleep 2
    
    # 测试API健康状态
    echo "测试API健康状态..."
    if curl -s "http://localhost:${BACKEND_PORT}/health" > /dev/null; then
        echo_success "API连接正常"
    else
        echo_error "API连接失败"
        echo_info "  请检查后端服务是否正常启动"
    fi
    
    # 启动前端服务
    echo "启动前端服务..."
    cd "${FRONTEND_DIR}" || exit 1
    npm start > /dev/null 2>&1 &
    FRONTEND_PID=$!
    
    # 获取前端端口
    FRONTEND_PORT=$(grep "FRONTEND_PORT" "${FRONTEND_DIR}/.env" | cut -d'=' -f2)
    echo_success "前端服务已启动，进程ID: ${FRONTEND_PID}"
    echo_info "  前端URL: http://localhost:${FRONTEND_PORT}"
    
    cd "${PROJECT_ROOT}" || exit 1
}

# 主函数
function main() {
    echo_info "=== 语音转文字工具启动脚本 ==="
    echo_info "项目根目录: $(pwd)"
    
    # 检查目录
    check_directory "${BACKEND_DIR}"
    check_directory "${FRONTEND_DIR}"
    check_directory "${BACKEND_DIR}/data"
    check_directory "${BACKEND_DIR}/uploads"
    
    # 检查环境变量配置
    check_env_files
    
    # 检查端口占用情况
    check_ports
    
    # 检查项目依赖
    check_dependencies
    
    # 启动服务
    start_services
    
    echo_info "=== 服务已启动 ==="
    echo_info "后端服务: http://localhost:${BACKEND_PORT}"
    echo_info "前端服务: http://localhost:${FRONTEND_PORT}"
    echo_info "API健康检查: http://localhost:${BACKEND_PORT}/health"
    echo_info "API根路径: ${API_BASE_URL}"
    echo_info "提示: 按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    wait
}

# 执行主函数
main
