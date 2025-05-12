/**
 * 文件处理路由模块
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { success, error, ErrorCodes } = require('../utils/response');
const { logger, logApiRequest, logApiError } = require('../utils/logger');
const { 
  isAllowedFileType, 
  generateSafeFilename,
  getFileInfo,
  deleteFile
} = require('../utils/fileUtils');

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, generateSafeFilename(file.originalname));
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  if (!isAllowedFileType(file.originalname)) {
    return cb(
      new Error('不支持的文件格式。允许的格式: ' + (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,flac')),
      false
    );
  }
  cb(null, true);
};

// 配置上传限制
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800) // 默认50MB
  }
});

/**
 * @route POST /api/v1/files
 * @desc 上传音频文件
 * @access Public
 */
router.post('/', upload.single('audioFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(
        error('未提供文件或文件无效', ErrorCodes.INVALID_REQUEST.code, null, 400).response
      );
    }

    logApiRequest(req, '上传文件', { filename: req.file.originalname, size: req.file.size });

    // 创建文件记录
    const fileRecord = {
      fileId: path.basename(req.file.filename, path.extname(req.file.filename)),
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // 保存文件记录到数据目录（简单文件存储）
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(dataDir, `${fileRecord.fileId}.json`),
      JSON.stringify(fileRecord, null, 2)
    );

    // 返回响应
    res.status(201).json(success({
      fileId: fileRecord.fileId,
      originalName: fileRecord.originalName,
      size: fileRecord.size,
      mimeType: fileRecord.mimeType,
      status: fileRecord.status,
      createdAt: fileRecord.createdAt
    }));
  } catch (err) {
    logApiError(req, err, '上传文件失败');
    
    // 处理multer错误
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json(
          error('文件大小超过限制', ErrorCodes.FILE_TOO_LARGE.code, null, 413).response
        );
      }
    }
    
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

/**
 * @route GET /api/v1/files
 * @desc 获取所有文件列表
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    logApiRequest(req, '获取文件列表');
    
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      return res.status(200).json(success([]));
    }
    
    // 读取所有文件记录
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        try {
          const fileData = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
          return {
            fileId: fileData.fileId,
            originalName: fileData.originalName,
            size: fileData.size,
            status: fileData.status,
            createdAt: fileData.createdAt
          };
        } catch (err) {
          logger.error(`读取文件记录失败: ${file}`, err);
          return null;
        }
      })
      .filter(file => file !== null);
    
    // 分页处理
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.per_page) || 20;
    const startIndex = (page - 1) * perPage;
    const endIndex = page * perPage;
    
    const paginatedFiles = files.slice(startIndex, endIndex);
    
    res.status(200).json(success(paginatedFiles, {
      pagination: {
        total: files.length,
        page,
        per_page: perPage,
        total_pages: Math.ceil(files.length / perPage)
      }
    }));
  } catch (err) {
    logApiError(req, err, '获取文件列表失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

/**
 * @route GET /api/v1/files/:fileId
 * @desc 获取单个文件信息
 * @access Public
 */
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    logApiRequest(req, '获取文件信息', { fileId });
    
    const filePath = path.join(__dirname, '../data', `${fileId}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(
        error('找不到指定的文件', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    res.status(200).json(success(fileData));
  } catch (err) {
    logApiError(req, err, '获取文件信息失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

/**
 * @route DELETE /api/v1/files/:fileId
 * @desc 删除文件
 * @access Public
 */
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    logApiRequest(req, '删除文件', { fileId });
    
    const dataFilePath = path.join(__dirname, '../data', `${fileId}.json`);
    
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json(
        error('找不到指定的文件', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    // 读取文件数据
    const fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // 删除实际文件
    if (fileData.path && fs.existsSync(fileData.path)) {
      await deleteFile(fileData.path);
    }
    
    // 删除文件记录
    fs.unlinkSync(dataFilePath);
    
    res.status(200).json(success({ message: '文件已成功删除' }));
  } catch (err) {
    logApiError(req, err, '删除文件失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

module.exports = router; 