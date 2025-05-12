/**
 * 清理种子数据脚本
 * 用于清理由seed-data.js创建的示例数据
 */

const fs = require('fs');
const path = require('path');

console.log('开始清理示例数据...');

// 清理转录数据文件
const transcriptionsFile = path.join(__dirname, '../backend/data/transcriptions.json');
if (fs.existsSync(transcriptionsFile)) {
  try {
    // 读取现有数据
    const data = JSON.parse(fs.readFileSync(transcriptionsFile, 'utf8'));
    
    // 获取示例文件名列表，用于后续清理上传文件
    const sampleFileNames = data.map(item => item.fileName);
    
    // 清理示例音频文件
    const uploadsDir = path.join(__dirname, '../backend/uploads');
    if (fs.existsSync(uploadsDir)) {
      sampleFileNames.forEach(fileName => {
        const filePath = path.join(uploadsDir, fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('已删除示例音频文件:', filePath);
        }
      });
    }
    
    // 清空转录数据文件
    fs.writeFileSync(transcriptionsFile, JSON.stringify([], null, 2));
    console.log('已清空转录数据文件:', transcriptionsFile);
  } catch (error) {
    console.error('清理数据时出错:', error.message);
  }
} else {
  console.log('转录数据文件不存在，无需清理');
}

console.log('示例数据清理完成!'); 