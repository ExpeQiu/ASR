/**
 * 日志工具模块
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aisound-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      )
    }),
    // 错误日志文件
    new winston.transports.File({ 
      filename: path.join(logDir, 'server_error.log'), 
      level: 'error' 
    }),
    // 所有日志文件
    new winston.transports.File({ 
      filename: path.join(logDir, 'server.log')
    })
  ]
});

/**
 * 创建API请求日志
 * @param {Object} req - Express请求对象
 * @param {string} action - 操作名称
 * @param {Object} details - 额外详情
 */
const logApiRequest = (req, action, details = {}) => {
  logger.info(`API请求: ${action}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    ...details
  });
};

/**
 * 创建API错误日志
 * @param {Object} req - Express请求对象
 * @param {Error} error - 错误对象
 * @param {string} action - 操作名称
 */
const logApiError = (req, error, action) => {
  logger.error(`API错误: ${action}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    errorMessage: error.message,
    errorStack: error.stack,
    errorCode: error.code
  });
};

/**
 * 创建文件操作日志
 * @param {string} action - 操作名称
 * @param {string} filePath - 文件路径
 * @param {Object} details - 额外详情
 */
const logFileOperation = (action, filePath, details = {}) => {
  logger.info(`文件操作: ${action}`, {
    filePath,
    ...details
  });
};

module.exports = {
  logger,
  logApiRequest,
  logApiError,
  logFileOperation
}; 