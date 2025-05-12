/**
 * 语音转录服务模块
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

/**
 * 使用阿里云语音识别API转录音频文件
 * @param {Object} fileData - 文件数据
 * @param {Object} options - 转录选项
 * @returns {Promise<Object>} 转录结果
 */
async function transcribeFile(fileData, options = {}) {
  try {
    logger.info(`开始转录文件: ${fileData.fileId}`, { originalName: fileData.originalName });
    
    // 检查API密钥是否配置
    const apiKey = process.env.DASHSCOPE_API_KEY;
    if (!apiKey) {
      logger.warn('未配置阿里云语音识别API密钥，使用模拟转录');
      return mockTranscribe(fileData);
    }
    
    // 检查文件是否存在
    if (!fs.existsSync(fileData.path)) {
      throw new Error('音频文件不存在或已被删除');
    }
    
    // 读取文件
    const fileBuffer = fs.readFileSync(fileData.path);
    const fileBase64 = fileBuffer.toString('base64');
    
    // 准备请求参数
    const requestData = {
      model: "speech-transcription-v1",
      input: {
        task: "transcription",
        audio: fileBase64,
        audio_format: path.extname(fileData.path).replace('.', ''),
        language: options.language || "zh",
        punc: options.punctuation !== false, // 默认添加标点符号
        sample_rate: options.sampleRate || 16000
      },
      parameters: {
        timestamp: options.timestamp || false // 是否返回时间戳
      }
    };
    
    // 发送请求到阿里云API
    const response = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/speech/transcription',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    // 处理响应
    if (response.data && response.data.output && response.data.output.text) {
      logger.info(`文件转录成功: ${fileData.fileId}`);
      
      return {
        transcription: response.data.output.text,
        timestamps: response.data.output.sentences || [],
        requestId: response.data.request_id
      };
    } else {
      throw new Error('API返回的响应格式无效');
    }
  } catch (error) {
    // 如果API调用失败，尝试使用模拟转录
    if (process.env.NODE_ENV === 'test' || !process.env.DASHSCOPE_API_KEY) {
      logger.warn(`API调用失败，使用模拟转录: ${error.message}`);
      return mockTranscribe(fileData);
    }
    
    // 处理API错误
    if (error.response) {
      // API返回了错误响应
      const errorData = error.response.data;
      logger.error(`API错误: ${error.response.status}`, errorData);
      
      throw new Error(`转录API错误: ${errorData.message || errorData.code || '未知错误'}`);
    } else if (error.request) {
      // 请求发送但没有收到响应
      logger.error('API请求无响应', error);
      throw new Error('语音识别服务无响应，请稍后重试');
    } else {
      // 请求设置时出错
      logger.error('API请求设置错误', error);
      throw error;
    }
  }
}

/**
 * 模拟转录（用于测试或API不可用时）
 * @param {Object} fileData - 文件数据
 * @returns {Promise<Object>} 转录结果
 */
async function mockTranscribe(fileData) {
  return new Promise((resolve) => {
    // 模拟API延迟
    setTimeout(() => {
      logger.info(`模拟转录成功: ${fileData.fileId}`);
      
      resolve({
        transcription: `这是文件 ${fileData.originalName} 的模拟转录结果。实际使用时，这里将是真实的语音识别结果。`,
        timestamps: [],
        requestId: `mock-${Date.now()}`
      });
    }, 1000); // 测试环境下使用较短的延迟
  });
}

module.exports = {
  transcribeFile,
  mockTranscribe
}; 