/**
 * 阿里云语音转录服务 - 使用阿里云OSS存储
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ossService = require('./ossService');

// 日志函数
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

/**
 * 上传音频文件到阿里云OSS并进行转录
 * @param {string} filePath - 音频文件路径
 * @param {Object} options - 转录选项
 * @returns {Promise<Object>} 转录结果
 */
async function transcribeAudio(filePath, options = {}) {
  try {
    logger.info(`开始处理音频文件: ${filePath}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 获取文件信息
    const fileStats = fs.statSync(filePath);
    const fileSize = fileStats.size;
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    
    logger.info(`文件信息: 名称=${fileName}, 大小=${(fileSize / (1024 * 1024)).toFixed(2)}MB, 格式=${fileExt}`);
    
    // 检查文件大小
    const maxFileSize = 100 * 1024 * 1024; // 100MB
    if (fileSize > maxFileSize) {
      throw new Error(`文件大小超过限制: ${(fileSize / (1024 * 1024)).toFixed(2)}MB > ${maxFileSize / (1024 * 1024)}MB`);
    }
    
    // 检查文件格式
    const supportedFormats = ['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];
    if (!supportedFormats.includes(fileExt)) {
      throw new Error(`不支持的文件格式: ${fileExt}，支持的格式: ${supportedFormats.join(', ')}`);
    }
    
    // 确定文件MIME类型
    let mimeType = 'audio/mpeg';
    if (fileExt === '.wav') {
      mimeType = 'audio/wav';
    } else if (fileExt === '.mp3') {
      mimeType = 'audio/mpeg';
    } else if (fileExt === '.m4a') {
      mimeType = 'audio/mp4';
    } else if (fileExt === '.aac') {
      mimeType = 'audio/aac';
    } else if (fileExt === '.flac') {
      mimeType = 'audio/flac';
    } else if (fileExt === '.ogg') {
      mimeType = 'audio/ogg';
    } else if (fileExt === '.opus') {
      mimeType = 'audio/opus';
    }
    
    // 生成唯一的对象键
    const fileId = uuidv4();
    const objectKey = `audio/${fileId}-${fileName}`;
    
    logger.info(`正在上传文件到阿里云OSS: ${objectKey}`);
    
    // 上传文件到阿里云OSS
    const uploadResult = await ossService.uploadFileToOSS(filePath, objectKey, mimeType);
    
    logger.info(`文件上传成功: ${uploadResult.publicUrl}`);
    
    // 调用阿里云语音识别API
    logger.info('正在调用阿里云语音识别API...');
    
    // 获取API密钥
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error('阿里云API密钥未配置，请检查环境变量DASHSCOPE_API_KEY');
    }
    
    // 准备API参数
    const apiParams = {
      model: options.model || "sensevoice-v1",
      input: {
        file_urls: [uploadResult.publicUrl]
      },
      parameters: {
        language_hints: options.languageHints || ["zh"]
      }
    };
    
    // 调用API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      apiParams,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-DashScope-Async': 'enable' // 启用异步处理
        }
      }
    );
    
    logger.info(`转录请求成功，请求ID: ${response.data.request_id}`);
    
    // 处理异步任务
    if (response.data.output && response.data.output.task_id) {
      const taskId = response.data.output.task_id;
      logger.info(`异步任务ID: ${taskId}`);
      
      // 返回任务信息
      return {
        status: 'PENDING',
        taskId,
        fileUrl: uploadResult.publicUrl,
        objectKey: uploadResult.objectKey,
        requestId: response.data.request_id,
        message: '转录任务已提交，正在处理中'
      };
    } else {
      // 同步响应情况（不太可能）
      if (response.data.output && response.data.output.text) {
        logger.info('转录成功（同步响应）');
        
        // 清理：删除上传的文件
        try {
          await ossService.deleteObject(objectKey);
          logger.info(`清理：已删除OSS文件 ${objectKey}`);
        } catch (cleanupError) {
          logger.error(`清理失败: ${cleanupError.message}`);
        }
        
        return {
          status: 'SUCCEEDED',
          text: response.data.output.text,
          fileUrl: uploadResult.publicUrl,
          objectKey: uploadResult.objectKey,
          requestId: response.data.request_id,
          message: '转录成功'
        };
      } else {
        logger.error('转录响应格式不符合预期');
        logger.error(`响应数据: ${JSON.stringify(response.data)}`);
        
        return {
          status: 'FAILED',
          fileUrl: uploadResult.publicUrl,
          objectKey: uploadResult.objectKey,
          requestId: response.data.request_id,
          message: '转录响应格式不符合预期',
          error: response.data
        };
      }
    }
  } catch (error) {
    logger.error(`转录失败: ${error.message}`);
    
    if (error.response) {
      logger.error(`响应状态: ${error.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
      
      return {
        status: 'FAILED',
        message: error.message,
        error: error.response.data
      };
    }
    
    return {
      status: 'FAILED',
      message: error.message,
      error: error.stack
    };
  }
}

/**
 * 查询转录任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 任务状态和结果
 */
async function getTranscriptionStatus(taskId) {
  try {
    logger.info(`查询转录任务状态: ${taskId}`);
    
    // 获取API密钥
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      throw new Error('阿里云API密钥未配置，请检查环境变量DASHSCOPE_API_KEY');
    }
    
    // 查询任务状态
    const response = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 10000 // 10秒超时
      }
    );
    
    logger.info(`任务查询响应状态码: ${response.status}`);
    
    if (response.data && response.data.output) {
      const status = response.data.output.task_status;
      logger.info(`任务状态: ${status}`);
      
      if (status === 'SUCCEEDED') {
        logger.info('任务成功完成!');
        
        // 处理结果
        if (response.data.output.results && response.data.output.results.length > 0) {
          // 获取转录URL
          const transcriptionUrl = response.data.output.results[0].transcription_url;
          
          if (transcriptionUrl) {
            try {
              // 获取转录结果
              logger.info(`获取转录结果，URL: ${transcriptionUrl}`);
              const transcriptionResponse = await axios.get(transcriptionUrl, { timeout: 10000 });
              
              if (transcriptionResponse.data) {
                const transcriptionData = transcriptionResponse.data;
                
                // 提取文本内容
                let text = '';
                let sentences = [];
                
                if (transcriptionData.transcripts && transcriptionData.transcripts.length > 0) {
                  const transcript = transcriptionData.transcripts[0];
                  text = transcript.text || '';
                  sentences = transcript.sentences || [];
                  
                  // 处理文本中的特殊标记
                  text = text.replace(/<\|.*?\|>/g, '').trim();
                }
                
                return {
                  status: 'SUCCEEDED',
                  taskId,
                  text,
                  sentences,
                  originalData: transcriptionData,
                  message: '转录成功'
                };
              }
            } catch (transcriptionError) {
              logger.error(`获取转录内容失败: ${transcriptionError.message}`);
              return {
                status: 'FAILED',
                taskId,
                message: `获取转录内容失败: ${transcriptionError.message}`
              };
            }
          }
          
          return {
            status: 'SUCCEEDED',
            taskId,
            results: response.data.output.results,
            message: '转录成功，但无法获取详细内容'
          };
        }
        
        return {
          status: 'SUCCEEDED',
          taskId,
          output: response.data.output,
          message: '转录成功，但格式不符合预期'
        };
      } else if (status === 'FAILED') {
        logger.error(`任务失败: ${JSON.stringify(response.data.output)}`);
        
        return {
          status: 'FAILED',
          taskId,
          message: response.data.output.message || '未知错误',
          originalData: response.data.output
        };
      } else {
        // RUNNING或PENDING状态
        return {
          status,
          taskId,
          message: `任务正在处理中，当前状态: ${status}`
        };
      }
    }
    
    logger.error('任务查询响应格式不符合预期');
    logger.error(`响应数据: ${JSON.stringify(response.data)}`);
    
    return {
      status: 'UNKNOWN',
      taskId,
      message: '任务查询响应格式不符合预期',
      originalData: response.data
    };
  } catch (error) {
    logger.error(`查询任务状态失败: ${error.message}`);
    
    if (error.response) {
      logger.error(`响应状态: ${error.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
      
      return {
        status: 'FAILED',
        taskId,
        message: error.message,
        error: error.response.data
      };
    }
    
    return {
      status: 'FAILED',
      taskId,
      message: error.message,
      error: error.stack
    };
  }
}

/**
 * 清理OSS中的文件
 * @param {string} objectKey - OSS对象键
 * @returns {Promise<boolean>} 是否成功删除
 */
async function cleanupFile(objectKey) {
  try {
    logger.info(`清理OSS文件: ${objectKey}`);
    
    await ossService.deleteObject(objectKey);
    
    logger.info(`文件删除成功: ${objectKey}`);
    return true;
  } catch (error) {
    logger.error(`文件删除失败: ${error.message}`);
    return false;
  }
}

module.exports = {
  transcribeAudio,
  getTranscriptionStatus,
  cleanupFile
}; 