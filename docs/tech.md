# 技术文档 - 语音转文字工具

## 目录
1. 技术架构概述
2. 前端技术栈
3. 后端技术栈
4. API集成规范
5. 数据流程
6. 部署环境
7. 开发规范
8. 安全措施
9. 性能优化
10. 测试策略

## 1. 技术架构概述

语音转文字工具采用前后端分离的Web应用架构，以实现高效的音频文件上传、处理和文本输出功能。系统主要由前端用户界面、后端服务和第三方API集成三部分组成。

### 系统架构图
```
+----------------+      +---------------+      +-------------------+
|                |      |               |      |                   |
|  客户端浏览器  +----->+  后端服务     +----->+  第三方语音识别API |
|  (前端应用)    |      |  (文件处理)   |      |  (转录处理)       |
|                |      |               |      |                   |
+-------^--------+      +-------+-------+      +-------------------+
        |                       |
        |                       |
        +---------------------------------------+
                        返回转录结果
```

## 2. 前端技术栈

### 核心技术
- **HTML5**: 提供语义化结构和基础页面元素
- **CSS3**: 样式设计，包括Flexbox布局、动画和响应式设计
- **JavaScript (ES6+)**: 客户端逻辑和交互实现

### 选择理由
- 轻量级实现，无需复杂框架
- 适合单页应用的简单功能需求
- 易于维护和扩展

### 关键功能实现
- **文件上传**: 使用HTML5 File API和FormData
- **拖放功能**: 使用HTML5 Drag and Drop API
- **进度显示**: XMLHttpRequest的progress事件监听
- **用户界面交互**: 原生DOM操作和事件处理
- **下载功能**: Blob和URL.createObjectURL实现

### 代码结构
- HTML结构采用语义化标签，清晰分区
- CSS遵循BEM命名约定
- JavaScript采用模块化组织，分离UI和业务逻辑

## 3. 后端技术栈

### 核心技术
- **Node.js**: JavaScript运行时环境
- **Express.js**: Web应用框架
- **Multer**: 处理文件上传的中间件

### 选择理由
- JavaScript全栈开发，减少技术切换成本
- Express轻量级框架，适合API服务开发
- 丰富的NPM生态系统支持

### 数据存储
- **文件系统**: 临时存储上传文件
- **环境变量**: 存储配置信息和API密钥
- **可选**: 添加轻量级数据库如SQLite或MongoDB（如需持久化存储）

### API端点设计
| 端点 | 方法 | 功能描述 |
|------|------|----------|
| `/api/upload` | POST | 接收上传的音频文件 |
| `/api/transcribe` | POST | 触发文件转录流程 |
| `/api/status/:id` | GET | 获取转录任务状态 |
| `/api/result/:id` | GET | 获取转录结果 |

## 4. API集成规范

### 第三方API集成
优先考虑阿里云智能语音服务：
- 服务名称: 阿里云百炼语音识别
- API文档: https://help.aliyun.com/zh/model-studio/sensevoice-speech-recognition/

### 认证与安全
- API密钥存储在环境变量中，不硬编码
- 所有API请求使用HTTPS
- 实现请求限流以控制API使用量

### 请求处理
```javascript
// API请求示例
const transcribeAudio = async (audioFilePath, config) => {
  try {
    // 从环境变量获取API密钥
    const API_KEY = process.env.ALIYUN_API_KEY;
    const API_SECRET = process.env.ALIYUN_API_SECRET;
    
    // 构建请求参数
    const params = {
      audioFile: fs.createReadStream(audioFilePath),
      language: config.language || 'zh-CN',
      // 其他参数
    };
    
    // 发送请求到阿里云API
    const response = await axios.post('https://api-endpoint-url', params, {
      headers: {
        'Authorization': generateAuthHeader(API_KEY, API_SECRET),
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('转录API调用失败:', error);
    throw new Error('语音转文字处理失败');
  }
};
```

### 响应解析
- 解析API返回的JSON响应
- 统一错误处理和日志记录
- 将原始结果转换为应用所需格式

## 5. 数据流程

### 文件上传流程
1. 用户通过界面选择音频文件
2. 文件通过XHR上传到后端
3. 后端验证文件格式和大小
4. 文件临时存储在服务器

### 转录处理流程
1. 接收上传的音频文件
2. 准备API请求参数
3. 调用第三方语音识别API
4. 接收并解析API响应
5. 存储处理结果
6. 向前端返回转录状态和结果

### 错误处理流程
1. 捕获各阶段可能的错误
2. 记录详细错误日志
3. 向用户返回友好的错误消息
4. 提供错误恢复建议

## 6. 部署环境

### 开发环境
- Node.js v16+
- npm 或 yarn 包管理器
- 本地开发服务器（localhost）
- 环境变量管理：dotenv

### 生产环境
- 轻量级云服务器
- 反向代理：Nginx
- 进程管理：PM2
- HTTPS证书：Let's Encrypt

### 环境变量配置
```
# 服务器配置
PORT=3000
NODE_ENV=production

# API配置
ALIYUN_API_KEY=your_api_key
ALIYUN_API_SECRET=your_api_secret
API_ENDPOINT=https://api-endpoint-url

# 文件配置
MAX_FILE_SIZE=52428800  # 50MB in bytes
ALLOWED_FORMATS=mp3,wav,m4a,flac
UPLOAD_DIR=./uploads
```

## 7. 开发规范

### 代码风格
- 使用ESLint确保代码质量
- 遵循Airbnb JavaScript风格指南
- 使用Prettier进行代码格式化

