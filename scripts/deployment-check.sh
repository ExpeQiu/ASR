#!/bin/bash

# 部署前环境检查脚本
# 用于检查部署环境是否满足要求

echo "===== 语音转文字工具 - 部署环境检查 ====="
echo "开始检查部署环境..."

# 检查Node.js版本
echo -n "检查Node.js版本: "
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装"
    echo "请安装Node.js v16.0.0或更高版本"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo "✅ 已安装 $NODE_VERSION"
    # 检查版本是否满足要求
    NODE_VERSION_NUM=$(echo $NODE_VERSION | cut -c 2- | cut -d. -f1)
    if [ "$NODE_VERSION_NUM" -lt 16 ]; then
        echo "❌ Node.js版本过低，需要v16.0.0或更高版本"
        exit 1
    fi
fi

# 检查npm版本
echo -n "检查npm版本: "
if ! command -v npm &> /dev/null; then
    echo "❌ npm未安装"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo "✅ 已安装 $NPM_VERSION"
fi

# 检查环境变量配置
echo -n "检查环境变量配置: "
if [ ! -f ".env" ]; then
    echo "❌ .env文件不存在"
    echo "正在创建.env文件模板..."
    cp .env.example .env 2>/dev/null || echo "# 阿里云语音识别API配置
DASHSCOPE_API_KEY=your_api_key_here

# 服务端口配置
FRONTEND_PORT=3000
BACKEND_PORT=8000

# API路径配置
API_BASE_URL=http://localhost:8000/api" > .env
    echo "已创建.env文件，请编辑并填写正确的配置信息"
    echo "特别是DASHSCOPE_API_KEY必须配置"
    exit 1
else
    # 检查关键环境变量
    source .env 2>/dev/null
    if [ -z "$DASHSCOPE_API_KEY" ]; then
        echo "❌ DASHSCOPE_API_KEY未配置"
        echo "请在.env文件中配置DASHSCOPE_API_KEY"
        exit 1
    else
        echo "✅ 环境变量已配置"
    fi
fi

# 检查端口占用情况
echo -n "检查前端端口 $FRONTEND_PORT: "
if command -v lsof &> /dev/null; then
    PORT_USAGE=$(lsof -i:${FRONTEND_PORT:-3000} -P -n | grep LISTEN)
    if [ -n "$PORT_USAGE" ]; then
        echo "❌ 端口 ${FRONTEND_PORT:-3000} 已被占用"
        echo "$PORT_USAGE"
        echo "请关闭占用端口的进程或修改FRONTEND_PORT配置"
    else
        echo "✅ 可用"
    fi
else
    echo "⚠️ 无法检查端口占用情况 (lsof命令不可用)"
fi

echo -n "检查后端端口 $BACKEND_PORT: "
if command -v lsof &> /dev/null; then
    PORT_USAGE=$(lsof -i:${BACKEND_PORT:-8000} -P -n | grep LISTEN)
    if [ -n "$PORT_USAGE" ]; then
        echo "❌ 端口 ${BACKEND_PORT:-8000} 已被占用"
        echo "$PORT_USAGE"
        echo "请关闭占用端口的进程或修改BACKEND_PORT配置"
    else
        echo "✅ 可用"
    fi
else
    echo "⚠️ 无法检查端口占用情况 (lsof命令不可用)"
fi

# 检查目录权限
echo -n "检查上传目录权限: "
if [ ! -d "backend/uploads" ]; then
    mkdir -p backend/uploads
fi
if [ -w "backend/uploads" ]; then
    echo "✅ 正常"
else
    echo "❌ backend/uploads目录无写入权限"
    echo "请执行: chmod -R 755 backend/uploads"
    exit 1
fi

# 检查API健康状态
echo -n "检查阿里云API配置: "
if [ -f "backend/checkAliVoiceApi.js" ]; then
    cd backend && node checkAliVoiceApi.js
    API_CHECK_RESULT=$?
    cd ..
    if [ $API_CHECK_RESULT -ne 0 ]; then
        echo "❌ API配置检查失败"
        echo "请检查DASHSCOPE_API_KEY是否正确"
        exit 1
    else
        echo "✅ API配置正常"
    fi
else
    echo "⚠️ 无法检查API配置 (检查脚本不存在)"
fi

echo "===== 环境检查完成 ====="
echo "部署环境检查通过，可以继续部署流程"
exit 0 