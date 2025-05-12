/**
 * API响应工具模块
 */

/**
 * 创建成功响应
 * @param {Object} data - 响应数据
 * @param {Object} meta - 元数据（如分页信息）
 * @returns {Object} 格式化的成功响应
 */
const success = (data, meta = {}) => {
  return {
    success: true,
    data,
    error: null,
    meta
  };
};

/**
 * 创建错误响应
 * @param {string} message - 错误消息
 * @param {string} code - 错误代码
 * @param {string} details - 错误详情
 * @param {number} status - HTTP状态码
 * @returns {Object} 格式化的错误响应和状态码
 */
const error = (message, code = 'SERVER_ERROR', details = null, status = 500) => {
  return {
    response: {
      success: false,
      data: null,
      error: {
        code,
        message,
        details
      },
      meta: {}
    },
    status
  };
};

/**
 * 错误代码映射
 */
const ErrorCodes = {
  INVALID_REQUEST: { code: 'INVALID_REQUEST', status: 400 },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { code: 'FORBIDDEN', status: 403 },
  FILE_NOT_FOUND: { code: 'FILE_NOT_FOUND', status: 404 },
  RESOURCE_NOT_FOUND: { code: 'RESOURCE_NOT_FOUND', status: 404 },
  METHOD_NOT_ALLOWED: { code: 'METHOD_NOT_ALLOWED', status: 405 },
  FILE_TOO_LARGE: { code: 'FILE_TOO_LARGE', status: 413 },
  UNSUPPORTED_MEDIA_TYPE: { code: 'UNSUPPORTED_MEDIA_TYPE', status: 415 },
  API_ERROR: { code: 'API_ERROR', status: 500 },
  SERVER_ERROR: { code: 'SERVER_ERROR', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', status: 503 }
};

module.exports = {
  success,
  error,
  ErrorCodes
}; 