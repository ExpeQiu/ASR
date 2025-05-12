# 开发指导 - 语音转文字工具

## 目录
1. 开发环境搭建
2. 项目结构
3. 前端开发指南
4. 后端开发指南
5. API集成指南
6. 常见问题解决方案
7. 调试技巧
8. 部署流程

## 1. 开发环境搭建

### 必要条件
- Node.js (v16.0.0+)
- npm (v7.0.0+) 或 yarn (v1.22.0+)
- 现代浏览器（Chrome、Firefox、Safari或Edge最新版）
- 代码编辑器（推荐：VS Code）

### 环境配置
1. **克隆代码库**:
   ```bash
   git clone https://github.com/yourusername/AIsound.git
   cd AIsound
   ```

2. **安装依赖**:
   ```bash
   # 使用npm
   npm install
   
   # 或使用yarn
   yarn install
   ```

3. **配置环境变量**:
   - 在项目根目录创建`.env`文件
   - 参考`.env.example`文件添加必要配置
   - 确保添加了API密钥和服务配置

4. **启动开发服务器**:
   ```bash
   # 前端开发服务器
   npm run dev:client  # 或 yarn dev:client
   
   # 后端开发服务器
   npm run dev:server  # 或 yarn dev:server
   ```

## 2. 项目结构

```
AIsound/
├── client/                  # 前端代码
│   ├── css/                 # 样式文件
│   │   └── styles.css       # 主样式表
│   ├── js/                  # 脚本文件
│   │   ├── app.js           # 主应用逻辑
│   │   ├── upload.js        # 文件上传处理
│   │   └── transcription.js # 转录结果处理
│   └── index.html           # 主HTML页面
├── server/                  # 后端代码
│   ├── api/                 # API路由
│   │   ├── upload.js        # 上传处理路由
│   │   └── transcribe.js    # 转录处理路由
│   ├── services/            # 业务逻辑服务
│   │   └── transcription.js # 转录服务
│   ├── utils/               # 工具函数
│   │   ├── fileHelpers.js   # 文件处理工具
│   │   └── apiClient.js     # API客户端
│   ├── middlewares/         # Express中间件
│   └── index.js             # 服务器入口
├── uploads/                 # 上传文件临时存储（gitignore）
├── docs/                    # 项目文档
├── .env                     # 环境变量（gitignore）
├── .env.example             # 环境变量示例
├── package.json             # 项目配置
└── README.md                # 项目说明
```

## 3. 前端开发指南

### HTML 结构开发
遵循设计文档中的布局，使用语义化HTML5标签：

```html
<!-- 示例：文件上传区域结构 -->
<div class="file-input-area" id="dropArea">
  <input type="file" id="audioFilesInput" accept=".mp3, .wav, .m4a, .flac" multiple>
  <span class="file-input-label">点击选择 或 拖拽文件到此区域</span>
  <p class="info-text">支持 MP3, WAV, M4A, FLAC. 单个文件最大50MB.</p>
</div>
```

### CSS 样式开发
- 遵循`design.md`中定义的设计规范
- 使用CSS类名前缀避免命名冲突
- 移动优先响应式设计

```css
/* 示例：文件上传区域样式 */
.file-input-area {
  border: 2px dashed var(--primary-color);  /* 使用CSS变量 */
  padding: 30px 15px;
  text-align: center;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.file-input-area:hover {
  background-color: var(--hover-bg-color);
}
```

### JavaScript 开发
- 模块化组织代码
- 使用ES6+特性
- 事件委托优化性能
- 异步处理API调用

```javascript
// 示例：文件上传处理
const uploadManager = (() => {
  // 私有变量
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedFormats = ['.mp3', '.wav', '.m4a', '.flac'];
  
  // 私有方法
  const validateFile = (file) => {
    // 文件验证逻辑
    if (file.size > maxFileSize) {
      return { valid: false, message: '文件过大' };
    }
    
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedFormats.includes(extension)) {
      return { valid: false, message: '不支持的文件格式' };
    }
    
    return { valid: true };
  };
  
  // 公开API
  return {
    uploadFile: async (file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }
      
      // 文件上传逻辑...
    }
  };
})();
```

