/**
 * 文件处理工具模块
 */
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { logFileOperation } = require('./logger');

/**
 * 获取文件扩展名
 * @param {string} filename - 文件名
 * @returns {string} 文件扩展名（小写）
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * 检查文件类型是否允许
 * @param {string} filename - 文件名
 * @returns {boolean} 是否允许
 */
const isAllowedFileType = (filename) => {
  const allowedFormats = (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,flac').split(',');
  const ext = getFileExtension(filename).replace('.', '');
  return allowedFormats.includes(ext);
};

/**
 * 生成安全的文件名
 * @param {string} originalFilename - 原始文件名
 * @returns {string} 安全的文件名
 */
const generateSafeFilename = (originalFilename) => {
  const ext = getFileExtension(originalFilename);
  const uuid = uuidv4();
  return `${uuid}${ext}`;
};

/**
 * 保存上传的文件
 * @param {Object} file - 上传的文件对象
 * @param {string} destDir - 目标目录
 * @returns {Promise<Object>} 保存的文件信息
 */
const saveUploadedFile = (file, destDir = 'uploads') => {
  return new Promise((resolve, reject) => {
    try {
      // 确保目标目录存在
      const uploadDir = path.join(__dirname, '..', destDir);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      // 生成安全的文件名
      const safeFilename = generateSafeFilename(file.originalname);
      const filePath = path.join(uploadDir, safeFilename);
      
      // 创建写入流
      const writeStream = fs.createWriteStream(filePath);
      
      // 处理错误
      writeStream.on('error', (err) => {
        reject(err);
      });
      
      // 完成写入
      writeStream.on('finish', () => {
        const fileInfo = {
          originalName: file.originalname,
          filename: safeFilename,
          path: filePath,
          size: file.size,
          mimetype: file.mimetype
        };
        
        logFileOperation('保存文件', filePath, { originalName: file.originalname, size: file.size });
        resolve(fileInfo);
      });
      
      // 写入文件
      if (file.buffer) {
        // 如果文件已经在内存中（如multer的内存存储）
        writeStream.write(file.buffer);
        writeStream.end();
      } else if (file.path) {
        // 如果文件已经在磁盘上（如multer的磁盘存储）
        const readStream = fs.createReadStream(file.path);
        readStream.pipe(writeStream);
      } else {
        reject(new Error('无效的文件对象'));
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 删除文件
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 是否成功删除
 */
const deleteFile = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      logFileOperation('删除文件', filePath);
      return true;
    }
    return false;
  } catch (err) {
    logFileOperation('删除文件失败', filePath, { error: err.message });
    throw err;
  }
};

/**
 * 获取文件信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 文件信息
 */
const getFileInfo = async (filePath) => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      isDirectory: stats.isDirectory()
    };
  } catch (err) {
    throw err;
  }
};

/**
 * 清理临时文件
 * @param {string} directory - 目录路径
 * @param {number} maxAge - 最大存活时间（毫秒）
 * @returns {Promise<number>} 删除的文件数量
 */
const cleanupTempFiles = async (directory, maxAge = 24 * 60 * 60 * 1000) => {
  try {
    const files = await fs.promises.readdir(directory);
    const now = Date.now();
    let deletedCount = 0;
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.promises.stat(filePath);
      
      if (!stats.isDirectory() && now - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        deletedCount++;
        logFileOperation('清理临时文件', filePath);
      }
    }
    
    return deletedCount;
  } catch (err) {
    throw err;
  }
};

module.exports = {
  getFileExtension,
  isAllowedFileType,
  generateSafeFilename,
  saveUploadedFile,
  deleteFile,
  getFileInfo,
  cleanupTempFiles
}; 