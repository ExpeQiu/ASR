/**
 * API配置文件
 * 用于集中管理API路径和配置
 */

// 从环境变量获取API基础URL
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// API版本
const API_VERSION = 'v1';

// API端点
const API_ENDPOINTS = {
  files: {
    upload: `${API_BASE_URL}/files`,
    list: `${API_BASE_URL}/files`,
    detail: (fileId) => `${API_BASE_URL}/files/${fileId}`
  },
  transcription: {
    start: `${API_BASE_URL}/transcriptions`,
    status: (fileId) => `${API_BASE_URL}/transcriptions/${fileId}`,
    result: (fileId) => `${API_BASE_URL}/transcriptions/${fileId}/result`
  },
  health: {
    api: `${API_BASE_URL}/health`,
    alivoice: `${API_BASE_URL}/health/alivoice`
  }
};

/**
 * 处理API响应
 * @param {Response} response - Fetch API响应对象
 * @returns {Promise} - 解析后的响应数据
 * @throws {Error} - 如果响应不成功则抛出错误
 */
async function handleResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.error?.message || '请求失败');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * 发送API请求的通用方法
 * @param {string} url - API地址
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
async function fetchAPI(url, options = {}) {
  try {
    // 设置默认请求头
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // 发送请求
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    return await handleResponse(response);
  } catch (error) {
    console.error('API请求错误:', error);
    throw error;
  }
}

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @returns {Promise} - 返回Promise对象
 */
async function uploadFile(file) {
  const formData = new FormData();
  formData.append('audioFile', file);
  
  return fetchAPI(API_ENDPOINTS.files.upload, {
    method: 'POST',
    headers: {}, // 让浏览器自动设置Content-Type为multipart/form-data
    body: formData
  });
}

/**
 * 获取文件列表
 * @param {Object} params - 查询参数
 * @returns {Promise} - 返回Promise对象
 */
async function getFiles(params = {}) {
  const queryParams = new URLSearchParams(params).toString();
  const url = `${API_ENDPOINTS.files.list}${queryParams ? `?${queryParams}` : ''}`;
  
  return fetchAPI(url);
}

/**
 * 获取单个文件信息
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
async function getFile(fileId) {
  return fetchAPI(API_ENDPOINTS.files.detail(fileId));
}

/**
 * 开始转录
 * @param {string} fileId - 文件ID
 * @param {Object} options - 转录选项
 * @returns {Promise} - 返回Promise对象
 */
async function startTranscription(fileId, options = {}) {
  return fetchAPI(API_ENDPOINTS.transcription.start, {
    method: 'POST',
    body: JSON.stringify({ fileId, options })
  });
}

/**
 * 获取转录状态
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
async function getTranscriptionStatus(fileId) {
  return fetchAPI(API_ENDPOINTS.transcription.status(fileId));
}

/**
 * 获取转录结果
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
async function getTranscriptionResult(fileId) {
  return fetchAPI(API_ENDPOINTS.transcription.result(fileId));
}

/**
 * 检查API健康状态
 * @returns {Promise} - 返回Promise对象
 */
async function checkApiHealth() {
  return fetchAPI(API_ENDPOINTS.health.api);
}

// 导出API配置和方法
export {
  API_BASE_URL,
  FRONTEND_URL,
  API_VERSION,
  API_ENDPOINTS,
  fetchAPI,
  uploadFile,
  getFiles,
  getFile,
  startTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
  checkApiHealth
}; 