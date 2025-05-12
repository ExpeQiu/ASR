# API接口规范 - 语音转文字工具

## 目录
1. API概述
2. 基础规范
3. 认证方式
4. 请求格式
5. 响应格式
6. 错误处理
7. API端点详情
8. 状态码使用
9. 第三方API集成
10. 安全最佳实践

## 1. API概述

本文档定义了语音转文字工具的API接口规范，包括内部应用API和与第三方语音识别服务的集成接口。API设计遵循RESTful原则，提供简洁、一致且安全的数据交互方式。

### 使用场景
- 前端应用上传音频文件到后端
- 后端与第三方语音识别API交互
- 前端获取转录状态和结果

### 版本控制
- 当前API版本: v1
- API路径前缀: `/api/v1`

## 2. 基础规范

### 通用准则
- 使用HTTPS协议确保传输安全
- URI使用小写字母，单词间使用连字符（-）分隔
- API端点使用名词复数形式（如`/files`而非`/file`）
- 使用JSON作为数据交换格式
- 支持跨域资源共享(CORS)

### URL结构
```
https://[域名]/api/v1/[资源]/[资源ID]
```

示例:
- `https://example.com/api/v1/files` - 获取所有文件列表
- `https://example.com/api/v1/files/1234` - 获取ID为1234的文件

### 版本迭代
当API需要进行不兼容更新时，版本号递增:
- `/api/v1/files` → `/api/v2/files`

## 3. 认证方式

内部API采用简单的API密钥认证方式：

### API密钥认证
- 请求头中包含API密钥: 
  ```
  X-API-Key: your_api_key_here
  ```

### 第三方API认证
与阿里云语音识别API交互时，使用阿里云SDK提供的认证机制：
- AccessKey + AccessSecret
- 临时安全令牌（STS）

## 4. 请求格式

### 内容类型
所有请求和响应使用JSON格式，除非是文件上传：
```
Content-Type: application/json
```

文件上传使用：
```
Content-Type: multipart/form-data
```

### HTTP动词使用
- GET: 获取资源
- POST: 创建资源或触发操作
- PUT: 完全替换资源
- PATCH: 部分更新资源
- DELETE: 删除资源

### 查询参数
- 分页: `?page=1&per_page=20`
- 排序: `?sort=created_at&order=desc`
- 过滤: `?status=completed`

### 请求体示例
```json
{
  "fileId": "a1b2c3d4",
  "options": {
    "language": "zh-CN",
    "enableTimestamps": true,
    "template": "default"
  }
}
```

## 5. 响应格式

### 通用响应结构
所有API响应遵循统一的JSON格式：

```json
{
  "success": true,  // 请求是否成功
  "data": {},       // 主要数据（成功时）
  "error": null,    // 错误信息（失败时）
  "meta": {         // 元数据（分页信息等）
    "pagination": {
      "total": 100,
      "page": 1,
      "per_page": 20,
      "total_pages": 5
    }
  }
}
```

### 成功响应示例
```json
{
  "success": true,
  "data": {
    "fileId": "a1b2c3d4",
    "originalName": "meeting.mp3",
    "status": "completed",
    "transcription": "这是转录的文本内容...",
    "createdAt": "2025-05-15T08:30:45Z"
  },
  "error": null,
  "meta": {}
}
```

### 错误响应示例
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "FILE_NOT_FOUND",
    "message": "找不到指定的文件",
    "details": "ID 'a1b2c3d4' 不存在或已被删除"
  },
  "meta": {}
}
```

## 6. 错误处理

### 错误码
应用使用自定义错误码，格式为大写字母和下划线的组合：

| 错误码 | 描述 | HTTP状态码 |
|--------|------|------------|
| INVALID_REQUEST | 请求格式错误 | 400 |
| UNAUTHORIZED | 未认证或认证失败 | 401 |
| FORBIDDEN | 无权限访问资源 | 403 |
| FILE_NOT_FOUND | 找不到请求的文件 | 404 |
| RESOURCE_NOT_FOUND | 找不到请求的资源 | 404 |
| METHOD_NOT_ALLOWED | 请求方法不允许 | 405 |
| FILE_TOO_LARGE | 文件大小超过限制 | 413 |
| UNSUPPORTED_MEDIA_TYPE | 不支持的文件格式 | 415 |
| API_ERROR | 第三方API调用错误 | 500 |
| SERVER_ERROR | 服务器内部错误 | 500 |
| SERVICE_UNAVAILABLE | 服务暂时不可用 | 503 |

### 错误处理最佳实践
- 提供有用的错误信息，帮助快速定位问题
- 在日志中记录更详细的错误信息
- 敏感信息（如API密钥、路径）不应出现在错误消息中
- 对于前端，提供用户友好的错误信息

## 7. API端点详情

### 文件上传与处理相关API

#### 上传音频文件
```
POST /api/v1/files
```
- 描述: 上传新的音频文件
- 请求体格式: `multipart/form-data`
- 请求参数:
  - `audioFile`: (必需) 音频文件
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "fileId": "a1b2c3d4",
      "originalName": "meeting.mp3",
      "size": 5242880,
      "mimeType": "audio/mp3",
      "status": "pending",
      "createdAt": "2025-05-15T08:30:45Z"
    },
    "error": null,
    "meta": {}
  }
  ```

