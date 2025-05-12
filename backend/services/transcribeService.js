/**
 * 音频转录服务
 * 使用阿里云语音识别API进行音频转录
 * 支持Cloudflare R2和阿里云OSS两种存储方式
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const storageService = require('./storageService');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 从环境变量获取阿里云API密钥
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;

// 日志函数
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

/**
 * 检查API配置是否完整
 * @returns {boolean} 配置是否完整
 */
function isAPIConfigured() {
  return !!DASHSCOPE_API_KEY;
}

/**
 * 转录音频文件
 * @param {string} filePath - 本地文件路径
 * @param {Object} options - 转录选项
 * @param {string} options.language - 语言，默认为"zh"（中文）
 * @param {boolean} options.enablePunctuation - 是否启用标点符号，默认为true
 * @param {boolean} options.useAsync - 是否使用异步转录，默认为true
 * @returns {Promise<Object>} 转录结果
 */
async function transcribeAudio(filePath, options = {}) {
  try {
    // 检查API配置
    if (!isAPIConfigured()) {
      throw new Error('阿里云API配置不完整，请检查环境变量');
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 默认选项
    const defaultOptions = {
      language: 'zh',
      enablePunctuation: true,
      useAsync: true
    };
    
    // 合并选项
    const mergedOptions = { ...defaultOptions, ...options };
    
    logger.info(`开始转录音频文件: ${path.basename(filePath)}`);
    logger.info(`文件大小: ${(fs.statSync(filePath).size / (1024 * 1024)).toFixed(2)} MB`);
    logger.info(`文件格式: ${path.extname(filePath).substring(1)}`);
    logger.info(`转录选项: ${JSON.stringify(mergedOptions)}`);
    
    // 上传文件到存储服务
    logger.info('正在上传文件到存储服务...');
    const uploadResult = await storageService.uploadFile(filePath);
    
    logger.info(`文件上传成功: ${uploadResult.objectKey}`);
    logger.info(`存储类型: ${uploadResult.storageType}`);
    logger.info(`公共URL: ${uploadResult.publicUrl}`);
    
    // 验证URL可访问性
    try {
      const response = await axios.head(uploadResult.publicUrl, { timeout: 5000 });
      logger.info(`URL可访问，状态码: ${response.status}`);
    } catch (error) {
      logger.error(`警告: URL不可访问: ${error.message}`);
    }
    
    // 调用阿里云API进行转录
    logger.info('正在调用阿里云语音识别API...');
    
    // 设置请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
    };
    
    // 如果使用异步转录，添加异步标志
    if (mergedOptions.useAsync) {
      headers['X-DashScope-Async'] = 'enable';
    }
    
    // 调用阿里云API
    const apiResponse = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      {
        model: "sensevoice-v1",
        input: {
          file_urls: [uploadResult.publicUrl]
        },
        parameters: {
          language_hints: [mergedOptions.language]
        }
      },
      { headers }
    );
    
    logger.info('转录请求成功!');
    logger.info(`请求ID: ${apiResponse.data.request_id}`);
    
    // 处理异步任务
    if (apiResponse.data.output && apiResponse.data.output.task_id) {
      const taskId = apiResponse.data.output.task_id;
      logger.info(`任务ID: ${taskId}`);
      logger.info('任务状态: PENDING');
      
      // 返回任务ID，由调用方决定是否等待任务完成
      return {
        status: 'pending',
        taskId,
        requestId: apiResponse.data.request_id,
        objectKey: uploadResult.objectKey,
        storageType: uploadResult.storageType
      };
    } else {
      // 同步响应情况
      if (apiResponse.data.output && apiResponse.data.output.text) {
        logger.info('转录完成!');
        
        return {
          status: 'completed',
          text: apiResponse.data.output.text,
          requestId: apiResponse.data.request_id,
          objectKey: uploadResult.objectKey,
          storageType: uploadResult.storageType
        };
      } else {
        logger.error('警告: 转录结果格式不符合预期');
        logger.error(`原始响应: ${JSON.stringify(apiResponse.data)}`);
        
        throw new Error('转录结果格式不符合预期');
      }
    }
  } catch (error) {
    logger.error(`转录失败: ${error.message}`);
    
    if (error.response) {
      logger.error(`响应状态: ${error.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
      
      // 如果是API错误，返回更详细的错误信息
      throw new Error(`API错误(${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    
    throw error;
  }
}

/**
 * 获取转录任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 任务状态
 */
async function getTranscriptionStatus(taskId) {
  try {
    // 检查API配置
    if (!isAPIConfigured()) {
      throw new Error('阿里云API配置不完整，请检查环境变量');
    }
    
    logger.info(`正在查询任务状态: ${taskId}`);
    
    // 调用阿里云API查询任务状态
    const response = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DASHSCOPE_API_KEY}`
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
                  status: 'completed',
                  taskStatus: status,
                  text,
                  sentences,
                  originalData: transcriptionData
                };
              }
            } catch (transcriptionError) {
              logger.error(`获取转录内容失败: ${transcriptionError.message}`);
              return {
                status: 'failed',
                taskStatus: 'FAILED',
                message: `获取转录内容失败: ${transcriptionError.message}`
              };
            }
          }
          
          return {
            status: 'completed',
            taskStatus: status,
            results: response.data.output.results
          };
        }
        
        return {
          status: 'completed',
          taskStatus: status,
          output: response.data.output
        };
      } else if (status === 'FAILED') {
        logger.error(`任务失败: ${JSON.stringify(response.data.output)}`);
        
        return {
          status: 'failed',
          taskStatus: status,
          message: response.data.output.message || '未知错误',
          originalData: response.data.output
        };
      } else {
        // 如果是RUNNING或PENDING状态
        return {
          status: 'pending',
          taskStatus: status,
          message: `任务正在处理中: ${status}`
        };
      }
    }
    
    // 如果响应格式不符合预期
    logger.error(`警告: 任务状态响应格式不符合预期`);
    logger.error(`原始响应: ${JSON.stringify(response.data)}`);
    
    return {
      status: 'unknown',
      message: '任务状态响应格式不符合预期',
      originalData: response.data
    };
  } catch (error) {
    logger.error(`查询任务状态失败: ${error.message}`);
    
    if (error.response) {
      logger.error(`响应状态: ${error.response.status}`);
      logger.error(`响应数据: ${JSON.stringify(error.response.data)}`);
    }
    
    return {
      status: 'failed',
      message: `查询任务状态失败: ${error.message}`
    };
  }
}

/**
 * 等待转录任务完成
 * @param {string} taskId - 任务ID
 * @param {number} maxRetries - 最大重试次数，默认为10
 * @param {number} retryInterval - 重试间隔（毫秒），默认为3000
 * @returns {Promise<Object>} 转录结果
 */
async function waitForTranscriptionComplete(taskId, maxRetries = 10, retryInterval = 3000) {
  logger.info(`开始等待任务完成，最多查询 ${maxRetries} 次，每次间隔 ${retryInterval/1000} 秒`);
  
  for (let i = 0; i < maxRetries; i++) {
    logger.info(`查询任务状态，第 ${i + 1} 次...`);
    
    const taskResult = await getTranscriptionStatus(taskId);
    
    if (taskResult.status === 'completed' || taskResult.status === 'failed') {
      return taskResult;
    }
    
    // 等待一段时间后再次查询
    await new Promise(resolve => setTimeout(resolve, retryInterval));
  }
  
  logger.error(`任务查询超时，已尝试 ${maxRetries} 次`);
  
  return {
    status: 'timeout',
    message: `任务查询超时，已尝试 ${maxRetries} 次`
  };
}

/**
 * 清理文件
 * @param {string} objectKey - 对象键
 * @returns {Promise<Object>} 清理结果
 */
async function cleanupFile(objectKey) {
  try {
    logger.info(`正在清理文件: ${objectKey}`);
    
    // 删除存储对象
    const result = await storageService.deleteObject(objectKey);
    
    logger.info(`文件清理成功: ${objectKey}`);
    
    return {
      success: true,
      objectKey,
      storageType: result.storageType
    };
  } catch (error) {
    logger.error(`文件清理失败: ${error.message}`);
    
    return {
      success: false,
      message: `文件清理失败: ${error.message}`
    };
  }
}

module.exports = {
  transcribeAudio,
  getTranscriptionStatus,
  waitForTranscriptionComplete,
  cleanupFile,
  isAPIConfigured
}; 