#!/bin/bash

# 部署问题诊断脚本
# 用于诊断部署过程中可能出现的问题

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
print_info "项目根目录: $PROJECT_ROOT"

print_header "系统信息"
echo "操作系统: $(uname -s)"
echo "内核版本: $(uname -r)"
echo "主机名: $(hostname)"
echo "当前用户: $(whoami)"

print_header "Node.js环境"
if command -v node &> /dev/null; then
    echo "Node.js版本: $(node -v)"
    echo "npm版本: $(npm -v)"
else
    print_error "Node.js未安装"
fi

print_header "Docker环境"
if command -v docker &> /dev/null; then
    echo "Docker版本: $(docker --version)"
    echo "Docker Compose版本: $(docker-compose --version 2>/dev/null || echo '未安装')"
    echo "Docker运行状态: $(docker info 2>/dev/null | grep "Server Version" || echo '未运行')"
else
    print_warn "Docker未安装"
fi

print_header "端口占用情况"
if command -v lsof &> /dev/null; then
    echo "前端端口(3000):"
    lsof -i:3000 -P -n | grep LISTEN || echo "未被占用"
    echo "后端端口(8000):"
    lsof -i:8000 -P -n | grep LISTEN || echo "未被占用"
else
    print_warn "无法检查端口占用情况 (lsof命令不可用)"
fi

print_header "项目文件检查"
echo "前端目录:"
ls -la frontend || echo "目录不存在"
echo "后端目录:"
ls -la backend || echo "目录不存在"
echo "环境配置文件:"
ls -la .env 2>/dev/null && echo "存在" || echo "不存在"
echo "上传目录:"
ls -la backend/uploads 2>/dev/null && echo "存在" || echo "不存在"

print_header "日志文件检查"
mkdir -p logs
echo "日志目录:"
ls -la logs || echo "目录不存在"

print_header "服务状态检查"
if command -v pm2 &> /dev/null; then
    echo "PM2服务状态:"
    pm2 list | grep aisound || echo "无相关服务"
else
    print_warn "PM2未安装，无法检查服务状态"
    echo "检查进程状态:"
    ps aux | grep -E '[n]ode.*server.js' || echo "后端服务未运行"
    ps aux | grep -E '[n]pm.*start' || echo "前端服务未运行"
fi

print_header "Docker容器状态"
if command -v docker &> /dev/null; then
    echo "相关Docker容器:"
    docker ps -a | grep -E 'aisound' || echo "无相关容器"
fi

print_header "API健康检查"
if command -v curl &> /dev/null; then
    echo "后端健康检查:"
    curl -s http://localhost:8000/health || echo "无法连接到后端服务"
else
    print_warn "curl未安装，无法执行API健康检查"
fi

print_header "环境变量检查"
if [ -f ".env" ]; then
    echo "环境变量文件内容检查:"
    # 安全显示环境变量，隐藏API密钥
    cat .env | grep -v "API_KEY" | grep -v "SECRET" || echo "环境变量文件为空"
    if grep -q "DASHSCOPE_API_KEY" .env; then
        echo "API密钥: [已配置]"
    else
        print_error "API密钥: [未配置]"
    fi
else
    print_error "环境变量文件不存在"
fi

print_header "诊断总结"
echo "如果您遇到部署问题，请检查以下几点:"
echo "1. 确保Node.js版本 >= 16.0.0"
echo "2. 确保.env文件存在并配置正确"
echo "3. 确保端口3000和8000未被其他程序占用"
echo "4. 检查日志文件获取详细错误信息"
echo "5. 确保上传目录具有正确的权限"
echo "6. 如果使用Docker，确保Docker服务正在运行"
echo "7. 确保网络连接正常，可以访问阿里云API"

print_info "诊断完成，如需更多帮助，请参考项目文档或联系技术支持"

exit 0 