// API测试脚本
const fetch = require('node-fetch');

// 从环境变量获取API基础URL
require('dotenv').config();
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

// 测试健康检查接口
async function testHealthCheck() {
  try {
    console.log(`测试健康检查接口: ${API_BASE_URL}/health`);
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    return response.status === 200;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试API根路径
async function testApiRoot() {
  try {
    console.log(`测试API根路径: ${API_BASE_URL}`);
    const response = await fetch(API_BASE_URL);
    const data = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    return response.status === 200;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试文件列表接口
async function testFilesList() {
  try {
    console.log(`测试文件列表接口: ${API_BASE_URL}/files`);
    const response = await fetch(`${API_BASE_URL}/files`);
    const data = await response.json();
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(data, null, 2));
    return response.status === 200;
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 测试转录接口
async function testTranscriptionsAPI() {
  try {
    console.log(`测试转录接口: ${API_BASE_URL}/transcriptions`);
    // 这里只测试接口是否存在，不提交真正的转录任务
    const response = await fetch(`${API_BASE_URL}/transcriptions`, {
      method: 'OPTIONS'
    });
    console.log('响应状态:', response.status);
    return response.status < 500; // 只要不是服务器错误就认为接口存在
  } catch (error) {
    console.error('请求失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('============================');
  console.log('   前端API连接测试工具');
  console.log('============================\n');
  console.log('API基础URL:', API_BASE_URL);
  
  // 测试健康检查
  console.log('\n1. 测试健康检查接口');
  const healthCheckResult = await testHealthCheck();
  console.log('测试结果:', healthCheckResult ? '✅ 成功' : '❌ 失败');
  
  // 测试API根路径
  console.log('\n2. 测试API根路径');
  const apiRootResult = await testApiRoot();
  console.log('测试结果:', apiRootResult ? '✅ 成功' : '❌ 失败');
  
  // 测试文件列表接口
  console.log('\n3. 测试文件列表接口');
  const filesListResult = await testFilesList();
  console.log('测试结果:', filesListResult ? '✅ 成功' : '❌ 失败');
  
  // 测试转录接口
  console.log('\n4. 测试转录接口');
  const transcriptionsResult = await testTranscriptionsAPI();
  console.log('测试结果:', transcriptionsResult ? '✅ 成功' : '❌ 失败');
  
  // 总结测试结果
  console.log('\n============================');
  console.log('   测试结果总结');
  console.log('============================');
  console.log('健康检查接口:', healthCheckResult ? '✅ 成功' : '❌ 失败');
  console.log('API根路径:', apiRootResult ? '✅ 成功' : '❌ 失败');
  console.log('文件列表接口:', filesListResult ? '✅ 成功' : '❌ 失败');
  console.log('转录接口:', transcriptionsResult ? '✅ 成功' : '❌ 失败');
  console.log('总体结果:', (healthCheckResult && apiRootResult && filesListResult && transcriptionsResult) ? '✅ 所有测试通过' : '❌ 部分测试失败');
}

// 执行测试
runAllTests()
  .catch(error => {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }); 