#!/bin/bash

# 服务监控脚本
# 用于监控服务状态并提供服务管理功能

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}===== $1 =====${NC}"
}

# 设置工作目录为项目根目录
cd "$(dirname "$0")/.." || exit 1
PROJECT_ROOT=$(pwd)

# 检查参数
if [ $# -eq 0 ]; then
    print_header "语音转文字工具 - 服务监控"
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  status       - 显示服务状态"
    echo "  start        - 启动服务"
    echo "  stop         - 停止服务"
    echo "  restart      - 重启服务"
    echo "  logs         - 查看日志"
    echo "  clean        - 清理临时文件"
    echo "  docker-start - 使用Docker启动服务"
    echo "  docker-stop  - 停止Docker服务"
    echo "  help         - 显示帮助信息"
    exit 0
fi

# 检查服务状态
check_status() {
    print_header "服务状态"
    
    # 检查后端服务
    echo -n "后端服务: "
    if command -v lsof &> /dev/null; then
        BACKEND_RUNNING=$(lsof -i:${BACKEND_PORT:-8000} -P -n | grep LISTEN)
        if [ -n "$BACKEND_RUNNING" ]; then
            echo -e "${GREEN}运行中${NC}"
            echo "$BACKEND_RUNNING"
        else
            echo -e "${RED}未运行${NC}"
        fi
    else
        echo -e "${YELLOW}无法检查${NC}"
    fi
    
    # 检查前端服务
    echo -n "前端服务: "
    if command -v lsof &> /dev/null; then
        FRONTEND_RUNNING=$(lsof -i:${FRONTEND_PORT:-3000} -P -n | grep LISTEN)
        if [ -n "$FRONTEND_RUNNING" ]; then
            echo -e "${GREEN}运行中${NC}"
            echo "$FRONTEND_RUNNING"
        else
            echo -e "${RED}未运行${NC}"
        fi
    else
        echo -e "${YELLOW}无法检查${NC}"
    fi
    
    # 检查API健康状态
    echo -n "API健康状态: "
    if command -v curl &> /dev/null; then
        API_HEALTH=$(curl -s http://localhost:${BACKEND_PORT:-8000}/health 2>/dev/null)
        if [ $? -eq 0 ] && [ -n "$API_HEALTH" ]; then
            echo -e "${GREEN}正常${NC}"
        else
            echo -e "${RED}异常${NC}"
        fi
    else
        echo -e "${YELLOW}无法检查${NC}"
    fi
    
    # 检查Docker容器状态
    if command -v docker &> /dev/null; then
        print_header "Docker容器状态"
        docker ps -a | grep -E 'aisound' || echo "无相关容器"
    fi
    
    # 检查PM2服务状态
    if command -v pm2 &> /dev/null; then
        print_header "PM2服务状态"
        pm2 list | grep -E 'aisound' || echo "无相关服务"
    fi
    
    # 检查磁盘使用情况
    print_header "磁盘使用情况"
    echo "上传目录:"
    du -sh backend/uploads 2>/dev/null || echo "目录不存在"
    echo "日志目录:"
    du -sh logs 2>/dev/null || echo "目录不存在"
}

# 启动服务
start_service() {
    print_header "启动服务"
    
    # 检查服务是否已运行
    if command -v lsof &> /dev/null; then
        BACKEND_RUNNING=$(lsof -i:${BACKEND_PORT:-8000} -P -n | grep LISTEN)
        FRONTEND_RUNNING=$(lsof -i:${FRONTEND_PORT:-3000} -P -n | grep LISTEN)
        
        if [ -n "$BACKEND_RUNNING" ] || [ -n "$FRONTEND_RUNNING" ]; then
            print_warn "服务已在运行中，请先停止服务"
            return 1
        fi
    fi
    
    # 使用部署脚本启动服务
    bash scripts/deploy.sh
}

# 停止服务
stop_service() {
    print_header "停止服务"
    
    # 停止PM2服务
    if command -v pm2 &> /dev/null; then
        print_info "停止PM2服务..."
        pm2 stop aisound-backend 2>/dev/null
        pm2 stop aisound-frontend 2>/dev/null
        pm2 delete aisound-backend 2>/dev/null
        pm2 delete aisound-frontend 2>/dev/null
    fi
    
    # 检查PID文件
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        print_info "停止后端服务 (PID: $BACKEND_PID)..."
        kill -15 $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null
        rm -f logs/backend.pid
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        print_info "停止前端服务 (PID: $FRONTEND_PID)..."
        kill -15 $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
        rm -f logs/frontend.pid
    fi
    
    # 检查端口占用进程
    if command -v lsof &> /dev/null; then
        BACKEND_PID=$(lsof -i:${BACKEND_PORT:-8000} -P -n -t)
        if [ -n "$BACKEND_PID" ]; then
            print_info "停止占用后端端口的进程 (PID: $BACKEND_PID)..."
            kill -15 $BACKEND_PID 2>/dev/null || kill -9 $BACKEND_PID 2>/dev/null
        fi
        
        FRONTEND_PID=$(lsof -i:${FRONTEND_PORT:-3000} -P -n -t)
        if [ -n "$FRONTEND_PID" ]; then
            print_info "停止占用前端端口的进程 (PID: $FRONTEND_PID)..."
            kill -15 $FRONTEND_PID 2>/dev/null || kill -9 $FRONTEND_PID 2>/dev/null
        fi
    fi
    
    print_info "服务已停止"
}

# 重启服务
restart_service() {
    print_header "重启服务"
    stop_service
    sleep 2
    start_service
}

# 查看日志
view_logs() {
    print_header "日志查看"
    
    # 创建日志目录
    mkdir -p logs
    
    # 检查日志文件
    if [ -f "logs/backend.log" ] || [ -f "logs/frontend.log" ]; then
        echo "可用日志文件:"
        ls -la logs/*.log 2>/dev/null
        
        # 显示最新日志
        if [ -f "logs/backend.log" ]; then
            print_header "后端日志 (最后20行)"
            tail -n 20 logs/backend.log
        fi
        
        if [ -f "logs/frontend.log" ]; then
            print_header "前端日志 (最后20行)"
            tail -n 20 logs/frontend.log
        fi
        
        print_info "要查看完整日志，请使用: cat logs/backend.log 或 cat logs/frontend.log"
    else
        print_warn "未找到日志文件"
    fi
}

# 清理临时文件
clean_temp() {
    print_header "清理临时文件"
    
    # 确认操作
    read -p "此操作将清理上传的临时文件，是否继续? (y/n): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        print_info "操作已取消"
        return 0
    fi
    
    # 清理上传目录
    if [ -d "backend/uploads" ]; then
        print_info "清理上传目录..."
        find backend/uploads -type f -mtime +7 -delete
        print_info "已清理7天前的上传文件"
    fi
    
    # 清理日志
    if [ -d "logs" ]; then
        print_info "清理日志文件..."
        find logs -name "*.log" -type f -size +10M -exec truncate -s 0 {} \;
        print_info "已清理大于10MB的日志文件"
    fi
    
    print_info "临时文件清理完成"
}

# 根据参数执行相应操作
case "$1" in
    status)
        check_status
        ;;
    start)
        start_service
        ;;
    stop)
        stop_service
        ;;
    restart)
        restart_service
        ;;
    logs)
        view_logs
        ;;
    clean)
        clean_temp
        ;;
    docker-start)
        bash scripts/docker-start.sh
        ;;
    docker-stop)
        bash scripts/docker-stop.sh
        ;;
    help)
        print_header "语音转文字工具 - 服务监控"
        echo "用法: $0 [选项]"
        echo "选项:"
        echo "  status       - 显示服务状态"
        echo "  start        - 启动服务"
        echo "  stop         - 停止服务"
        echo "  restart      - 重启服务"
        echo "  logs         - 查看日志"
        echo "  clean        - 清理临时文件"
        echo "  docker-start - 使用Docker启动服务"
        echo "  docker-stop  - 停止Docker服务"
        echo "  help         - 显示帮助信息"
        ;;
    *)
        print_error "未知选项: $1"
        echo "使用 '$0 help' 获取帮助"
        exit 1
        ;;
esac

exit 0 
 