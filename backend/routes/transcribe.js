/**
 * 语音转录路由模块
 */
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const { success, error, ErrorCodes } = require('../utils/response');
const { logger, logApiRequest, logApiError } = require('../utils/logger');
const transcribeService = require('../services/transcribeService');

/**
 * @route POST /api/v1/transcriptions/:fileId
 * @desc 转录音频文件
 * @access Public
 */
router.post('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const options = req.body || {};
    
    logApiRequest(req, '转录文件', { fileId, options });
    
    // 检查文件记录是否存在
    const dataFilePath = path.join(__dirname, '../data', `${fileId}.json`);
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json(
        error('找不到指定的文件', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    // 读取文件记录
    const fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // 检查文件是否存在
    if (!fs.existsSync(fileData.path)) {
      return res.status(404).json(
        error('音频文件不存在或已被删除', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    // 更新文件状态
    fileData.status = 'processing';
    fileData.updatedAt = new Date().toISOString();
    fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2));
    
    // 开始转录处理（异步）
    transcribeService.transcribeFile(fileData, options)
      .then(result => {
        // 更新文件记录
        fileData.status = 'completed';
        fileData.transcription = result.transcription;
        fileData.completedAt = new Date().toISOString();
        fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2));
        
        logger.info(`文件转录完成: ${fileId}`);
      })
      .catch(err => {
        // 更新文件记录为错误状态
        fileData.status = 'error';
        fileData.error = err.message;
        fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2));
        
        logger.error(`文件转录失败: ${fileId}`, err);
      });
    
    // 立即返回响应，转录将在后台进行
    res.status(202).json(success({
      fileId,
      status: 'processing',
      message: '转录请求已接受，正在处理中'
    }));
  } catch (err) {
    logApiError(req, err, '转录请求失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

/**
 * @route GET /api/v1/transcriptions/:fileId/status
 * @desc 获取转录状态
 * @access Public
 */
router.get('/:fileId/status', async (req, res) => {
  try {
    const { fileId } = req.params;
    logApiRequest(req, '获取转录状态', { fileId });
    
    // 检查文件记录是否存在
    const dataFilePath = path.join(__dirname, '../data', `${fileId}.json`);
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json(
        error('找不到指定的文件', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    // 读取文件记录
    const fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // 返回状态信息
    res.status(200).json(success({
      fileId,
      status: fileData.status,
      createdAt: fileData.createdAt,
      updatedAt: fileData.updatedAt,
      completedAt: fileData.completedAt,
      error: fileData.error
    }));
  } catch (err) {
    logApiError(req, err, '获取转录状态失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

/**
 * @route GET /api/v1/transcriptions/:fileId/result
 * @desc 获取转录结果
 * @access Public
 */
router.get('/:fileId/result', async (req, res) => {
  try {
    const { fileId } = req.params;
    logApiRequest(req, '获取转录结果', { fileId });
    
    // 检查文件记录是否存在
    const dataFilePath = path.join(__dirname, '../data', `${fileId}.json`);
    if (!fs.existsSync(dataFilePath)) {
      return res.status(404).json(
        error('找不到指定的文件', ErrorCodes.FILE_NOT_FOUND.code, null, 404).response
      );
    }
    
    // 读取文件记录
    const fileData = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));
    
    // 检查转录状态
    if (fileData.status === 'pending' || fileData.status === 'processing') {
      return res.status(202).json(success({
        fileId,
        status: fileData.status,
        message: '转录尚未完成'
      }));
    }
    
    if (fileData.status === 'error') {
      return res.status(500).json(
        error('转录处理失败', ErrorCodes.API_ERROR.code, fileData.error, 500).response
      );
    }
    
    // 返回转录结果
    res.status(200).json(success({
      fileId,
      originalName: fileData.originalName,
      status: fileData.status,
      transcription: fileData.transcription,
      completedAt: fileData.completedAt
    }));
  } catch (err) {
    logApiError(req, err, '获取转录结果失败');
    res.status(500).json(
      error(err.message, ErrorCodes.SERVER_ERROR.code, null, 500).response
    );
  }
});

module.exports = router; 