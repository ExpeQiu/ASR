/**
 * API测试脚本
 * 用于测试API连接、文件上传和转录功能
 */

// 配置参数
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';
const TEST_FILE_ID = 'test-file-123';

// 控制台颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * 格式化输出
 * @param {string} message - 消息文本
 * @param {string} type - 消息类型 (success, error, info, warn)
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  let prefix = '[INFO]';
  
  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '[成功]';
      break;
    case 'error':
      color = colors.red;
      prefix = '[错误]';
      break;
    case 'warn':
      color = colors.yellow;
      prefix = '[警告]';
      break;
    case 'info':
      color = colors.blue;
      prefix = '[信息]';
      break;
  }
  
  console.log(`${color}${prefix}${colors.reset} ${message}`);
}

/**
 * 测试API连接
 */
async function testApiConnection() {
  try {
    log('测试API连接...', 'info');
    const response = await fetch(`${API_BASE_URL}`);
    const data = await response.json();
    
    if (response.ok) {
      log(`API连接成功: ${data.message}`, 'success');
      return true;
    } else {
      log(`API连接失败: ${response.status} ${response.statusText}`, 'error');
      return false;
    }
  } catch (error) {
    log(`API连接错误: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 测试健康检查API
 */
async function testHealthCheck() {
  try {
    log('测试健康检查API...', 'info');
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    
    if (response.ok) {
      log(`健康检查成功: ${data.status}`, 'success');
      return true;
    } else {
      log(`健康检查失败: ${response.status} ${response.statusText}`, 'error');
      return false;
    }
  } catch (error) {
    log(`健康检查错误: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 测试文件列表API
 */
async function testFilesList() {
  try {
    log('测试文件列表API...', 'info');
    const response = await fetch(`${API_BASE_URL}/files`);
    const data = await response.json();
    
    if (response.ok) {
      log(`获取文件列表成功: ${data.data.length}个文件`, 'success');
      return true;
    } else {
      log(`获取文件列表失败: ${response.status} ${response.statusText}`, 'error');
      return false;
    }
  } catch (error) {
    log(`获取文件列表错误: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 测试转录API
 */
async function testTranscribe() {
  try {
    log('测试转录API...', 'info');
    const response = await fetch(`${API_BASE_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fileId: TEST_FILE_ID })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      log(`转录请求成功: ${data.data.message}`, 'success');
      return true;
    } else {
      // 预期404错误，因为文件不存在
      if (response.status === 404 && data.error?.code === 'FILE_NOT_FOUND') {
        log(`预期的错误响应: ${data.error.message}`, 'warn');
        return true;
      } else {
        log(`转录请求失败: ${response.status} ${data.error?.message || response.statusText}`, 'error');
        return false;
      }
    }
  } catch (error) {
    log(`转录请求错误: ${error.message}`, 'error');
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  log('===== API测试开始 =====', 'info');
  
  // 测试API连接
  const connectionResult = await testApiConnection();
  if (!connectionResult) {
    log('API连接测试失败，终止测试', 'error');
    process.exit(1);
  }
  
  // 测试健康检查API
  const healthResult = await testHealthCheck();
  
  // 测试文件列表API
  const filesResult = await testFilesList();
  
  // 测试转录API
  const transcribeResult = await testTranscribe();
  
  // 打印测试结果
  log('\n===== 测试结果汇总 =====', 'info');
  log(`API连接测试: ${connectionResult ? '通过' : '失败'}`, connectionResult ? 'success' : 'error');
  log(`健康检查测试: ${healthResult ? '通过' : '失败'}`, healthResult ? 'success' : 'error');
  log(`文件列表测试: ${filesResult ? '通过' : '失败'}`, filesResult ? 'success' : 'error');
  log(`转录API测试: ${transcribeResult ? '通过' : '失败'}`, transcribeResult ? 'success' : 'error');
  
  // 判断整体结果
  const allPassed = connectionResult && healthResult && filesResult && transcribeResult;
  log(`\n整体测试结果: ${allPassed ? '全部通过' : '部分失败'}`, allPassed ? 'success' : 'error');
  
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
runTests().catch(error => {
  log(`测试执行错误: ${error.message}`, 'error');
  process.exit(1);
}); 