#### 获取文件列表
```
GET /api/v1/files
```
- 描述: 获取已上传文件列表
- 查询参数:
  - `page`: 页码（默认1）
  - `per_page`: 每页数量（默认20）
  - `status`: 过滤状态（可选）
- 成功响应:
  ```json
  {
    "success": true,
    "data": [
      {
        "fileId": "a1b2c3d4",
        "originalName": "meeting.mp3",
        "size": 5242880,
        "status": "completed",
        "createdAt": "2025-05-15T08:30:45Z"
      },
      // ... 更多文件
    ],
    "error": null,
    "meta": {
      "pagination": {
        "total": 35,
        "page": 1,
        "per_page": 20,
        "total_pages": 2
      }
    }
  }
  ```

#### 获取单个文件信息
```
GET /api/v1/files/{fileId}
```
- 描述: 获取指定文件的详细信息
- 路径参数:
  - `fileId`: 文件ID
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "fileId": "a1b2c3d4",
      "originalName": "meeting.mp3",
      "size": 5242880,
      "mimeType": "audio/mp3",
      "status": "completed",
      "progress": 100,
      "createdAt": "2025-05-15T08:30:45Z",
      "updatedAt": "2025-05-15T08:32:15Z" 
    },
    "error": null,
    "meta": {}
  }
  ```

#### 删除文件
```
DELETE /api/v1/files/{fileId}
```
- 描述: 删除指定的文件
- 路径参数:
  - `fileId`: 文件ID
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "deleted": true,
      "fileId": "a1b2c3d4"
    },
    "error": null,
    "meta": {}
  }
  ```

### 转录相关API

#### 开始转录
```
POST /api/v1/transcriptions
```
- 描述: 开始文件转录过程
- 请求体:
  ```json
  {
    "fileId": "a1b2c3d4",
    "options": {
      "language": "zh-CN",
      "enableTimestamps": true,
      "speakerSeparation": false
    }
  }
  ```
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "transcriptionId": "t5678",
      "fileId": "a1b2c3d4",
      "status": "processing",
      "estimatedTime": 60, // 预估完成时间（秒）
      "createdAt": "2025-05-15T08:31:00Z"
    },
    "error": null,
    "meta": {}
  }
  ```

#### 获取转录状态
```
GET /api/v1/transcriptions/{transcriptionId}
```
- 描述: 获取转录任务状态
- 路径参数:
  - `transcriptionId`: 转录任务ID
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "transcriptionId": "t5678",
      "fileId": "a1b2c3d4",
      "status": "processing", // pending, processing, completed, failed
      "progress": 65, // 进度百分比
      "createdAt": "2025-05-15T08:31:00Z",
      "updatedAt": "2025-05-15T08:31:30Z"
    },
    "error": null,
    "meta": {}
  }
  ```

#### 获取转录结果
```
GET /api/v1/transcriptions/{transcriptionId}/result
```
- 描述: 获取完成的转录结果
- 路径参数:
  - `transcriptionId`: 转录任务ID
- 查询参数:
  - `template`: 输出模板（可选，默认值为"default"）
