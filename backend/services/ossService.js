/**
 * 阿里云OSS服务模块
 */
const OSS = require('ali-oss');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 确保环境变量已加载
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 从环境变量获取OSS配置
const OSS_REGION = process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing';
const OSS_ACCESS_KEY_ID = process.env.ALIYUN_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.ALIYUN_ACCESS_KEY_SECRET;
const OSS_BUCKET = process.env.ALIYUN_OSS_BUCKET;

// 日志函数
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

/**
 * 检查OSS配置是否完整
 * @returns {boolean} 配置是否完整
 */
function isOSSConfigured() {
  return !!(OSS_ACCESS_KEY_ID && OSS_ACCESS_KEY_SECRET && OSS_BUCKET);
}

/**
 * 获取OSS客户端实例
 * @returns {Object} OSS客户端实例
 */
function getOSSClient() {
  if (!isOSSConfigured()) {
    throw new Error('阿里云OSS配置不完整，请检查环境变量');
  }
  
  return new OSS({
    region: OSS_REGION,
    accessKeyId: OSS_ACCESS_KEY_ID,
    accessKeySecret: OSS_ACCESS_KEY_SECRET,
    bucket: OSS_BUCKET
  });
}

/**
 * 上传文件到阿里云OSS
 * @param {string} filePath - 本地文件路径
 * @param {string} objectKey - OSS对象键
 * @param {string} mimeType - 文件MIME类型
 * @returns {Promise<Object>} 上传结果
 */
async function uploadFileToOSS(filePath, objectKey, mimeType) {
  try {
    logger.info(`正在上传文件到阿里云OSS: ${objectKey}`);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 获取OSS客户端
    const client = getOSSClient();
    
    // 上传文件
    const result = await client.put(objectKey, filePath, {
      mime: mimeType,
      headers: {
        'Content-Type': mimeType
      }
    });
    
    logger.info(`文件上传成功: ${objectKey}`);
    
    // 生成公开访问URL（7天有效期）
    const publicUrl = client.signatureUrl(objectKey, { expires: 3600 * 24 * 7 });
    
    return {
      objectKey,
      etag: result.etag,
      publicUrl
    };
  } catch (error) {
    logger.error(`上传文件到阿里云OSS失败: ${error.message}`);
    throw error;
  }
}

/**
 * 列出OSS存储桶中的对象
 * @param {string} prefix - 对象前缀
 * @param {number} maxKeys - 最大返回数量
 * @returns {Promise<Object>} 列表结果
 */
async function listObjects(prefix = '', maxKeys = 100) {
  try {
    logger.info(`正在列出阿里云OSS对象: ${prefix}`);
    
    // 获取OSS客户端
    const client = getOSSClient();
    
    // 列出对象
    const result = await client.list({
      prefix,
      'max-keys': maxKeys
    });
    
    logger.info(`列出对象成功，共 ${result.objects ? result.objects.length : 0} 个对象`);
    
    return result;
  } catch (error) {
    logger.error(`列出阿里云OSS对象失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除OSS对象
 * @param {string} objectKey - OSS对象键
 * @returns {Promise<Object>} 删除结果
 */
async function deleteObject(objectKey) {
  try {
    logger.info(`正在删除阿里云OSS对象: ${objectKey}`);
    
    // 获取OSS客户端
    const client = getOSSClient();
    
    // 删除对象
    const result = await client.delete(objectKey);
    
    logger.info(`删除对象成功: ${objectKey}`);
    
    return result;
  } catch (error) {
    logger.error(`删除阿里云OSS对象失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  isOSSConfigured,
  getOSSClient,
  uploadFileToOSS,
  listObjects,
  deleteObject
}; 