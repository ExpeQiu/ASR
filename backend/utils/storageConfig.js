/**
 * 存储服务配置模块
 * 用于管理存储服务的选择（Cloudflare R2 或 阿里云OSS）
 */
const dotenv = require('dotenv');
const path = require('path');

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

// 存储类型枚举
const STORAGE_TYPES = {
  R2: 'R2',
  OSS: 'OSS'
};

// 从环境变量获取默认存储类型，如果未设置则默认使用OSS
const DEFAULT_STORAGE = process.env.DEFAULT_STORAGE || STORAGE_TYPES.OSS;

/**
 * 获取当前配置的存储类型
 * @returns {string} 存储类型，'R2' 或 'OSS'
 */
function getStorageType() {
  return DEFAULT_STORAGE;
}

/**
 * 检查当前是否使用R2存储
 * @returns {boolean} 如果当前使用R2存储则返回true，否则返回false
 */
function isUsingR2Storage() {
  return getStorageType() === STORAGE_TYPES.R2;
}

/**
 * 检查当前是否使用OSS存储
 * @returns {boolean} 如果当前使用OSS存储则返回true，否则返回false
 */
function isUsingOSSStorage() {
  return getStorageType() === STORAGE_TYPES.OSS;
}

/**
 * 获取存储服务配置
 * @returns {Object} 存储服务配置对象
 */
function getStorageConfig() {
  if (isUsingR2Storage()) {
    return {
      type: STORAGE_TYPES.R2,
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME,
      publicUrl: process.env.R2_PUBLIC_URL
    };
  } else {
    return {
      type: STORAGE_TYPES.OSS,
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-beijing',
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      bucket: process.env.ALIYUN_OSS_BUCKET
    };
  }
}

module.exports = {
  STORAGE_TYPES,
  getStorageType,
  isUsingR2Storage,
  isUsingOSSStorage,
  getStorageConfig
}; 