#!/bin/bash

# 语音转文字工具 - 端到端测试运行脚本
# 此脚本运行端到端功能测试，检查应用的各个功能是否正常工作

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}        语音转文字工具 - 端到端功能测试           ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo

# 检查npm和node是否安装
command -v node >/dev/null 2>&1 || { 
    echo -e "${RED}错误: 未安装Node.js，请安装Node.js后再运行此测试${NC}" >&2
    exit 1
}

command -v npm >/dev/null 2>&1 || { 
    echo -e "${RED}错误: 未安装npm，请安装npm后再运行此测试${NC}" >&2
    exit 1
}

echo -e "${BLUE}[步骤 1]${NC} 安装测试依赖..."

# 安装测试所需依赖
cd "$PROJECT_ROOT"
npm install --no-save axios form-data dotenv || {
    echo -e "${RED}安装依赖失败，请手动安装以下依赖后重试：${NC}"
    echo "npm install --no-save axios form-data dotenv"
    exit 1
}

echo -e "${GREEN}依赖安装完成${NC}"
echo

# 检查测试音频文件是否存在
if [ ! -f "$PROJECT_ROOT/test_audio.mp3" ]; then
    echo -e "${YELLOW}警告: 测试音频文件 (test_audio.mp3) 不存在${NC}"
    echo -e "${YELLOW}将使用示例API测试功能${NC}"
else
    echo -e "${BLUE}[信息]${NC} 发现测试音频文件: test_audio.mp3"
fi

echo
echo -e "${BLUE}[步骤 2]${NC} 检查后端服务是否运行..."

# 检查后端服务是否运行
BACKEND_PORT=$(grep "BACKEND_PORT" "$PROJECT_ROOT/.env" 2>/dev/null | cut -d= -f2 || echo "8000")
curl -s "http://localhost:${BACKEND_PORT}/health" > /dev/null

if [ $? -ne 0 ]; then
    echo -e "${YELLOW}警告: 后端服务似乎没有运行，是否启动后端服务？ (y/n)${NC}"
    read -r start_backend
    
    if [ "$start_backend" = "y" ] || [ "$start_backend" = "Y" ]; then
        echo -e "${BLUE}[步骤 2.1]${NC} 启动后端服务..."
        
        cd "$PROJECT_ROOT/backend"
        npm start &
        BACKEND_PID=$!
        
        echo -e "${BLUE}[信息]${NC} 等待服务启动 (5秒)..."
        sleep 5
        
        # 再次检查服务是否启动
        curl -s "http://localhost:${BACKEND_PORT}/health" > /dev/null
        if [ $? -ne 0 ]; then
            echo -e "${RED}错误: 无法启动后端服务，请手动启动后再重试：${NC}"
            echo "cd backend && npm start"
            kill $BACKEND_PID 2>/dev/null
            exit 1
        fi
        
        echo -e "${GREEN}后端服务已启动${NC}"
    else
        echo -e "${YELLOW}继续测试，但可能会失败，因为后端服务未运行${NC}"
    fi
else
    echo -e "${GREEN}后端服务正在运行${NC}"
fi

echo
echo -e "${BLUE}[步骤 3]${NC} 执行端到端功能测试..."

# 执行端到端测试
node "$PROJECT_ROOT/scripts/e2e-test.js"
TEST_EXIT_CODE=$?

echo
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}端到端功能测试执行完毕${NC}"
else
    echo -e "${RED}端到端功能测试执行失败，退出代码: ${TEST_EXIT_CODE}${NC}"
fi

# 如果是测试脚本启动的后端服务，则关闭
if [ ! -z ${BACKEND_PID+x} ]; then
    echo -e "${BLUE}[步骤 4]${NC} 关闭后端服务..."
    kill $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}后端服务已关闭${NC}"
fi

exit $TEST_EXIT_CODE 