/**
 * 语音转文字工具 - 后端服务器入口文件
 */

// 导入依赖
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const bodyParser = require('body-parser');
const fs = require('fs');
const winston = require('winston');

// 加载环境变量 - 确保使用正确的路径
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`环境变量加载失败: ${result.error.message}`);
  console.error(`尝试加载的.env文件路径: ${envPath}`);
} else {
  console.log(`环境变量已加载，路径: ${envPath}`);
  console.log(`DASHSCOPE_API_KEY: ${process.env.DASHSCOPE_API_KEY ? '已配置' : '未配置'}`);
}

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 8000;

// 配置日志系统
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'server_error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logDir, 'server.log') 
    })
  ]
});

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"],
      imgSrc: ["'self'", "data:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  }
})); // 安全HTTP头，配置CSP允许前端连接
app.use(cors({
  origin: function(origin, callback) {
    // 允许任何localhost域的请求，包括动态分配的端口
    const allowedOrigins = [/^http:\/\/localhost:\d+$/];
    const allowed = !origin || allowedOrigins.some(pattern => pattern.test(origin));
    callback(null, allowed ? origin : false);
  },
  credentials: true
})); // 允许来自任何localhost端口的跨域请求
app.use(compression()); // 压缩响应
app.use(bodyParser.json()); // 解析JSON请求体
app.use(bodyParser.urlencoded({ extended: true })); // 解析URL编码请求体

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// 创建必要的目录
const uploadDir = path.join(__dirname, 'uploads');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: require('./package.json').version
  });
});

// API路由
app.use('/api/v1/files', require('./routes/files'));
app.use('/api/v1/transcriptions', require('./routes/transcribe')); // 修正为前端调用的路径

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'RESOURCE_NOT_FOUND',
      message: '请求的资源不存在'
    },
    meta: {}
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`${err.stack || err}`);
  
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || '服务器内部错误',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    meta: {}
  });
});

// 只在非测试环境下启动服务器
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    logger.info(`服务器已启动，监听端口: ${PORT}`);
    logger.info(`API基础URL: http://localhost:${PORT}/api/v1`);
    logger.info(`健康检查: http://localhost:${PORT}/health`);
  });
}

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  logger.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
});

module.exports = app; 