## 4. 后端开发指南

### 服务器配置
使用Express.js设置基本服务器：

```javascript
// server/index.js
const express = require('express');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const uploadRoutes = require('./api/upload');
const transcribeRoutes = require('./api/transcribe');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));

// API路由
app.use('/api/upload', uploadRoutes);
app.use('/api/transcribe', transcribeRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在: http://localhost:${PORT}`);
});
```

### 文件上传处理
使用Multer处理文件上传：

```javascript
// server/api/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const router = express.Router();

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 安全文件名生成
    const fileId = uuidv4();
    const fileExt = path.extname(file.originalname).toLowerCase();
    cb(null, `${fileId}${fileExt}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  const allowedFormats = (process.env.ALLOWED_FORMATS || 'mp3,wav,m4a,flac').split(',');
  const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedFormats.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件格式'), false);
  }
};

// 上传中间件
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || 52428800) // 默认50MB
  }
});

// 上传路由
router.post('/', upload.single('audioFile'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '没有上传文件或文件上传失败' });
  }
  
  // 返回文件信息
  return res.status(200).json({
    success: true,
    fileId: path.parse(req.file.filename).name,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

module.exports = router;
```

## 5. API集成指南

### 认证配置
安全地配置API认证信息：

```javascript
// server/utils/apiClient.js
const axios = require('axios');

// 阿里云API签名生成（简化示例）
const generateSignature = (accessKeySecret, data) => {
  // 具体签名生成逻辑，根据阿里云API文档实现
  // ...
};

// 创建API客户端
const createApiClient = () => {
  const API_KEY = process.env.ALIYUN_API_KEY;
  const API_SECRET = process.env.ALIYUN_API_SECRET;
  const API_ENDPOINT = process.env.API_ENDPOINT;
  
  if (!API_KEY || !API_SECRET || !API_ENDPOINT) {
    throw new Error('API配置缺失');
  }
  
  return {
    transcribe: async (filePath, options = {}) => {
      // 实现转录请求...
    }
  };
};

module.exports = { createApiClient };
```

### 转录服务实现
封装API调用为服务：

```javascript
// server/services/transcription.js
const fs = require('fs');
const path = require('path');
const { createApiClient } = require('../utils/apiClient');

const transcriptionService = {
  async transcribeAudio(fileId, options = {}) {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const files = fs.readdirSync(uploadDir);
    
    // 查找匹配的文件
    const targetFile = files.find(file => path.parse(file).name === fileId);
    
    if (!targetFile) {
      throw new Error('文件不存在');
    }
    
    const filePath = path.join(uploadDir, targetFile);
    
    try {
      const apiClient = createApiClient();
      const result = await apiClient.transcribe(filePath, options);
      
      // 处理结果，格式转换等
      return result;
    } catch (error) {
      console.error('转录失败:', error);
      throw new Error('转录处理失败');
    }
  }
};

module.exports = transcriptionService;
```

## 6. 常见问题解决方案

### 文件上传问题
1. **问题：大文件上传超时**
   - 解决：配置更长的超时时间，实现分块上传
   ```javascript
   // 客户端分块上传示例
   const chunkSize = 5 * 1024 * 1024; // 5MB
   
   const uploadFileInChunks = async (file) => {
     const totalChunks = Math.ceil(file.size / chunkSize);
     const fileId = await initializeUpload(file.name, totalChunks);
     
     for (let i = 0; i < totalChunks; i++) {
       const start = i * chunkSize;
       const end = Math.min(file.size, start + chunkSize);
       const chunk = file.slice(start, end);
       
       await uploadChunk(fileId, i, chunk);
     }
     
     return await finalizeUpload(fileId);
   };
   ```

2. **问题：MIME类型验证失败**
   - 解决：前后端都进行文件格式验证
   ```javascript
   // 前端检查
   const validateFileType = (file) => {
     const validTypes = ['audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/flac'];
     return validTypes.includes(file.type);
   };
   
   // 后端补充检查
   const checkFileSignature = (filePath) => {
     // 读取文件头部字节并验证文件格式
     // ...
   };
   ```

### API调用问题
1. **问题：API密钥泄露风险**
   - 解决：后端安全存储，避免前端暴露
   ```javascript
   // 正确做法 - 后端安全调用
   router.post('/transcribe', async (req, res) => {
     try {
       const apiClient = createApiClient(); // API密钥仅在后端管理
       const result = await apiClient.callAPI();
       res.json(result);
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

2. **问题：API请求超时**
   - 解决：实现重试机制
   ```javascript
   const callWithRetry = async (apiFunc, maxRetries = 3) => {
     let lastError;
     
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await apiFunc();
       } catch (error) {
         console.log(`尝试 ${i+1} 失败，${maxRetries - i - 1} 次重试剩余`);
         lastError = error;
         
         // 增加延迟避免过快重试
         await new Promise(r => setTimeout(r, 1000 * (i + 1)));
       }
     }
     
     throw lastError;
   };
   ```

## 7. 调试技巧

### 前端调试
1. **使用浏览器开发者工具**:
   - Network面板监控API请求
   - Console面板添加日志点
   - 使用debugger语句设置断点

   ```javascript
   // 在关键位置添加日志
   const uploadFile = async (file) => {
     console.log('开始上传文件:', file.name, file.size);
     // ... 上传逻辑 ...
     console.log('上传完成');
   };
   ```

2. **模拟慢速网络**:
   - 使用Chrome DevTools的Network Throttling功能
   - 测试上传大文件的用户体验和错误处理

### 后端调试
1. **添加详细日志**:
   ```javascript
   const winston = require('winston');
   
   const logger = winston.createLogger({
     level: 'debug',
     format: winston.format.combine(
       winston.format.timestamp(),
       winston.format.json()
     ),
     transports: [
       new winston.transports.Console(),
       new winston.transports.File({ filename: 'server.log' })
     ]
   });
   
   // 在关键位置使用
   logger.info('收到上传请求', { fileSize, fileType });
   ```

2. **API请求/响应检查**:
   ```javascript
   // 请求检查中间件
   app.use((req, res, next) => {
     console.log(`${req.method} ${req.url}`);
     console.log('请求头:', req.headers);
     console.log('请求体:', req.body);
     next();
   });
   ```

## 8. 部署流程

### 本地构建
1. **前端构建**:
   ```bash
   # 构建优化的静态文件
   npm run build:client
   ```

2. **准备部署包**:
   ```bash
   # 创建部署包
   mkdir -p dist
   cp -r server dist/
   cp -r client/dist dist/client
   cp package.json dist/
   cp .env.example dist/
   ```

### 服务器部署
1. **初始配置**:
   ```bash
   # 安装依赖
   npm install --production
   
   # 配置环境变量
   cp .env.example .env
   nano .env  # 编辑配置
   ```

2. **使用PM2进行进程管理**:
   ```bash
   # 安装PM2
   npm install -g pm2
   
   # 启动应用
   pm2 start server/index.js --name "aisound"
   
   # 设置开机启动
   pm2 startup
   pm2 save
   ```

3. **Nginx反向代理配置**:
   ```nginx
   server {
     listen 80;
     server_name your-domain.com;
     
     location / {
       proxy_pass http://localhost:8000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

4. **设置SSL (使用Let's Encrypt)**:
   ```bash
   # 安装certbot
   apt-get install certbot python3-certbot-nginx
   
   # 申请证书
   certbot --nginx -d your-domain.com
   ```

5. **监控应用**:
   ```bash
   # 查看应用状态
   pm2 status
   
   # 查看日志
   pm2 logs aisound
   ``` 