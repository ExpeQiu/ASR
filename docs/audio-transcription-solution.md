# 音频转录解决方案：使用阿里云OSS和阿里云语音识别API

## 背景

我们的音频转录系统需要将音频文件上传到云存储，然后通过阿里云语音识别API进行转录。经过测试，我们发现阿里云API无法下载Cloudflare R2存储的文件，即使配置了CORS策略和添加了自定义请求头。因此，我们决定使用阿里云OSS作为默认存储服务，确保阿里云API能够正常访问和下载文件。

## 解决方案架构

我们实现了一个统一的存储服务接口，支持Cloudflare R2和阿里云OSS两种存储方式，并默认使用阿里云OSS。系统架构如下：

1. **存储配置模块**（`storageConfig.js`）：管理存储服务的选择
2. **统一存储服务**（`storageService.js`）：提供统一的文件上传和删除接口
3. **转录服务**（`transcribeService.js`）：使用统一存储服务接口，调用阿里云语音识别API
4. **测试脚本**（`testStorage.js`）：用于测试统一存储服务和转录功能

## 配置阿里云OSS

### 1. 创建阿里云OSS存储桶

1. 登录[阿里云控制台](https://home.console.aliyun.com/)
2. 进入对象存储OSS服务
3. 创建存储桶，记录以下信息：
   - 存储桶名称（例如：`aisound-audio`）
   - 地域（例如：`oss-cn-beijing`）
   - 访问权限：建议设置为"私有"，通过签名URL访问

### 2. 创建AccessKey

1. 在阿里云控制台中，点击右上角的用户头像
2. 选择"AccessKey管理"
3. 创建AccessKey，记录以下信息：
   - AccessKey ID
   - AccessKey Secret

### 3. 配置环境变量

在项目根目录的`.env`文件中添加以下配置：

```
# 阿里云OSS配置
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
ALIYUN_OSS_REGION=oss-cn-beijing
ALIYUN_OSS_BUCKET=aisound-audio

# 存储配置
# 可选值: R2, OSS
DEFAULT_STORAGE=OSS
```

将`your_access_key_id`和`your_access_key_secret`替换为你的实际AccessKey信息。

## 使用统一存储服务

### 上传文件

```javascript
const storageService = require('./services/storageService');

// 上传文件
const uploadResult = await storageService.uploadFile(filePath, objectKey, mimeType);

console.log('对象键:', uploadResult.objectKey);
console.log('公共URL:', uploadResult.publicUrl);
console.log('存储类型:', uploadResult.storageType);
```

### 删除文件

```javascript
const storageService = require('./services/storageService');

// 删除文件
const deleteResult = await storageService.deleteObject(objectKey);

console.log('删除成功:', deleteResult.success);
console.log('存储类型:', deleteResult.storageType);
```

## 使用转录服务

### 转录音频文件

```javascript
const transcribeService = require('./services/transcribeService');

// 转录选项
const options = {
  language: 'zh', // 语言，默认为"zh"（中文）
  enablePunctuation: true, // 是否启用标点符号，默认为true
  useAsync: true // 是否使用异步转录，默认为true
};

// 转录音频文件
const result = await transcribeService.transcribeAudio(filePath, options);

if (result.status === 'pending') {
  console.log('异步任务ID:', result.taskId);
  
  // 等待任务完成
  const taskResult = await transcribeService.waitForTranscriptionComplete(result.taskId);
  
  if (taskResult.status === 'completed') {
    console.log('转录文本:', taskResult.text);
  }
} else if (result.status === 'completed') {
  console.log('转录文本:', result.text);
}
```

### 查询任务状态

```javascript
const transcribeService = require('./services/transcribeService');

// 查询任务状态
const taskResult = await transcribeService.getTranscriptionStatus(taskId);

console.log('任务状态:', taskResult.status);
```

### 清理文件

```javascript
const transcribeService = require('./services/transcribeService');

// 清理文件
const cleanupResult = await transcribeService.cleanupFile(objectKey);

console.log('清理成功:', cleanupResult.success);
```

## 测试脚本

我们提供了一个测试脚本`scripts/testStorage.js`，用于测试统一存储服务和转录功能：

```bash
# 使用默认存储类型（环境变量中配置的）
node scripts/testStorage.js path/to/audio/file.wav

# 指定使用阿里云OSS
node scripts/testStorage.js path/to/audio/file.wav OSS

# 指定使用Cloudflare R2
node scripts/testStorage.js path/to/audio/file.wav R2
```

## 支持的音频格式

阿里云语音识别API支持以下音频格式：
- WAV
- MP3
- PCM
- AAC
- OGG
- FLAC
- OPUS

## 注意事项

1. 阿里云OSS存储桶的访问权限建议设置为"私有"，通过签名URL访问，以保护音频文件的安全
2. 签名URL默认有效期为7天，可以根据需要调整
3. 阿里云语音识别API有文件大小限制（约15MB），超过限制需要分段处理
4. 转录结果中可能包含特殊标记，需要进行处理（例如`<|.*?\|>`）

## 后续优化

1. 添加音频格式转换功能，支持更多音频格式
2. 实现分段处理，支持超过15MB的大文件
3. 添加转录结果缓存，避免重复转录
4. 优化错误处理和重试机制
5. 添加存储服务切换功能，允许用户在R2和OSS之间切换 