- 成功响应:
  ```json
  {
    "success": true,
    "data": {
      "transcriptionId": "t5678",
      "fileId": "a1b2c3d4",
      "status": "completed",
      "text": "这是转录的文本内容...",
      "segments": [
        {
          "start": 0.5,
          "end": 4.2,
          "text": "第一句话...",
          "speaker": "A" // 如果启用说话人分离
        },
        // ... 更多文本段落
      ],
      "metadata": {
        "duration": 45.6, // 音频时长（秒）
        "language": "zh-CN",
        "audioQuality": "high"
      },
      "createdAt": "2025-05-15T08:31:00Z",
      "completedAt": "2025-05-15T08:32:15Z"
    },
    "error": null,
    "meta": {}
  }
  ```

## 8. 状态码使用

API使用标准HTTP状态码表示请求处理状态：

| 状态码 | 描述 | 使用场景 |
|--------|------|---------|
| 200 | OK | 请求成功 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 成功处理但无返回内容（如DELETE操作） |
| 400 | Bad Request | 请求格式错误、参数无效 |
| 401 | Unauthorized | 未提供认证或认证无效 |
| 403 | Forbidden | 无权限访问资源 |
| 404 | Not Found | 请求的资源不存在 |
| 405 | Method Not Allowed | 请求方法不支持 |
| 413 | Payload Too Large | 上传文件过大 |
| 415 | Unsupported Media Type | 不支持的文件类型 |
| 429 | Too Many Requests | 请求过于频繁，触发限流 |
| 500 | Internal Server Error | 服务器内部错误 |
| 502 | Bad Gateway | 第三方API调用失败 |
| 503 | Service Unavailable | 服务暂时不可用 |

## 9. 第三方API集成

### 阿里云语音识别API集成

#### 认证配置
```javascript
// 阿里云API认证示例
const aliCloudAuth = {
  accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
  endpoint: 'http://nls-meta.cn-shanghai.aliyuncs.com',
  apiVersion: '2019-02-28'
};
```

#### 请求参数映射
将内部API参数转换为阿里云API所需参数：

| 内部参数 | 阿里云参数 | 描述 |
|---------|------------|------|
| language | language | 语言代码（zh-CN等） |
| enableTimestamps | enable_timestamps | 是否启用时间戳 |
| speakerSeparation | enable_speaker_separation | 是否启用说话人分离 |

#### 响应处理
将阿里云API响应转换为内部API格式：

```javascript
// 阿里云API响应转换示例
const transformAliyunResponse = (aliyunResponse) => {
  return {
    text: aliyunResponse.result,
    segments: aliyunResponse.segments.map(segment => ({
      start: segment.begin_time,
      end: segment.end_time,
      text: segment.text,
      speaker: segment.speaker_id
    })),
    metadata: {
      duration: aliyunResponse.duration,
      language: aliyunResponse.language,
      audioQuality: aliyunResponse.audio_quality
    }
  };
};
```

## 10. 安全最佳实践

### API安全措施
1. **使用HTTPS**
   - 所有API通信必须使用HTTPS加密
   - 配置适当的TLS版本和加密套件

2. **认证与授权**
   - API密钥定期轮换
   - 遵循最小权限原则
   - 可设置API密钥过期时间

3. **输入验证**
   - 验证所有API请求参数
   - 防止注入攻击和恶意输入

4. **限流措施**
   ```javascript
   // 限流中间件示例
   const rateLimit = require('express-rate-limit');
   
   const apiLimiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15分钟窗口
     max: 100, // 每个IP限制请求数
     message: {
       success: false,
       error: {
         code: 'TOO_MANY_REQUESTS',
         message: '请求过于频繁，请稍后再试'
       }
     }
   });
   
   // 应用到API路由
   app.use('/api/', apiLimiter);
   ```

5. **敏感信息处理**
   - API密钥不应出现在URL
   - 错误信息不应泄露敏感细节
   - 日志记录中脱敏处理

6. **跨域设置**
   ```javascript
   // CORS配置示例
   const cors = require('cors');
   
   const corsOptions = {
     origin: process.env.ALLOWED_ORIGINS.split(','),
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
     maxAge: 86400 // 24小时
   };
   
   app.use(cors(corsOptions));
   ```

7. **安全响应头**
   ```javascript
   // 安全头设置示例
   const helmet = require('helmet');
   app.use(helmet());
   ```

8. **第三方API凭证保护**
   - 使用环境变量存储凭证
   - 服务器端存储，从不传递给客户端
   - 考虑使用密钥管理服务 