### 命名约定
- 变量和函数：camelCase
- 类和组件：PascalCase
- 常量：UPPER_SNAKE_CASE
- CSS类名：kebab-case或BEM

### 注释规范
- 文件顶部添加文件说明
- 函数前添加JSDoc风格注释
- 复杂逻辑处添加行内注释
- 中文注释针对关键业务逻辑

### Git工作流
- 主分支：main/master
- 开发分支：dev
- 功能分支：feature/xxx
- 提交信息格式：`类型(范围): 描述`

## 8. 安全措施

### 文件上传安全
- 严格验证文件MIME类型
- 限制文件大小（50MB上限）
- 文件名安全处理和随机化
- 定期清理临时文件

### API安全
- 安全存储API密钥（环境变量）
- 实现请求限流和监控
- 敏感信息不传递给前端

### Web安全
- 实现CORS策略
- 防御XSS攻击
- 使用Helmet设置安全HTTP头
- 所有API请求使用HTTPS

## 9. 性能优化

### 前端优化
- 压缩静态资源（JS, CSS）
- 使用浏览器缓存
- 懒加载大资源
- 避免DOM频繁操作

### 后端优化
- 流式处理上传文件
- 实现请求队列管理
- 添加响应缓存
- 长任务使用异步处理

### 文件处理优化
- 大文件分块上传
- 实现断点续传
- 文件处理进度实时反馈
- 针对大文件实现后台处理

## 10. 测试策略

### 单元测试
- 前端：Jest
- 后端：Mocha + Chai

### 集成测试
- API测试：Supertest
- 前后端集成：Cypress

### 性能测试
- 负载测试：Apache JMeter
- 上传性能：大文件处理测试

### 手动测试
- 跨浏览器兼容性测试
- 用户界面交互测试
- 错误场景验证

## 阿里云语音识别API集成

### 概述

项目集成了阿里云SenseVoice录音语音识别RESTful API，用于将音频文件转换为文本。该API支持50多种语言的识别，具备情感分析和音频事件检测功能，并默认提供标点符号预测及逆文本正则化能力。

### 配置要求

1. **API密钥配置**：
   - 在`.env`文件中配置`DASHSCOPE_API_KEY`环境变量
   - 示例：`DASHSCOPE_API_KEY=your_api_key_here`

2. **支持的音频格式**：
   - 支持格式：aac、amr、avi、flac、flv、m4a、mkv、mov、mp3、mp4、mpeg、ogg、opus、wav、webm、wma、wmv
   - 文件大小限制：不超过2GB
   - 无时长限制

3. **语言支持**：
   - 支持50多种语言，包括中文、英文、粤语、日语、韩语等
   - 默认支持中文和英文
   - 每次只支持识别一种语言

### API集成实现

1. **工具类**：
   - 位置：`backend/utils/aliVoiceUtils.js`
   - 主要功能：提交任务、查询任务状态、等待任务完成、验证API配置

2. **服务类**：
   - 位置：`backend/services/transcriptionService.js`
   - 主要功能：文件转录处理、转录结果格式化、状态管理

3. **API健康检查**：
   - 端点：`/api/health/alivoice`
   - 脚本：`backend/scripts/checkApiHealth.js`
   - 验证工具：`backend/checkAliVoiceApi.js`

### 使用流程

1. **配置验证**：
   ```bash
   # 验证API配置
   npm run check:alivoice
   
   # 验证API健康状态
   npm run check:api
   ```

2. **转录流程**：
   - 上传音频文件：`POST /api/files`
   - 触发转录处理：`POST /api/transcribe`（提供fileId）
   - 查询转录状态：`GET /api/status/:fileId`
   - 获取转录结果：`GET /api/result/:fileId`

### 注意事项

1. 服务不支持本地音/视频文件直传，需要先将文件上传到可公开访问的URL
2. 不支持前端直接调用API，需通过后端中转
3. 批处理音频数目：单次请求最多支持100个文件URL

### 阿里云语音识别API参数格式

阿里云语音识别API（SenseVoice）需要严格按照以下格式提交请求：

```javascript
// 正确的参数格式
const requestData = {
  model: "sensevoice-v1", // 使用阿里云录音文件识别模型
  input: {
    file_urls: ["https://your-public-url.com/audio.mp3"] // 文件URL数组
  },
  parameters: {
    language_hints: ["zh"] // 语言设置，必须是数组格式
  }
};

// 请求头设置
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${apiKey}`,
  'X-DashScope-Async': 'enable' // 启用异步处理
};
```

**注意事项：**
1. `language_hints` 必须是数组格式，即使只有一种语言
2. `file_urls` 也必须是数组格式，可包含多个文件URL
3. 异步任务需要设置 `X-DashScope-Async: enable` 请求头
4. 任务提交后，需要通过任务ID查询结果
5. 任务完成后，需要通过 `transcription_url` 获取实际转录内容

### 错误处理

常见错误码及处理方式：

| 错误代码 | 错误信息 | 含义说明 |
|---------|---------|---------|
| InvalidFile.DecodeFailed | The audio file cannot be decoded. | 无法解码文件。请检查文件编码是否正确，并确认文件为正确的音频格式。 |
| InvalidParameter | task can not be null | 任务ID为空。确保正确传递任务ID进行查询。 |
| InvalidParameter | Model not exist | 模型不存在。确保使用正确的模型名称（sensevoice-v1）。 |
| Throttling.AllocationQuota | quota exceeded | API配额超限。检查账户配额或降低请求频率。 |

更多错误码请参考[阿里云文档](https://help.aliyun.com/zh/model-studio/developer-reference/sensevoice-recorded-speech-recognition-restful-api)。 