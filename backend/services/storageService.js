/**
 * 统一存储服务接口
 * 根据配置选择使用Cloudflare R2或阿里云OSS
 */
const fs = require('fs');
const path = require('path');
const { R2 } = require('node-cloudflare-r2');
const OSS = require('ali-oss');
const { v4: uuidv4 } = require('uuid');
const { getStorageConfig, isUsingR2Storage, isUsingOSSStorage } = require('../utils/storageConfig');

// 日志函数
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

/**
 * 获取R2客户端实例
 * @returns {Object} R2客户端实例
 */
function getR2Client() {
  const config = getStorageConfig();
  
  if (!config.accountId || !config.accessKeyId || !config.secretAccessKey) {
    throw new Error('Cloudflare R2配置不完整，请检查环境变量');
  }
  
  return new R2({
    accountId: config.accountId,
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey
  });
}

/**
 * 获取OSS客户端实例
 * @returns {Object} OSS客户端实例
 */
function getOSSClient() {
  const config = getStorageConfig();
  
  if (!config.accessKeyId || !config.accessKeySecret || !config.bucket) {
    throw new Error('阿里云OSS配置不完整，请检查环境变量');
  }
  
  return new OSS({
    region: config.region,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    bucket: config.bucket
  });
}

/**
 * 上传文件到存储服务
 * @param {string} filePath - 本地文件路径
 * @param {string} objectKey - 可选，对象键，如果不提供则自动生成
 * @param {string} mimeType - 可选，文件MIME类型
 * @returns {Promise<Object>} 上传结果，包含对象键和公开URL
 */
async function uploadFile(filePath, objectKey, mimeType) {
  try {
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }
    
    // 如果没有提供对象键，则自动生成
    if (!objectKey) {
      const fileId = uuidv4();
      const fileName = path.basename(filePath);
      objectKey = `audio/${fileId}-${fileName}`;
    }
    
    // 如果没有提供MIME类型，则根据文件扩展名确定
    if (!mimeType) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.wav') {
        mimeType = 'audio/wav';
      } else if (ext === '.mp3') {
        mimeType = 'audio/mpeg';
      } else if (ext === '.m4a') {
        mimeType = 'audio/mp4';
      } else {
        mimeType = 'application/octet-stream';
      }
    }
    
    logger.info(`正在上传文件 "${path.basename(filePath)}" 到 "${objectKey}"...`);
    
    // 根据配置选择存储服务
    if (isUsingR2Storage()) {
      return await uploadToR2(filePath, objectKey, mimeType);
    } else {
      return await uploadToOSS(filePath, objectKey, mimeType);
    }
  } catch (error) {
    logger.error(`上传文件失败: ${error.message}`);
    throw error;
  }
}

/**
 * 上传文件到Cloudflare R2
 * @param {string} filePath - 本地文件路径
 * @param {string} objectKey - 对象键
 * @param {string} mimeType - 文件MIME类型
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToR2(filePath, objectKey, mimeType) {
  try {
    const r2 = getR2Client();
    const config = getStorageConfig();
    
    // 初始化存储桶实例
    const bucket = r2.bucket(config.bucketName);
    
    // 如果存储桶允许公共访问，提供公共URL
    if (config.publicUrl) {
      bucket.provideBucketPublicUrl(config.publicUrl);
    }
    
    // 检查存储桶是否存在
    const exists = await bucket.exists();
    if (!exists) {
      throw new Error(`存储桶 "${config.bucketName}" 不存在`);
    }
    
    // 上传文件到R2
    const result = await bucket.uploadFile(filePath, objectKey);
    
    logger.info(`文件上传成功: ${objectKey}`);
    
    return {
      objectKey: result.objectKey,
      etag: result.etag,
      publicUrl: result.publicUrl,
      storageType: 'R2'
    };
  } catch (error) {
    logger.error(`上传文件到Cloudflare R2失败: ${error.message}`);
    throw error;
  }
}

/**
 * 上传文件到阿里云OSS
 * @param {string} filePath - 本地文件路径
 * @param {string} objectKey - 对象键
 * @param {string} mimeType - 文件MIME类型
 * @returns {Promise<Object>} 上传结果
 */
async function uploadToOSS(filePath, objectKey, mimeType) {
  try {
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
      publicUrl,
      storageType: 'OSS'
    };
  } catch (error) {
    logger.error(`上传文件到阿里云OSS失败: ${error.message}`);
    throw error;
  }
}

/**
 * 删除存储对象
 * @param {string} objectKey - 对象键
 * @returns {Promise<Object>} 删除结果
 */
async function deleteObject(objectKey) {
  try {
    logger.info(`正在删除对象: ${objectKey}`);
    
    // 根据配置选择存储服务
    if (isUsingR2Storage()) {
      return await deleteFromR2(objectKey);
    } else {
      return await deleteFromOSS(objectKey);
    }
  } catch (error) {
    logger.error(`删除对象失败: ${error.message}`);
    throw error;
  }
}

/**
 * 从Cloudflare R2删除对象
 * @param {string} objectKey - 对象键
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFromR2(objectKey) {
  try {
    const r2 = getR2Client();
    const config = getStorageConfig();
    
    // 初始化存储桶实例
    const bucket = r2.bucket(config.bucketName);
    
    // 删除对象
    const result = await bucket.deleteObject(objectKey);
    
    logger.info(`对象删除成功: ${objectKey}`);
    
    return {
      objectKey,
      success: true,
      storageType: 'R2'
    };
  } catch (error) {
    logger.error(`从Cloudflare R2删除对象失败: ${error.message}`);
    throw error;
  }
}

/**
 * 从阿里云OSS删除对象
 * @param {string} objectKey - 对象键
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFromOSS(objectKey) {
  try {
    const client = getOSSClient();
    
    // 删除对象
    const result = await client.delete(objectKey);
    
    logger.info(`对象删除成功: ${objectKey}`);
    
    return {
      objectKey,
      success: true,
      storageType: 'OSS'
    };
  } catch (error) {
    logger.error(`从阿里云OSS删除对象失败: ${error.message}`);
    throw error;
  }
}

module.exports = {
  uploadFile,
  deleteObject,
  getStorageType: isUsingR2Storage() ? 'R2' : 'OSS'
}; 