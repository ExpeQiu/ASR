/**
 * API客户端
 * 封装API请求方法，处理错误和响应
 */
import { API_PATHS, getApiPath } from './paths';

/**
 * 封装fetch请求
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} - 返回Promise对象
 */
const fetchAPI = async (url, options = {}) => {
  // 默认选项
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include'
  };
  
  // 合并选项
  const fetchOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers
    }
  };
  
  try {
    // 发送请求
    const response = await fetch(url, fetchOptions);
    
    // 记录API请求日志
    console.log(`API请求: ${options.method || 'GET'} ${url}`, {
      status: response.status,
      statusText: response.statusText
    });
    
    // 检查HTTP状态码
    if (!response.ok) {
      // 尝试解析错误响应
      try {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message || 
          `HTTP错误 ${response.status}: ${response.statusText}`
        );
      } catch (e) {
        throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`);
      }
    }
    
    // 解析JSON响应
    const data = await response.json();
    return data;
    
  } catch (error) {
    // 记录错误日志
    console.error('API请求失败', error);
    
    // 重新抛出错误，保留原始错误信息
    throw error;
  }
};

/**
 * 上传文件
 * @param {File} file - 要上传的文件
 * @param {Object} options - 上传选项
 * @returns {Promise} - 返回Promise对象
 */
const uploadFile = async (file, options = {}) => {
  const formData = new FormData();
  formData.append('audioFile', file);
  
  // 添加其他表单字段
  if (options.fields) {
    Object.entries(options.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }
  
  return fetchAPI(API_PATHS.files.base, {
    method: 'POST',
    headers: {
      // 不设置Content-Type，让浏览器自动设置
      'Accept': 'application/json'
    },
    body: formData
  });
};

/**
 * 获取文件列表
 * @param {Object} options - 查询选项
 * @returns {Promise} - 返回Promise对象
 */
const getFiles = (options = {}) => {
  // 构建查询参数
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);
  if (options.perPage) params.append('per_page', options.perPage);
  
  const url = `${API_PATHS.files.base}${params.toString() ? '?' + params.toString() : ''}`;
  return fetchAPI(url);
};

/**
 * 获取单个文件信息
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
const getFile = (fileId) => {
  return fetchAPI(API_PATHS.files.byId(fileId));
};

/**
 * 删除文件
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
const deleteFile = (fileId) => {
  return fetchAPI(API_PATHS.files.byId(fileId), {
    method: 'DELETE'
  });
};

/**
 * 开始转录
 * @param {string} fileId - 文件ID
 * @param {Object} options - 转录选项
 * @returns {Promise} - 返回Promise对象
 */
const startTranscription = (fileId, options = {}) => {
  return fetchAPI(API_PATHS.transcriptions.byId(fileId), {
    method: 'POST',
    body: JSON.stringify(options)
  });
};

/**
 * 获取转录状态
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
const getTranscriptionStatus = (fileId) => {
  return fetchAPI(API_PATHS.transcriptions.status(fileId));
};

/**
 * 获取转录结果
 * @param {string} fileId - 文件ID
 * @returns {Promise} - 返回Promise对象
 */
const getTranscriptionResult = (fileId) => {
  return fetchAPI(API_PATHS.transcriptions.result(fileId));
};

/**
 * 检查API健康状态
 * @returns {Promise} - 返回Promise对象
 */
const checkApiHealth = () => {
  return fetchAPI(API_PATHS.health);
};

// 导出API客户端方法
export {
  fetchAPI,
  uploadFile,
  getFiles,
  getFile,
  deleteFile,
  startTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
  checkApiHealth
};