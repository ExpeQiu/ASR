/**
 * 环境配置管理
 * 用于加载和验证环境变量
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config();

// 必需的环境变量列表
const requiredEnvVars = [
  'DASHSCOPE_API_KEY'
];

// 默认配置
const defaultConfig = {
  FRONTEND_PORT: 3000,
  BACKEND_PORT: 8000,
  API_BASE_URL: 'http://localhost:8000/api'
};

/**
 * 验证环境变量是否已配置
 * @returns {Object} 验证结果和缺失的环境变量
 */
function validateEnv() {
  const missingVars = [];
  
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  return {
    isValid: missingVars.length === 0,
    missingVars
  };
}

/**
 * 获取环境配置
 * @returns {Object} 环境配置
 */
function getConfig() {
  const config = { ...defaultConfig };
  
  // 加载环境变量，优先使用环境变量中的值
  Object.keys(defaultConfig).forEach(key => {
    if (process.env[key]) {
      config[key] = process.env[key];
    }
  });
  
  // 添加API密钥
  config.DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
  
  return config;
}

/**
 * 创建示例.env文件（如果不存在）
 */
function createEnvExample() {
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  // 如果.env.example不存在，则创建
  if (!fs.existsSync(envExamplePath)) {
    const envExample = `# 阿里云语音识别API配置
DASHSCOPE_API_KEY=your_api_key_here

# 服务端口配置
FRONTEND_PORT=3000
BACKEND_PORT=8000

# API路径配置
API_BASE_URL=http://localhost:8000/api
`;
    
    fs.writeFileSync(envExamplePath, envExample);
    console.log('已创建.env.example文件');
  }
}

// 导出配置相关函数
module.exports = {
  validateEnv,
  getConfig,
  createEnvExample
}; 