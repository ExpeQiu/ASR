/**
 * API路径管理模块
 * 集中管理所有API路径，避免硬编码和路径不一致
 */

// API基础URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

// API版本号
const API_VERSION = 'v1';

// API路径定义
const API_PATHS = {
  // 文件相关接口
  files: {
    base: `${API_BASE_URL}/files`,
    byId: (fileId) => `${API_BASE_URL}/files/${fileId}`
  },
  
  // 转录相关接口
  transcriptions: {
    byId: (fileId) => `${API_BASE_URL}/transcriptions/${fileId}`,
    status: (fileId) => `${API_BASE_URL}/transcriptions/${fileId}/status`,
    result: (fileId) => `${API_BASE_URL}/transcriptions/${fileId}/result`
  },
  
  // 健康检查接口
  health: `${API_BASE_URL.replace('/api/v1', '')}/health`
};

/**
 * 获取API路径
 * @param {string} path - API路径名称，格式为"category.endpoint"，如"files.byId"
 * @param {any} params - API路径参数
 * @returns {string} 完整的API URL
 */
const getApiPath = (path, params) => {
  const [category, endpoint] = path.split('.');
  
  if (!API_PATHS[category]) {
    throw new Error(`未知的API类别: ${category}`);
  }
  
  if (typeof API_PATHS[category] === 'string') {
    return API_PATHS[category];
  }
  
  if (!API_PATHS[category][endpoint]) {
    throw new Error(`未知的API端点: ${category}.${endpoint}`);
  }
  
  if (typeof API_PATHS[category][endpoint] === 'function') {
    return API_PATHS[category][endpoint](params);
  }
  
  return API_PATHS[category][endpoint];
};

export {
  API_BASE_URL,
  API_VERSION,
  API_PATHS,
  getApiPath
};