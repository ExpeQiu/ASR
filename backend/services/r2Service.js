/**
 * Cloudflare R2 存储服务
 * 提供文件上传到 R2 存储并生成公开访问 URL 的功能
 * 使用 node-cloudflare-r2 库
 */
const { R2 } = require('node-cloudflare-r2');
const fs = require('fs');
const path = require('path');
const { logger } = require('../utils/logger');

// 从环境变量获取 R2 配置
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// 打印配置信息（不包含敏感信息）
logger.info(`R2 配置信息: 账号ID=${R2_ACCOUNT_ID}, 存储桶=${R2_BUCKET_NAME}, 公开URL=${R2_PUBLIC_URL || '未配置'}`);

// 初始化 R2 客户端
let r2Client = null;
let bucket = null;

try {
  r2Client = new R2({
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  });

  // 初始化存储桶实例
  bucket = r2Client.bucket(R2_BUCKET_NAME);

  // 如果存储桶允许公共访问，提供公共 URL
  if (R2_PUBLIC_URL) {
    bucket.provideBucketPublicUrl(R2_PUBLIC_URL);
  }

  logger.info('R2 客户端初始化成功');
} catch (error) {
  logger.error(`R2 客户端初始化失败: ${error.message}`, error);
}

/**
 * 检查 R2 配置是否有效
 * @returns {boolean} 配置是否有效
 */
function isR2Configured() {
  return R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME && bucket !== null;
}

/**
 * 将文件上传到 R2 存储
 * @param {string} filePath - 本地文件路径
 * @param {string} key - 存储的文件名/键
 * @param {string} contentType - 文件的 MIME 类型
 * @returns {Promise<Object>} 上传结果，包含公开访问 URL
 */
async function uploadFileToR2(filePath, key, contentType) {
  try {
    if (!isR2Configured()) {
      throw new Error('R2 存储未配置，请检查环境变量');
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 上传文件
    const result = await bucket.uploadFile(filePath, key);

    logger.info(`文件已成功上传到 R2: ${key}`, { size: fs.statSync(filePath).size });

    return {
      key,
      publicUrl: result.publicUrl,
      etag: result.etag,
      size: fs.statSync(filePath).size
    };
  } catch (error) {
    logger.error(`上传文件到 R2 失败: ${error.message}`, error);
    throw error;
  }
}

/**
 * 生成文件的预签名 URL
 * @param {string} key - 文件的键/路径
 * @param {number} expiresIn - URL 有效期（秒）
 * @returns {Promise<string>} 预签名 URL
 */
async function generatePresignedUrl(key, expiresIn = 3600) {
  try {
    if (!isR2Configured()) {
      throw new Error('R2 存储未配置，请检查环境变量');
    }

    // 生成预签名 URL
    const url = await bucket.getObjectSignedUrl(key, expiresIn);
    
    logger.info(`已为文件生成预签名 URL: ${key}`, { expiresIn });
    return url;
  } catch (error) {
    logger.error(`生成预签名 URL 失败: ${error.message}`, error);
    throw error;
  }
}

/**
 * 检查存储桶是否存在
 * @returns {Promise<boolean>} 存储桶是否存在
 */
async function checkBucketExists() {
  try {
    if (!isR2Configured()) {
      throw new Error('R2 存储未配置，请检查环境变量');
    }

    const exists = await bucket.exists();
    logger.info(`存储桶 "${R2_BUCKET_NAME}" 是否存在: ${exists ? '是' : '否'}`);
    return exists;
  } catch (error) {
    logger.error(`检查存储桶是否存在失败: ${error.message}`, error);
    return false;
  }
}

/**
 * 列出存储桶中的所有对象
 * @returns {Promise<Array>} 对象列表
 */
async function listObjects() {
  try {
    if (!isR2Configured()) {
      throw new Error('R2 存储未配置，请检查环境变量');
    }

    // 修正：使用正确的方法名 listObjects 而不是 list
    const objects = await bucket.listObjects();
    
    if (Array.isArray(objects)) {
      logger.info(`列出存储桶中的对象: 找到 ${objects.length} 个对象`);
      return objects;
    } else {
      logger.warn(`列出存储桶对象返回的不是数组: ${typeof objects}`);
      return [];
    }
  } catch (error) {
    logger.error(`列出存储桶对象失败: ${error.message}`, error);
    if (error.code) {
      logger.error(`错误代码: ${error.code}`);
    }
    if (error.stack) {
      logger.debug(`错误堆栈: ${error.stack}`);
    }
    return [];
  }
}

module.exports = {
  isR2Configured,
  uploadFileToR2,
  generatePresignedUrl,
  checkBucketExists,
  listObjects
}; 