/**
 * 数据库种子脚本
 * 用于初始化基础数据
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 示例转录结果数据
const sampleTranscriptions = [
  {
    id: uuidv4(),
    fileName: 'sample_audio_1.mp3',
    fileSize: 1024000,
    duration: 65,
    status: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: {
      text: '这是一个示例转录文本，用于测试应用功能。语音转文字工具可以帮助用户快速将音频内容转换为文本。',
      language: 'zh-CN',
      segments: [
        {
          text: '这是一个示例转录文本，用于测试应用功能。',
          startTime: 0,
          endTime: 3.2
        },
        {
          text: '语音转文字工具可以帮助用户快速将音频内容转换为文本。',
          startTime: 3.5,
          endTime: 7.8
        }
      ]
    }
  },
  {
    id: uuidv4(),
    fileName: 'sample_audio_2.wav',
    fileSize: 2048000,
    duration: 120,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1天前
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    result: {
      text: 'This is a sample transcription text for testing application features. The voice-to-text tool can help users quickly convert audio content to text.',
      language: 'en-US',
      segments: [
        {
          text: 'This is a sample transcription text for testing application features.',
          startTime: 0,
          endTime: 4.5
        },
        {
          text: 'The voice-to-text tool can help users quickly convert audio content to text.',
          startTime: 4.8,
          endTime: 9.2
        }
      ]
    }
  }
];

// 确保数据目录存在
const dataDir = path.join(__dirname, '../backend/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('创建数据目录:', dataDir);
}

// 写入示例转录数据
const transcriptionsFile = path.join(dataDir, 'transcriptions.json');
fs.writeFileSync(
  transcriptionsFile,
  JSON.stringify(sampleTranscriptions, null, 2)
);
console.log('已写入示例转录数据:', transcriptionsFile);

// 创建示例音频文件（空文件，仅用于测试）
const uploadsDir = path.join(__dirname, '../backend/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('创建上传目录:', uploadsDir);
}

// 创建示例音频文件
sampleTranscriptions.forEach(sample => {
  const filePath = path.join(uploadsDir, sample.fileName);
  // 创建空文件
  fs.writeFileSync(filePath, '');
  console.log('创建示例音频文件:', filePath);
});

console.log('数据初始化完成!');
console.log('可以通过以下API访问示例数据:');
console.log(`GET /api/v1/transcriptions/${sampleTranscriptions[0].id}`);
console.log(`GET /api/v1/transcriptions/${sampleTranscriptions[0].id}/result`);

// 如果需要清理示例数据，可以运行：
// node scripts/clean-seed-data.js 